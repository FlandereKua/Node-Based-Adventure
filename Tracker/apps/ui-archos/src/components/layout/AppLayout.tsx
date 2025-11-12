import { NavLink } from 'react-router-dom';
import type { PropsWithChildren } from 'react';
import { useContentStore } from '@app/state/useContentStore';
import { useEffect } from 'react';

const links = [
  { to: '/battle', label: 'Battle' },
  { to: '/hero', label: 'Hero' },
  { to: '/skills', label: 'Skills' },
  { to: '/creator', label: 'Creator' },
  { to: '/load-save', label: 'Load/Save' },
  { to: '/settings', label: 'Settings' }
];

const AppLayout = ({ children }: PropsWithChildren) => {
  const loadContent = useContentStore((state) => state.loadContent);
  const preset = useContentStore((state) => state.preset);
  const loading = useContentStore((state) => state.loading);
  const error = useContentStore((state) => state.error);

  useEffect(() => {
    loadContent(preset);
  }, [preset, loadContent]);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <header className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">ArchOS Codex Interface</p>
          <h1 className="text-2xl font-semibold text-white">Node-Based Adventure UI</h1>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="rounded-full bg-slate-900 px-3 py-1 text-slate-300">Preset: {preset}</span>
          <button
            type="button"
            onClick={() => loadContent(preset)}
            className="rounded-md border border-emerald-400 px-4 py-2 font-medium text-emerald-200 transition hover:bg-emerald-500/20"
          >
            {loading ? 'Refreshing…' : 'Reload Data'}
          </button>
        </div>
      </header>
      {error && <div className="bg-amber-500/10 px-6 py-3 text-sm text-amber-200">{error}</div>}
      <div className="grid min-h-[calc(100vh-88px)] grid-cols-[220px_1fr]">
        <nav className="border-r border-slate-800 bg-[#0f172a] px-4 py-6">
          <p className="mb-3 text-xs uppercase tracking-wide text-slate-500">Navigate</p>
          <ul className="space-y-1">
            {links.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  className={({ isActive }) =>
                    `flex items-center rounded-md px-3 py-2 text-sm font-medium transition hover:bg-slate-800 ${
                      isActive ? 'bg-slate-800 text-emerald-300 shadow-lg' : 'text-slate-300'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
          <div className="mt-6 text-xs text-slate-500">
            <p className="font-semibold uppercase tracking-wide">Keyboard</p>
            <p>Tab/Shift+Tab, Arrows, Enter, Esc, 1-9 for skills, D for distance.</p>
          </div>
        </nav>
        <main className="max-h-[calc(100vh-88px)] overflow-y-auto px-6 py-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
