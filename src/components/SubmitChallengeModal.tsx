import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, X, Building2, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

interface SubmitChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: (challenge: SubmittedChallenge) => void;
}

export interface SubmittedChallenge {
  id: string;
  title: string;
  description: string;
  language: string;
  difficulty: string;
  tags: string[];
  company: { name: string; role: string } | null;
  verified: boolean;
  authorUsername: string;
  likes: number;
  createdAt: string;
}

const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'] as const;

export function SubmitChallengeModal({ isOpen, onClose, onSubmitted }: SubmitChallengeModalProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('');
  const [difficulty, setDifficulty] = useState<typeof DIFFICULTIES[number]>('Beginner');
  const [tagsInput, setTagsInput] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyRole, setCompanyRole] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SubmittedChallenge | null>(null);

  const reset = () => {
    setTitle('');
    setDescription('');
    setLanguage('');
    setDifficulty('Beginner');
    setTagsInput('');
    setCompanyName('');
    setCompanyRole('');
    setError(null);
    setSuccess(null);
    setSubmitting(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const body: Record<string, unknown> = {
      title: title.trim(),
      description: description.trim(),
      language: language.trim(),
      difficulty,
      tags,
    };
    if (companyName.trim() || companyRole.trim()) {
      body.company = { name: companyName.trim(), role: companyRole.trim() };
    }

    try {
      const created = await api.post<SubmittedChallenge>('/api/challenges', body);
      setSuccess(created);
      onSubmitted?.(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg glass-panel rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="p-8">
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {!user ? (
                <div>
                  <h2 className="text-2xl font-bold mb-2">Sign in to submit</h2>
                  <p className="text-slate-400 text-sm mb-6">
                    Please sign in from the top nav to submit your own challenge to the community.
                  </p>
                  <button
                    onClick={handleClose}
                    className="w-full h-11 bg-slate-800 hover:bg-slate-700 font-bold rounded-xl transition-colors"
                  >
                    Got it
                  </button>
                </div>
              ) : success ? (
                <div className="text-center py-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 mx-auto mb-4 flex items-center justify-center">
                    <Check className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Challenge submitted</h2>
                  <p className="text-slate-400 text-sm mb-2">
                    "{success.title}" is now live.
                  </p>
                  {success.verified && success.company && (
                    <p className="text-xs text-blue-400 mb-6 flex items-center justify-center gap-1">
                      <Building2 className="w-3.5 h-3.5" />
                      Verified as {success.company.name} — featured on the carousel
                    </p>
                  )}
                  {!success.verified && (
                    <p className="text-xs text-slate-500 mb-6">
                      Visible in the Community section.
                    </p>
                  )}
                  <button
                    onClick={handleClose}
                    className="w-full h-11 bg-blue-600 hover:bg-blue-500 font-bold rounded-xl transition-colors"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold mb-2">Submit a challenge</h2>
                  <p className="text-slate-400 text-sm mb-6">
                    Share a coding challenge for the community. If your account email matches a verified
                    company, it'll appear in the Featured carousel.
                  </p>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <Field label="Title">
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        maxLength={120}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        placeholder="e.g. Drag-and-Drop Kanban Board"
                      />
                    </Field>

                    <Field label="Description">
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                        maxLength={1000}
                        rows={3}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                        placeholder="What will the builder learn or create?"
                      />
                    </Field>

                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Language / Stack">
                        <input
                          type="text"
                          value={language}
                          onChange={(e) => setLanguage(e.target.value)}
                          required
                          maxLength={40}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                          placeholder="React, TypeScript…"
                        />
                      </Field>
                      <Field label="Difficulty">
                        <select
                          value={difficulty}
                          onChange={(e) => setDifficulty(e.target.value as typeof DIFFICULTIES[number])}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        >
                          {DIFFICULTIES.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>

                    <Field label="Tags (comma-separated, max 6)">
                      <input
                        type="text"
                        value={tagsInput}
                        onChange={(e) => setTagsInput(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        placeholder="UI, Animation, Accessibility"
                      />
                    </Field>

                    <div className="pt-2 border-t border-slate-800">
                      <p className="text-xs text-slate-500 mb-3">
                        Optional company info. Verified status is set automatically based on your email
                        domain.
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Company">
                          <input
                            type="text"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            maxLength={60}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            placeholder="Acme Inc."
                          />
                        </Field>
                        <Field label="Role">
                          <input
                            type="text"
                            value={companyRole}
                            onChange={(e) => setCompanyRole(e.target.value)}
                            maxLength={60}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            placeholder="Frontend Engineer"
                          />
                        </Field>
                      </div>
                    </div>

                    {error && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
                        {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full h-11 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit Challenge'}
                    </button>
                  </form>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}
