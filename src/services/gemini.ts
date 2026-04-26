import { GeneratedProject, Language, Difficulty } from "../types";

const BACKEND_URL = "http://127.0.0.1:5000/api";

export async function generateProject(prompt: string, language: Language, difficulty: Difficulty): Promise<GeneratedProject> {
  console.log("Sent prompt to backend");

  const response = await fetch(`${BACKEND_URL}/generateProject`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ prompt, language, difficulty })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error("Backend error:", errorData);
    throw new Error(errorData.error || "The server returned an error. Please try again.");
  }

  const projectData = await response.json();
  console.log("Backend Project Generation Response:", projectData);
  return projectData;
}

export async function getAIHelp(code: string, question: string, context: string): Promise<string> {
  const response = await fetch(`${BACKEND_URL}/getAIHelp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ code, question, context })
  });

  if (!response.ok) {
    throw new Error("Failed to get help from backend");
  }

  const data = await response.json();
  return data.response || "No response";
}

export interface StepCompletionResult {
  isComplete: boolean;
  feedback: string;
}

export async function checkStepCompletion(userCode: string, task: string, expectedSolution: string): Promise<StepCompletionResult> {
  try {
    const response = await fetch(`${BACKEND_URL}/checkStepCompletion`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ userCode, task, expectedSolution })
    });

    if (!response.ok) {
      throw new Error("Failed to check step completion from backend");
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to check step completion:", error);
    return {
      isComplete: false,
      feedback: "Failed to evaluate code. Please try again or ask for a hint."
    };
  }
}
