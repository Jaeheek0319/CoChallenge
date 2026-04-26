import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Search, Trophy, User as UserIcon } from 'lucide-react';
import { EloRankBadge } from '../components/EloRankBadge';
import { usersApi, type LeaderboardUser } from '../lib/usersApi';

function displayName(user: LeaderboardUser): string {
  return user.fullName.trim() || user.username;
}

function podiumClass(rank: number): string {
  if (rank === 1) return 'border-amber-400/40 bg-amber-400/10';
  if (rank === 2) return 'border-slate-300/35 bg-slate-300/10';
  if (rank === 3) return 'border-orange-400/35 bg-orange-400/10';
  return 'border-slate-800 bg-slate-900/60';
}

export function Leaderboard() {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    usersApi
      .leaderboard()
      .then((data) => {
        if (!cancelled) {
          setUsers(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((user) =>
      user.username.toLowerCase().includes(q) ||
      user.fullName.toLowerCase().includes(q),
    );
  }, [query, users]);

  const topThree = users.slice(0, 3);

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-amber-400 mb-3 font-bold text-sm tracking-widest uppercase">
            <Trophy className="w-4 h-4" />
            Global leaderboard
          </div>
          <h1 className="text-4xl font-bold mb-2">Top Builders</h1>
          <p className="text-slate-400 font-medium">
            Ranked by verified challenge ELO. Master and Legend builders display their rating directly.
          </p>
        </div>
      </div>

      <div className="mb-10 relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
        </div>
        <input
          type="text"
          placeholder="Search builders..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3.5 bg-slate-900/50 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-white placeholder-slate-500 transition-all text-lg"
        />
      </div>

      {error && (
        <div className="mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mr-3" />
          Loading leaderboard...
        </div>
      ) : users.length === 0 ? (
        <div className="text-center p-12 glass-panel rounded-3xl border-dashed">
          <Trophy className="w-10 h-10 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">No ranked builders yet</h3>
          <p className="text-slate-500 max-w-md mx-auto">
            Complete verified challenges and place high to start the leaderboard.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {topThree.length > 0 && !query && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {topThree.map((user) => (
                <Link
                  key={user.username}
                  to={`/u/${user.username}`}
                  className={`rounded-2xl border p-5 transition-colors hover:border-blue-400/40 ${podiumClass(user.globalRank)}`}
                >
                  <div className="flex items-start justify-between gap-3 mb-5">
                    <div className="text-3xl font-black text-white/90">#{user.globalRank}</div>
                    <EloRankBadge elo={user.elo} overallRank={user.globalRank} compact />
                  </div>
                  <div className="flex items-center gap-3">
                    <Avatar user={user} size="lg" />
                    <div className="min-w-0">
                      <h2 className="font-bold text-white truncate">{displayName(user)}</h2>
                      <p className="text-sm text-slate-400 truncate">@{user.username}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="rounded-3xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-xl shadow-black/20">
            <div className="grid grid-cols-[72px_minmax(0,1fr)_auto] gap-4 px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-800">
              <span>Rank</span>
              <span>Builder</span>
              <span className="text-right">Rating</span>
            </div>
            {filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No builders match your search.</div>
            ) : (
              <div className="divide-y divide-slate-800">
                {filteredUsers.map((user) => (
                  <Link
                    key={user.username}
                    to={`/u/${user.username}`}
                    className="grid grid-cols-[72px_minmax(0,1fr)_auto] gap-4 px-5 py-4 items-center hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="text-lg font-black text-slate-300">#{user.globalRank}</div>
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar user={user} />
                      <div className="min-w-0">
                        <div className="font-bold text-white truncate">{displayName(user)}</div>
                        <div className="text-sm text-slate-500 truncate">@{user.username}</div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <EloRankBadge elo={user.elo} overallRank={user.globalRank} compact />
                      <span className="text-xs font-mono text-slate-500">{user.elo} ELO</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Avatar({ user, size = 'md' }: { user: LeaderboardUser; size?: 'md' | 'lg' }) {
  const box = size === 'lg' ? 'w-14 h-14' : 'w-11 h-11';
  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={`${displayName(user)} avatar`}
        className={`${box} rounded-2xl object-cover border border-slate-700 bg-slate-800 shrink-0`}
      />
    );
  }
  return (
    <div className={`${box} rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0`}>
      <UserIcon className={size === 'lg' ? 'w-7 h-7 text-slate-500' : 'w-5 h-5 text-slate-500'} />
    </div>
  );
}
