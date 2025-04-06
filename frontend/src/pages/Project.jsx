import React, { useState, useEffect, useRef } from 'react';
import { useUser } from "../context/user.context";
import { useLocation } from 'react-router-dom';
import axios from '../config/axios';
import { initializeSocket, recieveMessage, sendMessage } from "../config/socket";
import Markdown from 'markdown-to-jsx';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { dracula } from '@uiw/codemirror-theme-dracula';
import { getWebContainer } from '../config/webContainer';

function WriteAiMessage({ text }) {
  const containerRef = useRef(null);
  const [parsedText, setParsedText] = useState({ text: '' });
  
  useEffect(() => {
    try {
      // Handle different formats of AI messages
      if (typeof text === 'string') {
        try {
          const parsed = JSON.parse(text);
          setParsedText(parsed);
        } catch (error) {
          // If not valid JSON, just use as text
          setParsedText({ text: text });
        }
      } else {
        setParsedText(text);
      }
    } catch (error) {
      console.error('Error parsing message:', error);
      setParsedText({ text: 'Error: Invalid message format.' });
    }
  }, [text]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollLeft = containerRef.current.scrollWidth;
    }
  }, [parsedText]);

  // Don't display code or fileTree, just show text message
  const displayText = typeof parsedText === 'object' && parsedText.text ? parsedText.text : parsedText;

  return (
    <div className="overflow-auto rounded-lg p-3 md:p-4 shadow-xl border max-w-full md:max-w-2xl mx-auto" ref={containerRef}>
      <p className="text-xs font-semibold mb-2 text-gray-500">AI Assistant</p>

      {/* Display text in yellow box */}
      {displayText && (
        <div className="bg-yellow-100 text-black border border-yellow-300 rounded-lg p-3 mb-2 overflow-x-auto">
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
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [selectedRemoveUserIds, setSelectedRemoveUserIds] = useState([]);
  const { user } = useUser();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [fileTree, setFileTree] = useState({});
  const [selectedFile, setSelectedFile] = useState("app.js");
  const [fileContent, setFileContent] = useState("");
  const messagesEndRef = useRef(null);
  const [webContainer, setWebContainer] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runOutput, setRunOutput] = useState("");
  const [showFileSidebar, setShowFileSidebar] = useState(true);
  const [showChatSidebar, setShowChatSidebar] = useState(true);
  const [iframeUrl, setIframeUrl] = useState(null);
  const [routing, setRouting] = useState('/');
  const editorRef = useRef(null);
  const [isSaved, setIsSaved] = useState(false);
  
  // Store reference to current running processes
  const activeProcessRef = useRef(null);

  const resetPreview = () => {
    setRouting('/');
    setIframeUrl(null);
  };
  
  // Debounce function for autosave
  const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    
    useEffect(() => {
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);
      
      return () => {
        clearTimeout(handler);
      };
    }, [value, delay]);
    
    return debouncedValue;
  };
  
  // Debounced file content for autosave
  const debouncedFileContent = useDebounce(fileContent, 1000);

  // Kill any active process
  const killActiveProcess = async () => {
    if (activeProcessRef.current) {
      try {
        setRunOutput(prev => prev + "\nStopping previous process...\n");
        // Ensure we properly kill the process and wait for it to complete
        await activeProcessRef.current.kill();
        // Important: Clear the reference after killing
        activeProcessRef.current = null;
        setIsRunning(false); // Make sure to set running state to false
        setRunOutput(prev => prev + "Previous process terminated successfully.\n");
        return true;
      } catch (error) {
        console.error("Error killing process:", error);
        setRunOutput(prev => prev + `Error stopping process: ${error.message}\n`);
        // Reset state even on error to allow rerunning
        activeProcessRef.current = null;
        setIsRunning(false);
        return false;
      }
    }
    return true;
  };

  const handleStopCode = async () => {
    await killActiveProcess();
    // Clear the iframe URL to remove the preview
    setIframeUrl(null);
    setRunOutput(prev => prev + "Process stopped and preview cleared.\n");
  };

  // Process and validate fileTree
  const processFileTree = (rawFileTree) => {
    const processedTree = { ...rawFileTree };
    
    // Make sure package.json is valid JSON if it exists
    if (processedTree["package.json"] && processedTree["package.json"].file) {
      try {
        // Try to parse as JSON to validate
        JSON.parse(processedTree["package.json"].file.contents);
      } catch (e) {
        // If it's not valid JSON, create a basic valid package.json
        console.warn("Invalid package.json detected, creating a default one");
        processedTree["package.json"].file.contents = JSON.stringify({
          "name": "web-project",
          "version": "1.0.0",
          "description": "Web project",
          "main": "app.js",
          "scripts": {
            "start": "node app.js",
            "test": "echo \"Error: no test specified\" && exit 1"
          },
          "dependencies": {
            "express": "^4.18.2"
          }
        }, null, 2);
      }
    } else {
      // If package.json doesn't exist, create it
      processedTree["package.json"] = {
        file: {
          contents: JSON.stringify({
            "name": "web-project",
            "version": "1.0.0",
            "description": "Web project",
            "main": "app.js",
            "scripts": {
              "start": "node app.js",
              "test": "echo \"Error: no test specified\" && exit 1"
            },
            "dependencies": {
              "express": "^4.18.2"
            }
          }, null, 2)
        }
      };
    }
    
    return processedTree;
  };

  useEffect(() => {
    if (initialProject) {
      initializeSocket(initialProject._id);

      // Initialize WebContainer only once
      if (!webContainer) {
        getWebContainer().then(container => {
          setWebContainer(container);
          console.log("Web container started");
        }).catch(error => {
          console.error("Failed to start web container:", error);
          setRunOutput("Failed to initialize web container: " + error.message);
        });
      }

      recieveMessage("project-message", (data) => {
        const ID = `${data?.sender?._id?.toString?.() || "temp"}${Math.random().toString(12)}`;

        // Check if message is from AI and try to parse JSON
        if (data.sender.name === "AI") {
          try {
            let parsedMessage;
            if (typeof data.message === 'string') {
              parsedMessage = JSON.parse(data.message);
            } else {
              parsedMessage = data.message;
            }
            
            // If the message contains a fileTree, update the fileTree state
            if (parsedMessage.fileTree) {
              const validatedFileTree = processFileTree(parsedMessage.fileTree);
              setFileTree(validatedFileTree);
              
              // Kill any running process before mounting new files
              killActiveProcess().then(() => {
                // Mount files to webContainer when available
                if (webContainer) {
                  console.log("Mounting file tree:", validatedFileTree);
                  webContainer.mount(validatedFileTree).catch(err => {
                    console.error("Error mounting file tree:", err);
                    setRunOutput(prev => prev + `\nError mounting files: ${err.message}\n`);
                  });
                }
              });
              
              // If the currently selected file exists in the new fileTree, update its content
              if (selectedFile && validatedFileTree[selectedFile] && validatedFileTree[selectedFile].file) {
                setFileContent(validatedFileTree[selectedFile].file.contents);
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

      // Fetch project data and users
      fetchProjectData(initialProject._id);
    }
    
    // Cleanup function to kill any active processes on unmount
    return () => {
      killActiveProcess();
    };
  }, [initialProject]);
  
  // Function to fetch project data
  const fetchProjectData = (projectId) => {
    axios.get(`/projects/get-project/${projectId}`)
      .then((res) => {
        const projectData = res.data.project;
        setProject(projectData);

        // Fetch all users who are not already collaborators
        axios.get('/users/all')
          .then((userRes) => {
            const filteredUsers = userRes.data.users.filter(
              (user) => !projectData.users.some((u) => u._id === user._id)
            );
            setAllUsers(filteredUsers);
          })
          .catch(err => console.error('Error fetching users:', err));
      })
      .catch((err) => console.error('Error fetching project data:', err));
  };

  // Auto-save file content when it changes
  useEffect(() => {
    if (debouncedFileContent && selectedFile && fileTree[selectedFile]) {
      // Update local fileTree
      const updatedFileTree = { ...fileTree };
      if (updatedFileTree[selectedFile].file) {
        updatedFileTree[selectedFile].file.contents = debouncedFileContent;
        setFileTree(updatedFileTree);
        
        console.log(`Auto-saving changes to ${selectedFile}`);
      }
    }
  }, [debouncedFileContent, selectedFile]);

  // Auto scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Set initial file content when component mounts or selected file changes
  // Set initial file content when component mounts or selected file changes
  useEffect(() => {
    if (selectedFile && fileTree) {
      console.log(`Loading file: ${selectedFile}`, fileTree);
      
      if (fileTree[selectedFile]) {
        // Check if it's a file (not a directory)
        if (fileTree[selectedFile].file) {
          console.log(`Loading content for ${selectedFile}:`, fileTree[selectedFile].file.contents);
          console.log(fileTree);
          setFileContent(fileTree[selectedFile].file.contents || "");
        } else {
          // It's a directory, not a file
          console.log(`${selectedFile} is a directory, not a file`);
          setFileContent("");
        }
      } else {
        console.warn(`File ${selectedFile} doesn't exist in the file tree`, fileTree);
        setFileContent("");
      }
    }
  }, [selectedFile, fileTree]);
  
  // Add a proper file selection handler function
  const handleFileSelect = (fileName) => {
    // Save current file before switching
    if (selectedFile && fileTree[selectedFile] && fileTree[selectedFile].file) {
      const updatedFileTree = { ...fileTree };
      updatedFileTree[selectedFile].file.contents = fileContent;
      setFileTree(updatedFileTree);
    }
    
    // Set the new selected file
    setSelectedFile(fileName);
    setFileContent(fileTree[fileName] || '');
  };

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

  // Function to determine language extension for CodeMirror
  const getLanguageExtension = (filename) => {
    // Only use JavaScript for now
    return javascript();
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
  
  const handleRemoveCollaborator = () => {
    if (!selectedRemoveUserIds.length || !project) return;
    
    axios.put('/projects/remove-user', {
      projectId: project._id,
      users: selectedRemoveUserIds
    })
      .then((res) => {
        const removedUsers = project.users.filter((u) => selectedRemoveUserIds.includes(u._id));
        setProject((prev) => ({
          ...prev,
          users: prev.users.filter((u) => !selectedRemoveUserIds.includes(u._id))
        }));
        setAllUsers((prev) => [...prev, ...removedUsers]);
        setSelectedRemoveUserIds([]);
        setShowRemoveModal(false);
      })
      .catch((err) => console.error('Error removing collaborators:', err));
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

    resetPreview();
    if (!webContainer) {
      setRunOutput("Web container not initialized yet. Please try again later.");
      return;
    }
  
    // Kill any existing process before starting a new one
    const killSuccess = await killActiveProcess();
    if (!killSuccess) return;
  
    setIsRunning(true);
    setRunOutput("Running code...\n");
    setIframeUrl(null); // Reset iframe URL
  
    try {
      // Make sure fileTree is up to date with latest editor changes
      const updatedFileTree = { ...fileTree };
      if (updatedFileTree[selectedFile] && updatedFileTree[selectedFile].file) {
        updatedFileTree[selectedFile].file.contents = fileContent;
      }
      
      // Ensure package.json exists and is valid
      if (!updatedFileTree["package.json"] || !updatedFileTree["package.json"].file) {
        updatedFileTree["package.json"] = {
          file: {
            contents: JSON.stringify({
              "name": "web-project",
              "version": "1.0.0",
              "description": "Web project",
              "main": "app.js",
              "scripts": {
                "start": "node app.js",
                "test": "echo \"Error: no test specified\" && exit 1"
              },
              "dependencies": {
                "express": "^4.18.2"
              }
            }, null, 2)
          }
        };
      } else {
        try {
          // Validate package.json is proper JSON
          const packageContent = updatedFileTree["package.json"].file.contents;
          JSON.parse(packageContent);
        } catch (e) {
          setRunOutput(prev => prev + `\nError: package.json is not valid JSON. Creating default package.json...\n`);
          updatedFileTree["package.json"].file.contents = JSON.stringify({
            "name": "web-project",
            "version": "1.0.0",
            "description": "Web project",
            "main": "app.js",
            "scripts": {
              "start": "node app.js",
              "test": "echo \"Error: no test specified\" && exit 1"
            },
            "dependencies": {
              "express": "^4.18.2"
            }
          }, null, 2);
        }
      }
      
      // Ensure app.js exists
      if (!updatedFileTree["app.js"] || !updatedFileTree["app.js"].file) {
        updatedFileTree["app.js"] = {
          file: {
            contents: `const express = require('express');
  const app = express();
  const port = 3111;
  
  app.use(express.static('public'));
  app.use(express.json());
  
  app.get('/', (req, res) => {
    res.send('<h1>Welcome to the Web Project</h1>');
  });
  
  app.listen(port, () => {
    console.log(\`Server running at http://localhost:\${port}\`);
  });`
          }
        };
      }
      
      // Log out fileTree for debugging
      console.log("Mounting file tree before run:", updatedFileTree);
      setRunOutput(prev => prev + `Preparing files for execution...\n`);
      
      // Mount the files to the web container
      await webContainer.mount(updatedFileTree);
      setFileTree(updatedFileTree); // Update the file tree state
      
      // Install dependencies
      setRunOutput(prev => prev + "Installing dependencies...\n");
      const installProcess = await webContainer.spawn("npm", ["install"]);
      activeProcessRef.current = installProcess;
      
      installProcess.output.pipeTo(new WritableStream({
        write(chunk) {
          setRunOutput(prev => prev + chunk);
        }
      }));
      
      // Wait for the install process to complete before continuing
      const installExitCode = await installProcess.exit;
      
      if (installExitCode !== 0) {
        setRunOutput(prev => prev + `\nInstallation failed with exit code ${installExitCode}\n`);
        setIsRunning(false);
        return;
      }
      
      // Start the application
      setRunOutput(prev => prev + "\nStarting application...\n");
      const startProcess = await webContainer.spawn("node", ["app.js"]);
      activeProcessRef.current = startProcess;
      
      startProcess.output.pipeTo(new WritableStream({
        write(chunk) {
          setRunOutput(prev => prev + chunk);
        }
      }));
      
      // Listen for server ready event (this is handled by WebContainer)
      webContainer.on("server-ready", (port, url) => {
        setIframeUrl(url);
        setRunOutput(prev => prev + `\nServer running at: ${url}\n`);
        console.log("Server ready:", port, url);
      });
      
    } catch (error) {
      setRunOutput(prev => prev + `\nError: ${error.message}\n`);
      console.error("Runtime error:", error);
      setIsRunning(false);
      activeProcessRef.current = null; // Clear reference on error
    }
  };

  // Add this function to save the file tree to the database
  const saveFileTree = async () => {
    if (!project || !fileTree) {
      console.error("Cannot save: Project or fileTree is missing");
      return;
    }
    
    try {
      // First, ensure the current file content is saved to the fileTree
      const updatedFileTree = { ...fileTree };
      if (selectedFile && updatedFileTree[selectedFile] && updatedFileTree[selectedFile].file) {
        updatedFileTree[selectedFile].file.contents = fileContent;
      }
      
      // Send the fileTree to the server
      const response = await axios.put('/projects/update-file-tree', {
        projectId: project._id,
        fileTree: updatedFileTree
      });
      
      if (response.data.success) {
        console.log("File tree saved successfully");
        
        // You could show a success notification here
        // For example, add a temporary state to show a "Saved!" message
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
      } else {
        console.error("Failed to save file tree:", response.data.message);
      }
    } catch (error) {
      console.error("Error saving file tree:", error);
    }
  };
  
  // Handle code changes
  const handleCodeChange = (value) => {
    setFileContent(value);
    
    // Update the file in fileTree immediately for navigation between files
    if (selectedFile && fileTree[selectedFile] && fileTree[selectedFile].file) {
      const updatedFileTree = { ...fileTree };
      updatedFileTree[selectedFile].file.contents = value;
      setFileTree(updatedFileTree);
    }
  };
  
  // Handle route change for iframe preview
  const handleRouteChange = (e) => {
    e.preventDefault();
    if (!iframeUrl) {
      setRunOutput(prev => prev + "\nNo preview available. Run the application first.\n");
      return;
    }
    
    try {
      // Parse the current URL to get the origin
      const url = new URL(iframeUrl);
      const origin = url.origin;
      
      // Create a new URL with the provided route path
      // Ensure the path starts with a slash
      const path = routing.startsWith('/') ? routing : `/${routing}`;
      const newUrl = `${origin}${path}`;
      
      console.log(`Changing route from ${iframeUrl} to ${newUrl}`);
      setRunOutput(prev => prev + `\nNavigating to ${newUrl}\n`);
      setIframeUrl(newUrl);
    } catch (error) {
      console.error("Error changing route:", error);
      setRunOutput(prev => prev + `\nError changing route: ${error.message}\n`);
    }
  };

  if (!project) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
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
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* Mobile navigation bar */}
      <div className="md:hidden flex items-center justify-between bg-indigo-700 text-white p-3 shadow-md">
        <button 
          onClick={() => {
            setShowChatSidebar(true);
            setShowFileSidebar(false);
          }}
          className={`px-3 py-1 rounded-lg ${showChatSidebar ? 'bg-indigo-900' : 'bg-indigo-800'} transition-colors`}>
          <i className="ri-chat-3-line mr-1"></i> Chat
        </button>
        <div className="font-medium truncate mx-2">{project.name}</div>
        <button 
          onClick={() => {
            setShowChatSidebar(false);
            setShowFileSidebar(true);
          }}
          className={`px-3 py-1 rounded-lg ${showFileSidebar ? 'bg-indigo-900' : 'bg-indigo-800'} transition-colors`}>
          <i className="ri-code-line mr-1"></i> Code
        </button>
      </div>
  
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar - Chat & Collaborator Section */}
        {showChatSidebar && (
          <div className="w-full md:w-1/3 lg:w-1/4 bg-white border-r border-gray-200 flex flex-col md:min-w-[320px] md:max-w-md shadow-md">
            <div className="flex items-center justify-between p-3 md:p-4 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md">
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-3 py-1 md:px-4 md:py-2 bg-white text-indigo-600 text-xs md:text-sm font-semibold rounded-lg shadow hover:bg-gray-50 transition-colors"
                >
                  <i className="ri-user-add-line mr-1"></i> Add
                </button>
                <button
                  onClick={() => setShowRemoveModal(true)}
                  className="px-3 py-1 md:px-4 md:py-2 bg-white text-red-600 text-xs md:text-sm font-semibold rounded-lg shadow hover:bg-gray-50 transition-colors"
                >
                  <i className="ri-user-unfollow-line mr-1"></i> Remove
                </button>
              </div>
  
              {showDetails ? (
                <button
                  onClick={() => setShowDetails(false)}
                  className="px-3 py-1 md:px-4 md:py-2 bg-white text-red-600 text-xs md:text-sm font-semibold rounded-lg shadow hover:bg-gray-50 transition-colors"
                >
                  <i className="ri-close-line mr-1"></i> Close
                </button>
              ) : (
                <button
                  onClick={() => setShowDetails(true)}
                  className="flex items-center gap-1 md:gap-2 px-3 py-1 md:px-4 md:py-2 bg-white text-indigo-600 text-xs md:text-sm font-semibold rounded-lg shadow hover:bg-gray-50 transition-colors"
                >
                  <span className="truncate max-w-[100px] md:max-w-[120px]">{project.name}</span>
                  <i className="ri-group-line text-base md:text-lg" />
                </button>
              )}
              
              {/* Mobile only close button */}
              <button 
                className="md:hidden ml-1 text-white hover:text-gray-200 transition-colors"
                onClick={() => setShowChatSidebar(false)}>
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
  
            {showDetails ? (
              <div className="flex-1 overflow-y-auto p-4 md:p-5 bg-gray-50">
                <h3 className="text-lg md:text-xl font-bold text-indigo-700 mb-4 flex items-center gap-2">
                  <i className="ri-folder-info-line"></i> Project Details
                </h3>
                <div className="mb-4 md:mb-5">
                  <p className="text-xs md:text-sm text-gray-500 mb-1 font-medium">Project Name</p>
                  <div className="bg-white border px-4 py-3 rounded-lg shadow-sm">{project.name}</div>
                </div>
                <div>
                  <p className="text-xs md:text-sm text-gray-500 mb-2 font-medium flex items-center gap-1">
                    <i className="ri-team-line"></i> Collaborators ({project.users.length})
                  </p>
                  <ul className="space-y-3 mt-2">
                    {project.users.map((user, idx) => (
                      <li key={idx} className="flex items-center gap-3 bg-white border px-4 py-3 rounded-lg shadow-sm hover:shadow transition-shadow">
                        <div className="bg-indigo-100 text-indigo-700 p-2 rounded-full">
                          <i className="ri-user-line text-base md:text-lg" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800">{user.name || `User ${idx + 1}`}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                        {user._id === project.owner && (
                          <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full">Owner</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4 md:space-y-5 bg-gray-50">
                  {messages.map((msg) =>
                    msg.sender === "AI" ? (
                      <WriteAiMessage key={msg.id} text={msg.text} />
                    ) : msg.type === "incoming" ? (
                      <div key={msg.id} className="w-fit max-w-[85%] bg-white p-3 md:p-4 rounded-lg shadow-sm border-l-4 border-gray-300">
                        <p className="text-xs text-gray-500 mb-1 font-medium">{msg.sender}</p>
                        <p className="text-sm text-gray-700">{msg.text}</p>
                      </div>
                    ) : (
                      <div key={msg.id} className="ml-auto w-fit max-w-[85%] bg-indigo-50 p-3 md:p-4 rounded-lg shadow-sm text-right border-r-4 border-indigo-300">
                        <p className="text-xs text-gray-500 mb-1 font-medium">{msg.sender}</p>
                        <p className="text-sm text-gray-700">{msg.text}</p>
                      </div>
                    )
                  )}
                  <div ref={messagesEndRef} />
                </div>
                <div className="p-3 md:p-4 border-t border-gray-200 bg-white">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Type your message..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm transition-shadow"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim()}
                      className={`px-4 py-2 rounded-lg text-white text-sm flex items-center gap-1 ${
                        !newMessage.trim() ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
                      } transition-colors`}
                    >
                      <i className="ri-send-plane-fill"></i>
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
            <div className="w-full md:w-56 lg:w-64 bg-gray-800 text-white border-r border-gray-700 flex flex-col overflow-hidden">
              <div className="p-3 md:p-4 border-b border-gray-700 flex justify-between items-center">
                <h3 className="font-semibold text-sm">Files</h3>
                <button 
                  className="md:hidden text-gray-400 hover:text-white transition-colors"
                  onClick={() => setShowFileSidebar(false)}>
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                <ul className="space-y-1">
                  {Object.keys(fileTree).map((fileName) => (
                    <li 
                      key={fileName}
                      className={`px-3 py-2 rounded-lg text-sm cursor-pointer ${
                        selectedFile === fileName ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700/50'
                      }`}
                      onClick={() => handleFileSelect(fileName)}
                    >
                      <i className={`ri-file-code-line mr-2 ${
                        fileName.endsWith('.js') ? 'text-yellow-400' : 
                        fileName.endsWith('.json') ? 'text-blue-400' :
                        fileName.endsWith('.html') ? 'text-orange-400' :
                        fileName.endsWith('.css') ? 'text-purple-400' : 'text-gray-400'
                      }`}></i>
                      {fileName}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            {/* Code editor area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Editor toolbar - modified to include Save button */}
              <div className="bg-gray-100 p-2 border-b flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-sm font-medium px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg mr-2">
                    {selectedFile}
                  </span>
                  {isSaved && (
                    <span className="text-xs text-green-600 font-medium animate-fade-out">
                      <i className="ri-check-line mr-1"></i>Saved!
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={saveFileTree}
                    className="px-3 py-1 text-sm rounded-lg flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <i className="ri-save-line"></i> Save
                  </button>
                  <button 
                    onClick={handleRunCode}
                    disabled={isRunning}
                    className={`px-3 py-1 text-sm rounded-lg flex items-center gap-1 ${
                      isRunning ? 'bg-gray-400 cursor-wait' : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}>
                    {isRunning ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Running...
                      </>
                    ) : (
                      <>
                        <i className="ri-play-line"></i> Run
                      </>
                    )}
                  </button>
                  <button 
                    onClick={handleStopCode}
                    disabled={!isRunning}
                    className={`px-3 py-1 text-sm rounded-lg flex items-center gap-1 ${
                      !isRunning ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}>
                    <i className="ri-stop-line"></i> Stop
                  </button>
                </div>
              </div>
              
              {/* Code editor */}
              <div className="flex-1 overflow-hidden">
                <div className="h-full overflow-auto">
                  <CodeMirror
                    ref={editorRef}
                    value={fileContent}
                    height="100%"
                    theme={dracula}
                    onChange={handleCodeChange}
                    extensions={[getLanguageExtension(selectedFile)]}
                    basicSetup={{
                      lineNumbers: true,
                      highlightActiveLineGutter: true,
                      highlightSpecialChars: true,
                      foldGutter: true,
                      dropCursor: true,
                      allowMultipleSelections: true,
                      indentOnInput: true,
                      syntaxHighlighting: true,
                      bracketMatching: true,
                      closeBrackets: true,
                      autocompletion: true,
                      rectangularSelection: true,
                      crosshairCursor: true,
                      highlightActiveLine: true,
                      highlightSelectionMatches: true,
                      closeBracketsKeymap: true,
                      defaultKeymap: true,
                      searchKeymap: true,
                      historyKeymap: true,
                      foldKeymap: true,
                      completionKeymap: true,
                      lintKeymap: true
                    }}
                  />
                </div>
              </div>
              
              {/* Output and Preview Area */}
              <div className="h-1/3 flex flex-col overflow-hidden bg-gray-900 text-white border-t border-gray-700">
                <div className="flex items-center justify-between p-2 bg-gray-800 border-b border-gray-700">
                  <div className="flex items-center space-x-2">
                    <button 
                      className={`px-3 py-1 text-xs rounded-lg ${!iframeUrl ? 'bg-gray-700 text-gray-300' : 'bg-blue-600 text-white'}`}
                      disabled={!iframeUrl}
                    >
                      <i className="ri-terminal-line mr-1"></i> Output
                    </button>
                    {iframeUrl && (
                      <div className="flex items-center">
                        <form onSubmit={handleRouteChange} className="flex items-center">
                          <input
                            type="text"
                            value={routing}
                            onChange={(e) => setRouting(e.target.value)}
                            placeholder="URL path"
                            className="ml-2 px-2 py-1 text-xs bg-gray-700 text-white rounded-l-lg border border-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <button 
                            type="submit"
                            className="px-2 py-1 text-xs bg-blue-600 text-white rounded-r-lg border border-blue-700 hover:bg-blue-700"
                          >
                            Go
                          </button>
                        </form>
                        <button
                          onClick={() => {
                            if (iframeUrl) {
                              // Navigate to home route
                              setRouting('/');
                              try {
                                const url = new URL(iframeUrl);
                                setIframeUrl(`${url.origin}/`);
                              } catch (error) {
                                console.error("Error navigating to home:", error);
                              }
                            }
                          }}
                          className="ml-2 px-2 py-1 text-xs bg-gray-700 text-white rounded-lg border border-gray-600 hover:bg-gray-600"
                        >
                          <i className="ri-home-line mr-1"></i>
                        </button>
                        <button
                          onClick={() => {
                            if (iframeUrl) {
                              // Refresh current route
                              try {
                                const url = new URL(iframeUrl);
                                setIframeUrl(`${url.origin}${url.pathname}`);
                              } catch (error) {
                                console.error("Error refreshing:", error);
                              }
                            }
                          }}
                          className="ml-2 px-2 py-1 text-xs bg-gray-700 text-white rounded-lg border border-gray-600 hover:bg-gray-600"
                        >
                          <i className="ri-refresh-line mr-1"></i>
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {isRunning ? (
                      <button 
                        onClick={handleStopCode}
                        className="px-3 py-1 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        <i className="ri-stop-line mr-1"></i> Stop
                      </button>
                    ) : (
                      <button 
                        onClick={handleRunCode}
                        className="px-3 py-1 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        <i className="ri-play-line mr-1"></i> Run
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="flex-1 flex overflow-hidden">
                  {/* Console Output */}
                  <div className="flex-1 p-2 font-mono text-xs overflow-auto whitespace-pre-wrap">
                    {runOutput}
                  </div>
                  
                  {/* Preview iframe */}
                  {iframeUrl && (
                    <div className="flex-1 border-l border-gray-700 bg-white">
                      <iframe 
                        src={iframeUrl} 
                        className="w-full h-full"
                        title="Project Preview"
                        sandbox="allow-forms allow-modals allow-pointer-lock allow-popups allow-same-origin allow-scripts allow-top-navigation"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
  
        {/* Modal for adding collaborators */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800">Add Collaborators</h3>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
              
              <div className="max-h-64 overflow-y-auto mb-4">
                {allUsers.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No available users to add</p>
                ) : (
                  <ul className="space-y-2">
                    {allUsers.map((user) => (
                      <li key={user._id} className="flex items-center p-2 hover:bg-gray-50 rounded-lg">
                        <input
                          type="checkbox"
                          id={`add-user-${user._id}`}
                          checked={selectedUserIds.includes(user._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUserIds([...selectedUserIds, user._id]);
                            } else {
                              setSelectedUserIds(selectedUserIds.filter(id => id !== user._id));
                            }
                          }}
                          className="mr-3 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <label htmlFor={`add-user-${user._id}`} className="flex-1 cursor-pointer">
                          <p className="text-sm font-medium text-gray-700">{user.name}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCollaborator}
                  disabled={selectedUserIds.length === 0}
                  className={`px-4 py-2 text-sm text-white rounded-lg ${
                    selectedUserIds.length === 0
                      ? 'bg-indigo-400 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  Add Selected
                </button>
              </div>
            </div>
          </div>
        )}
  
        {/* Modal for removing collaborators */}
        {showRemoveModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800">Remove Collaborators</h3>
                <button 
                  onClick={() => setShowRemoveModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
              
              <div className="max-h-64 overflow-y-auto mb-4">
                {project.users.length <= 1 ? (
                  <p className="text-gray-500 text-center py-4">No collaborators to remove</p>
                ) : (
                  <ul className="space-y-2">
                    {project.users.map((user) => (
                      user._id !== project.owner && (
                        <li key={user._id} className="flex items-center p-2 hover:bg-gray-50 rounded-lg">
                          <input
                            type="checkbox"
                            id={`remove-user-${user._id}`}
                            checked={selectedRemoveUserIds.includes(user._id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedRemoveUserIds([...selectedRemoveUserIds, user._id]);
                              } else {
                                setSelectedRemoveUserIds(selectedRemoveUserIds.filter(id => id !== user._id));
                              }
                            }}
                            className="mr-3 rounded text-red-600 focus:ring-red-500"
                          />
                          <label htmlFor={`remove-user-${user._id}`} className="flex-1 cursor-pointer">
                            <p className="text-sm font-medium text-gray-700">{user.name}</p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                          </label>
                        </li>
                      )
                    ))}
                  </ul>
                )}
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowRemoveModal(false)}
                  className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRemoveCollaborator}
                  disabled={selectedRemoveUserIds.length === 0}
                  className={`px-4 py-2 text-sm text-white rounded-lg ${
                    selectedRemoveUserIds.length === 0
                      ? 'bg-red-400 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  Remove Selected
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProjectPage;