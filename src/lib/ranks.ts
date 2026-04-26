export type EloRankTier =
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'platinum'
  | 'diamond'
  | 'master'
  | 'legend';

export interface EloRank {
  tier: EloRankTier;
  label: string;
  division: 'I' | 'II' | 'III' | 'IV' | null;
  minElo: number;
  showElo: boolean;
  showOverallRank: boolean;
  badgeClassName: string;
}

const DIVISIONS: Array<'I' | 'II' | 'III' | 'IV'> = ['I', 'II', 'III', 'IV'];

const TIER_RANGES: Array<{
  tier: EloRankTier;
  label: string;
  min: number;
  max: number;
  badgeClassName: string;
}> = [
  {
    tier: 'bronze',
    label: 'Bronze',
    min: 0,
    max: 799,
    badgeClassName: 'bg-orange-500/10 border-orange-500/25 text-orange-200',
  },
  {
    tier: 'silver',
    label: 'Silver',
    min: 800,
    max: 1599,
    badgeClassName: 'bg-slate-300/10 border-slate-300/25 text-slate-200',
  },
  {
    tier: 'gold',
    label: 'Gold',
    min: 1600,
    max: 2399,
    badgeClassName: 'bg-amber-400/10 border-amber-400/25 text-amber-200',
  },
  {
    tier: 'platinum',
    label: 'Platinum',
    min: 2400,
    max: 3199,
    badgeClassName: 'bg-cyan-400/10 border-cyan-400/25 text-cyan-200',
  },
  {
    tier: 'diamond',
    label: 'Diamond',
    min: 3200,
    max: 3999,
    badgeClassName: 'bg-blue-400/10 border-blue-400/25 text-blue-200',
  },
];

function normalizeElo(elo: number): number {
  if (!Number.isFinite(elo)) return 0;
  return Math.max(0, Math.floor(elo));
}

export function getEloRank(elo: number): EloRank {
  const normalized = normalizeElo(elo);

  if (normalized >= 5000) {
    return {
      tier: 'legend',
      label: 'Legend',
      division: null,
      minElo: 5000,
      showElo: true,
      showOverallRank: true,
      badgeClassName: 'bg-gradient-to-r from-amber-400/20 to-sky-400/20 border-amber-300/40 text-amber-100',
    };
  }

  if (normalized >= 4000) {
    return {
      tier: 'master',
      label: 'Master',
      division: null,
      minElo: 4000,
      showElo: true,
      showOverallRank: false,
      badgeClassName: 'bg-red-500/10 border-red-500/30 text-red-200',
    };
  }

  const tier = TIER_RANGES.find((r) => normalized >= r.min && normalized <= r.max) ?? TIER_RANGES[0];
  const division = DIVISIONS[Math.floor((normalized - tier.min) / 200)] ?? 'IV';
  return {
    tier: tier.tier,
    label: tier.label,
    division,
    minElo: tier.min,
    showElo: false,
    showOverallRank: false,
    badgeClassName: tier.badgeClassName,
  };
}

export function formatEloRank(elo: number): string {
  const rank = getEloRank(elo);
  return rank.division ? `${rank.label} ${rank.division}` : rank.label;
}
