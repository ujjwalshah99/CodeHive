import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from '../config/axios';

function ProjectPage() {
  const location = useLocation();
  const initialProject = location.state?.project || null;
  const [project, setProject] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [messages, setMessages] = useState([
    { id: 1, type: 'incoming', text: 'Hey team, let’s start the discussion!', sender: 'Alice' },
    { id: 2, type: 'outgoing', text: 'Sure, I’m ready.', sender: 'You' },
    { id: 3, type: 'incoming', text: 'Don’t forget the deadline is Friday.', sender: 'Bob' }
  ]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    if (initialProject) {
      axios.get(`/projects/get-project/${initialProject._id}`)
        .then((res) => {
          const projectData = res.data.project;
          setProject(projectData);

          axios.get('/users/all')
            .then((userRes) => {
              const filteredUsers = userRes.data.users.filter(
                (user) => !projectData.users.some((u) => u._id === user._id)
              );
              setAllUsers(filteredUsers);
            });
        })
        .catch((err) => console.error('Error fetching project data:', err));
    }
  }, [initialProject]);

  const handleAddCollaborator = () => {
    if (!selectedUserIds.length || !project) return;

    axios.put('/projects/add-user', {
      projectId: project._id,
      users: selectedUserIds
    })
    .then((res) => {
      const addedUsers = allUsers.filter((u) => selectedUserIds.includes(u._id));
      setProject((prev) => ({
        ...prev,
        users: [...prev.users, ...addedUsers]
      }));
      setAllUsers((prev) => prev.filter((u) => !selectedUserIds.includes(u._id)));
      setSelectedUserIds([]);
      setShowAddModal(false);
    })
    .catch((err) => console.error('Error adding collaborators:', err));
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    const newMsg = {
      id: messages.length + 1,
      type: 'outgoing',
      text: newMessage,
      sender: 'You'
    };
    setMessages([...messages, newMsg]);
    setNewMessage('');
  };

  if (!project) return <div className="p-6 text-red-500">Loading project...</div>;

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="w-full max-w-md bg-white border-r border-gray-200 flex flex-col">
        <div className="flex items-center justify-between p-4 bg-indigo-600 text-white shadow-md">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-white text-indigo-600 text-sm font-semibold rounded-xl shadow hover:bg-gray-100"
          >+ Add Collaborator</button>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 text-sm font-semibold rounded-xl shadow hover:bg-gray-100"
          >
            <span>{project.name}</span>
            <i className="ri-group-line text-lg" />
          </button>
        </div>

        {showDetails ? (
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
            <h3 className="text-xl font-bold text-indigo-700 mb-4">📁 Project Details</h3>
            <div className="mb-4">
              <p className="text-sm text-gray-500">Project Name</p>
              <div className="bg-white border px-4 py-2 rounded-xl shadow-sm">{project.name}</div>
            </div>
            <div>
              <p className="text-sm text-gray-500">Collaborators</p>
              <ul className="space-y-3 mt-2">
                {project.users.map((user, idx) => (
                  <li key={idx} className="flex items-center gap-3 bg-white border px-4 py-2 rounded-xl shadow-sm">
                    <i className="ri-user-line text-lg text-indigo-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{user.name || `User ${idx + 1}`}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                msg.type === 'incoming' ? (
                  <div key={msg.id} className="w-fit max-w-[80%] bg-gray-200 p-3 rounded-lg shadow">
                    <p className="text-sm text-gray-700">{msg.text}</p>
                    <p className="text-xs text-gray-500 mt-1 text-right">{msg.sender}</p>
                  </div>
                ) : (
                  <div key={msg.id} className="ml-auto w-fit max-w-[80%] bg-indigo-100 p-3 rounded-lg shadow text-right">
                    <p className="text-sm text-gray-700">{msg.text}</p>
                    <p className="text-xs text-gray-500 mt-1">{msg.sender}</p>
                  </div>
                )
              ))}
            </div>
            <div className="p-4 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                />
                <button
                  onClick={handleSendMessage}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-sm"
                >Send</button>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="flex justify-center items-center mb-6">
          <h1 className="text-2xl font-bold text-indigo-700 border-b pb-2 w-full text-center">{project.name}</h1>
        </div>
        <p className="text-gray-500 text-sm text-center">This area can be used for tasks, files, notes, and more.</p>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-indigo-700">Add Collaborators</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-red-500">
                <i className="ri-close-line text-2xl" />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleAddCollaborator(); }} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Select Users</label>
                <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-xl p-3 bg-gray-50 space-y-3">
                  {allUsers.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center">No users available.</p>
                  ) : (
                    allUsers.map((user) => (
                      <label key={user._id} className="flex items-center justify-between px-4 py-2 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl shadow-sm">
                        <div className="flex items-center gap-3">
                          <i className="ri-user-line text-indigo-500 text-lg" />
                          <div>
                            <p className="text-sm font-medium text-gray-800">{user.name}</p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          value={user._id}
                          checked={selectedUserIds.includes(user._id)}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setSelectedUserIds((prev) =>
                              checked ? [...prev, user._id] : prev.filter((id) => id !== user._id)
                            );
                          }}
                          className="w-4 h-4 accent-indigo-600"
                        />
                      </label>
                    ))
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200"
                >Cancel</button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700"
                >Add Selected</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectPage;