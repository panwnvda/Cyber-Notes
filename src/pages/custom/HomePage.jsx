import React, { useState, useEffect } from 'react';
import MapNode from '../../components/MapNode';
import { persistGet, persistSet } from '../../lib/persistentStorage';
import { Plus, X, Pencil, Check } from 'lucide-react';

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

const headerColorMap = {
  cyan:   'text-cyan-400 border-cyan-500/30',
  green:  'text-emerald-400 border-emerald-500/30',
  red:    'text-red-400 border-red-500/30',
  purple: 'text-purple-400 border-purple-500/30',
  orange: 'text-orange-400 border-orange-500/30',
  pink:   'text-pink-400 border-pink-500/30',
  blue:   'text-blue-400 border-blue-500/30',
  yellow: 'text-yellow-400 border-yellow-500/30',
};

const colorPreview = {
  cyan: 'bg-cyan-500', green: 'bg-emerald-500', red: 'bg-red-500',
  purple: 'bg-purple-500', orange: 'bg-orange-500', pink: 'bg-pink-500',
  blue: 'bg-blue-500', yellow: 'bg-yellow-500',
};

const defaultMeta = {
  titleLeft: '',
  titleRight: '',
  titleLeftColor: 'red',
  description: '',
  authorInitials: '',
  authorName: '',
  authorSub: '',
  authorTag: '',
};

function loadMetaLocal(pageKey) {
  try {
    const s = localStorage.getItem(`redops_homemeta_${pageKey}`);
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

function loadColumnsLocal(pageKey) {
  try {
    const primary = localStorage.getItem(`redops_columns_${pageKey}`);
    if (primary) return JSON.parse(primary);

    const legacy = localStorage.getItem(`redops_homecolumns_${pageKey}`);
    return legacy ? JSON.parse(legacy) : [];
  } catch { return []; }
}

export default function HomePage({ pageKey }) {
  const [meta, setMetaRaw] = useState(() => loadMetaLocal(pageKey) || defaultMeta);
  const [editingMeta, setEditingMeta] = useState(false);
  const [draft, setDraft] = useState(meta);

  const [columns, setColumnsRaw] = useState(() => loadColumnsLocal(pageKey));

  useEffect(() => {
    const localMeta = loadMetaLocal(pageKey) || defaultMeta;
    const localCols = loadColumnsLocal(pageKey);
    setMetaRaw(localMeta);
    setDraft(localMeta);
    setColumnsRaw(localCols);
    setEditingMeta(false);

    persistGet(`redops_homemeta_${pageKey}`).then(val => { if (val) { setMetaRaw(val); setDraft(val); } });
    persistGet(`redops_columns_${pageKey}`).then(val => {
      if (val !== null && val !== undefined) {
        setColumnsRaw(val);
        return;
      }

      persistGet(`redops_homecolumns_${pageKey}`).then((legacyVal) => {
        if (legacyVal !== null && legacyVal !== undefined) {
          setColumnsRaw(legacyVal);
          persistSet(`redops_columns_${pageKey}`, legacyVal);
        }
      });
    });
  }, [pageKey]);

  const updateMeta = (m) => { setMetaRaw(m); persistSet(`redops_homemeta_${pageKey}`, m); };
  const setColumns = (c) => {
    setColumnsRaw(c);
    persistSet(`redops_columns_${pageKey}`, c);
    persistSet(`redops_homecolumns_${pageKey}`, c);
  };

  const handleSave = () => { updateMeta(draft); setEditingMeta(false); };
  const handleEditOpen = () => { setDraft(meta); setEditingMeta(true); };

  const [modalStep, setModalStep] = useState(null);
  const [columnName, setColumnName] = useState('');
  const [selectedColor, setSelectedColor] = useState('cyan');
  const [addingTopicCol, setAddingTopicCol] = useState(null);
  const [topicTitle, setTopicTitle] = useState('');
  const [topicTags, setTopicTags] = useState('');

  const handleAddColumnStart = () => { setColumnName(''); setModalStep('name'); };
  const handleNameSubmit = () => { if (columnName.trim()) setModalStep('color'); };
  const handleColorSubmit = () => {
    setColumns([...columns, { header: columnName.toUpperCase(), color: selectedColor, nodes: [] }]);
    setModalStep(null); setSelectedColor('cyan'); setColumnName('');
  };
  const handleDeleteColumn = (i) => setColumns(columns.filter((_, idx) => idx !== i));
  const handleAddTopic = (colIndex) => {
    if (topicTitle.trim()) {
      const updated = [...columns];
      updated[colIndex].nodes.push({
        title: topicTitle,
        subtitle: topicTags || '',
        tags: topicTags.split(',').map(t => t.trim()).filter(t => t),
        id: `topic-${Date.now()}`,
      });
      setColumns(updated); setAddingTopicCol(null); setTopicTitle(''); setTopicTags('');
    }
  };
  const handleDeleteTopic = (colIndex, nodeIndex) => {
    const updated = [...columns]; updated[colIndex].nodes.splice(nodeIndex, 1); setColumns(updated);
  };

  const leftColorClass = colorOptions.find(c => c.value === meta.titleLeftColor)?.text || 'text-red-400';
  const hasHeaderContent = Boolean(
    meta.titleLeft ||
    meta.titleRight ||
    meta.description ||
    meta.authorName ||
    meta.authorInitials ||
    meta.authorSub ||
    meta.authorTag
  );
  const isBlankCanvas = !editingMeta && !hasHeaderContent && columns.length === 0;

  return (
    <div>
      {/* Title */}
      {(meta.titleLeft || meta.titleRight) ? (
        <div className="text-center mb-3">
          <h1 className="text-3xl md:text-5xl font-bold font-mono tracking-tight">
            <span className={leftColorClass}>{meta.titleLeft}</span>
            {meta.titleLeft && meta.titleRight && <span className="text-slate-200"> </span>}
            <span className="text-slate-200">{meta.titleRight}</span>
          </h1>
        </div>
      ) : null}

      {/* Description */}
      {meta.description && (
        <div className="text-center mb-5">
          <p className="text-slate-500 font-mono text-sm">{meta.description}</p>
        </div>
      )}

      {/* Author Card */}
      {meta.authorName && (
        <div className="max-w-sm mx-auto mb-10 bg-[#0d1117] border border-slate-800/50 rounded-xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center flex-shrink-0">
            <span className="text-red-400 font-mono font-bold text-sm">{meta.authorInitials}</span>
          </div>
          <div>
            <p className="text-slate-200 font-mono font-semibold text-sm">{meta.authorName}</p>
            {meta.authorSub && <p className="text-slate-500 font-mono text-xs mt-0.5">{meta.authorSub}</p>}
            {meta.authorTag && (
              <span className="inline-block mt-1.5 text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                {meta.authorTag}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Edit Header Button */}
      {!editingMeta && !isBlankCanvas && (
        <div className="text-center mb-8">
          <button
            onClick={handleEditOpen}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-mono transition-all"
          >
            <Pencil className="w-3 h-3" /> Edit Header
          </button>
        </div>
      )}

      {/* Edit Header Form */}
      {editingMeta && (
        <div className="bg-[#0d1117] border border-slate-800 rounded-xl p-6 max-w-xl mx-auto text-left space-y-4 mb-10">
          <h3 className="text-sm font-mono font-bold text-slate-300 uppercase tracking-wider">Edit Page Header</h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-slate-500 mb-1">TITLE LEFT</label>
              <input type="text" value={draft.titleLeft} onChange={e => setDraft({ ...draft, titleLeft: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200 font-mono text-sm focus:outline-none focus:border-slate-500" />
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-500 mb-1">TITLE RIGHT</label>
              <input type="text" value={draft.titleRight} onChange={e => setDraft({ ...draft, titleRight: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200 font-mono text-sm focus:outline-none focus:border-slate-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-500 mb-2">TITLE LEFT COLOR</label>
            <div className="flex flex-wrap gap-2">
              {colorOptions.map(opt => (
                <button key={opt.value} onClick={() => setDraft({ ...draft, titleLeftColor: opt.value })}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all border ${
                    draft.titleLeftColor === opt.value
                      ? 'border-slate-400 bg-slate-700 text-slate-100'
                      : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-500'
                  }`}>
                  <div className={`w-2.5 h-2.5 rounded-full ${opt.bg}`} />{opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-500 mb-1">DESCRIPTION</label>
            <textarea value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })}
              placeholder="Brief description of this page..."
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200 placeholder-slate-500 font-mono text-xs focus:outline-none focus:border-slate-500 h-20" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-slate-500 mb-1">AUTHOR INITIALS</label>
              <input type="text" value={draft.authorInitials} onChange={e => setDraft({ ...draft, authorInitials: e.target.value })}
                maxLength={4}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200 font-mono text-sm focus:outline-none focus:border-slate-500" />
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-500 mb-1">AUTHOR NAME</label>
              <input type="text" value={draft.authorName} onChange={e => setDraft({ ...draft, authorName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200 font-mono text-sm focus:outline-none focus:border-slate-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-slate-500 mb-1">AUTHOR SUBTITLE</label>
              <input type="text" value={draft.authorSub} onChange={e => setDraft({ ...draft, authorSub: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200 font-mono text-sm focus:outline-none focus:border-slate-500" />
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-500 mb-1">AUTHOR TAG</label>
              <input type="text" value={draft.authorTag} onChange={e => setDraft({ ...draft, authorTag: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200 font-mono text-sm focus:outline-none focus:border-slate-500" />
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setEditingMeta(false)} className="flex-1 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors font-mono text-sm">Cancel</button>
            <button onClick={handleSave} className="flex-1 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors font-mono text-sm font-semibold flex items-center justify-center gap-1">
              <Check className="w-4 h-4" /> Save
            </button>
          </div>
        </div>
      )}

      {/* Map Section */}
      {!isBlankCanvas && (
        <div className="overflow-x-auto pb-4">
          <div className="inline-flex gap-4 min-w-max">
            {columns.map((col, i) => {
              const color = col.color || 'cyan';
              return (
                <div key={i} className="flex flex-col gap-2 min-w-[180px] max-w-[200px] relative">
                  <div className={`text-center py-2 border-b-2 mb-2 ${headerColorMap[color]} flex items-center justify-between px-2`}>
                    <span className="font-mono text-[11px] font-bold tracking-[0.2em] uppercase flex-1">{col.header}</span>
                    <button onClick={() => handleDeleteColumn(i)} className="text-slate-500 hover:text-slate-300 transition-colors p-0.5"><X className="w-3 h-3" /></button>
                  </div>
                  <div className="flex flex-col gap-2 border border-slate-800/50 rounded-lg p-2 bg-[#0d1117]">
                    {col.nodes.map((node, j) => (
                      <div key={j} className="flex items-start gap-1 group">
                        <div className="flex-1 min-w-0">
                          <MapNode title={node.title} subtitle={node.tags?.length > 0 ? node.tags.join(' • ') : node.subtitle} accentColor={color} small />
                        </div>
                        <button onClick={() => handleDeleteTopic(i, j)} className="text-slate-600 hover:text-red-400 transition-colors p-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                    {addingTopicCol === i ? (
                      <div className="flex flex-col gap-1">
                        <input type="text" value={topicTitle} onChange={e => setTopicTitle(e.target.value)} placeholder="Topic name"
                          className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-200 placeholder-slate-500 font-mono text-xs focus:outline-none focus:border-slate-500"
                          autoFocus onKeyDown={e => { if (e.key === 'Escape') { setAddingTopicCol(null); setTopicTitle(''); setTopicTags(''); } }} />
                        <input type="text" value={topicTags} onChange={e => setTopicTags(e.target.value)} placeholder="Tags (comma-separated)"
                          className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-200 placeholder-slate-500 font-mono text-xs focus:outline-none focus:border-slate-500"
                          onKeyDown={e => { if (e.key === 'Enter') handleAddTopic(i); if (e.key === 'Escape') { setAddingTopicCol(null); setTopicTitle(''); setTopicTags(''); } }} />
                        <div className="flex gap-1">
                          <button onClick={() => handleAddTopic(i)} className="flex-1 px-2 py-1 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-mono rounded transition-colors">Add</button>
                          <button onClick={() => { setAddingTopicCol(null); setTopicTitle(''); setTopicTags(''); }} className="flex-1 px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-mono rounded transition-colors">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setAddingTopicCol(i)} className="px-2 py-1 text-xs font-mono text-slate-500 hover:text-slate-300 border border-dashed border-slate-700 rounded hover:border-slate-500 transition-colors">+ Add Topic</button>
                    )}
                  </div>
                </div>
              );
            })}
            <div className="flex flex-col gap-2 min-w-[180px] max-w-[200px]">
              <button onClick={handleAddColumnStart} className="h-full min-h-[100px] flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-700 rounded-lg p-4 hover:border-slate-500 hover:bg-slate-800/20 transition-all">
                <Plus className="w-6 h-6 text-slate-500" /><span className="text-xs font-mono text-slate-500 text-center">Add Column</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Column Modal */}
      {modalStep && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#0d1117] border border-slate-800 rounded-lg p-6 max-w-sm w-full mx-4">
            {modalStep === 'name' && (
              <div className="space-y-4">
                <h3 className="text-lg font-mono font-bold text-slate-200">Column Name</h3>
                <input type="text" value={columnName} onChange={e => setColumnName(e.target.value)} placeholder="e.g., Custom Category"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 font-mono text-sm focus:outline-none focus:border-slate-500"
                  autoFocus onKeyDown={e => e.key === 'Enter' && handleNameSubmit()} />
                <div className="flex gap-2">
                  <button onClick={() => setModalStep(null)} className="flex-1 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors font-mono text-sm">Cancel</button>
                  <button onClick={handleNameSubmit} className="flex-1 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors font-mono text-sm font-semibold">Next</button>
                </div>
              </div>
            )}
            {modalStep === 'color' && (
              <div className="space-y-4">
                <h3 className="text-lg font-mono font-bold text-slate-200">Choose Color</h3>
                <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                  {colorOptions.map(option => (
                    <button key={option.value} onClick={() => setSelectedColor(option.value)}
                      className={`px-4 py-2 rounded-lg text-sm font-mono font-semibold transition-all flex items-center gap-2 ${selectedColor === option.value ? `${colorPreview[option.value]} text-slate-900` : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
                      <div className={`w-3 h-3 rounded-full ${colorPreview[option.value]}`} />{option.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setModalStep('name')} className="flex-1 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors font-mono text-sm">Back</button>
                  <button onClick={handleColorSubmit} className="flex-1 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors font-mono text-sm font-semibold">Create</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
