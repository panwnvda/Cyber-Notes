import React, { useEffect, useState } from 'react';
import {
  X,
  Shield,
  Layers,
  FileText,
  FolderOpen,
  Sparkles,
  MousePointer,
  Download,
  Upload,
  Lock,
  Zap,
} from 'lucide-react';

const featureCards = [
  {
    icon: Layers,
    title: 'Methodology Maps',
    description: 'Build column-based TTP maps with topics and nested structure for your workflow.',
    accent: 'text-cyan-400',
    surface: 'bg-cyan-500/10 border-cyan-500/20',
  },
  {
    icon: FileText,
    title: 'Technique Cards',
    description: 'Capture procedures, steps, and code blocks in a structured reusable format.',
    accent: 'text-purple-400',
    surface: 'bg-purple-500/10 border-purple-500/20',
  },
  {
    icon: FolderOpen,
    title: 'Local Project Files',
    description: 'Export and import full workspaces with portable `.cybernotes` snapshots.',
    accent: 'text-emerald-400',
    surface: 'bg-emerald-500/10 border-emerald-500/20',
  },
  {
    icon: Sparkles,
    title: 'Smart Page Seeding',
    description: 'Generate a structured page skeleton from a prompt to speed up setup.',
    accent: 'text-amber-400',
    surface: 'bg-amber-500/10 border-amber-500/20',
  },
];

const workflowSteps = [
  {
    icon: MousePointer,
    label: 'Create',
    text: 'Add a page, choose a type, and optionally generate a starting structure.',
  },
  {
    icon: Download,
    label: 'Document',
    text: 'Capture techniques, references, and notes directly inside the workspace.',
  },
  {
    icon: Upload,
    label: 'Export',
    text: 'Save your current state locally and restore it later from the same project file.',
  },
];

const storageBadges = [
  { icon: Lock, label: 'Local-first storage', tone: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10' },
  { icon: Zap, label: 'Fast project restore', tone: 'text-cyan-400 border-cyan-500/20 bg-cyan-500/10' },
  { icon: Sparkles, label: 'Guided page setup', tone: 'text-amber-400 border-amber-500/20 bg-amber-500/10' },
];

const DISMISS_KEY = 'redops_welcome_modal_dismissed';

export default function WelcomeModal() {
  const [open, setOpen] = useState(false);
  const [persistDismissal, setPersistDismissal] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY) !== 'true') {
        setOpen(true);
      }
    } catch {
      setOpen(true);
    }
  }, []);

  const handleClose = () => {
    if (persistDismissal) {
      try {
        localStorage.setItem(DISMISS_KEY, 'true');
      } catch {}
    }
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, persistDismissal]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-md">
      <div className="flex min-h-screen items-center justify-center p-4 md:p-8">
        <div className="relative w-full max-w-5xl overflow-hidden rounded-[28px] border border-slate-700/60 bg-[#09101a] shadow-2xl shadow-black/50">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,0.14),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.12),transparent_30%)]" />

          <button
            type="button"
            onClick={handleClose}
            className="absolute right-4 top-4 z-10 rounded-full border border-slate-700/70 bg-slate-900/80 p-2 text-slate-400 transition-colors hover:text-slate-100"
            aria-label="Close welcome modal"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="relative grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
            <section className="border-b border-slate-800/80 p-6 md:p-8 lg:border-b-0 lg:border-r">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-[11px] font-mono uppercase tracking-[0.18em] text-red-300">
                <Shield className="h-3.5 w-3.5" />
                Red-Notes Overview
              </div>

              <div className="max-w-2xl">
                <h1 className="text-3xl font-black tracking-tight text-white md:text-5xl">
                  Structured notes for red team operations.
                </h1>
                <p className="mt-4 max-w-xl text-sm leading-6 text-slate-400 md:text-base">
                  Red-Notes is a local-first workspace for organizing offensive security methodology,
                  documenting techniques, and managing project references in one place.
                </p>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {storageBadges.map(({ icon: Icon, label, tone }) => (
                  <span
                    key={label}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-mono ${tone}`}
                  >
                    <Icon className="h-3 w-3" />
                    {label}
                  </span>
                ))}
              </div>

              <div className="mt-8 grid gap-3 md:grid-cols-2">
                {featureCards.map(({ icon: Icon, title, description, accent, surface }) => (
                  <div key={title} className={`rounded-2xl border p-4 ${surface}`}>
                    <div className={`mb-3 inline-flex rounded-xl bg-slate-950/60 p-2 ${accent}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <h2 className="font-mono text-sm font-semibold text-slate-100">{title}</h2>
                    <p className="mt-2 text-xs leading-5 text-slate-400">{description}</p>
                  </div>
                ))}
              </div>
            </section>

            <aside className="p-6 md:p-8">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/45 p-5">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-slate-500">How It Works</p>
                <div className="mt-5 space-y-4">
                  {workflowSteps.map(({ icon: Icon, label, text }, index) => (
                    <div key={label} className="flex gap-3">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-cyan-300">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-mono text-xs uppercase tracking-[0.16em] text-slate-500">
                          {String(index + 1).padStart(2, '0')} {label}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-slate-300">{text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-800 bg-[#0d1117] p-5">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-slate-500">Recommended Workflow</p>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  Use the notebook as the active workspace, then export after meaningful changes.
                  The project file is the portable source of truth.
                </p>

                <label className="mt-5 flex cursor-pointer items-center gap-3 text-sm text-slate-400">
                  <input
                    type="checkbox"
                    checked={persistDismissal}
                    onChange={(event) => setPersistDismissal(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-cyan-500 focus:ring-cyan-500"
                  />
                  Don&apos;t show this again on launch
                </label>

                <button
                  type="button"
                  onClick={handleClose}
                  className="mt-5 w-full rounded-xl bg-cyan-600 px-4 py-3 font-mono text-sm font-semibold text-white transition-colors hover:bg-cyan-500"
                >
                  Open Workspace
                </button>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
