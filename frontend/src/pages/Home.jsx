import React, { useState, useEffect } from 'react';
import { useUser } from '../context/user.context';
import axios from '../config/axios';
import { useNavigate } from "react-router-dom";

function Home() {
  const { user } = useUser();
  const [showModal, setShowModal] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projects, setProjects] = useState([]);

  const navigate = useNavigate();

  // Fetch all projects from the server
  const fetchProjects = () => {
    axios
      .get('/projects/all')
      .then((res) => {
        console.log('Fetched projects:', res.data);
        setProjects(Array.isArray(res.data.projects) ? res.data.projects : []);
      })
      .catch((err) => {
        console.error('Error fetching projects:', err);
        setProjects([]);
      });
  };

  // Handle project creation
  const createProject = (e) => {
    e.preventDefault();

    axios
      .post('/projects/create', { name: projectName })
      .then((res) => {
        console.log('Project created:', res.data);
        setShowModal(false);
        setProjectName('');
        fetchProjects(); // Refresh list after creation
      })
      .catch((err) => {
        console.error('Error creating project:', err);
      });
  };

  // Load projects on mount
  useEffect(() => {
    fetchProjects();
  }, []);

  return (
    <main className="p-6 min-h-screen bg-gradient-to-br from-white to-slate-100">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-800">
          Welcome, {user?.name || 'User'}!
        </h1>
      </div>

      {/* New Project Button */}
      <div className="flex justify-center mb-8">
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-2xl shadow-lg hover:bg-indigo-700 transition-all duration-300"
        >
          New Project <i className="ri-add-line text-lg"></i>
        </button>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {Array.isArray(projects) && projects.length > 0 ? (
          projects.map((project) => (
            <div
              onClick={() => navigate('/project', { state: { project } })}
              key={project._id}
              className="bg-white rounded-2xl shadow-md p-5 border border-slate-200 hover:shadow-lg transition-all"
            >
              <h3 className="text-lg font-semibold text-slate-700 mb-3">{project.name}</h3>

              <div className="flex items-center text-sm text-slate-500">
                <i className="ri-user-3-line mr-2 text-indigo-600 text-base"></i>
                Collaborators:{' '}
                <span className="ml-1 font-semibold text-slate-700">
                  {project?.users?.length || 0}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center text-slate-500 text-sm italic">
            No projects yet. Create one to get started!
          </div>
        )}
      </div>



      {/* Create Project Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md relative animate-fade-in">
            <h2 className="text-2xl font-semibold text-slate-700 mb-4">Create New Project</h2>
            <form onSubmit={createProject} className="space-y-4">
              <div>
                <label
                  htmlFor="projectName"
                  className="block text-sm font-medium text-slate-600 mb-1"
                >
                  Project Name
                </label>
                <input
                  id="projectName"
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                  required
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-all shadow-sm"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

export default Home;
