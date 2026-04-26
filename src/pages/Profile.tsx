import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ProjectDial } from '../components/ProjectDial';
import { useProjects } from '../hooks/useProjects';
import {
  User as UserIcon,
  Github,
  Linkedin,
  Twitter,
  Pencil,
  Camera,
  AtSign,
  Check,
  AlertCircle,
} from 'lucide-react';
import { profileApi } from '../lib/profileApi';
import { api } from '../lib/api';
import { uploadAvatar, deleteAvatar } from '../lib/avatarApi';
import { AvatarCropModal } from '../components/AvatarCropModal';
import { UserProjectsList } from '../components/UserProjectsList';
import { UserChallengesList } from '../components/UserChallengesList';
import type { UserProfile } from '../types';

const emailPrefix = (email: string | null | undefined) =>
  email ? email.split('@')[0] : 'Guest';

const emptyDraft: UserProfile = {
  username: '',
  fullName: '',
  bio: '',
  avatarUrl: '',
  linkedinUrl: '',
  githubUrl: '',
  twitterUrl: '',
  updatedAt: '',
};

const LIMITS = {
  username: 30,
  fullName: 100,
  bio: 280,
  url: 300,
};

const RESERVED = new Set([
  'admin', 'settings', 'api', 'login', 'signup', 'logout',
  'null', 'undefined', 'me', 'search', 'user', 'users',
  'profile', 'profiles', 'auth', 'health', 'home',
]);

const validateUrl = (u: string) => u.trim() === '' || /^https?:\/\//i.test(u.trim());

function localUsernameError(u: string): string | null {
  const trimmed = u.trim().toLowerCase();
  if (trimmed.length === 0) return 'Username is required';
  if (trimmed.length < 3 || trimmed.length > 30) return 'Must be 3-30 characters';
  if (!/^[a-z0-9_-]+$/.test(trimmed)) return 'Only letters, numbers, _ and -';
  if (RESERVED.has(trimmed)) return 'That username is reserved';
  return null;
}

type UsernameStatus =
  | { kind: 'idle' }
  | { kind: 'invalid'; message: string }
  | { kind: 'checking' }
  | { kind: 'available' }
  | { kind: 'taken' }
  | { kind: 'unchanged' };

export function Profile() {
  const { user } = useAuth();
  const { projects } = useProjects();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<UserProfile>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [originalAvatar, setOriginalAvatar] = useState<string>('');
  const [cropOpen, setCropOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    profileApi
      .get()
      .then((p) => {
        if (!cancelled) {
          setProfile(p);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const startEdit = () => {
    const base = profile ?? emptyDraft;
    setDraft(base);
    setOriginalAvatar(base.avatarUrl);
    setSaveError(null);
    setEditing(true);
  };

  const cancelEdit = async () => {
    if (draft.avatarUrl && draft.avatarUrl !== originalAvatar && user?.id) {
      deleteAvatar(draft.avatarUrl, user.id).catch(() => {});
    }
    setEditing(false);
    setSaveError(null);
  };

  const onAvatarPicked = async (blob: Blob) => {
    if (!user?.id) throw new Error('not signed in');
    const url = await uploadAvatar(blob, user.id);
    if (draft.avatarUrl && draft.avatarUrl !== originalAvatar) {
      deleteAvatar(draft.avatarUrl, user.id).catch(() => {});
    }
    setDraft((d) => ({ ...d, avatarUrl: url }));
  };

  const updateDraft = (patch: Partial<UserProfile>) =>
    setDraft((d) => ({ ...d, ...patch }));

  const urlError = (u: string) => (validateUrl(u) ? null : 'Must start with http:// or https://');

  const linkedinErr = urlError(draft.linkedinUrl);
  const githubErr = urlError(draft.githubUrl);
  const twitterErr = urlError(draft.twitterUrl);

  const usernameLocalErr = useMemo(
    () => (editing ? localUsernameError(draft.username) : null),
    [editing, draft.username]
  );
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>({ kind: 'idle' });

  useEffect(() => {
    if (!editing) {
      setUsernameStatus({ kind: 'idle' });
      return;
    }
    if (usernameLocalErr) {
      setUsernameStatus({ kind: 'invalid', message: usernameLocalErr });
      return;
    }
    const candidate = draft.username.trim().toLowerCase();
    if (profile && candidate === profile.username) {
      setUsernameStatus({ kind: 'unchanged' });
      return;
    }
    setUsernameStatus({ kind: 'checking' });
    let cancelled = false;
    const handle = window.setTimeout(() => {
      profileApi
        .checkUsername(candidate)
        .then((r) => {
          if (cancelled) return;
          if (r.available) setUsernameStatus({ kind: 'available' });
          else setUsernameStatus({ kind: 'taken' });
        })
        .catch(() => {
          if (!cancelled) setUsernameStatus({ kind: 'idle' });
        });
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [editing, draft.username, usernameLocalErr, profile]);

  const usernameBlocksSave =
    usernameStatus.kind === 'invalid' ||
    usernameStatus.kind === 'taken' ||
    usernameStatus.kind === 'checking';

  const hasErr = !!(linkedinErr || githubErr || twitterErr) || usernameBlocksSave;

  const save = async () => {
    if (hasErr) return;
    setSaving(true);
    setSaveError(null);
    try {
      await profileApi.save(draft);
      const fresh = await profileApi.get();
      setProfile(fresh);
      if (originalAvatar && originalAvatar !== draft.avatarUrl && user?.id) {
        deleteAvatar(originalAvatar, user.id).catch(() => {});
      }
      setEditing(false);
    } catch (err) {
      setSaveError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const displayName =
    profile?.fullName?.trim() || profile?.username || emailPrefix(user?.email);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold text-white mb-8">Profile</h1>

      <div className="flex flex-col lg:flex-row gap-8 mb-12">
        {/* Profile Picture Section */}
        <div className="flex-shrink-0">
          <div className="relative w-40 h-40 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl shadow-black/20 overflow-hidden">
            {(editing ? draft.avatarUrl : profile?.avatarUrl) ? (
              <img
                src={editing ? draft.avatarUrl : profile!.avatarUrl}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                <UserIcon className="w-20 h-20 text-slate-600" />
              </div>
            )}
            {editing && (
              <button
                onClick={() => setCropOpen(true)}
                className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 text-white text-sm opacity-0 hover:opacity-100 transition-opacity"
              >
                <Camera className="w-5 h-5" />
                Change avatar
              </button>
            )}
          </div>
          <p className="text-sm text-white mt-3 font-medium">{displayName}</p>
          {profile?.username && (
            <p className="text-xs text-slate-400">@{profile.username}</p>
          )}
        </div>

        {/* Dial Section */}
        <div className="max-w-2xl h-40">
          <ProjectDial projects={projects} />
        </div>
      </div>

      <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-8 shadow-xl shadow-black/20">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-white">Account Details</h2>
          {!loading && !editing && (
            <button
              onClick={startEdit}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm text-white border border-slate-700 transition-colors"
            >
              <Pencil className="w-4 h-4" />
              Edit
            </button>
          )}
        </div>

        {loading && <p className="text-slate-400">Loading profile…</p>}

        {error && !loading && (
          <p className="text-red-400 mb-4 text-sm">Failed to load profile: {error}</p>
        )}

        {!loading && !editing && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Username" value={profile?.username ? `@${profile.username}` : ''} placeholder="Not set" />
            <Field label="Full name" value={profile?.fullName} placeholder="Not set" />
            <Field label="Email" value={user?.email ?? 'No email available'} />
            <div className="sm:col-span-2">
              <Field label="Bio" value={profile?.bio} placeholder="No bio yet" multiline />
            </div>
            <SocialField label="LinkedIn" url={profile?.linkedinUrl} Icon={Linkedin} />
            <SocialField label="GitHub" url={profile?.githubUrl} Icon={Github} />
            <SocialField label="Twitter" url={profile?.twitterUrl} Icon={Twitter} />
          </div>
        )}

        {!loading && !editing && (
          <div className="mt-8 pt-8 border-t border-slate-800">
            <h3 className="text-xl font-semibold text-white mb-4">Integrations</h3>
            <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center">
                  <Github className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="text-white font-medium">GitHub Connection</h4>
                  <p className="text-sm text-slate-400">
                    {profile?.githubAccessToken 
                      ? 'Connected. You can now export projects to your repositories.' 
                      : 'Connect your account to export projects directly to GitHub.'}
                  </p>
                </div>
              </div>
              {profile?.githubAccessToken ? (
                <button 
                  onClick={async () => {
                    try {
                      await api.post('/api/auth/github/disconnect', {});
                      window.location.reload();
                    } catch (err) {
                      alert('Failed to disconnect GitHub');
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-red-500/20 text-sm text-white hover:text-red-400 border border-slate-700 hover:border-red-500/50 transition-colors"
                >
                  Disconnect
                </button>
              ) : (
                <button 
                  onClick={async () => {
                    try {
                      const { url } = await api.get<{url: string}>('/api/auth/github/url');
                      window.location.href = url;
                    } catch (err) {
                      alert('Failed to get GitHub Auth URL. Is GITHUB_CLIENT_ID set in .env?');
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm text-white font-medium transition-colors whitespace-nowrap"
                >
                  Connect to GitHub
                </button>
              )}
            </div>
          </div>
        )}

        {!loading && editing && (
          <div className="grid gap-4 sm:grid-cols-2">
            <UsernameField
              value={draft.username}
              onChange={(v) => updateDraft({ username: v })}
              status={usernameStatus}
            />
            <InputField
              label="Full name"
              value={draft.fullName}
              onChange={(v) => updateDraft({ fullName: v })}
              maxLength={LIMITS.fullName}
              placeholder="Your name"
            />
            <ReadOnlyField label="Email" value={user?.email ?? 'No email available'} />
            <div className="sm:col-span-2">
              <InputField
                label="Bio"
                value={draft.bio}
                onChange={(v) => updateDraft({ bio: v })}
                maxLength={LIMITS.bio}
                placeholder="A short bio"
                multiline
              />
            </div>
            <InputField
              label="LinkedIn"
              icon={<Linkedin className="w-4 h-4" />}
              value={draft.linkedinUrl}
              onChange={(v) => updateDraft({ linkedinUrl: v })}
              maxLength={LIMITS.url}
              placeholder="https://linkedin.com/in/you"
              error={linkedinErr}
            />
            <InputField
              label="GitHub"
              icon={<Github className="w-4 h-4" />}
              value={draft.githubUrl}
              onChange={(v) => updateDraft({ githubUrl: v })}
              maxLength={LIMITS.url}
              placeholder="https://github.com/you"
              error={githubErr}
            />
            <InputField
              label="Twitter"
              icon={<Twitter className="w-4 h-4" />}
              value={draft.twitterUrl}
              onChange={(v) => updateDraft({ twitterUrl: v })}
              maxLength={LIMITS.url}
              placeholder="https://twitter.com/you"
              error={twitterErr}
            />

            <div className="sm:col-span-2 flex items-center justify-end gap-3 pt-2">
              {saveError && (
                <p className="text-red-400 text-sm mr-auto">Save failed: {saveError}</p>
              )}
              <button
                onClick={cancelEdit}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm text-white border border-slate-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving || hasErr}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-sm text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </div>

      {profile?.username && !editing && (
        <>
          <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-8 shadow-xl shadow-black/20 mt-6">
            <h2 className="text-2xl font-semibold text-white mb-6">Challenges authored</h2>
            <UserChallengesList username={profile.username} />
          </div>

          <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-8 shadow-xl shadow-black/20 mt-6">
            <h2 className="text-2xl font-semibold text-white mb-6">Projects</h2>
            <UserProjectsList username={profile.username} />
          </div>
        </>
      )}

      <AvatarCropModal
        open={cropOpen}
        onClose={() => setCropOpen(false)}
        onSave={onAvatarPicked}
      />
    </div>
  );
}

function UsernameField({
  value,
  onChange,
  status,
}: {
  value: string;
  onChange: (v: string) => void;
  status: UsernameStatus;
}) {
  const message = (() => {
    switch (status.kind) {
      case 'invalid':
        return { text: status.message, tone: 'red' as const, icon: <AlertCircle className="w-3.5 h-3.5" /> };
      case 'taken':
        return { text: 'Username is taken', tone: 'red' as const, icon: <AlertCircle className="w-3.5 h-3.5" /> };
      case 'checking':
        return { text: 'Checking availability…', tone: 'slate' as const, icon: null };
      case 'available':
        return { text: 'Available', tone: 'green' as const, icon: <Check className="w-3.5 h-3.5" /> };
      case 'unchanged':
        return { text: 'Current username', tone: 'slate' as const, icon: null };
      default:
        return null;
    }
  })();
  const toneClass =
    message?.tone === 'red'
      ? 'text-red-400'
      : message?.tone === 'green'
      ? 'text-green-400'
      : 'text-slate-500';

  return (
    <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-6">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
        <AtSign className="w-4 h-4" />
        Username
      </h3>
      <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg overflow-hidden focus-within:border-sky-500">
        <span className="pl-3 pr-1 text-slate-500 text-base">@</span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
          maxLength={LIMITS.username}
          placeholder="your-handle"
          autoComplete="off"
          className="flex-1 bg-transparent px-2 py-2 text-white text-base placeholder-slate-600 focus:outline-none"
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs">
        {message ? (
          <span className={`flex items-center gap-1 ${toneClass}`}>
            {message.icon}
            {message.text}
          </span>
        ) : (
          <span className="text-slate-600">&nbsp;</span>
        )}
        <span className="text-slate-600">
          {value.length} / {LIMITS.username}
        </span>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  placeholder,
  multiline,
}: {
  label: string;
  value?: string | null;
  placeholder?: string;
  multiline?: boolean;
}) {
  const display = value && value.trim().length > 0 ? value : placeholder ?? '—';
  const isEmpty = !value || value.trim().length === 0;
  return (
    <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-6">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-[0.2em] mb-3">{label}</h3>
      <p
        className={`text-lg ${isEmpty ? 'text-slate-500 italic' : 'text-white'} ${
          multiline ? 'whitespace-pre-wrap' : 'break-all'
        }`}
      >
        {display}
      </p>
    </div>
  );
}

function SocialField({
  label,
  url,
  Icon,
}: {
  label: string;
  url?: string | null;
  Icon: typeof Github;
}) {
  const has = !!url && url.trim().length > 0;
  return (
    <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-6">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
        <Icon className="w-4 h-4" />
        {label}
      </h3>
      {has ? (
        <a
          href={url!}
          target="_blank"
          rel="noopener noreferrer"
          className="text-lg text-sky-400 hover:text-sky-300 break-all"
        >
          {url}
        </a>
      ) : (
        <p className="text-lg text-slate-500 italic">Not linked</p>
      )}
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-6">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-[0.2em] mb-3">{label}</h3>
      <p className="text-lg text-slate-400 break-all">{value}</p>
    </div>
  );
}

function InputField({
  label,
  icon,
  value,
  onChange,
  maxLength,
  placeholder,
  multiline,
  error,
}: {
  label: string;
  icon?: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  maxLength: number;
  placeholder?: string;
  multiline?: boolean;
  error?: string | null;
}) {
  return (
    <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-6">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
        {icon}
        {label}
      </h3>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={maxLength}
          placeholder={placeholder}
          rows={3}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-base placeholder-slate-600 focus:outline-none focus:border-sky-500 resize-none"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={maxLength}
          placeholder={placeholder}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-base placeholder-slate-600 focus:outline-none focus:border-sky-500"
        />
      )}
      <div className="mt-2 flex items-center justify-between text-xs">
        {error ? (
          <span className="text-red-400">{error}</span>
        ) : (
          <span className="text-slate-600">&nbsp;</span>
        )}
        <span className="text-slate-600">
          {value.length} / {maxLength}
        </span>
      </div>
    </div>
  );
}
