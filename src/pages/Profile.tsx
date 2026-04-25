import { useAuth } from '../contexts/AuthContext';
import { useProjects } from '../hooks/useProjects';
import { ProjectDial } from '../components/ProjectDial';
import { User as UserIcon } from 'lucide-react';

export function Profile() {
  const { user } = useAuth();
  const { projects } = useProjects();

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold text-white mb-8">Profile</h1>

      <div className="flex flex-col lg:flex-row gap-8 mb-12">
        {/* Profile Picture Section */}
        <div className="flex-shrink-0">
          <div className="w-40 h-40 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl shadow-black/20 flex items-center justify-center overflow-hidden">
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
              <UserIcon className="w-20 h-20 text-slate-600" />
            </div>
          </div>
          <p className="text-sm text-slate-400 mt-3">{user?.email ? user.email.split('@')[0] : 'Guest'}</p>
        </div>

        {/* Dial Section */}
        <div className="max-w-2xl h-40">
          <ProjectDial projects={projects} />
        </div>
      </div>

      <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-8 shadow-xl shadow-black/20">
        <h2 className="text-2xl font-semibold text-white mb-6">Account Details</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-6">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-[0.2em] mb-3">Email</h3>
            <p className="text-lg text-white break-all">{user?.email ?? 'No email available'}</p>
          </div>
          <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-6">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-[0.2em] mb-3">Username</h3>
            <p className="text-lg text-white">{user?.email ? user.email.split('@')[0] : 'Guest'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}