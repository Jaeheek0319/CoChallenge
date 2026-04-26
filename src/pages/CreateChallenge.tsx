import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Plus, X, Sparkles } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

const DIFFICULTY_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const LANGUAGES = [
  'JavaScript', 'TypeScript', 'Python', 'React', 'Next.js',
  'Vue.js', 'Angular', 'HTML/CSS', 'Java', 'C++'
];
const COMMON_TAGS = [
  'Web Development', 'UI/UX', 'Performance', 'Accessibility',
  'Game Dev', 'Data Structures', 'Algorithms', 'API Design',
  'Database', 'DevOps', 'Mobile', 'Animation'
];

export function CreateChallenge() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const defaultDueDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    d.setMinutes(0, 0, 0);
    // datetime-local needs a 'YYYY-MM-DDTHH:MM' string in local time
    const tzOffsetMs = d.getTimezoneOffset() * 60_000;
    return new Date(d.getTime() - tzOffsetMs).toISOString().slice(0, 16);
  })();

  const minDueDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const tzOffsetMs = d.getTimezoneOffset() * 60_000;
    return new Date(d.getTime() - tzOffsetMs).toISOString().slice(0, 16);
  })();

  const maxDueDate = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    const tzOffsetMs = d.getTimezoneOffset() * 60_000;
    return new Date(d.getTime() - tzOffsetMs).toISOString().slice(0, 16);
  })();

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    difficulty: 'Intermediate',
    primaryLanguage: 'JavaScript',
    tags: [] as string[],
    requirements: '',
    resources: '',
    starterCode: '',
    estimatedTime: '4 hours',
    dueDate: defaultDueDate,
    isCompanyChallenge: false,
    companyName: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const toggleTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Challenge title is required';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Challenge description is required';
    }
    if (!formData.requirements.trim()) {
      newErrors.requirements = 'Requirements are required';
    }
    if (formData.tags.length === 0) {
      newErrors.tags = 'Select at least one tag';
    }
    if (!formData.dueDate) {
      newErrors.dueDate = 'Due date is required';
    } else {
      const due = new Date(formData.dueDate);
      const ms = due.getTime();
      const now = Date.now();
      if (!Number.isFinite(ms)) {
        newErrors.dueDate = 'Invalid due date';
      } else if (ms - now < 24 * 60 * 60 * 1000) {
        newErrors.dueDate = 'Due date must be at least 1 day from now';
      } else if (ms - now > 365 * 24 * 60 * 60 * 1000) {
        newErrors.dueDate = 'Due date must be within 1 year';
      }
    }
    if (formData.isCompanyChallenge && !formData.companyName.trim()) {
      newErrors.companyName = 'Company name is required for company challenges';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePreview = () => {
    if (!validateForm()) {
      return;
    }

    // Navigate to preview page with form data
    navigate('/preview-challenge', { state: formData });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) {
      return;
    }

    if (!user) {
      setSubmitError('Please sign in before submitting a challenge.');
      return;
    }

    setIsSubmitting(true);

    try {
      const body = {
        title: formData.title,
        description: formData.description,
        language: formData.primaryLanguage,
        difficulty: formData.difficulty,
        tags: formData.tags,
        requirements: formData.requirements,
        resources: formData.resources,
        starterCode: formData.starterCode,
        estimatedTime: formData.estimatedTime,
        dueDate: new Date(formData.dueDate).toISOString(),
        company: formData.isCompanyChallenge
          ? { name: formData.companyName, role: '' }
          : undefined,
      };

      await api.post('/api/challenges', body);

      navigate('/challenges', {
        state: { successMessage: 'Challenge created successfully!' },
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit challenge');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-slate-950 py-12">
        <div className="max-w-md mx-auto px-6">
          <div className="glass-panel rounded-2xl p-10 text-center">
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl inline-flex mb-4">
              <Sparkles className="w-6 h-6 text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Sign in to submit</h1>
            <p className="text-slate-400 text-sm mb-6">
              You need an account to share a challenge with the community. Sign in from the
              top nav and come back.
            </p>
            <button
              onClick={() => navigate('/challenges')}
              className="w-full h-11 bg-slate-800 hover:bg-slate-700 font-bold rounded-xl transition-colors"
            >
              Back to Challenges
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 py-12">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <button
            onClick={() => navigate('/challenges')}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Challenges
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <Sparkles className="w-6 h-6 text-blue-400" />
            </div>
            <h1 className="text-4xl font-bold">Create a Challenge</h1>
          </div>
          <p className="text-slate-400 text-lg max-w-2xl">
            Share your coding challenge with the community and help developers learn and grow.
          </p>
        </motion.div>

        {/* Form */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleSubmit}
          className="space-y-8"
        >
          {/* Basic Info */}
          <div className="glass-panel rounded-2xl p-8 border border-slate-800">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-sm font-bold text-blue-400">
                1
              </span>
              Basic Information
            </h2>

            <div className="space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">
                  Challenge Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="e.g., Build a Real-time Chat Application"
                  className={`w-full bg-slate-900 border rounded-lg px-4 py-3 text-white placeholder-slate-600 transition-colors focus:outline-none ${
                    errors.title
                      ? 'border-red-500/50 focus:border-red-500'
                      : 'border-slate-700 focus:border-blue-500'
                  }`}
                />
                {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title}</p>}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe what this challenge is about and what developers will learn..."
                  rows={4}
                  className={`w-full bg-slate-900 border rounded-lg px-4 py-3 text-white placeholder-slate-600 transition-colors focus:outline-none resize-none ${
                    errors.description
                      ? 'border-red-500/50 focus:border-red-500'
                      : 'border-slate-700 focus:border-blue-500'
                  }`}
                />
                {errors.description && <p className="text-red-400 text-xs mt-1">{errors.description}</p>}
              </div>


              {/* Company Name */}
              {formData.isCompanyChallenge && (
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => handleInputChange('companyName', e.target.value)}
                    placeholder="e.g., Stripe, Vercel, Airbnb"
                    className={`w-full bg-slate-900 border rounded-lg px-4 py-3 text-white placeholder-slate-600 transition-colors focus:outline-none ${
                      errors.companyName
                        ? 'border-red-500/50 focus:border-red-500'
                        : 'border-slate-700 focus:border-blue-500'
                    }`}
                  />
                  {errors.companyName && <p className="text-red-400 text-xs mt-1">{errors.companyName}</p>}
                </div>
              )}
            </div>
          </div>

          {/* Technical Details */}
          <div className="glass-panel rounded-2xl p-8 border border-slate-800">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-sm font-bold text-blue-400">
                2
              </span>
              Technical Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Due Date */}
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">
                  Due Date *
                </label>
                <input
                  type="datetime-local"
                  value={formData.dueDate}
                  min={minDueDate}
                  max={maxDueDate}
                  onChange={(e) => handleInputChange('dueDate', e.target.value)}
                  className={`w-full bg-slate-900 border rounded-lg px-4 py-3 text-white focus:outline-none transition-colors ${
                    errors.dueDate
                      ? 'border-red-500/50 focus:border-red-500'
                      : 'border-slate-700 focus:border-blue-500'
                  }`}
                />
                {errors.dueDate ? (
                  <p className="text-red-400 text-xs mt-1">{errors.dueDate}</p>
                ) : (
                  <p className="text-xs text-slate-500 mt-1">Submissions close at this time. Min 1 day, max 1 year.</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Difficulty */}
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">
                  Difficulty Level
                </label>
                <select
                  value={formData.difficulty}
                  onChange={(e) => handleInputChange('difficulty', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                >
                  {DIFFICULTY_LEVELS.map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>

              {/* Primary Language */}
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">
                  Primary Language
                </label>
                <select
                  value={formData.primaryLanguage}
                  onChange={(e) => handleInputChange('primaryLanguage', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                >
                  {LANGUAGES.map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
              </div>

              {/* Estimated Time */}
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">
                  Estimated Time
                </label>
                <input
                  type="text"
                  value={formData.estimatedTime}
                  onChange={(e) => handleInputChange('estimatedTime', e.target.value)}
                  placeholder="e.g., 4 hours"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Requirements & Resources */}
          <div className="glass-panel rounded-2xl p-8 border border-slate-800">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-sm font-bold text-blue-400">
                3
              </span>
              Requirements & Resources
            </h2>

            <div className="space-y-6">
              {/* Requirements */}
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">
                  Requirements *
                </label>
                <textarea
                  value={formData.requirements}
                  onChange={(e) => handleInputChange('requirements', e.target.value)}
                  placeholder="What must developers build? Include specific features, constraints, and acceptance criteria.&#10;&#10;Example:&#10;- Create a responsive UI that works on mobile and desktop&#10;- Implement user authentication&#10;- Add real-time updates using WebSockets"
                  rows={5}
                  className={`w-full bg-slate-900 border rounded-lg px-4 py-3 text-white placeholder-slate-600 transition-colors focus:outline-none resize-none ${
                    errors.requirements
                      ? 'border-red-500/50 focus:border-red-500'
                      : 'border-slate-700 focus:border-blue-500'
                  }`}
                />
                {errors.requirements && <p className="text-red-400 text-xs mt-1">{errors.requirements}</p>}
              </div>

              {/* Resources */}
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">
                  Resources & References (Optional)
                </label>
                <textarea
                  value={formData.resources}
                  onChange={(e) => handleInputChange('resources', e.target.value)}
                  placeholder="Links to documentation, tutorials, or tools that might help developers solve this challenge."
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                />
              </div>
            </div>
          </div>

          {/* Starter Code */}
          <div className="glass-panel rounded-2xl p-8 border border-slate-800">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-sm font-bold text-blue-400">
                4
              </span>
              Starter Code (Optional)
            </h2>

            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">
                Provide Starter Code
              </label>
              <textarea
                value={formData.starterCode}
                onChange={(e) => handleInputChange('starterCode', e.target.value)}
                placeholder="Paste starter code that developers can use as a foundation.&#10;&#10;Example:&#10;function calculateSum(arr) {&#10;  // TODO: Implement this function&#10;  return 0;&#10;}"
                rows={6}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors resize-none font-mono text-sm"
              />
              <p className="text-xs text-slate-500 mt-2">Leave empty if you don't want to provide starter code.</p>
            </div>
          </div>

          {/* Tags */}
          <div className="glass-panel rounded-2xl p-8 border border-slate-800">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-sm font-bold text-blue-400">
                5
              </span>
              Tags *
            </h2>

            <div className="flex flex-wrap gap-3">
              {COMMON_TAGS.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-4 py-2 rounded-full font-medium text-sm transition-all ${
                    formData.tags.includes(tag)
                      ? 'bg-blue-600 text-white border border-blue-500'
                      : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700 hover:text-slate-300'
                  }`}
                >
                  {formData.tags.includes(tag) && <Plus className="w-4 h-4 inline mr-1" />}
                  {tag}
                </button>
              ))}
            </div>
            {errors.tags && <p className="text-red-400 text-xs mt-2">{errors.tags}</p>}

            {formData.tags.length > 0 && (
              <div className="mt-6 p-4 bg-slate-900/50 rounded-lg border border-slate-800">
                <p className="text-sm text-slate-400 mb-2">Selected tags:</p>
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-2 px-3 py-1 bg-slate-800 text-slate-300 rounded-full text-xs"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className="hover:text-white transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {submitError && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-300">
              {submitError}
            </div>
          )}

          {/* Submit Button */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex gap-4 pt-4"
          >
            <button
              type="button"
              onClick={() => navigate('/challenges')}
              className="flex-1 px-6 py-4 rounded-xl font-bold text-slate-300 border border-slate-700 hover:border-slate-600 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePreview}
              className="flex-1 px-6 py-4 rounded-xl font-bold text-slate-300 border border-blue-500/30 hover:border-blue-500 hover:text-blue-400 transition-colors bg-blue-600/5"
            >
              Preview
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-4 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white transition-all active:scale-95 shadow-lg shadow-blue-900/30"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Publishing...
                </span>
              ) : (
                'Publish Challenge'
              )}
            </button>
          </motion.div>
        </motion.form>
      </div>
    </div>
  );
}
