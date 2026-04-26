from ast import Return
import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

api_key = os.getenv("GEMINI_API_KEY")

try:
    from google.adk.agents.sequential_agent import SequentialAgent
    from google.adk.agents.llm_agent import LlmAgent
    from google.adk import Runner
    from google.adk.sessions import InMemorySessionService
    from google.genai import types
    import uuid
    adk_available = True
except ImportError:
    print("WARNING: google-adk is not installed or failed to import.")
    adk_available = False

MODEL_ID = "gemini-2.5-flash"

if adk_available:
    agent1_idea = LlmAgent(
        name="Idea_and_Plan_Agent",
        model=MODEL_ID,
        instruction="You are Step 1 of a pipeline. Generate a project idea and implementation plan for the user's prompt. Output only the plan."
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
        instruction="""You are Step 4. For each key functional component, create a step according to a JSON format with 'title', 'explanation', 'task', 'hint', 'solution', and 'starterCode'. 
        CRITICAL TOKEN OPTIMIZATION: 
        1. Only the VERY FIRST step (index 0) should contain 'starterCode'. This starter code should be a minimal, empty boilerplate (e.g., just the basic HTML structure with no content). 
        2. For ALL subsequent steps (index 1 and above), set 'starterCode' to an empty string (""). 
        This ensures the user starts with a blank slate and their progress is maintained as they move through steps without overwriting their code."""
    )

    agent5_refiner = LlmAgent(
        name="Starter_Code_Refiner_Agent",
        model=MODEL_ID,
        instruction="""You are Step 5. Refine the 'starterCode' for all steps:
        1. Ensure ONLY step 0 has a non-empty 'starterCode'. This should be a minimal, functional boilerplate (e.g. basic HTML/CSS/JS skeletons but with NO logic or content). 
        2. For ALL other steps (index 1+), the 'starterCode' MUST be an empty string ("").
        3. Double check that step 0's starter code is NOT completely empty (it needs minimal structure) but contains no solution code."""
    )

    agent6_reviser = LlmAgent(
        name="Content_Reviser_Agent",
        model=MODEL_ID,
        instruction="""You are Step 6, the final step. Revise the explanation, task, and hint. 
        FINAL QUALITY CHECK: 
        1. Ensure that ONLY step 0 (index 0) has a non-empty 'starterCode' boilerplate. All other steps MUST have 'starterCode': "". 
        2. CRITICAL: For step 0, ensure that NONE of the requirements specified in the 'task' are already completed in the 'starterCode'. The starter code should provide ONLY the bare-minimum boilerplate structure required to begin the task.
        IMPORTANT: Your output MUST be ONLY a JSON object representing a structured project lesson, exactly matching this schema:
        {
          "title": "Project Title",
          "description": "Short description of the project",
          "learningGoals": ["Goal 1", "Goal 2"],
          "files": [
            { "name": "index.html", "language": "html", "content": "..." },
            { "name": "style.css", "language": "css", "content": "..." },
            { "name": "script.js", "language": "javascript", "content": "..." }
          ],
          "steps": [
            {
              "title": "Step title",
              "explanation": "Detailed explanation of concepts",
              "task": "What the user needs to do",
              "hint": "A subtle hint",
              "solution": "The final code for this step",
              "starterCode": { "filename": "starter code for this step" }
            }
          ]
        }
        Return ONLY the JSON. No markdown, no backticks."""
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
                    
                    # 1. Check for top-level text attribute
                    if hasattr(event, 'text') and event.text:
                        event_text = event.text
                    
                    # 2. Check for content object (common in ADK)
                    elif hasattr(event, 'content') and event.content:
                        c = event.content
                        if hasattr(c, 'text') and c.text:
                            event_text = c.text
                        elif hasattr(c, 'parts') and c.parts:
                            for p in c.parts:
                                # Skip internal reasoning parts if present
                                if hasattr(p, 'thought') and p.thought:
                                    continue
                                if hasattr(p, 'text') and p.text:
                                    event_text += p.text
                                    
                    # 3. Check for message object (fallback)
                    elif hasattr(event, 'message') and hasattr(event.message, 'content'):
                        msg = event.message.content
                        if hasattr(msg, 'text') and msg.text:
                            event_text = msg.text
                        elif hasattr(msg, 'parts') and msg.parts:
                            for p in msg.parts:
                                if hasattr(p, 'thought') and p.thought: continue
                                if hasattr(p, 'text') and p.text:
                                    event_text += p.text
                        elif isinstance(msg, list):
                            for p in msg:
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
        
        project_data = json.loads(final_content)
        
        import random
        import string
        project_id = ''.join(random.choices(string.ascii_lowercase + string.digits, k=7))
        project_data['id'] = project_id
        project_data['language'] = language
        project_data['difficulty'] = difficulty

        return jsonify(project_data)
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

if __name__ == '__main__':
    app.run(debug=True, port=5000)
