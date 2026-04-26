from ast import Return
import os
import json
import subprocess
import tempfile
import threading
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from flask_socketio import SocketIO, emit
import logging
import json_repair

# Suppress the "non-text parts" warning from google-genai SDK when tool calling
class _NoFunctionCallWarning(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        return "there are non-text parts in the response:" not in record.getMessage()

logging.getLogger("google_genai.types").addFilter(_NoFunctionCallWarning())

try:
    import ptyprocess
    PTY_SUPPORTED = True
except ImportError:
    PTY_SUPPORTED = False

load_dotenv()

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")
running_processes = {}

api_key = os.getenv("GEMINI_API_KEY")

try:
    from google.adk.agents.sequential_agent import SequentialAgent
    from google.adk.agents.llm_agent import LlmAgent
    from google.adk import Runner
    from google.adk.sessions import InMemorySessionService
    from google.genai import types
    import uuid
    import random
    import string
    adk_available = True
except ImportError:
    import random
    import string
    print("WARNING: google-adk is not installed or failed to import.")
    adk_available = False

import re
import json_repair

MODEL_ID = "gemini-2.5-flash-lite"
SLOW_MODEL_ID = "gemini-2.5-flash"

if adk_available:
    agent1_idea = LlmAgent(
        name="Idea_and_Plan_Agent",
        model=MODEL_ID,
        instruction="You are Step 1 of a pipeline. Generate a project idea and implementation plan for the user's prompt. Output only the plan. Carefully consider the difficulty specified by the user and elaborate on features. Possible difficulties are Beginner, Intermediate, and Advanced. Projects with higher difficulties should incorporate more features and utilize more advanced features."
    )

    agent2_code = LlmAgent(
        name="Code_Generator_Agent",
        model=MODEL_ID,
        instruction="You are Step 2. Write a complete project implementing the created plan from the previous step. Output the full code."
    )

    agent3_components = LlmAgent(
        name="Component_Identifier_Agent",
        model=MODEL_ID,
        instruction="You are Step 3. Break apart the project by identifying key functional components and concepts to be taught for each step. Output these components clearly."
    )

    agent4_step_gen = LlmAgent(
        name="Step_Generator_Agent",
        model=MODEL_ID,
        instruction="""You are Step 4. Create a structured project lesson in JSON.
        CRITICAL: Keep explanations concise (max 2-3 sentences) to avoid token limits.
        
        SCHEMA:
        {
          "title": "...", "description": "...", "language": "...", "difficulty": "...", "learningGoals": [],
          "files": [{ "name": "...", "language": "...", "content": "..." }],
          "steps": [{ "title": "...", "explanation": "...", "task": "...", "hint": "...", "solution": "...", "starterCode": { "filename": "..." } }]
        }

        RULES:
        1. Only the VERY FIRST step (index 0) should contain 'starterCode' (a bare skeleton).
        2. All subsequent steps MUST have 'starterCode': {}.
        3. Ensure the project is functionally complete but lean."""
    )

    agent5_refiner = LlmAgent(
        name="Starter_Code_Refiner_Agent",
        model=SLOW_MODEL_ID,
        instruction="""You are Step 5. Refine the 'starterCode' for all steps:
        1. Ensure ONLY step 0 has a non-empty 'starterCode'. 
        2. EXTREMELY IMPORTANT: The 'starterCode' for step 0 MUST NOT contain any of the actual project logic or solution. If you see game loops, print statements related to the project, or any completed features in the 'starterCode', YOU MUST DELETE THEM and replace them with a bare minimum empty skeleton. The starter code's purpose is to be a learning tool, so the student must write the logic themselves.
        3. For ALL other steps (index 1+), the 'starterCode' MUST be exactly an empty string ("")."""
    )

    agent6_reviser = LlmAgent(
        name="Content_Reviser_Agent",
        model=SLOW_MODEL_ID,
        instruction="""You are Step 6, the final content reviser. 
        MANDATORY: Output ONLY the final valid JSON object matching the schema:
        { "title": "...", "description": "...", "language": "...", "difficulty": "...", "learningGoals": [], "files": [], "steps": [] }
        
        FINAL QUALITY CHECK: 
        1. Ensure ONLY step 0 (index 0) has a non-empty 'starterCode'. All other steps MUST have 'starterCode': "". 
        2. CRITICAL LEARNING ENFORCEMENT: Step 0's 'starterCode' MUST be a bare skeleton (e.g., `<!DOCTYPE html><html>...</html>` or `int main() { return 0; }`). IT MUST NOT contain any project logic, game loops, or solutions.
        3. CRITICAL: If the Language is Python, use exactly one file named 'main.py'. If C, use exactly one file named 'main.c'. If C++, use exactly one file named 'main.cpp'. If Web, use 'index.html', 'style.css', 'script.js' etc.
        
        Ensure all Python code blocks are properly escaped and strings are terminated.
        Be concise and keep the response under 12k characters if possible."""
    )

    pipeline = SequentialAgent(
        name="Project_Generation_Pipeline",
        sub_agents=[
            agent1_idea,
            agent2_code,
            agent3_components,
            agent4_step_gen,
            agent5_refiner,
            agent6_reviser
        ]
    )

@app.route('/api/generateProject', methods=['POST'])
async def generate_project():
    data = request.json
    prompt = data.get('prompt')
    language = data.get('language')
    difficulty = data.get('difficulty')

    if not prompt or not language or not difficulty:
        return jsonify({"error": "Missing required fields"}), 400

    # Save metadata before agents begin
    project_id = ''.join(random.choices(string.ascii_lowercase + string.digits, k=7))
    project_metadata = {
        "id": project_id,
        "language": language,
        "difficulty": difficulty
    }

    full_prompt = f"Topic: {prompt}\nLanguage: {language}\nDifficulty: {difficulty}"

    try:
        final_content = ""
        
        if adk_available:
            print("--- Starting ADK Pipeline ---")
            try:
                from google.adk import Runner
                from google.adk.sessions import InMemorySessionService
                from google.genai import types
                import uuid
                
                runner = Runner(
                    app_name="Project_Generator",
                    agent=pipeline,
                    session_service=InMemorySessionService(),
                    auto_create_session=True
                )
                
                print("Running ADK sequential pipeline via Runner...")
                session_id = str(uuid.uuid4())
                events = runner.run_async(
                    user_id="default_user",
                    session_id=session_id,
                    new_message=types.Content(role="user", parts=[types.Part.from_text(text=full_prompt)])
                )
                
                async for event in events:
                    print(".", end="", flush=True)
                    event_text = ""
                    
                    # Robust text extraction that avoids triggering SDK warnings for tool calls
                    parts = []
                    
                    # 1. Check candidates (for GenerateContentResponse)
                    if hasattr(event, 'candidates') and event.candidates:
                        parts = event.candidates[0].content.parts
                    # 2. Check content (common in ADK events)
                    elif hasattr(event, 'content') and event.content:
                        if hasattr(event.content, 'parts') and event.content.parts:
                            parts = event.content.parts
                    # 3. Check message (fallback)
                    elif hasattr(event, 'message') and hasattr(event.message, 'content'):
                        if hasattr(event.message.content, 'parts') and event.message.content.parts:
                            parts = event.message.content.parts
                    
                    # Concatenate only text parts, ignoring function_call/thought parts here
                    if parts:
                        for p in parts:
                            if hasattr(p, 'text') and p.text:
                                event_text += p.text
                    
                    if event_text.strip():
                        final_content = event_text
                        
                print("\nPipeline execution finished.")
            except Exception as e:
                print(f"Pipeline call via Runner failed ({e}). Falling back to Gemini SDK directly for pipeline simulation.")
                
                # Manual Sequential Fallback without ADK's Runner, directly calling the genai model
                from google import genai
                client = genai.Client(api_key=api_key)
                current_context = full_prompt
                agents = [
                    agent1_idea, agent2_code, agent3_components, 
                    agent4_step_gen, agent5_refiner, agent6_reviser
                ]
                
                for idx, agent in enumerate(agents):
                    print(f"--> Executing {agent.name}...")
                    response = client.models.generate_content(
                        model=agent.model,
                        contents=f"System Instruction: {agent.instruction}\n\nUser Input: {current_context}",
                    )
                    current_context = response.text
                    print(f"    Completed {agent.name}.")
                
                final_content = current_context
                
            print("--- Pipeline Completed ---")
        else:
            print("ADK not available. Using a standard fallback.")
            from google import genai
            client = genai.Client(api_key=api_key)
            response = client.models.generate_content(
                model=MODEL_ID,
                contents=full_prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                ),
            )
            final_content = response.text

        if final_content.startswith("```json"):
            final_content = final_content.replace("```json", "", 1)
            if final_content.endswith("```"):
                final_content = final_content[:-3]
        elif final_content.startswith("```"):
            final_content = final_content.replace("```", "", 1)
            if final_content.endswith("```"):
                final_content = final_content[:-3]
        final_content = final_content.strip()
        
        # Post-processing optimization: use json_repair to instantly fix common JSON syntax/truncation issues
        try:
            # json_repair.loads is a drop-in replacement for json.loads that handles mangled JSON
            project_data = json_repair.loads(final_content)
            
            # If it's a string (which can happen with some repair cases), try one more parse
            if isinstance(project_data, str):
                project_data = json.loads(project_data)
        except Exception as e:
            print(f"[Post-Process] Fast repair failed, attempting fallback extraction: {e}")
            import re
            json_match = re.search(r'(\{.*\})', final_content, re.DOTALL)
            if json_match:
                try:
                    project_data = json_repair.loads(json_match.group(1))
                except:
                    raise Exception("Could not recover JSON from agent output even with repair.")
            else:
                raise
        
        # Merge agent output with saved metadata
        project_metadata.update(project_data)

        return jsonify(project_metadata)
    except Exception as e:
        print("Failed to generate project:", e)
        return jsonify({"error": "The AI returned an invalid project structure. Please try again."}), 500

@app.route('/api/getAIHelp', methods=['POST'])
def get_ai_help():
    data = request.json
    code = data.get('code')
    question = data.get('question')
    context = data.get('context')

    if not all([code is not None, question is not None, context is not None]):
        return jsonify({"error": "Missing required fields"}), 400

    help_prompt = f"""You are an AI coding tutor. A student is working on a project and needs help.
  
Project Context: {context}
Student's Current Code:
{code}

Student's Question: {question}

Provide a helpful, educational response. Don't just give the full solution if they are asking for a hint. Guide them to the answer."""

    try:
        from google import genai
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model=MODEL_ID,
            contents=help_prompt
        )
        return jsonify({"response": response.text})
    except Exception as e:
        print("Failed to get AI help:", e)
        return jsonify({"error": "Failed to generate help response."}), 500

@app.route('/api/checkStepCompletion', methods=['POST'])
def check_step_completion():
    data = request.json
    user_code = data.get('userCode')
    task = data.get('task')
    expected_solution = data.get('expectedSolution')

    if not all([user_code is not None, task is not None, expected_solution is not None]):
        return jsonify({"error": "Missing required fields"}), 400

    prompt = f"""You are an expert coding evaluator. 
The student is on a step with the following task:
"{task}"

Here is the expected solution reference:
{expected_solution}

Here is the student's current code:
{user_code}

Analyze the student's code. Have they functionally completed the task requirements?
Respond ONLY with a JSON object in this format:
{{
  "isComplete": true/false,
  "feedback": "If false, a brief 1-sentence hint on what is missing. If true, a short encouragement."
}}"""

    try:
        from google import genai
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model=MODEL_ID,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )
        
        final_content = response.text
        if final_content.startswith("```json"):
            final_content = final_content.replace("```json", "", 1)
            if final_content.endswith("```"):
                final_content = final_content[:-3]
        elif final_content.startswith("```"):
            final_content = final_content.replace("```", "", 1)
            if final_content.endswith("```"):
                final_content = final_content[:-3]
        final_content = final_content.strip()

        return jsonify(json.loads(final_content))
    except Exception as e:
        print("Failed to check step completion:", e)
        return jsonify({
            "isComplete": False,
            "feedback": "Failed to evaluate code. Please try again or ask for a hint."
        })

def read_and_forward_pty_output(process, session_id):
    try:
        while True:
            # Read character by character
            char = process.read(1)
            if not char:
                break
            socketio.emit('terminal_output', {'data': char}, to=session_id)
    except EOFError:
        pass
    except Exception as e:
        socketio.emit('terminal_output', {'data': f'\r\n[Process Error: {str(e)}]\r\n'}, to=session_id)
    finally:
        socketio.emit('terminal_output', {'data': '\r\n[Process exited]\r\n'}, to=session_id)
        if session_id in running_processes:
            del running_processes[session_id]

@socketio.on('execute_code')
def handle_execute_code(data):
    session_id = request.sid
    language = data.get('language')
    code = data.get('code')

    if not PTY_SUPPORTED:
        emit('terminal_output', {'data': 'Error: ptyprocess not supported on this OS (Windows Native). Please run in WSL.\r\n'})
        return

    if not language or not code:
        emit('terminal_output', {'data': 'Error: Missing language or code\r\n'})
        return

    if language not in ['c', 'cpp', 'c++']:
        emit('terminal_output', {'data': 'Error: Unsupported language.\r\n'})
        return

    is_cpp = language in ['cpp', 'c++']
    extension = '.cpp' if is_cpp else '.c'
    compiler = 'g++' if is_cpp else 'gcc'

    temp_dir = tempfile.mkdtemp()
    file_path = os.path.join(temp_dir, f'main{extension}')
    out_path = os.path.join(temp_dir, 'main')

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(code)

    emit('terminal_output', {'data': f'Compiling...\r\n'})

    # Compile
    compile_process = subprocess.run(
        [compiler, file_path, '-o', out_path],
        capture_output=True,
        text=True
    )

    if compile_process.returncode != 0:
        emit('terminal_output', {'data': f'Compilation Error:\r\n{compile_process.stderr.replace(chr(10), chr(13)+chr(10))}'})
        return

    emit('terminal_output', {'data': 'Compilation successful. Running...\r\n'})

    try:
        process = ptyprocess.PtyProcessUnicode.spawn([out_path])
        running_processes[session_id] = process
        
        thread = threading.Thread(target=read_and_forward_pty_output, args=(process, session_id))
        thread.daemon = True
        thread.start()
    except Exception as e:
        emit('terminal_output', {'data': f'Failed to spawn process: {str(e)}\r\n'})

@socketio.on('terminal_input')
def handle_terminal_input(data):
    session_id = request.sid
    char = data.get('char', '')
    if session_id in running_processes:
        try:
            running_processes[session_id].write(char)
        except Exception as e:
            print(f"Failed to write to pty: {e}")

if __name__ == '__main__':
    socketio.run(app, debug=True, port=5000, allow_unsafe_werkzeug=True)
