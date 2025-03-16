import React from 'react';
import { useLocation } from 'react-router-dom';

function ProjectPage() {
  const location = useLocation();
  const project  = location.state.project || {};

  if (!project) {
    return <div className="p-6 text-red-500">No project data received.</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{project.name}</h1>
      <p className="text-slate-700">Collaborators: {project.users.length}</p>
      {/* You can display more project data here */}
    </div>
  );
}

export default ProjectPage;
