import { Swords } from 'lucide-react';
import { ChallengeDojo } from '../components/ChallengeDojo';

export function ChallengeDojoPage() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <Swords className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-4xl font-bold">Challenge Dojo</h1>
            <p className="text-slate-400 font-medium">
              Your active drafts and past challenge submissions.
            </p>
          </div>
        </div>
      </div>
      <ChallengeDojo />
    </div>
  );
}
