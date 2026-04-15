import React, { useState, useEffect } from 'react';
import MapNode from '../../components/MapNode';
import AddCardModal from '../../components/AddCardModal';
import DraggableCardList from '../../components/DraggableCardList';
import { usePageStorage } from '../../hooks/usePageStorage';
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

export default function NotesPage({ pageKey }) {
  const defaultMeta = { title: 'My Notes', titleColor: 'cyan', description: '', tags: [] };

  const loadMeta = (key) => {
    try { const s = localStorage.getItem(`redops_meta_${key}`); return s ? JSON.parse(s) : defaultMeta; } catch { return defaultMeta; }
  };

  const [meta, setMetaRaw] = useState(() => loadMeta(pageKey));
  const [editingMeta, setEditingMeta] = useState(false);
  const [draftMeta, setDraftMeta] = useState(meta);
  const [draftTagsRaw, setDraftTagsRaw] = useState('');

  useEffect(() => {
    const localMeta = loadMeta(pageKey);
    setMetaRaw(localMeta);
    setDraftMeta(localMeta);
    setEditingMeta(false);
    persistGet(`redops_meta_${pageKey}`).then(val => { if (val) { setMetaRaw(val); setDraftMeta(val); } });
  }, [pageKey]);

  const updateMeta = (newMeta) => { setMetaRaw(newMeta); persistSet(`redops_meta_${pageKey}`, newMeta); };

  const handleSaveMeta = () => {
    const parsedTags = draftTagsRaw.split(',').map(t => t.trim()).filter(t => t);
    updateMeta({ ...draftMeta, tags: parsedTags });
    setEditingMeta(false);
  };

  const { columns, setColumns, allCards, addCustomCard, updateCard, deleteCard, reorderCards } =
    usePageStorage(pageKey, [], []);

  const [modalStep, setModalStep] = useState(null);
  const [columnName, setColumnName] = useState('');
  const [selectedColor, setSelectedColor] = useState('cyan');
  const [addingTopicCol, setAddingTopicCol] = useState(null);
  const [topicTitle, setTopicTitle] = useState('');
  const [topicTags, setTopicTags] = useState('');
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState(null);

  const handleCardSubmit = (card) => {
    if (editingCard) { updateCard(card); setEditingCard(null); }
    else addCustomCard(card);
  };

  const handleAddColumnStart = () => setModalStep('name');
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
        subtitle: topicTags || 'Custom topic',
        tags: topicTags.split(',').map(t => t.trim()).filter(t => t),
        id: `topic-${Date.now()}`
      });
      setColumns(updated); setAddingTopicCol(null); setTopicTitle(''); setTopicTags('');
    }
  };
  const handleDeleteTopic = (colIndex, nodeIndex) => {
    const updated = [...columns]; updated[colIndex].nodes.splice(nodeIndex, 1); setColumns(updated);
  };
  const scrollTo = (id) => { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

  const titleColorClass = colorOptions.find(c => c.value === meta.titleColor)?.text || 'text-cyan-400';

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="text-center mb-10">
        {!editingMeta ? (
          <div className="group relative inline-block w-full">
            <h1 className="text-3xl md:text-5xl font-bold font-mono tracking-tight">
              <span className={titleColorClass}>{meta.title}</span>
            </h1>
            {meta.tags.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mt-3">
                {meta.tags.map((tag, i) => (
                  <span key={i} className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {meta.description && (
              <p className="text-slate-500 font-mono text-sm mt-3">{meta.description}</p>
            )}
            <button
              onClick={() => { setDraftMeta(meta); setDraftTagsRaw(meta.tags.join(', ')); setEditingMeta(true); }}
              className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-mono transition-all"
            >
              <Pencil className="w-3 h-3" /> Edit Header
            </button>
          </div>
        ) : (
          <div className="bg-[#0d1117] border border-slate-800 rounded-xl p-6 max-w-xl mx-auto text-left space-y-4">
            <h3 className="text-sm font-mono font-bold text-slate-300 uppercase tracking-wider">Edit Page Header</h3>

            <div>
              <label className="block text-xs font-mono text-slate-500 mb-1">TITLE</label>
              <input
                type="text"
                value={draftMeta.title}
                onChange={e => setDraftMeta({ ...draftMeta, title: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200 font-mono text-sm focus:outline-none focus:border-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-500 mb-2">TITLE COLOR</label>
              <div className="flex flex-wrap gap-2">
                {colorOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setDraftMeta({ ...draftMeta, titleColor: opt.value })}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all border ${
                      draftMeta.titleColor === opt.value
                        ? 'border-slate-400 bg-slate-700 text-slate-100'
                        : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    <div className={`w-2.5 h-2.5 rounded-full ${opt.bg}`} />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-500 mb-1">TAGS (comma-separated)</label>
              <input
                type="text"
                value={draftTagsRaw}
                onChange={e => setDraftTagsRaw(e.target.value)}
                placeholder="tag1, tag2, tag3"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200 placeholder-slate-500 font-mono text-sm focus:outline-none focus:border-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-500 mb-1">DESCRIPTION</label>
              <textarea
                value={draftMeta.description}
                onChange={e => setDraftMeta({ ...draftMeta, description: e.target.value })}
                placeholder="Brief description of this page..."
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200 placeholder-slate-500 font-mono text-xs focus:outline-none focus:border-slate-500 h-20"
              />
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

      {/* Map */}
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
                        <MapNode title={node.title} subtitle={node.tags?.length > 0 ? node.tags.join(' • ') : node.subtitle} accentColor={color} onClick={() => scrollTo(node.id)} small />
                      </div>
                      <button onClick={() => handleDeleteTopic(i, j)} className="text-slate-600 hover:text-red-400 transition-colors p-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                  {addingTopicCol === i ? (
                    <div className="flex flex-col gap-1">
                      <input type="text" value={topicTitle} onChange={e => setTopicTitle(e.target.value)} placeholder="Topic name" className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-200 placeholder-slate-500 font-mono text-xs focus:outline-none focus:border-slate-500" autoFocus onKeyDown={e => { if (e.key === 'Escape') { setAddingTopicCol(null); setTopicTitle(''); setTopicTags(''); } }} />
                      <input type="text" value={topicTags} onChange={e => setTopicTags(e.target.value)} placeholder="Tags (comma-separated)" className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-200 placeholder-slate-500 font-mono text-xs focus:outline-none focus:border-slate-500" onKeyDown={e => { if (e.key === 'Enter') handleAddTopic(i); if (e.key === 'Escape') { setAddingTopicCol(null); setTopicTitle(''); setTopicTags(''); } }} />
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
            <button onClick={handleAddColumnStart} className="h-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-700 rounded-lg p-4 hover:border-slate-500 hover:bg-slate-800/20 transition-all">
              <Plus className="w-6 h-6 text-slate-500" /><span className="text-xs font-mono text-slate-500 text-center">Add Column</span>
            </button>
          </div>
        </div>
      </div>

      {/* Column modal */}
      {modalStep && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#0d1117] border border-slate-800 rounded-lg p-6 max-w-sm w-full mx-4">
            {modalStep === 'name' && (
              <div className="space-y-4">
                <h3 className="text-lg font-mono font-bold text-slate-200">Column Name</h3>
                <input type="text" value={columnName} onChange={e => setColumnName(e.target.value)} placeholder="e.g., Custom Category" className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 font-mono text-sm focus:outline-none focus:border-slate-500" autoFocus onKeyDown={e => e.key === 'Enter' && handleNameSubmit()} />
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
                    <button key={option.value} onClick={() => setSelectedColor(option.value)} className={`px-4 py-2 rounded-lg text-sm font-mono font-semibold transition-all flex items-center gap-2 ${selectedColor === option.value ? `${colorPreview[option.value]} text-slate-900` : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
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

      {/* Technique Cards */}
      <div className="flex items-center justify-between pt-4">
        <button onClick={() => setCardModalOpen(true)} className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-mono rounded transition-colors flex items-center gap-1">
          <Plus className="w-3 h-3" /> Add Technique
        </button>
      </div>
      <AddCardModal
        isOpen={cardModalOpen || !!editingCard}
        onClose={() => { setCardModalOpen(false); setEditingCard(null); }}
        onSubmit={handleCardSubmit}
        editCard={editingCard}
      />
      {allCards.length > 0 && (
        <div className="border-t border-slate-800/50 pt-10">
          <DraggableCardList cards={allCards} onDelete={deleteCard} onReorder={reorderCards} onEdit={(card) => setEditingCard(card)} />
        </div>
      )}
    </div>
  );
}