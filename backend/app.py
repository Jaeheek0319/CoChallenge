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
import asyncio
import re
from google import genai

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


MODEL_ID = "gemini-2.5-flash-lite"
SLOW_MODEL_ID = "gemini-2.5-flash"
ADV_MODEL_ID = "gemini-2.5-pro"

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
        model=SLOW_MODEL_ID,
        instruction="""You are Step 3. Break apart the project into exactly 4-6 key functional components.
        MANDATORY: Output ONLY a JSON list of objects:
        [{"title": "Step Title", "concept": "Brief description of what to teach"}]
        No extra text or markdown."""
    )

    agent4_step_template = """You are Step 4. Create ONE specific project step for the component: {component_title}.
        
        CONTEXT:
        Project: {project_plan}
        Implementation: {full_code}
        Specific Concept to Teach: {concept}

        OUTPUT SCHEMA:
        {{
          "title": "Step Title",
          "lesson": "CLEANLY FORMATTED, BULLET-POINTED explanation of the concepts (e.g. how a loop works, what an array is). Use markdown bullet points for readability.",
          "explanation": "CONCISE 1-2 sentence instruction on what to do in this specific step",
          "task": "Specific task for the user",
          "hint": "Subtle hint",
          "solution": "The full code for this specific step",
          "starterCode": {{ "filename": "..." }}
        }}
        
        RULES:
        1. If this is Step 0 (the first component), provide a bare skeleton in 'starterCode'.
        2. If this is NOT Step 0, 'starterCode' MUST be {{}}.
        3. Output ONLY the JSON object. No markdown."""

    agent5_refiner = LlmAgent(
        name="Starter_Code_Refiner_Agent",
        model=ADV_MODEL_ID,
        instruction="""You are Step 5. Refine the 'starterCode' for all steps:
        1. Ensure ONLY step 0 has a non-empty 'starterCode'. 
        2. EXTREMELY IMPORTANT: The 'starterCode' for step 0 MUST NOT contain any of the actual project logic or solution. If you see game loops, print statements related to the project, or any completed features in the 'starterCode', YOU MUST DELETE THEM and replace them with a bare minimum empty skeleton. The starter code's purpose is to be a learning tool, so the student must write the logic themselves.
        3. For ALL other steps (index 1+), the 'starterCode' MUST be exactly an empty string ("")."""
    )

    agent6_reviser = LlmAgent(
        name="Content_Reviser_Agent",
        model=SLOW_MODEL_ID,
        instruction="""You are Step 6, the final content reviser. 
        MANDATORY: Output only the complete, final JSON object.
        CRITICAL: The 'steps' array MUST contain ALL steps generated in the previous phase. DO NOT omit any steps.
        
        SCHEMA:
        { "title": "...", "description": "...", "language": "...", "difficulty": "...", "learningGoals": [], "files": [], "steps": [...] }
        
        FINAL QUALITY CHECK: 
        1. Ensure ONLY step 0 (index 0) has a non-empty 'starterCode'.
        2. PRESERVE the 'lesson' and 'explanation' fields for every step.
        3. Ensure all Python code blocks are properly escaped.
        4. (CRITICAL!) Verify that only the minimum required starter code is provided in 'starterCode' to allow the student to learn by building on their own."""
    )

    pipeline = SequentialAgent(
        name="Project_Generation_Pipeline",
        sub_agents=[
            agent1_idea,
            agent2_code,
            agent3_components
        ]
    )

def clean_code_block(text):
    if not isinstance(text, str): return text
    text = text.strip()
    # Catch ```python ... ``` or ``` ... ```
    match = re.search(r'```(?:[a-zA-Z+]*)?\n?(.*?)\n?```', text, re.DOTALL)
    if match:
        return match.group(1).strip()
    return text

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
            print("--- Starting Hybrid ADK Pipeline ---")
            client = genai.Client(api_key=api_key)
            
            # Phase A: Sequential Agents (Idea, Code, Components)
            print("--> Running Phase A (Idea, Code, Components)...")
            current_context = full_prompt
            phase_a_results = []
            for agent in [agent1_idea, agent2_code, agent3_components]:
                resp = client.models.generate_content(
                    model=agent.model,
                    contents=f"System Instruction: {agent.instruction}\n\nUser Input: {current_context}",
                )
                current_context = resp.text
                phase_a_results.append(resp.text)
                print(f"    Completed {agent.name}.")

            project_plan = phase_a_results[0]
            full_code = phase_a_results[1]
            components_json = phase_a_results[2]
            
            # Parse Components
            print(f"--> Component Raw Output: {components_json[:100]}...")
            try:
                # Use json_repair for robust parsing of the component list
                components = json_repair.loads(components_json)
                if not isinstance(components, list):
                    # If it returned an object with a list inside, try to find it
                    if isinstance(components, dict):
                        for val in components.values():
                            if isinstance(val, list):
                                components = val
                                break
                
                if not isinstance(components, list) or len(components) == 0:
                    raise Exception("Not a valid list")
            except Exception as e:
                print(f"Failed to parse components JSON ({e}). Using fallback.")
                components = [
                    {"title": "Initial Setup", "concept": "Setting up the environment"},
                    {"title": "Core Logic", "concept": "Implementing the main functionality"},
                    {"title": "User Interaction", "concept": "Handling inputs and outputs"},
                    {"title": "Polishing", "concept": "Refining the user experience"}
                ]

            # Phase B: Parallel Step Generation
            print(f"--> Running Phase B (Parallel Step Gen for {len(components)} steps)...")
            
            async def gen_step(idx, comp):
                prompt = agent4_step_template.format(
                    component_title=comp['title'],
                    project_plan=project_plan,
                    full_code=full_code,
                    concept=comp['concept']
                )
                if idx == 0:
                    prompt += "\nREMINDER: This is Step 0. Provide 'starterCode'."
                else:
                    prompt += f"\nREMINDER: This is Step {idx}. 'starterCode' MUST be {{}}."
                
                resp = await asyncio.to_thread(
                    client.models.generate_content,
                    model=MODEL_ID,
                    contents=prompt
                )
                return resp.text

            step_results = await asyncio.gather(*[gen_step(i, c) for i, c in enumerate(components)])
            
            # Aggregation
            steps = []
            for s in step_results:
                try:
                    steps.append(json_repair.loads(s))
                except:
                    continue

            # Construct Aggregate Project
            # Try to get basic info from the code agent or idea agent
            project_aggregate = {
                "title": prompt[:50],
                "description": project_plan[:200],
                "language": language,
                "difficulty": difficulty,
                "learningGoals": ["Master the implementation of the project"],
                "files": [
                    {"name": "main.py" if language.lower() == 'python' else ("main.c" if language.lower() == 'c' else "index.html"), 
                     "language": language, "content": full_code}
                ],
                "steps": steps
            }

            # Phase C: Final Refinement & Revision
            print("--> Running Phase C (Refinement & Revision)...")
            aggregate_json = json.dumps(project_aggregate)
            
            refiner_resp = client.models.generate_content(
                model=agent5_refiner.model,
                contents=f"System Instruction: {agent5_refiner.instruction}\n\nUser Input: {aggregate_json}",
            )
            
            reviser_resp = client.models.generate_content(
                model=agent6_reviser.model,
                contents=f"System Instruction: {agent6_reviser.instruction}\n\nUser Input: {refiner_resp.text}",
            )
            
            final_content = reviser_resp.text
            print("--- Hybrid Pipeline Completed ---")
        else:
            print("ADK not available. Using a standard fallback.")
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
            json_match = re.search(r'(\{.*\})', final_content, re.DOTALL)
            if json_match:
                try:
                    project_data = json_repair.loads(json_match.group(1))
                except:
                    raise Exception("Could not recover JSON from agent output even with repair.")
            else:
                raise
        
        # Apply markdown cleaning to all code fields
        if "files" in project_data:
            for f in project_data["files"]:
                if "content" in f: f["content"] = clean_code_block(f["content"])
        
        if "steps" in project_data:
            for s in project_data["steps"]:
                if "solution" in s: s["solution"] = clean_code_block(s["solution"])
                if "starterCode" in s and isinstance(s["starterCode"], dict):
                    for filename in s["starterCode"]:
                        s["starterCode"][filename] = clean_code_block(s["starterCode"][filename])
        
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
