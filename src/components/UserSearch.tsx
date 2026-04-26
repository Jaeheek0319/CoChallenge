import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User as UserIcon } from 'lucide-react';
import { usersApi } from '../lib/usersApi';
import type { PublicUser } from '../types';

export function UserSearch() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<PublicUser[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trimmed = q.trim();
    if (trimmed.length < 1) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setBusy(true);
    const handle = window.setTimeout(() => {
      usersApi
        .search(trimmed)
        .then((r) => {
          if (!cancelled) setResults(r);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setBusy(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
      setBusy(false);
    };
  }, [q]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const go = (username: string) => {
    setOpen(false);
    setQ('');
    navigate(`/u/${username}`);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && results[0]) {
      e.preventDefault();
      go(results[0].username);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={wrapRef}>
      <div className="flex items-center bg-slate-800/60 border border-slate-700 rounded-full px-3 h-9 w-56 focus-within:border-slate-500">
        <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <input
          type="text"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Find people"
          className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 px-2 focus:outline-none"
        />
      </div>

      {open && q.trim().length > 0 && (
        <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 z-50 max-h-80 overflow-y-auto">
          {busy && results.length === 0 && (
            <p className="px-4 py-3 text-sm text-slate-400">Searching…</p>
          )}
          {!busy && results.length === 0 && (
            <p className="px-4 py-3 text-sm text-slate-500 italic">No matches.</p>
          )}
          {results.map((r) => (
            <button
              key={r.username}
              onClick={() => go(r.username)}
              className="w-full text-left flex items-center gap-3 px-4 py-2 hover:bg-slate-800 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-slate-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
                {r.avatarUrl ? (
                  <img src={r.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-4 h-4 text-slate-500" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white text-sm truncate">{r.fullName?.trim() || r.username}</p>
                <p className="text-slate-500 text-xs truncate">@{r.username}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
