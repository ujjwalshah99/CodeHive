import React, { useState, useEffect, useRef } from 'react';
import { useUser } from "../context/user.context";
import { useLocation } from 'react-router-dom';
import axios from '../config/axios';
import { initializeSocket, recieveMessage, sendMessage } from "../config/socket";
import Markdown from 'markdown-to-jsx'
import hljs from 'highlight.js';
import 'highlight.js/styles/nord.css'; // Changed to nord theme which works better with dark backgrounds

function SyntaxHighlightedCode({ className, children, ...props }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      hljs.highlightElement(ref.current);
    }
  }, [children]);

  return (
    <code ref={ref} className={className} {...props}>
      {children}
    </code>
  );
}

function WriteAiMessage({ text, key }) {
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
    <div key={key} className="overflow-auto rounded-lg p-4 shadow-xl border max-w-2xl mx-auto" ref={containerRef}>
      <p className="text-xs font-semibold mb-2 text-gray-400">AI Assistant</p>

      {/* Display text in yellow box */}
      {displayText && (
        <div className="bg-yellow-200 text-black border border-yellow-400 rounded-lg p-2 mb-4">
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
  const [fileTree, setFileTree] = useState({
    "app.js": {
      "file": {
        "contents": "// This is your main application file\n\nconst express = require('express');\nconst app = express();\n\napp.get('/', (req, res) => {\n  res.send('Hello World!');\n});\n\nconst PORT = process.env.PORT || 3000;\napp.listen(PORT, () => {\n  console.log(`Server running on port ${PORT}`);\n});"
      }
    },
    "package.json": {
      "file": {
        "contents": "{\n  \"name\": \"project-app\",\n  \"version\": \"1.0.0\",\n  \"description\": \"A collaborative coding project\",\n  \"main\": \"app.js\",\n  \"scripts\": {\n    \"start\": \"node app.js\",\n    \"dev\": \"nodemon app.js\"\n  },\n  \"dependencies\": {\n    \"express\": \"^4.17.1\"\n  },\n  \"devDependencies\": {\n    \"nodemon\": \"^2.0.15\"\n  }\n}"
      }
    }
  });
  const [selectedFile, setSelectedFile] = useState("app.js");
  const [fileContent, setFileContent] = useState("");
  const messagesEndRef = useRef(null);
  const editorRef = useRef(null);
  const highlightedCodeRef = useRef(null);
  const [lineNumbers, setLineNumbers] = useState([]);
  const [cursorPosition, setCursorPosition] = useState({ line: 0, ch: 0 });
  const [highlightedContent, setHighlightedContent] = useState("");

  useEffect(() => {
    if (initialProject) {
      initializeSocket(initialProject._id);

      recieveMessage("project-message", (data) => {
        const ID = `${data?.sender?._id?.toString?.() || "temp"}${Math.random().toString(12)}`;

        // Check if message is from AI and try to parse JSON
        if (data.sender.name === "AI") {
          try {
            const parsedMessage = JSON.parse(data.message);
            
            // If the message contains a fileTree, update the fileTree state
            if (parsedMessage.fileTree) {
              setFileTree(parsedMessage.fileTree);
              
              // If the currently selected file exists in the new fileTree, update its content
              if (selectedFile && parsedMessage.fileTree[selectedFile] && parsedMessage.fileTree[selectedFile].file) {
                setFileContent(parsedMessage.fileTree[selectedFile].file.contents);
                updateLineNumbers(parsedMessage.fileTree[selectedFile].file.contents);
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
      
      // Reset cursor position when switching files
      setCursorPosition({ line: 0, ch: 0 });
      
      // Update highlighted content when file changes
      updateHighlightedContent(content);
    }
  }, [selectedFile, fileTree]);

  // Function to highlight code with highlight.js
  const updateHighlightedContent = (content) => {
    try {
      const language = getLanguageForFile(selectedFile);
      let highlighted = hljs.highlight(content, { language }).value;
      
      // Optional: Add additional custom CSS classes for better dark theme visibility
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

  // Adjust editor height when window resizes
  useEffect(() => {
    const handleResize = () => {
      if (editorRef.current) {
        const viewportHeight = window.innerHeight;
        const editorTop = editorRef.current.getBoundingClientRect().top;
        const editorHeight = viewportHeight - editorTop - 20; // 20px for some padding
        editorRef.current.style.height = `${Math.max(300, editorHeight)}px`;
        
        // Also update the height of the pre element that contains highlighted code
        if (highlightedCodeRef.current && highlightedCodeRef.current.parentElement) {
          highlightedCodeRef.current.parentElement.style.height = `${Math.max(300, editorHeight)}px`;
        }
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sync scrolling between textarea and highlighted code
  useEffect(() => {
    const syncScroll = () => {
      if (editorRef.current && highlightedCodeRef.current && highlightedCodeRef.current.parentElement) {
        highlightedCodeRef.current.parentElement.scrollTop = editorRef.current.scrollTop;
        highlightedCodeRef.current.parentElement.scrollLeft = editorRef.current.scrollLeft;
      }
    };

    if (editorRef.current) {
      editorRef.current.addEventListener('scroll', syncScroll);
      return () => {
        if (editorRef.current) {
          editorRef.current.removeEventListener('scroll', syncScroll);
        }
      };
    }
  }, [editorRef.current, highlightedCodeRef.current]);

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

  const handleFileContentChange = (e) => {
    const newContent = e.target.value;
    setFileContent(newContent);
    updateLineNumbers(newContent);
    updateHighlightedContent(newContent);
    
    // Save cursor position
    if (editorRef.current) {
      const { selectionStart, selectionEnd } = editorRef.current;
      
      // Calculate line and character position
      const textBeforeCursor = newContent.substring(0, selectionStart);
      const line = (textBeforeCursor.match(/\n/g) || []).length;
      const lastNewLine = textBeforeCursor.lastIndexOf('\n');
      const ch = lastNewLine > -1 ? selectionStart - lastNewLine - 1 : selectionStart;
      
      setCursorPosition({ line, ch });
    }
    
    // Update the file tree with new content
    setFileTree(prev => ({
      ...prev,
      [selectedFile]: {
        file: {
          contents: newContent
        }
      }
    }));
  };

  // Restore cursor position after re-render
  useEffect(() => {
    if (editorRef.current && cursorPosition) {
      try {
        // Convert line/ch to absolute position
        const lines = fileContent.split('\n');
        let position = 0;
        
        for (let i = 0; i < cursorPosition.line; i++) {
          position += (lines[i]?.length || 0) + 1; // +1 for the newline
        }
        position += cursorPosition.ch;
        
        // Set cursor position
        editorRef.current.focus();
        editorRef.current.setSelectionRange(position, position);
      } catch (e) {
        console.error('Error restoring cursor position:', e);
      }
    }
  }, [highlightedCodeRef.current]); // Only run when the highlighted code is updated

  // Filter out buildCommand and startCommand files from display
  const displayableFiles = Object.keys(fileTree).filter(
    fileName => fileName !== 'buildCommand' && fileName !== 'startCommand'
  );

  // Replace the renderSyntaxHighlightedEditor function with this improved version

  const renderSyntaxHighlightedEditor = () => {
    const language = getLanguageForFile(selectedFile);
    
    return (
      <div className="flex-1 overflow-hidden relative">
        {/* Line numbers container */}
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-gray-900 border-r border-gray-700 flex flex-col items-end pt-4 overflow-hidden z-10">
          {lineNumbers.map((num) => (
            <div key={num} className="text-gray-500 text-xs pr-2 h-6 leading-6">{num}</div>
          ))}
        </div>
        
        {/* Hidden textarea for editing (behind the highlighted code) */}
        <textarea
          ref={editorRef}
          value={fileContent}
          onChange={handleFileContentChange}
          className="ml-12 w-full h-full bg-transparent text-transparent caret-white p-4 font-mono text-sm resize-none outline-none leading-6 absolute z-20"
          spellCheck="false"
          style={{ 
            lineHeight: '1.5rem',
            caretColor: '#38bdf8', // Light blue caret for better visibility
            fontFamily: 'Consolas, Monaco, "Andale Mono", monospace', // Better coding font
            tabSize: 2,
            whiteSpace: 'pre',
            overflowX: 'auto',
            overflowY: 'auto'
          }}
        ></textarea>
        
        {/* Visible syntax highlighted code - with darker background for better dark theme */}
        <pre className="ml-12 w-full h-full overflow-auto bg-gray-900 p-4 m-0 z-10">
          <code 
            ref={highlightedCodeRef}
            className={`language-${language} font-mono text-sm leading-6`}
            style={{ 
              background: 'transparent',
              color: '#e2e8f0', // Light gray default text color for better visibility
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

  // Also update the syncScroll function in your useEffect
  useEffect(() => {
    const syncScroll = () => {
      if (editorRef.current && highlightedCodeRef.current && highlightedCodeRef.current.parentElement) {
        highlightedCodeRef.current.parentElement.scrollTop = editorRef.current.scrollTop;
        highlightedCodeRef.current.parentElement.scrollLeft = editorRef.current.scrollLeft;
      }
    };

    if (editorRef.current) {
      editorRef.current.addEventListener('scroll', syncScroll);
      return () => {
        if (editorRef.current) {
          editorRef.current.removeEventListener('scroll', syncScroll);
        }
      };
    }
  }, []);

  if (!project) return <div className="p-6 text-red-500">Loading project...</div>;

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-100 overflow-hidden">
      {/* Left sidebar - Chat & Collaborator Section */}
      <div className="w-full md:w-1/3 lg:w-1/4 bg-white border-r border-gray-200 flex flex-col md:min-w-[320px] md:max-w-md">
        <div className="flex items-center justify-between p-4 bg-indigo-600 text-white shadow-md">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-white text-indigo-600 text-sm font-semibold rounded-xl shadow hover:bg-gray-100"
          >
            + Add Collaborator
          </button>

          {showDetails ? (
            <button
              onClick={() => setShowDetails(false)}
              className="px-4 py-2 bg-white text-red-600 text-sm font-semibold rounded-xl shadow hover:bg-gray-100"
            >
              ✖ Close
            </button>
          ) : (
            <button
              onClick={() => setShowDetails(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 text-sm font-semibold rounded-xl shadow hover:bg-gray-100"
            >
              <span className="truncate max-w-[120px]">{project.name}</span>
              <i className="ri-group-line text-lg" />
            </button>
          )}
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
              {messages.map((msg) =>
                msg.sender === "AI" ? (
                  <WriteAiMessage key={msg.id} text={msg.text} />
                ) : msg.type === "incoming" ? (
                  <div key={msg.id} className="w-fit max-w-[80%] bg-gray-200 p-3 rounded-lg shadow">
                    <p className="text-xs font text-gray-500 mb-1">{msg.sender}</p>
                    <p className="text-sm text-gray-700">{msg.text}</p>
                  </div>
                ) : (
                  <div key={msg.id} className="ml-auto w-fit max-w-[80%] bg-indigo-100 p-3 rounded-lg shadow text-right">
                    <p className="text-xs font text-gray-500 mb-1">{msg.sender}</p>
                    <p className="text-sm text-gray-700">{msg.text}</p>
                  </div>
                )
              )}
              <div ref={messagesEndRef} />
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
                >
                  Send
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Right section of the page - Code Editor Area */}
      <div className="flex-1 flex flex-col h-full md:flex-row overflow-hidden">
        {/* File list sidebar */}
        <div className="w-full md:w-56 lg:w-64 bg-gray-900 text-white border-r border-gray-700 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold truncate">Project Files</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ul className="py-2">
              {displayableFiles.map((fileName) => (
                <li key={fileName}>
                  <button
                    onClick={() => setSelectedFile(fileName)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-800 flex items-center gap-2 transition-colors duration-150 ${
                      selectedFile === fileName ? 'bg-gray-800 border-l-4 border-indigo-400' : ''
                    }`}
                  >
                    <i className={`${fileName.endsWith('.json') ? 'ri-file-list-line' : 'ri-file-code-line'} text-gray-400`}></i>
                    <span className="text-sm truncate">{fileName}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* File content editor */}
        <div className="flex-1 flex flex-col bg-gray-900 overflow-hidden">
          <div className="bg-gray-900 text-gray-300 px-4 py-3 text-sm font-mono border-b border-gray-700 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <i className={`${selectedFile.endsWith('.json') ? 'ri-file-list-line' : 'ri-file-code-line'} text-gray-400`}></i>
              <span>{selectedFile}</span>
            </div>
            <div className="text-xs text-gray-500">
              {fileContent.split('\n').length} lines | {getLanguageForFile(selectedFile)}
            </div>
          </div>
          {renderSyntaxHighlightedEditor()}
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 border border-gray-200 max-h-[90vh] overflow-y-auto">
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
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700"
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