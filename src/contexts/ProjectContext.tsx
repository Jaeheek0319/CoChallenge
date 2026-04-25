import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProject } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface ProjectContextType {
  projects: UserProject[];
  loading: boolean;
  saveProject: (project: UserProject) => Promise<void>;
  getProject: (id: string) => UserProject | undefined;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<UserProject[]>([]);
  const [loading, setLoading] = useState(true);

  // Load projects
  useEffect(() => {
    async function loadProjects() {
      setLoading(true);
      
      // Always try local storage first (for anonymous or offline work)
      const saved = localStorage.getItem('project-code-projects');
      let localProjects: UserProject[] = [];
      if (saved) {
        try {
          localProjects = JSON.parse(saved);
        } catch (e) {
          console.error("Failed to load local projects", e);
        }
      }

      if (user) {
        // Fetch from Supabase if logged in
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('user_id', user.id);

        if (error) {
          console.error("Error fetching projects from Supabase", error);
          setProjects(localProjects);
        } else if (data) {
          // Merge logic: prefer Supabase but keep unique local ones?
          // For simplicity, let's just use Supabase data if user is logged in
          const remoteProjects: UserProject[] = data.map(p => ({
            id: p.id,
            title: p.title,
            description: p.description,
            language: p.language,
            difficulty: p.difficulty,
            learningGoals: p.learning_goals,
            files: p.files,
            steps: p.steps,
            currentStep: p.current_step,
            updatedAt: p.updated_at
          }));
          setProjects(remoteProjects);
        }
      } else {
        setProjects(localProjects);
      }
      setLoading(false);
    }

    loadProjects();
  }, [user]);

  const saveProject = async (project: UserProject) => {
    const updatedProject = { ...project, updatedAt: new Date().toISOString() };
    
    // Update local state
    setProjects(prev => {
      const filtered = prev.filter(p => p.id !== project.id);
      return [...filtered, updatedProject];
    });

    // Update local storage
    const saved = localStorage.getItem('project-code-projects');
    const localProjects: UserProject[] = saved ? JSON.parse(saved) : [];
    const filteredLocal = localProjects.filter(p => p.id !== project.id);
    localStorage.setItem('project-code-projects', JSON.stringify([...filteredLocal, updatedProject]));

    // Update Supabase if logged in
    if (user) {
      const { error } = await supabase
        .from('projects')
        .upsert({
          id: project.id,
          user_id: user.id,
          title: project.title,
          description: project.description,
          language: project.language,
          difficulty: project.difficulty,
          learning_goals: project.learningGoals,
          files: project.files,
          steps: project.steps,
          current_step: project.currentStep,
          updated_at: updatedProject.updatedAt
        });

      if (error) {
        console.error("Error saving to Supabase", error);
      }
    }
  };

  const getProject = (id: string) => projects.find(p => p.id === id);

  return (
    <ProjectContext.Provider value={{ projects, loading, saveProject, getProject }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjectContext() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProjectContext must be used within a ProjectProvider');
  }
  return context;
}
