import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Sparkles, Code, BrainCircuit, Rocket, ChevronRight, PlayCircle } from 'lucide-react';
import { generateProject } from '../services/gemini';
import { Language, Difficulty } from '../types';
import { useProjects } from '../hooks/useProjects';

export function Home() {
  const navigate = useNavigate();
  const { saveProject } = useProjects();
  const [prompt, setPrompt] = useState(window.history.state?.usr?.presetPrompt || '');
  const [language, setLanguage] = useState<Language>('html-css-js');
  const [difficulty, setDifficulty] = useState<Difficulty>('Beginner');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const project = await generateProject(prompt, language, difficulty);
      saveProject({ ...project, currentStep: 0, updatedAt: new Date().toISOString() });
      navigate(`/workspace/${project.id}`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  const examples = [
    { title: "Snake Game", lang: "JavaScript", prompt: "Build me a retro snake game with score tracking" },
    { title: "Calculator", lang: "HTML/CSS", prompt: "Create a modern dark-mode calculator" },
    { title: "To-Do App", lang: "React", prompt: "Build a todo list with local storage persistence" },
  ];

  return (
    <div className="relative isolate overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
        <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-blue-600 to-purple-600 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-20 pb-32 sm:pt-32 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center mb-8"
          >
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Sparkles className="w-4 h-4" />
              AI-Powered Learning
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl font-bold tracking-tight text-white sm:text-7xl mb-6"
          >
            Learn to Code by <span className="text-blue-500">Building Projects</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg leading-8 text-slate-400 mb-10"
          >
            Describe any project you want to make, and our AI will generate a tailored, step-by-step coding lesson with a built-in IDE and live preview.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="p-2 glass-panel rounded-2xl glow-blue max-w-2xl mx-auto mb-12"
          >
            <div className="flex flex-col gap-4 p-4">
              <div className="relative border-b border-slate-800/50 pb-4">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="What do you want to build? (e.g. A budget tracker in JavaScript)"
                  className="w-full bg-transparent border-none focus:ring-0 text-lg text-white placeholder-slate-500 resize-none h-24"
                />
              </div>
              
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-start gap-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500 ml-1 tracking-wider">Language</span>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value as Language)}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="html-css-js">JavaScript (Web)</option>
                      <option value="react">React</option>
                      <option value="python" disabled>Python (Coming soon)</option>
                    </select>
                  </div>

                  <div className="flex flex-col items-start gap-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500 ml-1 tracking-wider">Difficulty</span>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={loading || !prompt.trim()}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-[0_0_20px_-5px_rgba(37,99,235,0.5)] active:scale-95"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Rocket className="w-5 h-5 font-bold" />
                      Generate Project
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>

          {/* Example Prompts */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-20">
            {examples.map((ex, idx) => (
              <motion.button
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + idx * 0.1 }}
                onClick={() => setPrompt(ex.prompt)}
                className="p-4 glass-panel rounded-xl text-left hover:border-blue-500/50 transition-all group active:scale-95"
              >
                <div className="flex items-center gap-2 mb-2">
                  <PlayCircle className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{ex.lang}</span>
                </div>
                <p className="text-sm font-medium group-hover:text-blue-400 transition-colors">{ex.title}</p>
                <p className="text-xs text-slate-500 mt-1 line-clamp-1 italic">"{ex.prompt}"</p>
              </motion.button>
            ))}
          </div>

          {/* How it Works */}
          <div className="pt-20 border-t border-slate-900">
            <h2 className="text-3xl font-bold mb-12">How it Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { icon: BrainCircuit, title: "1. Prompt", desc: "Describe the app or website you want to build in plain English." },
                { icon: Code, title: "2. Guided IDE", desc: "Get a step-by-step curriculum with code tasks and real-time feedback." },
                { icon: Rocket, title: "3. Build & Ship", desc: "Code in the browser, see live previews, and master core concepts." },
              ].map((step, idx) => (
                <div key={idx} className="flex flex-col items-center text-center p-6">
                  <div className="w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center mb-6 text-blue-500">
                    <step.icon className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                  <p className="text-slate-400">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
