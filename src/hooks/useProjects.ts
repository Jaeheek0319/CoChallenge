import { useState, useEffect } from 'react';
import { UserProject } from '../types';

export function useProjects() {
  const [projects, setProjects] = useState<UserProject[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('project-code-projects');
    if (saved) {
      try {
        setProjects(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load projects", e);
      }
    }
  }, []);

  const saveProject = (project: UserProject) => {
    const updated = [...projects.filter(p => p.id !== project.id), { ...project, updatedAt: new Date().toISOString() }];
    setProjects(updated);
    localStorage.setItem('project-code-projects', JSON.stringify(updated));
  };

  const getProject = (id: string) => projects.find(p => p.id === id);

  return { projects, saveProject, getProject };
}
