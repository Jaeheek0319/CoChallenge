import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

type ChallengeState = 'open' | 'closed' | 'graded';

interface ChallengePreviewData {
  challengeId?: string;
  state?: ChallengeState;
  dueDate?: string;
  title: string;
  description: string;
  difficulty: string;
  primaryLanguage: string;
  tags: string[];
  requirements: string;
  resources: string;
  starterCode: string;
  estimatedTime: string;
  isCompanyChallenge: boolean;
  companyName?: string;
}

function getPreviewState(challenge: ChallengePreviewData): ChallengeState {
  if (challenge.state === 'graded') return 'graded';
  const due = challenge.dueDate ? Date.parse(challenge.dueDate) : NaN;
  if (Number.isFinite(due) && Date.now() >= due) return 'closed';
  return challenge.state ?? 'open';
}

export function PreviewChallenge() {
  const navigate = useNavigate();
  const location = useLocation();
  const challengeData = location.state as ChallengePreviewData | undefined;

  if (!challengeData) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-slate-400 mb-4">No challenge data provided</p>
          <button
            onClick={() => navigate('/challenges')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-colors"
          >
            Back to Challenges
          </button>
        </div>
      </div>
    );
  }

  const challengeState = getPreviewState(challengeData);

  return (
    <div className="min-h-screen bg-slate-950 py-12">
      <div className="max-w-3xl mx-auto px-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3 mb-2">
            {challengeData.isCompanyChallenge && challengeData.companyName && (
              <span className="px-2 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full text-xs font-bold">
                {challengeData.companyName}
              </span>
            )}
            {challengeData.title}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-3 py-1 bg-slate-800 text-slate-300 rounded-full font-bold">
              {challengeData.difficulty}
            </span>
            <span className="px-3 py-1 bg-slate-800 text-slate-300 rounded-full font-bold">
              {challengeData.primaryLanguage}
            </span>
            {challengeData.estimatedTime && (
              <span className="px-3 py-1 bg-slate-800 text-slate-300 rounded-full font-bold">
                {challengeData.estimatedTime}
              </span>
            )}
            {challengeState === 'closed' && (
              <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-full font-bold">
                Closed
              </span>
            )}
            {challengeState === 'graded' && (
              <span className="px-3 py-1 bg-violet-500/10 border border-violet-500/20 text-violet-300 rounded-full font-bold">
                Graded
              </span>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-900/50 border border-slate-800 p-6 space-y-5">
          <div>
            <h3 className="text-sm font-bold text-slate-300 mb-2 uppercase tracking-wider">Description</h3>
            <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
              {challengeData.description}
            </p>
          </div>

          {challengeData.requirements && (
            <div>
              <h3 className="text-sm font-bold text-slate-300 mb-2 uppercase tracking-wider">Requirements</h3>
              <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                {challengeData.requirements}
              </p>
            </div>
          )}

          {challengeData.resources && (
            <div>
              <h3 className="text-sm font-bold text-slate-300 mb-2 uppercase tracking-wider">Resources</h3>
              <p className="text-sm text-slate-400 whitespace-pre-wrap">
                {challengeData.resources}
              </p>
            </div>
          )}

          {challengeData.tags.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-slate-300 mb-2 uppercase tracking-wider">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {challengeData.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-slate-800 text-slate-300 rounded-lg text-xs font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {challengeData.challengeId && challengeState === 'open' && (
          <div className="mt-6">
            <button
              onClick={() => navigate(`/challenges/${challengeData.challengeId}/submit`)}
              className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-colors shadow-lg shadow-blue-900/30 active:scale-95"
            >
              Submit your project
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
