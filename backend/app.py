import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# Initialize the Gemini client
# Ensure GEMINI_API_KEY is set in your environment variables (.env file)
api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key)

MODEL_ID = "gemma-4-26b-a4b-it"

@app.route('/api/generateProject', methods=['POST'])
def generate_project():
    data = request.json
    prompt = data.get('prompt')
    language = data.get('language')
    difficulty = data.get('difficulty')

    if not prompt or not language or not difficulty:
        return jsonify({"error": "Missing required fields"}), 400

    system_prompt = """You are an expert coding tutor. Your goal is to generate high-quality, guided coding projects for students.
When a user provides a topic, language, and difficulty, you must respond with a JSON object representing a structured project lesson.

The JSON schema must be:
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

Constraints:
1. For HTML/CSS/JS projects, always provide index.html, style.css, and script.js.
2. Ensure the code is clean, well-commented, and educational.
3. Steps should be incremental, building the project from scratch or from logical milestones.
4. If difficulty is Beginner, explain basic concepts. If Advanced, use modern best practices and more complex logic.
5. IMPORTANT: Return ONLY the JSON object, no Markdown formatting or backticks."""

    full_prompt = f"Topic: {prompt}\nLanguage: {language}\nDifficulty: {difficulty}"

    try:
        response = client.models.generate_content(
            model=MODEL_ID,
            contents=system_prompt + "\n\n" + full_prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )

        final_content = response.text
        # Strip potential markdown formatting that models sometimes include
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
        
        # Add frontend-specific data
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
        response = client.models.generate_content(
            model=MODEL_ID,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )
        
        final_content = response.text
        # Strip potential markdown formatting
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
