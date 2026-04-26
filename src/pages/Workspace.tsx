import React, { useState, useEffect, useRef } from 'react';

import ReactMarkdown from 'react-markdown';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, RotateCcw, Save, Trash2, 
  ChevronLeft, ChevronRight, HelpCircle, 
  Layout, Code, Eye, MessageSquare, 
  Sparkles, CheckCircle2, AlertCircle, Terminal, Github, Loader2,
  BookOpen

} from 'lucide-react';
import { api } from '../lib/api';
import { useProjects } from '../hooks/useProjects';

import { UserProject, ProjectFile } from '../types';
import { getAIHelp, checkStepCompletion } from '../services/gemini';
import { cn } from '../lib/utils';
import { io, Socket } from 'socket.io-client';
import { XTerm } from '../components/XTerm';
import { Notification } from '../components/Notification';
import { LessonModal } from '../components/LessonModal';


export function Workspace() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { projects, loading, saveProject } = useProjects();
  
  const [project, setProject] = useState<UserProject | null>(null);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [previewUrl, setPreviewUrl] = useState('');
  const [showAI, setShowAI] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [userInput, setUserInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [stepFeedback, setStepFeedback] = useState<{isComplete: boolean, message: string} | null>(null);
  const [consoleOutput, setConsoleOutput] = useState<string>('');
  const [isPyodideReady, setIsPyodideReady] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'info'} | null>(null);
  const [showLessonModal, setShowLessonModal] = useState(false);





  const lastLoadedProjectId = useRef<string | null>(null);
  const pyodideRef = useRef<any>(null);
  const socketRef = useRef<Socket | null>(null);
  const inputResolverRef = useRef<((val: string) => void) | null>(null);
  const inputBufferRef = useRef<string>('');

  useEffect(() => {
    (window as any).promptUserForInput = () => {
      return new Promise<string>((resolve) => {
        inputResolverRef.current = resolve;
        inputBufferRef.current = '';
      });
    };
    return () => {
      delete (window as any).promptUserForInput;
    };
  }, []);

  const handleTerminalInput = (char: string) => {
    if (inputResolverRef.current) {
      if (char === '\r') {
        inputResolverRef.current(inputBufferRef.current);
        inputResolverRef.current = null;
      } else if (char === '\x7f') { // Backspace
        if (inputBufferRef.current.length > 0) {
          inputBufferRef.current = inputBufferRef.current.slice(0, -1);
          if ((window as any).writeToTerminal) {
            (window as any).writeToTerminal('\b \b');
          }
        }
      } else {
        inputBufferRef.current += char;
        if ((window as any).writeToTerminal) {
          (window as any).writeToTerminal(char);
        }
      }
    }
  };

  useEffect(() => {
    socketRef.current = io('http://localhost:5000');
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    
    if (projectId) {
      const p = projects.find(proj => proj.id === projectId);
      if (p) {
        setProject(p);
        
        // Only initialize state if we're loading a DIFFERENT project
        if (lastLoadedProjectId.current !== projectId) {
          const stepIndex = p.currentStep || 0;
          let initialFiles = p.files;
          const stepData = p.steps[stepIndex];
          
          // Apply starter code for the current step if it exists
          if (stepData && stepData.starterCode) {
            initialFiles = initialFiles.map(file => {
              if (stepData.starterCode![file.name]) {
                return { ...file, content: stepData.starterCode![file.name] };
              }
              return file;
            });
          }
          
          setFiles(initialFiles);
          setCurrentStep(stepIndex);
          
          // Mark all previous steps as completed
          const completed = [];
          for (let i = 0; i < stepIndex; i++) {
            completed.push(i);
          }
          setCompletedSteps(completed);
          
          setStepFeedback(null);
          lastLoadedProjectId.current = projectId;

          if (p.steps[stepIndex]?.lesson) {
            setShowLessonModal(true);
          }
        }
      } else {
        navigate('/');
      }
    }
  }, [projectId, loading, projects, navigate]);

  useEffect(() => {
    if (project?.language === 'python') {
      if ((window as any).loadPyodide || document.getElementById('pyodide-script')) {
        // Already loaded or loading
        if ((window as any).loadPyodide && !pyodideRef.current) {
          (window as any).loadPyodide({
            indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/'
          }).then((py: any) => {
            pyodideRef.current = py;
            setIsPyodideReady(true);
          }).catch(console.error);
        }
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js';
      script.id = 'pyodide-script';
      script.onload = async () => {
        try {
          const pyodide = await (window as any).loadPyodide({
            indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/'
          });
          pyodideRef.current = pyodide;
          setIsPyodideReady(true);
        } catch (e) {
          console.error("Failed to load Pyodide", e);
          setConsoleOutput("Error: Failed to initialize Python environment.\\n");
        }
      };
      document.body.appendChild(script);
    }
  }, [project?.language]);

  const handleRun = async () => {
    if (project?.language === 'c' || project?.language === 'cpp') {
      const isCpp = project.language === 'cpp';
      const fileName = isCpp ? 'main.cpp' : 'main.c';
      const codeFile = files.find(f => f.name === fileName);
      
      if (!codeFile) {
        if ((window as any).writeToTerminal) {
          (window as any).writeToTerminal(`\r\nError: ${fileName} not found.\r\n`);
        }
        return;
      }
      
      if ((window as any).clearTerminal) {
        (window as any).clearTerminal();
      }
      
      if (socketRef.current) {
        socketRef.current.emit('execute_code', {
          language: project.language,
          code: codeFile.content
        });
      }
      return;
    }

    if (project?.language === 'python') {
      const pythonFile = files.find(f => f.name === 'main.py');
      if (!pythonFile) return;
      
      if (!pyodideRef.current) {
        if ((window as any).writeToTerminal) {
          (window as any).writeToTerminal("\r\nPython environment is still loading...\r\n");
        }
        return;
      }
      
      if ((window as any).clearTerminal) {
        (window as any).clearTerminal();
      }
      
      try {
        const pyodide = pyodideRef.current;
        
        // Let's implement real-time stdout streaming by overriding sys.stdout
        await pyodide.runPythonAsync(`
import sys
import js

class XTermWriter:
    def write(self, s):
        js.writeToTerminal(s)
    def flush(self):
        pass

sys.stdout = XTermWriter()
sys.stderr = XTermWriter()

async def async_input(prompt=""):
    if prompt:
        js.writeToTerminal(prompt)
    res = await js.promptUserForInput()
    js.writeToTerminal(res + "\\r\\n")
    return res

import builtins
builtins.input = async_input
        `);
        
        // Transform the user's code to make 'input()' calls awaitable
        // This allows synchronous-looking code to run in our async terminal environment
        const transformedCode = pythonFile.content.replace(/\binput\s*\(/g, 'await input(');
        await pyodide.runPythonAsync(transformedCode);
        if ((window as any).writeToTerminal) {
           (window as any).writeToTerminal('\r\n[Process exited]\r\n');
        }
      } catch (e: any) {
        if ((window as any).writeToTerminal) {
          (window as any).writeToTerminal(`\r\n${e.toString()}\r\n`);
        }
      }
      return;
    }

    const htmlFile = files.find(f => f.name === 'index.html');
    const cssFile = files.find(f => f.name === 'style.css');
    const jsFile = files.find(f => f.name === 'script.js');

    if (!htmlFile) return;

    const combinedHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>${cssFile?.content || ''}</style>
        </head>
        <body>
          ${htmlFile.content}
          <script>${jsFile?.content || ''}</script>
        </body>
      </html>
    `;

    const blob = new Blob([combinedHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
  };

  const handleFileChange = (value: string | undefined) => {
    if (value === undefined) return;
    const newFiles = [...files];
    newFiles[activeFileIndex].content = value;
    setFiles(newFiles);
  };

  const handleNextStep = () => {
    if (project && currentStep < project.steps.length - 1) {
      setCompletedSteps(prev => Array.from(new Set([...prev, currentStep])));
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      setStepFeedback(null);
      
      // If the next step has starter code, apply it
      const stepData = project.steps[nextStep];
      if (stepData.starterCode) {
        const newFiles = files.map(file => {
          if (stepData.starterCode![file.name]) {
            return { ...file, content: stepData.starterCode![file.name] };
          }
          return file;
        });
        setFiles(newFiles);
      }
      
      saveProject({ ...project, currentStep: Math.max(project.currentStep, nextStep), files });

      if (project.steps[nextStep]?.lesson) {
        setShowLessonModal(true);
      }
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setStepFeedback(null);
    }
  };

  const handleAIHelp = async () => {
    if (!userInput.trim() || !project) return;
    
    setAiLoading(true);
    setChatHistory(prev => [...prev, { role: 'user', text: userInput }]);
    const currentCode = files.map(f => `// ${f.name}\n${f.content}`).join('\n\n');
    const context = `User is on step ${currentStep + 1}: ${project.steps[currentStep].title}. Project: ${project.title}`;
    
    const input = userInput;
    setUserInput('');

    try {
      const response = await getAIHelp(currentCode, input, context);
      setChatHistory(prev => [...prev, { role: 'ai', text: response }]);
    } catch (e) {
      setChatHistory(prev => [...prev, { role: 'ai', text: "Sorry, I couldn't process that request." }]);
    } finally {
      setAiLoading(false);
    }
  };

  const handleCheckStep = async () => {
    if (!project) return;
    
    setIsChecking(true);
    setStepFeedback(null);
    
    const currentCode = files.map(f => `// ${f.name}\n${f.content}`).join('\n\n');
    const stepData = project.steps[currentStep];

    try {
      const result = await checkStepCompletion(currentCode, stepData.task, stepData.solution);
      setStepFeedback({
        isComplete: result.isComplete,
        message: result.feedback
      });
      if (result.isComplete) {
        setCompletedSteps(prev => Array.from(new Set([...prev, currentStep])));
      }
    } catch (e) {
      setStepFeedback({
        isComplete: false,
        message: "Sorry, I couldn't check your code right now."
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleExport = async () => {
    if (!project || isExporting) return;
    setIsExporting(true);
    
    try {
      const res = await api.post<{success: boolean, url: string}>(`/api/projects/${projectId}/export`, {});
      if (res.success) {
        setNotification({ message: 'Project created in the repo', type: 'success' });
        window.open(res.url, '_blank');
      }
    } catch (err: any) {
      if (err.message && err.message.includes('already exists')) {
        setNotification({ message: 'Project already exists in your repo', type: 'info' });
      } else {
        alert(err.message || 'Export failed. Ensure you are connected to GitHub in your Profile.');
      }
    } finally {


      setIsExporting(false);
    }
  };

  if (loading || !project) {
    return (
      <div className="h-[calc(100vh-64px)] flex flex-col items-center justify-center bg-slate-950">
        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4" />
        <p className="text-slate-400 font-medium">Loading Workspace...</p>
      </div>
    );
  }

  const activeFile = files[activeFileIndex];
  const step = project.steps[currentStep];

  return (
    <div className="h-[calc(100vh-64px)] flex overflow-hidden bg-slate-950">
      <LessonModal
        isOpen={showLessonModal}
        onClose={() => setShowLessonModal(false)}
        title={step?.title || ''}
        lesson={step?.lesson || ''}
      />
      <Notification 
        isVisible={!!notification}
        message={notification?.message || ''}
        type={notification?.type}
        onClose={() => setNotification(null)}
      />

      {/* Left Panel: Instructions */}
      <div className="w-80 flex-shrink-0 border-r border-slate-800 bg-slate-900/30 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="font-bold text-slate-200">Instructions</h2>
          <div className="text-xs font-mono text-slate-500">
            {step.lesson && (
              <button
                onClick={() => setShowLessonModal(true)}
                className="p-1.5 hover:bg-slate-800 rounded-md text-blue-400 transition-colors mr-2"
                title="View Lesson"
              >
                <BookOpen className="w-4 h-4" />
              </button>
            )}
            Step {currentStep + 1} / {project.steps.length}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
            <div className="prose prose-invert prose-sm prose-code:text-[0.85em] prose-code:bg-slate-800 prose-code:px-1 prose-code:rounded">
              <div className="text-slate-300 leading-relaxed">
                <ReactMarkdown>
                  {step.explanation}
                </ReactMarkdown>
              </div>
            </div>
          </div>

          <div className="bg-blue-600/10 border border-blue-500/20 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 text-blue-400 mb-2">
              <Code className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Your Task</span>
            </div>
            <div className="text-sm text-slate-200 leading-relaxed font-medium prose-sm prose-invert prose-p:leading-relaxed prose-code:text-[0.85em] prose-code:bg-slate-800 prose-code:px-1 prose-code:rounded">
              <ReactMarkdown>
                {step.task}
              </ReactMarkdown>
            </div>
          </div>

          <div className="space-y-4">
            <details className="group glass-panel rounded-lg overflow-hidden">
              <summary className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-800/50 transition-colors">
                <span className="text-xs font-bold text-slate-400 group-open:text-blue-400">View Hint</span>
                <HelpCircle className="w-4 h-4 text-slate-500 group-open:text-blue-400" />
              </summary>
              <div className="p-3 pt-0 text-sm text-slate-400 border-t border-slate-800/50 italic">
                <div className="prose-sm prose-invert prose-p:italic prose-code:text-[0.85em] prose-code:bg-slate-800 prose-code:px-1 prose-code:rounded">
                  <ReactMarkdown>
                    {step.hint}
                  </ReactMarkdown>
                </div>
              </div>
            </details>

            <details className="group glass-panel rounded-lg overflow-hidden">
              <summary className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-800/50 transition-colors">
                <span className="text-xs font-bold text-slate-400 group-open:text-green-400">See Solution</span>
                <CheckCircle2 className="w-4 h-4 text-slate-500 group-open:text-green-400" />
              </summary>
              <div className="p-3 pt-0 text-sm font-mono bg-slate-900/50 border-t border-slate-800/50 whitespace-pre-wrap">
                {step.solution.trim().replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '')}
              </div>
            </details>
          </div>
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex flex-col gap-3">
          {stepFeedback && (
            <div className={cn(
              "p-3 rounded-lg text-sm flex gap-2 items-start",
              stepFeedback.isComplete ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
            )}>
              {stepFeedback.isComplete ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
              <div>
                <p className="font-bold mb-1">{stepFeedback.isComplete ? 'Excellent work!' : 'Not quite yet.'}</p>
                <p className="opacity-90 leading-relaxed text-xs">{stepFeedback.message}</p>
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between gap-3">
            <button 
              onClick={handlePrevStep}
              disabled={currentStep === 0}
              className="p-2 rounded-lg hover:bg-slate-800 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            
            <div className="flex-1 flex gap-2">
              <button 
                onClick={handleCheckStep}
                disabled={isChecking}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-bold flex-1 transition-all flex items-center justify-center gap-2"
              >
                {isChecking ? 'Checking...' : 'Check'}
              </button>
              <button 
                onClick={handleNextStep}
                disabled={currentStep === project.steps.length - 1 || !completedSteps.includes(currentStep)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-bold flex-1 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed",
                  (currentStep === project.steps.length - 1 || !completedSteps.includes(currentStep))
                    ? "bg-slate-800 text-slate-200"
                    : "bg-blue-600 hover:bg-blue-500 text-white"
                )}
              >
                Next Step
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Panel: Editor */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-slate-800">
        <div className="flex items-center justify-between px-4 h-12 bg-slate-900/50 border-b border-slate-800">
          <div className="flex gap-2 h-full">
            {files.map((file, idx) => (
              <button
                key={file.name}
                onClick={() => setActiveFileIndex(idx)}
                className={cn(
                  "px-4 text-xs font-medium flex items-center gap-2 border-b-2 transition-all",
                  activeFileIndex === idx 
                    ? "border-blue-500 text-blue-400 bg-blue-500/5" 
                    : "border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/30"
                )}
              >
                <Code className="w-3.5 h-3.5" />
                {file.name}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {currentStep === project.steps.length - 1 && (
              <button 
                onClick={handleExport}
                disabled={isExporting}
                className="flex items-center gap-2 px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-md text-sm font-bold transition-all active:scale-95 disabled:opacity-50"
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                ) : (
                  <Github className="w-4 h-4" />
                )}
                {isExporting ? 'Exporting...' : 'Export to GitHub'}
              </button>
            )}

            <button 
              onClick={handleRun}
              className="flex items-center gap-2 px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-md text-sm font-bold transition-all shadow-lg shadow-green-900/20 active:scale-95"
            >
              <Play className="w-4 h-4 fill-current" />
              Run
            </button>
          </div>
        </div>

        <div className="flex-1 relative bg-[#1e1e1e]">
          <Editor
            height="100%"
            language={activeFile?.language || 'javascript'}
            value={activeFile?.content}
            theme="vs-dark"
            onChange={handleFileChange}
            onMount={(editor, monaco) => {
              (editor as any).onDidType((text: string) => {
                if (text === '>') {
                  const position = editor.getPosition();
                  if (!position) return;
                  const model = editor.getModel();
                  const lineContent = model.getLineContent(position.lineNumber);
                  const textBeforeCursor = lineContent.substring(0, position.column - 1);

                  const match = textBeforeCursor.match(/<([a-zA-Z0-9\-]+)[^>]*>$/);
                  if (!match) return;
                  
                  const tagName = match[1];
                  const isSelfClosing = /<\s*[a-zA-Z0-9\-]+[^>]*\/\s*>$/.test(textBeforeCursor);
                  if (isSelfClosing) return;

                  const voidElements = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'];
                  if (voidElements.includes(tagName.toLowerCase())) return;

                  const closingTag = `</${tagName}>`;
                  editor.executeEdits("auto-close-tag", [{
                    range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
                    text: closingTag,
                    forceMoveMarkers: true
                  }]);

                  editor.setPosition(new monaco.Position(position.lineNumber, position.column));
                }
              });
            }}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              fontFamily: '"JetBrains Mono", monospace',
              padding: { top: 20 },
              smoothScrolling: true,
              cursorBlinking: "smooth",
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              autoClosingBrackets: 'always',
              autoClosingQuotes: 'always',
              formatOnType: true,
              formatOnPaste: true,
            }}
          />
        </div>
      </div>

      {/* Right Panel: Preview & AI */}
      <div className="w-[400px] flex-shrink-0 flex flex-col bg-slate-900/30">
        <div className="h-1/2 flex flex-col border-b border-slate-800">
          <div className="p-3 border-b border-slate-800 flex items-center gap-2 text-slate-400">
            {['python', 'c', 'cpp'].includes(project.language) ? <Terminal className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span className="text-xs font-bold uppercase tracking-widest">
              {['python', 'c', 'cpp'].includes(project.language) ? 'Console Output' : 'Live Preview'}
            </span>
          </div>
          <div className="flex-1 bg-black overflow-y-auto">
            {['python', 'c', 'cpp'].includes(project.language) ? (
              <div className="w-full h-full relative">
                {project.language === 'python' && !isPyodideReady && (
                  <div className="absolute inset-0 z-10 bg-black/80 flex items-center justify-center text-slate-500 gap-2 font-mono text-sm">
                    <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                    Initializing Python Environment...
                  </div>
                )}
                <XTerm 
                  socket={project.language !== 'python' ? socketRef.current : undefined} 
                  onInput={project.language === 'python' ? handleTerminalInput : undefined}
                />
              </div>
            ) : previewUrl ? (
              <iframe 
                src={previewUrl} 
                className="w-full h-full border-none bg-white"
                title="preview"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-500 gap-4">
                <Play className="w-12 h-12 opacity-10" />
                <p className="text-sm font-medium">Click "Run" to see your code in action</p>
              </div>
            )}
          </div>
        </div>

        <div className="h-1/2 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
            <div className="flex items-center gap-2 text-blue-400">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-widest">AI Tutor Helper</span>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {chatHistory.length === 0 && (
              <div className="text-center py-8">
                <MessageSquare className="w-8 h-8 text-slate-800 mx-auto mb-3" />
                <p className="text-xs text-slate-500 px-8">Ask the AI tutor for a hint, to explain your code, or to help you with the current step.</p>
              </div>
            )}
            
            {chatHistory.map((chat, idx) => (
              <div 
                key={idx} 
                className={cn(
                  "p-3 rounded-xl text-sm max-w-[85%]",
                  chat.role === 'user' 
                    ? "bg-blue-600 ml-auto text-white" 
                    : "bg-slate-800 border border-slate-700 mr-auto text-slate-300"
                )}
              >
                <div className={cn(
                  "prose-sm prose-invert prose-p:my-0 prose-code:text-[0.85em] prose-code:bg-slate-800/50 prose-code:px-1 prose-code:rounded",
                  chat.role === 'user' ? "prose-p:text-white" : "prose-p:text-slate-300"
                )}>
                  <ReactMarkdown>
                    {chat.text}
                  </ReactMarkdown>
                </div>
              </div>
            ))}
            
            {aiLoading && (
              <div className="bg-slate-800 border border-slate-700 mr-auto p-3 rounded-xl flex gap-1 items-center">
                <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-800 bg-slate-900/70">
            <div className="relative flex gap-2">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAIHelp()}
                placeholder="Ask your AI tutor..."
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button 
                onClick={handleAIHelp}
                disabled={aiLoading || !userInput.trim()}
                className="p-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
