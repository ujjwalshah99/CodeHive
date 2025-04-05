import React, { useState, useEffect, useRef } from 'react';
import { useUser } from "../context/user.context";
import { useLocation } from 'react-router-dom';
import axios from '../config/axios';
import { initializeSocket, recieveMessage, sendMessage } from "../config/socket";
import Markdown from 'markdown-to-jsx'
import hljs from 'highlight.js';
import 'highlight.js/styles/nord.css'; 
import { getWebContainer } from '../config/webContainer';

function WriteAiMessage({ text }) {
  const containerRef = useRef(null);
  let parsedText;

  try {
    parsedText = JSON.parse(text);
  } catch (error) {
    console.error('Error parsing message:', error);
    parsedText = { text: 'Error: Invalid message format.' };
  }

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollLeft = containerRef.current.scrollWidth;
    }
  }, [parsedText]);

  // Don't display code or fileTree, just show text message
  const displayText = typeof parsedText === 'object' && parsedText.text ? parsedText.text : parsedText;

  return (
    <div className="overflow-auto rounded-lg p-3 md:p-4 shadow-xl border max-w-full md:max-w-2xl mx-auto" ref={containerRef}>
      <p className="text-xs font-semibold mb-2 text-gray-400">AI Assistant</p>

      {/* Display text in yellow box */}
      {displayText && (
        <div className="bg-yellow-200 text-black border border-yellow-400 rounded-lg p-2 mb-2 overflow-x-auto">
          <Markdown
            children={
              typeof displayText === 'string'
                ? displayText
                : JSON.stringify(displayText, null, 2)
            }
          />
        </div>
      )}
    </div>
  );
}

function ProjectPage() {
  const location = useLocation();
  const initialProject = location.state?.project || null;
  const [project, setProject] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const { user } = useUser();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [fileTree, setFileTree] = useState({});
  const [selectedFile, setSelectedFile] = useState("app.js");
  const [fileContent, setFileContent] = useState("");
  const messagesEndRef = useRef(null);
  const highlightedCodeRef = useRef(null);
  const [lineNumbers, setLineNumbers] = useState([]);
  const [highlightedContent, setHighlightedContent] = useState("");
  const [webContainer, setWebContainer] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runOutput, setRunOutput] = useState("");
  const [showFileSidebar, setShowFileSidebar] = useState(true);
  const [showChatSidebar, setShowChatSidebar] = useState(true);

  useEffect(() => {
    if (initialProject) {
      initializeSocket(initialProject._id);

      if(!webContainer) {
        getWebContainer().then(container => {
          setWebContainer(container)
          console.log("container started");
        })
      }

      recieveMessage("project-message", (data) => {
        const ID = `${data?.sender?._id?.toString?.() || "temp"}${Math.random().toString(12)}`;

        // Check if message is from AI and try to parse JSON
        if (data.sender.name === "AI") {
          try {
            const parsedMessage = JSON.parse(data.message);
            
            // If the message contains a fileTree, update the fileTree state
            if (parsedMessage.fileTree) {
              setFileTree(parsedMessage.fileTree);
              webContainer?.mount(parsedMessage.fileTree);
              
              // If the currently selected file exists in the new fileTree, update its content
              if (selectedFile && parsedMessage.fileTree[selectedFile] && parsedMessage.fileTree[selectedFile].file) {
                setFileContent(parsedMessage.fileTree[selectedFile].file.contents);
                updateLineNumbers(parsedMessage.fileTree[selectedFile].file.contents);
                updateHighlightedContent(parsedMessage.fileTree[selectedFile].file.contents);
              }
            }
          } catch (e) {
            console.error('Error parsing AI message:', e);
          }
        }

        const tempMessage = {
          id: ID,
          type: "incoming",
          text: data.message,
          sender: data.sender.name
        };
        setMessages((prev) => [...prev, tempMessage]);
      });

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

  // Auto scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Set initial file content when component mounts or selected file changes
  useEffect(() => {
    if (selectedFile && fileTree[selectedFile] && fileTree[selectedFile].file) {
      const content = fileTree[selectedFile].file.contents;
      setFileContent(content);
      updateLineNumbers(content);
      updateHighlightedContent(content);
    }
  }, [selectedFile, fileTree]);

  // Check viewport size and adjust sidebar visibility
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setShowFileSidebar(false);
        setShowChatSidebar(true); // Show chat by default on mobile
      } else {
        setShowFileSidebar(true);
        setShowChatSidebar(true);
      }
    };

    // Initial check
    handleResize();
    
    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Function to highlight code with highlight.js
  const updateHighlightedContent = (content) => {
    try {
      const language = getLanguageForFile(selectedFile);
      let highlighted = hljs.highlight(content, { language }).value;
      
      // Add additional custom CSS classes for better dark theme visibility
      highlighted = highlighted.replace(/<span class="hljs-/g, '<span class="hljs-dark-theme hljs-');
      
      setHighlightedContent(highlighted);
    } catch (error) {
      console.error('Error highlighting code:', error);
      setHighlightedContent(content);
    }
  };

  // Function to generate line numbers
  const updateLineNumbers = (content) => {
    const lines = content.split('\n').length;
    setLineNumbers(Array.from({ length: lines }, (_, i) => i + 1));
  };

  // Function to determine language based on file extension
  const getLanguageForFile = (filename) => {
    const extension = filename.split('.').pop().toLowerCase();
    const languageMap = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'html': 'html',
      'css': 'css',
      'json': 'json',
      'py': 'python',
      'java': 'java',
      'rb': 'ruby',
      'php': 'php',
      'go': 'go',
      'rust': 'rust',
      'c': 'c',
      'cpp': 'cpp',
      'md': 'markdown'
    };
    return languageMap[extension] || 'plaintext';
  };

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

    sendMessage("project-message", {
      message: newMessage,
      sender: user
    });

    const ID = `${user?._id?.toString?.() || 'temp'}-${Math.random().toString(36)}`;

    const tempMessage = {
      id: ID,
      type: "outgoing",
      text: newMessage,
      sender: user.name
    };

    setMessages((prev) => [...prev, tempMessage]);
    setNewMessage('');
  };

  const handleRunCode = async () => {
    if (!webContainer) {
      setRunOutput("Web container not initialized yet. Please try again later.");
      return;
    }

    setIsRunning(true);
    setRunOutput("Running code...\n");

    try {
      
      webContainer?.mount(fileTree);
      const installProcess = await webContainer.spawn("npm" , ["install"]);

      installProcess.output.pipeTo(new WritableStream({
        write(chunk) {
          console.log(chunk);
        }
      }))

      const runProcess = await webContainer.spawn("npm" , ["start"]);

      runProcess.output.pipeTo(new WritableStream({
        write(chunk) {
          console.log(chunk);
        }
      }))

      setIsRunning(false);

    } catch (error) {
      setRunOutput(`Error starting execution: ${error.message}`);
      setIsRunning(false);
    }
  };

  // Render read-only syntax highlighted code
  const renderSyntaxHighlightedEditor = () => {
    const language = getLanguageForFile(selectedFile);
    
    return (
      <div className="flex-1 overflow-hidden relative">
        {/* Line numbers container */}
        <div className="absolute left-0 top-0 bottom-0 w-10 md:w-12 bg-gray-900 border-r border-gray-700 flex flex-col items-end pt-4 overflow-hidden z-10">
          {lineNumbers.map((num) => (
            <div key={num} className="text-gray-500 text-xs pr-2 h-6 leading-6">{num}</div>
          ))}
        </div>
        
        {/* Visible syntax highlighted code */}
        <pre className="ml-10 md:ml-12 w-full h-full overflow-auto bg-gray-900 p-2 md:p-4 m-0 z-10">
          <code 
            ref={highlightedCodeRef}
            className={`language-${language} font-mono text-sm leading-6`}
            style={{ 
              background: 'transparent',
              color: '#e2e8f0',
              whiteSpace: 'pre',
              display: 'inline-block',
              minWidth: '100%'
            }}
            dangerouslySetInnerHTML={{ __html: highlightedContent }}
          />
        </pre>
      </div>
    );
  };

  if (!project) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="p-6 bg-white rounded-xl shadow-md">
        <div className="flex items-center space-x-3">
          <svg className="animate-spin h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-indigo-600 font-medium">Loading project...</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
      {/* Mobile navigation bar */}
      <div className="md:hidden flex items-center justify-between bg-indigo-700 text-white p-3 shadow-md">
        <button 
          onClick={() => {
            setShowChatSidebar(true);
            setShowFileSidebar(false);
          }}
          className={`px-3 py-1 rounded-lg ${showChatSidebar ? 'bg-indigo-900' : 'bg-indigo-800'}`}>
          <i className="ri-chat-3-line mr-1"></i> Chat
        </button>
        <div className="font-medium truncate mx-2">{project.name}</div>
        <button 
          onClick={() => {
            setShowChatSidebar(false);
            setShowFileSidebar(true);
          }}
          className={`px-3 py-1 rounded-lg ${showFileSidebar ? 'bg-indigo-900' : 'bg-indigo-800'}`}>
          <i className="ri-code-line mr-1"></i> Code
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar - Chat & Collaborator Section */}
        {showChatSidebar && (
          <div className="w-full md:w-1/3 lg:w-1/4 bg-white border-r border-gray-200 flex flex-col md:min-w-[300px] md:max-w-md">
            <div className="flex items-center justify-between p-3 md:p-4 bg-indigo-600 text-white shadow-md">
              <button
                onClick={() => setShowAddModal(true)}
                className="px-3 py-1 md:px-4 md:py-2 bg-white text-indigo-600 text-xs md:text-sm font-semibold rounded-lg shadow hover:bg-gray-100"
              >
                + Add Collaborator
              </button>

              {showDetails ? (
                <button
                  onClick={() => setShowDetails(false)}
                  className="px-3 py-1 md:px-4 md:py-2 bg-white text-red-600 text-xs md:text-sm font-semibold rounded-lg shadow hover:bg-gray-100"
                >
                  ✖ Close
                </button>
              ) : (
                <button
                  onClick={() => setShowDetails(true)}
                  className="flex items-center gap-1 md:gap-2 px-3 py-1 md:px-4 md:py-2 bg-white text-indigo-600 text-xs md:text-sm font-semibold rounded-lg shadow hover:bg-gray-100"
                >
                  <span className="truncate max-w-[100px] md:max-w-[120px]">{project.name}</span>
                  <i className="ri-group-line text-base md:text-lg" />
                </button>
              )}
              
              {/* Mobile only close button */}
              <button 
                className="md:hidden ml-1 text-white"
                onClick={() => setShowChatSidebar(false)}>
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>

            {showDetails ? (
              <div className="flex-1 overflow-y-auto p-3 md:p-4 bg-gray-50">
                <h3 className="text-lg md:text-xl font-bold text-indigo-700 mb-3 md:mb-4">📁 Project Details</h3>
                <div className="mb-3 md:mb-4">
                  <p className="text-xs md:text-sm text-gray-500">Project Name</p>
                  <div className="bg-white border px-3 py-2 md:px-4 md:py-2 rounded-xl shadow-sm">{project.name}</div>
                </div>
                <div>
                  <p className="text-xs md:text-sm text-gray-500">Collaborators</p>
                  <ul className="space-y-2 md:space-y-3 mt-2">
                    {project.users.map((user, idx) => (
                      <li key={idx} className="flex items-center gap-2 md:gap-3 bg-white border px-3 py-2 md:px-4 md:py-2 rounded-xl shadow-sm">
                        <i className="ri-user-line text-base md:text-lg text-indigo-600" />
                        <div>
                          <p className="text-xs md:text-sm font-medium text-gray-800">{user.name || `User ${idx + 1}`}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4">
                  {messages.map((msg) =>
                    msg.sender === "AI" ? (
                      <WriteAiMessage key={msg.id} text={msg.text} />
                    ) : msg.type === "incoming" ? (
                      <div key={msg.id} className="w-fit max-w-[80%] bg-gray-200 p-2 md:p-3 rounded-lg shadow">
                        <p className="text-xs text-gray-500 mb-1">{msg.sender}</p>
                        <p className="text-xs md:text-sm text-gray-700">{msg.text}</p>
                      </div>
                    ) : (
                      <div key={msg.id} className="ml-auto w-fit max-w-[80%] bg-indigo-100 p-2 md:p-3 rounded-lg shadow text-right">
                        <p className="text-xs text-gray-500 mb-1">{msg.sender}</p>
                        <p className="text-xs md:text-sm text-gray-700">{msg.text}</p>
                      </div>
                    )
                  )}
                  <div ref={messagesEndRef} />
                </div>
                <div className="p-3 md:p-4 border-t border-gray-200">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Type your message..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-xs md:text-sm"
                    />
                    <button
                      onClick={handleSendMessage}
                      className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-xs md:text-sm"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Right section of the page - Code Editor Area */}
        {showFileSidebar && (
          <div className="flex-1 flex flex-col h-full md:flex-row overflow-hidden">
            {/* File list sidebar */}
            <div className="w-full md:w-56 lg:w-64 bg-gray-900 text-white border-r border-gray-700 flex flex-col overflow-hidden">
              <div className="p-3 md:p-4 border-b border-gray-700 flex justify-between items-center">
                <h2 className="text-base md:text-lg font-semibold truncate">Project Files</h2>
                {/* Mobile only close button */}
                <button 
                  className="md:hidden text-gray-400 hover:text-white"
                  onClick={() => setShowFileSidebar(false)}>
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <ul className="py-1 md:py-2">
                  <li key="projectName" className="w-full text-left px-3 py-2 md:px-4 md:py-3 bg-gray-900 text-white flex items-center gap-2">
                    <i className="ri-folder-2-line text-gray-400"></i>
                    <span className="text-xs md:text-sm truncate">{project.name}</span>
                  </li>
                  {Object.keys(fileTree).map((fileName) => (
                    <li key={fileName}>
                      <button
                        onClick={() => setSelectedFile(fileName)}
                        className={`w-full text-left px-3 py-2 md:px-4 md:py-3 hover:bg-gray-800 flex items-center gap-2 transition-colors duration-150 ${
                          selectedFile === fileName ? 'bg-gray-800 border-l-4 border-indigo-400' : ''
                        }`}
                      >
                        <i className={`${fileName.endsWith('.json') ? 'ri-file-list-line' : 'ri-file-code-line'} text-gray-400`}></i>
                        <span className="text-xs md:text-sm truncate">{fileName}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* File content editor */}
            <div className="flex-1 flex flex-col bg-gray-900 overflow-hidden">
              <div className="bg-gray-900 text-gray-300 px-3 py-2 md:px-4 md:py-3 text-xs md:text-sm font-mono border-b border-gray-700 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <i className={`${selectedFile.endsWith('.json') ? 'ri-file-list-line' : 'ri-file-code-line'} text-gray-400`}></i>
                  <span>{selectedFile}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-xs text-gray-500 hidden sm:block">
                    {fileContent.split('\n').length} lines | {getLanguageForFile(selectedFile)}
                  </div>
                  <button
                    onClick={handleRunCode}
                    disabled={isRunning}
                    className={`px-3 py-1 md:px-4 md:py-2 rounded-lg text-xs font-medium flex items-center gap-1 ${
                      isRunning 
                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {isRunning ? (
                      <>
                        <svg className="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Running...
                      </>
                    ) : (
                      <>
                        <i className="ri-play-circle-line"></i>
                        Run
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              {/* Code editor content */}
              <div className="flex flex-col flex-1 overflow-hidden">
                {renderSyntaxHighlightedEditor()}
                
                {/* Output console */}
                {runOutput && (
                  <div className="bg-black text-green-400 border-t border-gray-700 p-3 h-1/3 overflow-auto font-mono text-xs">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white text-xs font-semibold">Console Output</span>
                      <button 
                        onClick={() => setRunOutput("")}
                        className="text-gray-500 hover:text-white text-xs"
                      >
                        Clear
                      </button>
                    </div>
                    <pre>{runOutput}</pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-4 md:p-6 border border-gray-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl md:text-2xl font-semibold text-indigo-700">Add Collaborators</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-red-500">
                <i className="ri-close-line text-2xl" />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleAddCollaborator(); }} className="space-y-4 md:space-y-6">
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-600 mb-2">Select Users</label>
                <div className="max-h-60 md:max-h-64 overflow-y-auto border border-gray-300 rounded-xl p-2 md:p-3 bg-gray-50 space-y-2 md:space-y-3">
                  {allUsers.length === 0 ? (
                    <p className="text-gray-400 text-xs md:text-sm text-center">No users available.</p>
                  ) : (
                    allUsers.map((user) => (
                      <label key={user._id} className="flex items-center justify-between px-3 py-2 md:px-4 md:py-2 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl shadow-sm">
                        <div className="flex items-center gap-2 md:gap-3">
                          <i className="ri-user-line text-indigo-500 text-base md:text-lg" />
                          <div>
                            <p className="text-xs md:text-sm font-medium text-gray-800">{user.name}</p>
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
              <div className="flex justify-end gap-3 md:gap-4 pt-3 md:pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1 md:px-4 md:py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 text-xs md:text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1 md:px-6 md:py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 text-xs md:text-sm"
                  disabled={!selectedUserIds.length}
                >
                  Add Selected
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectPage;