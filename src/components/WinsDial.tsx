import React from 'react';
import { Trophy } from 'lucide-react';

interface WinsDialProps {
  byDifficulty?: { Beginner: number; Intermediate: number; Advanced: number };
  byPlacement?: { first: number; second: number; third: number };
}

export function WinsDial({
  byDifficulty = { Beginner: 0, Intermediate: 0, Advanced: 0 },
  byPlacement = { first: 0, second: 0, third: 0 },
}: WinsDialProps) {
  const total = byDifficulty.Beginner + byDifficulty.Intermediate + byDifficulty.Advanced;

  const easyPct = total > 0 ? (byDifficulty.Beginner / total) * 100 : 0;
  const medPct = total > 0 ? (byDifficulty.Intermediate / total) * 100 : 0;
  const hardPct = total > 0 ? (byDifficulty.Advanced / total) * 100 : 0;

  const radius = 65;
  const centerX = 75;
  const centerY = 75;
  const startAngle = 180;

  const getArcPath = (a: number, b: number, rad: number) => {
    const aRad = (a * Math.PI) / 180;
    const bRad = (b * Math.PI) / 180;
    const x1 = centerX + rad * Math.cos(aRad);
    const y1 = centerY + rad * Math.sin(aRad);
    const x2 = centerX + rad * Math.cos(bRad);
    const y2 = centerY + rad * Math.sin(bRad);
    const largeArc = b - a > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${rad} ${rad} 0 ${largeArc} 1 ${x2} ${y2}`;
  };

  const easyEnd = startAngle + easyPct * 1.8;
  const medEnd = easyEnd + medPct * 1.8;
  const hardEnd = medEnd + hardPct * 1.8;

  return (
    <div className="glass-panel rounded-3xl pt-7 pb-7 px-4">
      <div className="flex items-center justify-between">
        <div className="relative w-42 h-24 flex items-center justify-center">
          <svg
            className="absolute"
            width="150"
            height="70"
            viewBox="0 0 150 75"
            preserveAspectRatio="none"
          >
            <path
              d={getArcPath(180, 0, radius)}
              fill="none"
              stroke="rgba(51, 65, 85, 0.3)"
              strokeWidth="12"
              strokeLinecap="round"
            />
            {easyPct > 0 && (
              <path
                d={getArcPath(startAngle, easyEnd, radius)}
                fill="none"
                stroke="#10b981"
                strokeWidth="12"
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            )}
            {medPct > 0 && (
              <path
                d={getArcPath(easyEnd, medEnd, radius)}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="12"
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            )}
            {hardPct > 0 && (
              <path
                d={getArcPath(medEnd, hardEnd, radius)}
                fill="none"
                stroke="#ef4444"
                strokeWidth="12"
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            )}
          </svg>

          <div className="absolute left-1/2 top-full transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
            <div className="text-center absolute bottom-0">
              <div className="text-2xl font-bold text-white">{total}</div>
              <div className="flex items-center justify-center gap-1 mt-1 text-sm text-amber-300">
                <Trophy className="w-4 h-4" />
                <span>{total === 1 ? 'Win' : 'Wins'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 ml-4">
          <div className="flex gap-4">
            <div className="bg-emerald-400/20 rounded-lg p-2 border border-emerald-400/30 text-center min-w-16">
              <span className="text-xs font-semibold text-emerald-400">Easy</span>
              <span className="text-sm font-bold text-white block">{byDifficulty.Beginner}</span>
            </div>
            <div className="bg-amber-400/20 rounded-lg p-2 border border-amber-400/30 text-center min-w-16">
              <span className="text-xs font-semibold text-amber-400">Medium</span>
              <span className="text-sm font-bold text-white block">{byDifficulty.Intermediate}</span>
            </div>
            <div className="bg-red-400/20 rounded-lg p-2 border border-red-400/30 text-center min-w-16">
              <span className="text-xs font-semibold text-red-400">Hard</span>
              <span className="text-sm font-bold text-white block">{byDifficulty.Advanced}</span>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="bg-amber-300/20 rounded-lg p-2 border border-amber-300/30 text-center min-w-16">
              <span className="text-xs font-semibold text-amber-300">🥇 1st</span>
              <span className="text-sm font-bold text-white block">{byPlacement.first}</span>
            </div>
            <div className="bg-slate-300/20 rounded-lg p-2 border border-slate-300/30 text-center min-w-16">
              <span className="text-xs font-semibold text-slate-300">🥈 2nd</span>
              <span className="text-sm font-bold text-white block">{byPlacement.second}</span>
            </div>
            <div className="bg-orange-500/20 rounded-lg p-2 border border-orange-500/30 text-center min-w-16">
              <span className="text-xs font-semibold text-orange-400">🥉 3rd</span>
              <span className="text-sm font-bold text-white block">{byPlacement.third}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
