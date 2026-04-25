import { GoogleGenAI } from "@google/genai";
import { GeneratedProject, Language, Difficulty } from "../types";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const SYSTEM_PROMPT = `You are an expert coding tutor. Your goal is to generate high-quality, guided coding projects for students.
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
5. IMPORTANT: Return ONLY the JSON object, no Markdown formatting or backticks.`;

export async function generateProject(prompt: string, language: Language, difficulty: Difficulty): Promise<GeneratedProject> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Gemini API key is missing. Please configure it in the Secrets panel.");
  }

  const fullPrompt = `Topic: ${prompt}\nLanguage: ${language}\nDifficulty: ${difficulty}`;
  console.log("Sent prompt");

  const result = await genAI.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: SYSTEM_PROMPT + "\n\n" + fullPrompt }] }],
    config: {
      responseMimeType: "application/json",
    },
  } as any); // Cast because types might be out of sync with SDK

  const response = result;
  const text = typeof (response as any).text === 'function' ? (response as any).text() : (response as any).text;
  
  const finalContent = text || (response as any).content?.parts?.[0]?.text;
  
  console.log("Gemini Project Generation Response:", finalContent);

  try {
    const data = JSON.parse(finalContent);
    return {
      ...data,
      id: Math.random().toString(36).substring(7),
      language,
      difficulty
    };
  } catch (error) {
    console.error("Failed to parse Gemini response:", text);
    throw new Error("The AI returned an invalid project structure. Please try again.");
  }
}

export async function getAIHelp(code: string, question: string, context: string): Promise<string> {
  const helpPrompt = `You are an AI coding tutor. A student is working on a project and needs help.
  
  Project Context: ${context}
  Student's Current Code:
  ${code}
  
  Student's Question: ${question}
  
  Provide a helpful, educational response. Don't just give the full solution if they are asking for a hint. Guide them to the answer.`;

  const result = await genAI.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [{ role: "user", parts: [{ text: helpPrompt }] }]
  } as any);

  const text = typeof (result as any).text === 'function' ? (result as any).text() : (result as any).text;
  return text || (result as any).content?.parts?.[0]?.text || "No response";
}

export interface StepCompletionResult {
  isComplete: boolean;
  feedback: string;
}

export async function checkStepCompletion(userCode: string, task: string, expectedSolution: string): Promise<StepCompletionResult> {
  const prompt = `You are an expert coding evaluator. 
The student is on a step with the following task:
"${task}"

Here is the expected solution reference:
${expectedSolution}

Here is the student's current code:
${userCode}

Analyze the student's code. Have they functionally completed the task requirements?
Respond ONLY with a JSON object in this format:
{
  "isComplete": true/false,
  "feedback": "If false, a brief 1-sentence hint on what is missing. If true, a short encouragement."
}`;

  try {
    const result = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
      },
    } as any);

    const response = result;
    const text = typeof (response as any).text === 'function' ? (response as any).text() : (response as any).text;
    const finalContent = text || (response as any).content?.parts?.[0]?.text;
    
    return JSON.parse(finalContent);
  } catch (error) {
    console.error("Failed to check step completion:", error);
    return {
      isComplete: false,
      feedback: "Failed to evaluate code. Please try again or ask for a hint."
    };
  }
}
