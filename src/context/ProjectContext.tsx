import React, { createContext, useContext, useState } from 'react';

interface ProjectContextType {
  projectName: string;
  setProjectName: (name: string) => void;
}

const ProjectContext = createContext<ProjectContextType>({
  projectName: '',
  setProjectName: () => {},
});

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [projectName, setProjectName] = useState('');
  return (
    <ProjectContext.Provider value={{ projectName, setProjectName }}>
      {children}
    </ProjectContext.Provider>
  );
}

export const useProject = () => useContext(ProjectContext);
