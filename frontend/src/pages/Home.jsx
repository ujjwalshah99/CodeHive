import React, { useState, useEffect } from 'react';
import { useUser } from '../context/user.context';
import axios from '../config/axios';
import { useNavigate } from 'react-router-dom';

function Home() {
  const { user } = useUser();
  const [showModal, setShowModal] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projects, setProjects] = useState([]);
  const navigate = useNavigate();

  const fetchProjects = () => {
    axios
      .get('/projects/all')
      .then((res) => {
        setProjects(Array.isArray(res.data.projects) ? res.data.projects : []);
      })
      .catch((err) => {
        console.error('Error fetching projects:', err);
        setProjects([]);
      });
  };

  const createProject = (e) => {
    e.preventDefault();
    axios
      .post('/projects/create', { name: projectName })
      .then(() => {
        setShowModal(false);
        setProjectName('');
        fetchProjects();
      })
      .catch((err) => console.error('Error creating project:', err));
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  return (
    <main className="p-8 min-h-screen bg-gradient-to-br from-slate-50 to-slate-200">
      {/* Welcome Header */}
      <header className="flex justify-between items-center mb-10">
        <h1 className="text-4xl font-bold text-slate-800 tracking-tight">
          Welcome, {user?.name || 'User'}!
        </h1>
        <button
          onClick={() => {
            localStorage.removeItem('token'); // or call logout from context if available
            navigate('/login');
          }}
          className="px-4 py-2 bg-red-100 text-red-600 font-medium rounded-xl hover:bg-red-200 hover:text-red-700 transition text-sm shadow-sm"
        >
          Logout
        </button>
      </header>

      {/* New Project Button */}
      <div className="flex justify-center mb-10">
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl shadow-md hover:bg-indigo-700 transition duration-300"
        >
          <i className="ri-add-line text-xl" />
          New Project
        </button>
      </div>

      {/* Projects Grid */}
      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {projects.length > 0 ? (
          projects.map((project) => (
            <div
              key={project._id}
              onClick={() => navigate('/project', { state: { project } })}
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md hover:shadow-xl hover:scale-[1.01] transition cursor-pointer"
            >
              <h3 className="text-xl font-semibold text-slate-800 mb-3">{project.name}</h3>
              <div className="flex items-center text-slate-600 text-sm">
                <i className="ri-user-3-line mr-2 text-indigo-600 text-base"></i>
                Collaborators:{' '}
                <span className="ml-1 font-semibold text-slate-800">
                  {project?.users?.length || 0}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center text-slate-500 text-base italic">
            No projects yet. Create one to get started!
          </div>
        )}
      </section>

      {/* Create Project Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 relative animate-fade-in border border-gray-200">
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-indigo-700">Create New Project</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-red-500 transition"
              >
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={createProject} className="space-y-5">
              <div>
                <label
                  htmlFor="projectName"
                  className="block text-sm font-medium text-gray-600 mb-1"
                >
                  Project Name
                </label>
                <input
                  id="projectName"
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm text-sm"
                  required
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition shadow-sm text-sm"
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
