import React, { useState, useEffect } from 'react';
import { Pencil, Check, Plus, X } from 'lucide-react';
import { persistGet, persistSet } from '../../lib/persistentStorage';

const colorOptions = [
  { value: 'cyan',   label: 'Cyan',   text: 'text-cyan-400',    bg: 'bg-cyan-500' },
  { value: 'green',  label: 'Green',  text: 'text-emerald-400', bg: 'bg-emerald-500' },
  { value: 'red',    label: 'Red',    text: 'text-red-400',     bg: 'bg-red-500' },
  { value: 'purple', label: 'Purple', text: 'text-purple-400',  bg: 'bg-purple-500' },
  { value: 'orange', label: 'Orange', text: 'text-orange-400',  bg: 'bg-orange-500' },
  { value: 'pink',   label: 'Pink',   text: 'text-pink-400',    bg: 'bg-pink-500' },
  { value: 'blue',   label: 'Blue',   text: 'text-blue-400',    bg: 'bg-blue-500' },
  { value: 'yellow', label: 'Yellow', text: 'text-yellow-400',  bg: 'bg-yellow-500' },
];

export default function TextPage({ pageKey }) {
  const defaultMeta = { title: 'My Page', titleColor: 'cyan' };

  const localLoad = (key, fb) => { try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fb; } catch { return fb; } };

  const [meta, setMetaRaw] = useState(() => localLoad(`redops_meta_${pageKey}`, defaultMeta));
  const [sections, setSectionsRaw] = useState(() => localLoad(`redops_text_${pageKey}`, []));
  const [editingMeta, setEditingMeta] = useState(false);
  const [draftMeta, setDraftMeta] = useState(meta);
  const [editingSection, setEditingSection] = useState(null);
  const [draftSection, setDraftSection] = useState(null);

  useEffect(() => {
    persistGet(`redops_meta_${pageKey}`).then(val => { if (val) setMetaRaw(val); });
    persistGet(`redops_text_${pageKey}`).then(val => { if (val) setSectionsRaw(val); });
  }, [pageKey]);

  const updateMeta = (m) => { setMetaRaw(m); persistSet(`redops_meta_${pageKey}`, m); };
  const updateSections = (s) => { setSectionsRaw(s); persistSet(`redops_text_${pageKey}`, s); };

  const handleSaveMeta = () => { updateMeta(draftMeta); setEditingMeta(false); };

  const handleAddSection = () => {
    const newSection = { title: '', body: '', id: `s-${Date.now()}` };
    const updated = [...sections, newSection];
    updateSections(updated);
    setEditingSection(updated.length - 1);
    setDraftSection({ ...newSection });
  };

  const handleSaveSection = (index) => {
    const updated = [...sections];
    updated[index] = { ...draftSection };
    updateSections(updated);
    setEditingSection(null);
    setDraftSection(null);
  };

  const handleDeleteSection = (index) => {
    updateSections(sections.filter((_, i) => i !== index));
    if (editingSection === index) { setEditingSection(null); setDraftSection(null); }
  };

  const titleColorClass = colorOptions.find(c => c.value === meta.titleColor)?.text || 'text-cyan-400';

  return (
    <div className="space-y-10 max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center">
        {!editingMeta ? (
          <div>
            <h1 className="text-3xl md:text-5xl font-bold font-mono tracking-tight">
              <span className={titleColorClass}>{meta.title}</span>
            </h1>
            <button
              onClick={() => { setDraftMeta(meta); setEditingMeta(true); }}
              className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-mono transition-all"
            >
              <Pencil className="w-3 h-3" /> Edit Title
            </button>
          </div>
        ) : (
          <div className="bg-[#0d1117] border border-slate-800 rounded-xl p-6 max-w-xl mx-auto text-left space-y-4">
            <h3 className="text-sm font-mono font-bold text-slate-300 uppercase tracking-wider">Edit Title</h3>
            <div>
              <label className="block text-xs font-mono text-slate-500 mb-1">TITLE</label>
              <input type="text" value={draftMeta.title} onChange={e => setDraftMeta({ ...draftMeta, title: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200 font-mono text-sm focus:outline-none focus:border-slate-500" />
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-500 mb-2">TITLE COLOR</label>
              <div className="flex flex-wrap gap-2">
                {colorOptions.map(opt => (
                  <button key={opt.value} onClick={() => setDraftMeta({ ...draftMeta, titleColor: opt.value })}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all border ${draftMeta.titleColor === opt.value ? 'border-slate-400 bg-slate-700 text-slate-100' : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-500'}`}>
                    <div className={`w-2.5 h-2.5 rounded-full ${opt.bg}`} />{opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditingMeta(false)} className="flex-1 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors font-mono text-sm">Cancel</button>
              <button onClick={handleSaveMeta} className="flex-1 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors font-mono text-sm font-semibold flex items-center justify-center gap-1">
                <Check className="w-4 h-4" /> Save
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sections */}
      <div className="space-y-6">
        {sections.map((section, index) => (
          <div key={section.id} className="group relative bg-[#0d1117] border border-slate-800/50 rounded-xl overflow-hidden">
            {editingSection === index ? (
              <div className="p-5 space-y-3">
                <input
                  type="text"
                  value={draftSection.title}
                  onChange={e => setDraftSection({ ...draftSection, title: e.target.value })}
                  placeholder="Section title (optional)"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200 font-mono text-sm font-semibold focus:outline-none focus:border-slate-500"
                />
                <textarea
                  value={draftSection.body}
                  onChange={e => setDraftSection({ ...draftSection, body: e.target.value })}
                  placeholder="Write your content here..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200 placeholder-slate-500 font-mono text-sm focus:outline-none focus:border-slate-500 min-h-[200px] resize-y"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button onClick={() => { setEditingSection(null); setDraftSection(null); if (!section.title && !section.body) handleDeleteSection(index); }}
                    className="flex-1 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors font-mono text-sm">Cancel</button>
                  <button onClick={() => handleSaveSection(index)}
                    className="flex-1 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors font-mono text-sm font-semibold flex items-center justify-center gap-1">
                    <Check className="w-4 h-4" /> Save
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-5">
                {section.title && (
                  <h2 className="font-mono font-bold text-slate-200 text-lg mb-3 border-b border-slate-800 pb-2">{section.title}</h2>
                )}
                <p className="text-slate-400 font-mono text-sm leading-relaxed whitespace-pre-wrap">
                  {section.body || <span className="text-slate-600 italic">Empty section</span>}
                </p>
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditingSection(index); setDraftSection({ ...section }); }}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDeleteSection(index)}
                    className="p-1.5 bg-slate-800 hover:bg-red-900/40 text-slate-400 hover:text-red-400 rounded transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        <button onClick={handleAddSection}
          className="w-full py-4 border-2 border-dashed border-slate-700 rounded-xl text-slate-500 hover:text-slate-300 hover:border-slate-500 transition-all font-mono text-sm flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" /> Add Section
        </button>
      </div>
    </div>
  );
}