import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { User as UserIcon, Github, Linkedin, Twitter } from 'lucide-react';
import type { UserProfile, UserProject, PublicProjectSummary } from '../types';
import { usersApi } from '../lib/usersApi';
import { UserProjectsList } from '../components/UserProjectsList';
import { UserChallengesList } from '../components/UserChallengesList';
import { ProjectDial } from '../components/ProjectDial';
import { WinsDial } from '../components/WinsDial';
import { EloHistoryChart } from '../components/EloHistoryChart';

const EMPTY_WINS = {
  byDifficulty: { Beginner: 0, Intermediate: 0, Advanced: 0 },
  byPlacement: { first: 0, second: 0, third: 0 },
};

function toDialProjects(items: PublicProjectSummary[]): UserProject[] {
  return items.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    language: p.language as UserProject['language'],
    difficulty: p.difficulty as UserProject['difficulty'],
    learningGoals: p.learningGoals,
    files: [],
    steps: Array.from({ length: p.totalSteps }, () => ({
      title: '',
      explanation: '',
      task: '',
      hint: '',
      solution: '',
    })),
    currentStep: p.currentStep,
    updatedAt: p.updatedAt,
  }));
}

export function PublicProfile() {
  const { username = '' } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialProjects, setDialProjects] = useState<UserProject[]>([]);
  const [wins, setWins] = useState(EMPTY_WINS);

  useEffect(() => {
    if (!username) return;
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setError(null);
    setDialProjects([]);
    setWins(EMPTY_WINS);

    usersApi
      .get(username)
      .then((p) => {
        if (!cancelled) setProfile(p as UserProfile);
      })
      .catch((err) => {
        if (cancelled) return;
        if (String(err).includes('not found')) setNotFound(true);
        else setError(String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    usersApi
      .projects(username)
      .then((items) => {
        if (!cancelled) setDialProjects(toDialProjects(items));
      })
      .catch(() => {});

    usersApi
      .podiumWins(username)
      .then((data) => {
        if (!cancelled) {
          setWins({ byDifficulty: data.byDifficulty, byPlacement: data.byPlacement });
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [username]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-slate-400">Loading profile…</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold text-white mb-4">User not found</h1>
        <p className="text-slate-400">No profile exists at @{username}.</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-red-400">Failed to load profile: {error ?? 'unknown error'}</p>
      </div>
    );
  }

  const displayName = profile.fullName?.trim() || profile.username;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col lg:flex-row gap-8 mb-10">
        <div className="flex-shrink-0">
          <div className="w-40 h-40 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl shadow-black/20 overflow-hidden">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                <UserIcon className="w-20 h-20 text-slate-600" />
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-semibold text-white">{displayName}</h1>
          <p className="text-sm text-slate-400 mt-1">@{profile.username}</p>
          {profile.bio && (
            <p className="text-slate-300 mt-4 whitespace-pre-wrap">{profile.bio}</p>
          )}
          <div className="flex items-center gap-3 mt-5 flex-wrap">
            {profile.linkedinUrl && (
              <SocialLink href={profile.linkedinUrl} Icon={Linkedin} label="LinkedIn" />
            )}
            {profile.githubUrl && (
              <SocialLink href={profile.githubUrl} Icon={Github} label="GitHub" />
            )}
            {profile.twitterUrl && (
              <SocialLink href={profile.twitterUrl} Icon={Twitter} label="Twitter" />
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        <ProjectDial projects={dialProjects} />
        <WinsDial byDifficulty={wins.byDifficulty} byPlacement={wins.byPlacement} />
      </div>

      <div className="mb-6">
        <EloHistoryChart username={profile.username} />
      </div>

      <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-8 shadow-xl shadow-black/20 mt-6">
        <h2 className="text-2xl font-semibold text-white mb-6">Challenges authored</h2>
        <UserChallengesList username={profile.username} />
      </div>

      <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-8 shadow-xl shadow-black/20 mt-6">
        <h2 className="text-2xl font-semibold text-white mb-6">Projects</h2>
        <UserProjectsList username={profile.username} />
      </div>
    </div>
  );
}

function SocialLink({
  href,
  Icon,
  label,
}: {
  href: string;
  Icon: typeof Github;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-sm text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
    >
      <Icon className="w-4 h-4" />
      {label}
    </a>
  );
}
