import { useProjectContext } from '../contexts/ProjectContext';

export function useProjects() {
  return useProjectContext();
}
