import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Sparkles, Code, BrainCircuit, Rocket, ShieldCheck, Layers } from 'lucide-react';

export function Home() {
  return (
    <div className="relative isolate overflow-hidden">
      <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
        <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] animated-hero-bg opacity-90 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-20 pb-32 sm:pt-24 lg:px-8">
        <div className="grid gap-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-4 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-blue-300">
              <Sparkles className="h-4 w-4" />
              Project-first learning
            </span>

            <h1 className="mt-8 text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
              Build skills faster with AI-guided coding projects.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400 sm:text-xl">
              Turn ideas into real apps with interactive lessons, live previews, and a modern coding experience designed for learners who love to build.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link
                to="/generation"
                className="inline-flex items-center justify-center rounded-full bg-blue-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 hover:bg-blue-500 transition-colors"
              >
                Start building
              </Link>
              <Link
                to="/challenges"
                className="inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-900/70 px-8 py-3 text-sm font-semibold text-slate-100 hover:border-blue-500 hover:text-white transition-colors"
              >
                Explore challenges
              </Link>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
            <div className="rounded-[2rem] border border-slate-800 bg-slate-900/70 p-7 shadow-[0_32px_80px_-42px_rgba(15,23,42,0.8)] glass-panel">
              <div className="flex items-center justify-between gap-4 rounded-3xl border border-slate-800 bg-slate-950/90 px-4 py-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-blue-400">Launch faster</p>
                  <p className="mt-2 text-xl font-semibold text-white">Your learning dashboard</p>
                </div>
                <span className="rounded-full bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-300">New</span>
              </div>

              <div className="mt-6 space-y-4 text-slate-300">
                <p>Sign up once and keep your progress, projects, and AI learning path in one place.</p>
                <div className="flex flex-wrap gap-3">
                  <span className="rounded-full border border-slate-800 bg-slate-950/90 px-3 py-2 text-sm text-slate-300">Live preview</span>
                  <span className="rounded-full border border-slate-800 bg-slate-950/90 px-3 py-2 text-sm text-slate-300">Project templates</span>
                  <span className="rounded-full border border-slate-800 bg-slate-950/90 px-3 py-2 text-sm text-slate-300">Guided steps</span>
                  <span className="rounded-full border border-slate-800 bg-slate-950/90 px-3 py-2 text-sm text-slate-300">Saved progress</span>
                </div>
              </div>

              <div className="mt-8 rounded-[1.5rem] border border-slate-800 bg-slate-950/90 p-5">
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>Enter your email</span>
                  <span className="font-semibold text-slate-200">Free access</span>
                </div>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <input
                    type="email"
                    placeholder="you@example.com"
                    className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                  <button className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500 transition-colors">
                    Sign up
                  </button>
                </div>
                <p className="mt-3 text-xs text-slate-500">No credit card required • Instantly unlock guided project builds.</p>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }} className="mt-20 grid gap-6 lg:grid-cols-3">
          <div className="glass-panel rounded-[2rem] border border-slate-800 p-8 hover:border-blue-500 transition-colors">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-3xl bg-slate-950/70 text-blue-400">
              <BrainCircuit className="h-6 w-6" />
            </div>
            <h3 className="mt-6 text-xl font-semibold text-white">Personalized AI prompts</h3>
            <p className="mt-3 text-slate-400 leading-7">Generate lesson plans for the exact project you want to build.</p>
          </div>

          <div className="glass-panel rounded-[2rem] border border-slate-800 p-8 hover:border-blue-500 transition-colors">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-3xl bg-slate-950/70 text-blue-400">
              <Code className="h-6 w-6" />
            </div>
            <h3 className="mt-6 text-xl font-semibold text-white">Code with confidence</h3>
            <p className="mt-3 text-slate-400 leading-7">Learn through real code examples and instant preview feedback.</p>
          </div>

          <div className="glass-panel rounded-[2rem] border border-slate-800 p-8 hover:border-blue-500 transition-colors">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-3xl bg-slate-950/70 text-blue-400">
              <Rocket className="h-6 w-6" />
            </div>
            <h3 className="mt-6 text-xl font-semibold text-white">Ship real apps</h3>
            <p className="mt-3 text-slate-400 leading-7">Finish projects that are portfolio-ready and skill-boosting.</p>
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.5 }} className="mt-24 grid gap-10 lg:grid-cols-[0.9fr_1.1fr] items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-400">Mini visual demo</p>
            <h2 className="mt-4 text-3xl font-bold text-white sm:text-4xl">See the experience before you build.</h2>
            <p className="mt-6 text-slate-400 leading-8">Preview the guided workflow from project prompt to code editor to live app preview—all in one seamless learning environment.</p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6">
                <p className="text-sm font-semibold text-white">Step-by-step tasks</p>
                <p className="mt-3 text-slate-400">Complete bite-sized lessons that keep you focused.</p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6">
                <p className="text-sm font-semibold text-white">Interactive preview</p>
                <p className="mt-3 text-slate-400">Watch your code come to life instantly.</p>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-950/80 p-6 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.9)]">
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-blue-500/20 to-transparent" />
            <div className="relative grid gap-4">
              <div className="flex items-center justify-between rounded-3xl bg-slate-900/80 px-4 py-3 text-sm text-slate-400">
                <span>AI Generator</span>
                <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">Live</span>
              </div>

              <div className="rounded-[2rem] border border-slate-800 bg-slate-900 p-5">
                <div className="mb-4 flex items-center gap-2 text-slate-500 text-xs">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  <span>app.js</span>
                </div>
                <pre className="overflow-x-auto text-sm leading-7 text-slate-300"><code>{`const project = createProject('portfolio site');
project.addSection('Hero');
project.addFeature('Testimonials');
renderPreview();`}</code></pre>
              </div>

              <div className="grid gap-4 rounded-[2rem] bg-slate-950/90 p-5 sm:grid-cols-2">
                <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-4">
                  <p className="text-sm text-slate-400">Preview</p>
                  <p className="mt-3 text-white font-semibold">A responsive site appears instantly as you code.</p>
                </div>
                <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-4">
                  <p className="text-sm text-slate-400">Learning</p>
                  <p className="mt-3 text-white font-semibold">Every step ties back to the concepts you need to know.</p>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, duration: 0.5 }} className="mt-24 rounded-[2rem] border border-slate-800 bg-slate-900/70 p-8 glass-panel">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-400">Getting started</p>
              <h2 className="mt-4 text-3xl font-bold text-white">A clean path from first click to first project.</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 text-lg font-semibold">1</div>
                <p className="text-sm font-semibold text-white">Choose a project</p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 text-lg font-semibold">2</div>
                <p className="text-sm font-semibold text-white">Follow guided steps</p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 text-lg font-semibold">3</div>
                <p className="text-sm font-semibold text-white">Launch your app</p>
              </div>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
