import { Trophy } from 'lucide-react';
import { getEloRank } from '../lib/ranks';

export function EloRankBadge({
  elo,
  overallRank,
  compact = false,
}: {
  elo: number;
  overallRank?: number | null;
  compact?: boolean;
}) {
  const rank = getEloRank(elo);
  const rankLabel = rank.division ? `${rank.label} ${rank.division}` : rank.label;

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border font-bold ${rank.badgeClassName} ${
        compact ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
      }`}
    >
      <Trophy className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      <span>{rankLabel}</span>
      {rank.showElo && <span className="text-current/80">{elo} ELO</span>}
      {rank.showOverallRank && overallRank && (
        <span className="text-current/80">#{overallRank} overall</span>
      )}
    </div>
  );
}
