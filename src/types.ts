export type Language = 'html-css-js' | 'python' | 'react' | 'c' | 'cpp';
export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export interface ProjectFile {
  name: string;
  language: string;
  content: string;
}

export interface LessonStep {
  title: string;
  lesson?: string;
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

export interface UserProfile {
  username: string;
  fullName: string;
  bio: string;
  avatarUrl: string;
  linkedinUrl: string;
  githubUrl: string;
  twitterUrl: string;
  githubAccessToken?: string;
  elo: number;
  globalRank?: number;
  updatedAt: string;
}

export interface PublicUser {
  username: string;
  fullName: string;
  avatarUrl: string;
}

export interface PublicProjectSummary {
  id: string;
  title: string;
  description: string;
  language: string;
  difficulty: string;
  learningGoals: string[];
  currentStep: number;
  totalSteps: number;
  updatedAt: string;
}

export interface SchoolProjectSummary {
  id: string;
  title: string;
  description: string;
  language: string;
  difficulty: string;
  learningGoals: string[];
  totalSteps: number;
  sourceChallengeId: string | null;
  sourceWinnerId: string | null;
  sourceWinnerUsername: string | null;
  likes: number;
  createdAt: string;
  updatedAt: string;
}

export interface SchoolProject extends Omit<SchoolProjectSummary, 'totalSteps'> {
  files: ProjectFile[];
  steps: LessonStep[];
}

export interface PublicChallengeSummary {
  id: string;
  authorId: string;
  authorUsername: string;
  title: string;
  description: string;
  language: string;
  difficulty: string;
  tags: string[];
  estimatedTime: string;
  company: { name: string; role: string } | null;
  verified: boolean;
  logoUrl: string | null;
  likes: number;
  createdAt: string;
}
