import { ClipboardList } from 'lucide-react';
import { MyChallengesCreated } from '../components/MyChallengesCreated';

export function MyChallenges() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-3 bg-violet-500/10 border border-violet-500/20 rounded-xl">
            <ClipboardList className="w-6 h-6 text-violet-400" />
          </div>
          <div>
            <h1 className="text-4xl font-bold">My Challenges</h1>
            <p className="text-slate-400 font-medium">
              Challenges you've posted for other builders to take on. Grade them once they close.
            </p>
          </div>
        </div>
      </div>
      <MyChallengesCreated />
    </div>
  );
}
