export type Language = 'html-css-js' | 'python' | 'react';
export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export interface ProjectFile {
  name: string;
  language: string;
  content: string;
}

export interface LessonStep {
  title: string;
  explanation: string;
  task: string;
  hint: string;
  solution: string;
  starterCode?: { [fileName: string]: string };
}

export interface GeneratedProject {
  id: string;
  title: string;
  description: string;
  language: Language;
  difficulty: Difficulty;
  learningGoals: string[];
  files: ProjectFile[];
  steps: LessonStep[];
}

export interface UserProject extends GeneratedProject {
  currentStep: number;
  updatedAt: string;
}
