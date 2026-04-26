import { useEffect, useMemo, useState } from 'react';
import { Loader2, TrendingUp } from 'lucide-react';
import { api } from '../lib/api';

interface EloChange {
  id: string;
  userId: string;
  challengeId: string;
  delta: number;
  newRating: number;
  reason: string;
  createdAt: string;
}

const ELO_STARTING_VALUE = 500;
const CHART_W = 700;
const CHART_H = 240;
const PADDING = { top: 24, right: 24, bottom: 36, left: 48 };

export function EloHistoryChart() {
  const [changes, setChanges] = useState<EloChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get<EloChange[]>('/api/users/me/elo-history')
      .then((data) => {
        if (!cancelled) setChanges(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const data = useMemo(() => {
    if (changes.length === 0) return [];
    // Prepend starting value as a synthetic anchor right before the first change
    const firstTime = Date.parse(changes[0].createdAt);
    return [
      {
        time: Number.isFinite(firstTime) ? firstTime - 1 : Date.now(),
        rating: ELO_STARTING_VALUE,
        reason: 'Starting rating',
      },
      ...changes.map((c) => ({
        time: Date.parse(c.createdAt),
        rating: c.newRating,
        reason: c.reason,
      })),
    ];
  }, [changes]);

  if (loading) {
    return (
      <Card>
        <Header />
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Loading history…
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <Header />
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-300">
          {error}
        </div>
      </Card>
    );
  }

  if (data.length <= 1) {
    return (
      <Card>
        <Header />
        <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl">
          <TrendingUp className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 mb-1">No elo changes yet.</p>
          <p className="text-slate-500 text-sm">
            Place top 3 in a verified challenge to start your rating history.
          </p>
        </div>
      </Card>
    );
  }

  // Compute axis bounds
  const minTime = data[0].time;
  const maxTime = data[data.length - 1].time;
  const ratings = data.map((d) => d.rating);
  const rawMin = Math.min(...ratings);
  const rawMax = Math.max(...ratings);
  const yPad = Math.max(50, Math.round((rawMax - rawMin) * 0.2) || 50);
  const minRating = Math.max(0, rawMin - yPad);
  const maxRating = rawMax + yPad;

  const innerW = CHART_W - PADDING.left - PADDING.right;
  const innerH = CHART_H - PADDING.top - PADDING.bottom;

  const xFor = (t: number) => {
    if (maxTime === minTime) return PADDING.left + innerW / 2;
    return PADDING.left + ((t - minTime) / (maxTime - minTime)) * innerW;
  };
  const yFor = (r: number) => {
    if (maxRating === minRating) return PADDING.top + innerH / 2;
    return PADDING.top + (1 - (r - minRating) / (maxRating - minRating)) * innerH;
  };

  const linePath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xFor(d.time).toFixed(1)} ${yFor(d.rating).toFixed(1)}`)
    .join(' ');

  const areaPath =
    `M ${xFor(data[0].time).toFixed(1)} ${(PADDING.top + innerH).toFixed(1)} ` +
    data
      .map((d) => `L ${xFor(d.time).toFixed(1)} ${yFor(d.rating).toFixed(1)}`)
      .join(' ') +
    ` L ${xFor(data[data.length - 1].time).toFixed(1)} ${(PADDING.top + innerH).toFixed(1)} Z`;

  // Y-axis ticks: 4 evenly spaced
  const yTicks = Array.from({ length: 4 }, (_, i) => {
    const v = minRating + ((maxRating - minRating) * i) / 3;
    return Math.round(v);
  });

  const fmtDate = (ms: number) => new Date(ms).toLocaleDateString();
  const currentRating = data[data.length - 1].rating;
  const startRating = data[0].rating;
  const totalDelta = currentRating - startRating;

  return (
    <Card>
      <Header current={currentRating} delta={totalDelta} />
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-auto"
          style={{ minWidth: 320 }}
        >
          <defs>
            <linearGradient id="eloAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(56, 189, 248, 0.35)" />
              <stop offset="100%" stopColor="rgba(56, 189, 248, 0)" />
            </linearGradient>
          </defs>

          {/* Y-axis grid + labels */}
          {yTicks.map((v) => {
            const y = yFor(v);
            return (
              <g key={v}>
                <line
                  x1={PADDING.left}
                  x2={CHART_W - PADDING.right}
                  y1={y}
                  y2={y}
                  stroke="rgba(51, 65, 85, 0.4)"
                  strokeDasharray="3 3"
                />
                <text
                  x={PADDING.left - 8}
                  y={y + 4}
                  fontSize="11"
                  fill="rgb(148, 163, 184)"
                  textAnchor="end"
                >
                  {v}
                </text>
              </g>
            );
          })}

          {/* Area under curve */}
          <path d={areaPath} fill="url(#eloAreaGradient)" />

          {/* Line */}
          <path
            d={linePath}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Data points */}
          {data.map((d, i) => (
            <g key={i}>
              <circle
                cx={xFor(d.time)}
                cy={yFor(d.rating)}
                r={i === 0 || i === data.length - 1 ? 5 : 3.5}
                fill="#0ea5e9"
                stroke="#0c1424"
                strokeWidth="2"
              >
                <title>{`${d.rating} elo · ${fmtDate(d.time)}\n${d.reason}`}</title>
              </circle>
            </g>
          ))}

          {/* X-axis: first / last date */}
          <text
            x={xFor(minTime)}
            y={CHART_H - 12}
            fontSize="11"
            fill="rgb(148, 163, 184)"
            textAnchor="start"
          >
            {fmtDate(minTime)}
          </text>
          <text
            x={xFor(maxTime)}
            y={CHART_H - 12}
            fontSize="11"
            fill="rgb(148, 163, 184)"
            textAnchor="end"
          >
            {fmtDate(maxTime)}
          </text>
        </svg>
      </div>
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-8 shadow-xl shadow-black/20">
      {children}
    </div>
  );
}

function Header({ current, delta }: { current?: number; delta?: number } = {}) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
        <TrendingUp className="w-6 h-6 text-sky-400" />
        Elo history
      </h2>
      {current !== undefined && delta !== undefined && (
        <div className="flex items-center gap-3 text-sm">
          <div>
            <span className="text-slate-500">Current</span>
            <span className="ml-2 font-bold text-white">{current}</span>
          </div>
          <div>
            <span
              className={`font-bold ${
                delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-red-400' : 'text-slate-400'
              }`}
            >
              {delta > 0 ? '+' : ''}
              {delta}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
