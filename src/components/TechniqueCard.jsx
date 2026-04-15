import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import CodeBlock from './CodeBlock';

export default function TechniqueCard({ title, subtitle, tags = [], accentColor = 'cyan', overview, steps = [], commands = [], subsections = [] }) {
  const [expanded, setExpanded] = useState(false);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [expandedSubsections, setExpandedSubsections] = useState(new Set());

  const toggleStep = (e, i) => {
    e.stopPropagation();
    setCompletedSteps(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const colorMap = {
    cyan:   { border: 'border-cyan-500/30',   bg: 'bg-cyan-500/5',   tag: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',   title: 'text-cyan-400',   glow: 'hover:shadow-cyan-500/5',   circleFilled: 'bg-cyan-500 border-cyan-500 text-slate-900',   circleEmpty: 'bg-slate-800 border-slate-600 text-cyan-400' },
    green:  { border: 'border-emerald-500/30', bg: 'bg-emerald-500/5', tag: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', title: 'text-emerald-400', glow: 'hover:shadow-emerald-500/5', circleFilled: 'bg-emerald-500 border-emerald-500 text-slate-900', circleEmpty: 'bg-slate-800 border-slate-600 text-emerald-400' },
    red:    { border: 'border-red-500/30',     bg: 'bg-red-500/5',     tag: 'bg-red-500/10 text-red-400 border-red-500/20',         title: 'text-red-400',     glow: 'hover:shadow-red-500/5',     circleFilled: 'bg-red-500 border-red-500 text-white',           circleEmpty: 'bg-slate-800 border-slate-600 text-red-400' },
    purple: { border: 'border-purple-500/30',  bg: 'bg-purple-500/5',  tag: 'bg-purple-500/10 text-purple-400 border-purple-500/20',  title: 'text-purple-400',  glow: 'hover:shadow-purple-500/5',  circleFilled: 'bg-purple-500 border-purple-500 text-white',     circleEmpty: 'bg-slate-800 border-slate-600 text-purple-400' },
    orange: { border: 'border-orange-500/30',  bg: 'bg-orange-500/5',  tag: 'bg-orange-500/10 text-orange-400 border-orange-500/20',  title: 'text-orange-400',  glow: 'hover:shadow-orange-500/5',  circleFilled: 'bg-orange-500 border-orange-500 text-slate-900', circleEmpty: 'bg-slate-800 border-slate-600 text-orange-400' },
    pink:   { border: 'border-pink-500/30',    bg: 'bg-pink-500/5',    tag: 'bg-pink-500/10 text-pink-400 border-pink-500/20',       title: 'text-pink-400',    glow: 'hover:shadow-pink-500/5',    circleFilled: 'bg-pink-500 border-pink-500 text-white',         circleEmpty: 'bg-slate-800 border-slate-600 text-pink-400' },
    blue:   { border: 'border-blue-500/30',    bg: 'bg-blue-500/5',    tag: 'bg-blue-500/10 text-blue-400 border-blue-500/20',       title: 'text-blue-400',    glow: 'hover:shadow-blue-500/5',    circleFilled: 'bg-blue-500 border-blue-500 text-white',         circleEmpty: 'bg-slate-800 border-slate-600 text-blue-400' },
    yellow: { border: 'border-yellow-500/30',  bg: 'bg-yellow-500/5',  tag: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',  title: 'text-yellow-400',  glow: 'hover:shadow-yellow-500/5',  circleFilled: 'bg-yellow-500 border-yellow-500 text-slate-900', circleEmpty: 'bg-slate-800 border-slate-600 text-yellow-400' },
  };

  const colors = colorMap[accentColor] || colorMap.cyan;
  const completedCount = completedSteps.size;
  const totalSteps = steps.length;

  return (
    <div className={`technique-card rounded-xl border ${colors.border} ${colors.bg} backdrop-blur-sm overflow-hidden hover:shadow-lg ${colors.glow} transition-all`}>
      <div
        className="p-5 cursor-pointer flex items-start justify-between gap-4"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <h3 className={`font-bold text-base ${colors.title} font-mono`}>{title}</h3>
          {subtitle && <p className="text-slate-400 text-sm mt-1">{subtitle}</p>}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {tags.map((tag, i) => (
                <span key={i} className={`text-[11px] px-2 py-0.5 rounded-full border font-mono ${colors.tag}`}>
                  {tag}
                </span>
              ))}
            </div>
          )}
          {totalSteps > 0 && completedCount > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${accentColor === 'cyan' ? 'bg-cyan-500' : accentColor === 'green' ? 'bg-emerald-500' : accentColor === 'red' ? 'bg-red-500' : accentColor === 'purple' ? 'bg-purple-500' : accentColor === 'orange' ? 'bg-orange-500' : accentColor === 'pink' ? 'bg-pink-500' : accentColor === 'blue' ? 'bg-blue-500' : 'bg-yellow-500'}`}
                  style={{ width: `${(completedCount / totalSteps) * 100}%` }}
                />
              </div>
              <span className={`text-[10px] font-mono ${colors.title}`}>{completedCount}/{totalSteps}</span>
            </div>
          )}
        </div>
        <div className="text-slate-500 mt-1 flex-shrink-0">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-5 border-t border-slate-700/30 pt-4">
          {subsections.length > 0 && (
            <div className="mb-6">
              <h4 className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-3">Web App Attack Vectors</h4>
              <div className="space-y-2">
                {subsections.map((sub, i) => {
                  const subExpanded = expandedSubsections.has(i);
                  return (
                    <div key={i} className={`rounded-lg border ${subExpanded ? colors.border : 'border-slate-700/30'} ${colors.bg} overflow-hidden`}>
                      <button
                        onClick={() => setExpandedSubsections(prev => {
                          const next = new Set(prev);
                          if (next.has(i)) next.delete(i); else next.add(i);
                          return next;
                        })}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-800/20 transition-colors"
                      >
                        <div className="flex-1 text-left">
                          <h5 className={`font-mono text-sm font-semibold ${colors.title}`}>{sub.title}</h5>
                          <p className="text-xs text-slate-400 mt-1">{sub.description}</p>
                        </div>
                        <div className="text-slate-500 flex-shrink-0">
                          {subExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </button>
                      {subExpanded && (
                        <div className="px-4 py-3 border-t border-slate-700/30 bg-slate-900/30">
                          <div className="flex flex-wrap gap-1.5">
                            {sub.tags.map((tag, j) => (
                              <span key={j} className={`text-[10px] px-2 py-0.5 rounded-full border font-mono ${colors.tag}`}>
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {overview && (
            <div className="mb-5">
              <h4 className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-2">Overview</h4>
              <p className="text-sm text-slate-400 leading-relaxed">{overview}</p>
            </div>
          )}

          {steps.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-3">
                Step-by-Step Process
                <span className="ml-2 text-slate-700 normal-case">— click circle to mark done</span>
              </h4>
              <div className="space-y-0">
                {steps.map((step, i) => {
                  const done = completedSteps.has(i);
                  return (
                    <div key={i} className="flex gap-3 step-connector pb-4">
                      <button
                        onClick={(e) => toggleStep(e, i)}
                        title={done ? 'Click to unmark' : 'Click to mark done'}
                        className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer select-none ${done ? 'bg-slate-800/60 border-slate-700 text-slate-600' : colors.circleEmpty}`}
                      >
                        <span className="text-xs font-mono font-bold">{i + 1}</span>
                      </button>
                      <div className={`flex-1 pt-1 transition-opacity ${done ? 'opacity-30' : ''}`}>
                        <p className={`text-sm leading-relaxed transition-all ${done ? 'text-slate-600' : 'text-slate-300'}`}>{step}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {commands.map((cmd, i) => (
            <CodeBlock key={i} title={cmd.title}>
              {cmd.code}
            </CodeBlock>
          ))}
        </div>
      )}
    </div>
  );
}