import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProject } from '../types';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';

interface ProjectContextType {
  projects: UserProject[];
  loading: boolean;
  saveProject: (project: UserProject) => Promise<void>;
  addProject: (project: UserProject) => void;
  getProject: (id: string) => UserProject | undefined;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<UserProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProjects() {
      setLoading(true);

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
        try {
          const remoteProjects = await api.get<UserProject[]>('/api/projects');
          setProjects(remoteProjects);
        } catch (err) {
          console.error("Error fetching projects from API", err);
          setProjects(localProjects);
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

    setProjects(prev => {
      const filtered = prev.filter(p => p.id !== project.id);
      return [...filtered, updatedProject];
    });

    const saved = localStorage.getItem('project-code-projects');
    const localProjects: UserProject[] = saved ? JSON.parse(saved) : [];
    const filteredLocal = localProjects.filter(p => p.id !== project.id);
    localStorage.setItem('project-code-projects', JSON.stringify([...filteredLocal, updatedProject]));

    if (user) {
      try {
        await api.put(`/api/projects/${project.id}`, updatedProject);
      } catch (err) {
        console.error("Error saving to API", err);
      }
    }
  };

  const addProject = (project: UserProject) => {
    setProjects((prev) => {
      const filtered = prev.filter((p) => p.id !== project.id);
      return [...filtered, project];
    });

    const saved = localStorage.getItem('project-code-projects');
    const localProjects: UserProject[] = saved ? JSON.parse(saved) : [];
    const filteredLocal = localProjects.filter((p) => p.id !== project.id);
    localStorage.setItem(
      'project-code-projects',
      JSON.stringify([...filteredLocal, project]),
    );
  };

  const getProject = (id: string) => projects.find(p => p.id === id);

  return (
    <ProjectContext.Provider value={{ projects, loading, saveProject, addProject, getProject }}>
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
