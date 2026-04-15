import React, { useState } from 'react';
import { X } from 'lucide-react';

const codeLanguages = [
  'bash', 'powershell', 'python', 'javascript', 'c', 'cpp', 'csharp', 'java', 'go', 'rust', 'sql', 'json', 'xml', 'html', 'css'
];

const colorOptions = [
  { value: 'cyan', label: 'Cyan', dot: 'bg-cyan-500' },
  { value: 'green', label: 'Green', dot: 'bg-emerald-500' },
  { value: 'red', label: 'Red', dot: 'bg-red-500' },
  { value: 'purple', label: 'Purple', dot: 'bg-purple-500' },
  { value: 'orange', label: 'Orange', dot: 'bg-orange-500' },
  { value: 'pink', label: 'Pink', dot: 'bg-pink-500' },
  { value: 'blue', label: 'Blue', dot: 'bg-blue-500' },
  { value: 'yellow', label: 'Yellow', dot: 'bg-yellow-500' },
];

export default function AddCardModal({ isOpen, onClose, onSubmit, accentColor = 'cyan', editCard = null }) {
  const isEdit = !!editCard;

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [tags, setTags] = useState('');
  const [overview, setOverview] = useState('');
  const [steps, setSteps] = useState(['']);
  const [codeBlocks, setCodeBlocks] = useState([{ title: '', language: 'bash', code: '' }]);
  const [selectedColor, setSelectedColor] = useState(accentColor);

  // Pre-fill when editing
  React.useEffect(() => {
    if (editCard) {
      setTitle(editCard.title || '');
      setSubtitle(editCard.subtitle || '');
      setTags((editCard.tags || []).join(', '));
      setOverview(editCard.overview || '');
      setSteps(editCard.steps?.length ? editCard.steps : ['']);
      setCodeBlocks(editCard.commands?.length ? editCard.commands.map(c => ({ title: c.title || '', language: c.language || 'bash', code: c.code || '' })) : [{ title: '', language: 'bash', code: '' }]);
      setSelectedColor(editCard.accentColor || accentColor);
    } else {
      resetForm();
    }
  }, [editCard, isOpen]);

  const handleAddStep = () => {
    setSteps([...steps, '']);
  };

  const handleRemoveStep = (idx) => {
    setSteps(steps.filter((_, i) => i !== idx));
  };

  const handleStepChange = (idx, value) => {
    const newSteps = [...steps];
    newSteps[idx] = value;
    setSteps(newSteps);
  };

  const handleAddCodeBlock = () => {
    setCodeBlocks([...codeBlocks, { title: '', language: 'bash', code: '' }]);
  };

  const handleRemoveCodeBlock = (idx) => {
    setCodeBlocks(codeBlocks.filter((_, i) => i !== idx));
  };

  const handleCodeBlockChange = (idx, field, value) => {
    const newBlocks = [...codeBlocks];
    newBlocks[idx][field] = value;
    setCodeBlocks(newBlocks);
  };

  const handleSubmit = () => {
    if (!title.trim()) return;

    const card = {
      id: isEdit ? editCard.id : `card-${Date.now()}`,
      title,
      subtitle,
      tags: tags.split(',').map(t => t.trim()).filter(t => t),
      overview,
      steps: steps.filter(s => s.trim()),
      commands: codeBlocks.filter(b => b.code.trim()).map(b => ({ title: b.title || 'Code', code: b.code, language: b.language })),
      accentColor: selectedColor
    };

    onSubmit(card);
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setTitle('');
    setSubtitle('');
    setTags('');
    setOverview('');
    setSteps(['']);
    setCodeBlocks([{ title: '', language: 'bash', code: '' }]);
    setSelectedColor(accentColor);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-[#0d1117] border border-slate-800 rounded-lg p-6 max-w-2xl w-full mx-4 my-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-mono font-bold text-slate-200">{isEdit ? 'Edit Technique Card' : 'Add Technique Card'}</h3>
          <button
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Title */}
          <div>
            <label className="block text-xs font-mono text-slate-400 uppercase mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Technique name"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200 placeholder-slate-500 font-mono text-sm focus:outline-none focus:border-slate-500"
            />
          </div>

          {/* Subtitle */}
          <div>
            <label className="block text-xs font-mono text-slate-400 uppercase mb-1">Subtitle</label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Brief description"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200 placeholder-slate-500 font-mono text-sm focus:outline-none focus:border-slate-500"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-mono text-slate-400 uppercase mb-1">Tags</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="tag1, tag2, tag3"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200 placeholder-slate-500 font-mono text-sm focus:outline-none focus:border-slate-500"
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-xs font-mono text-slate-400 uppercase mb-2">Card Color</label>
            <div className="flex flex-wrap gap-2">
              {colorOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setSelectedColor(opt.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all border ${
                    selectedColor === opt.value
                      ? 'border-slate-400 bg-slate-700 text-slate-100'
                      : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  <div className={`w-2.5 h-2.5 rounded-full ${opt.dot}`} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Overview */}
          <div>
            <label className="block text-xs font-mono text-slate-400 uppercase mb-1">Overview</label>
            <textarea
              value={overview}
              onChange={(e) => setOverview(e.target.value)}
              placeholder="High-level description"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200 placeholder-slate-500 font-mono text-xs focus:outline-none focus:border-slate-500 h-24"
            />
          </div>

          {/* Steps */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-mono text-slate-400 uppercase">Steps</label>
              <button
                onClick={handleAddStep}
                className="text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                + Add Step
              </button>
            </div>
            <div className="space-y-2">
              {steps.map((step, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="text"
                    value={step}
                    onChange={(e) => handleStepChange(idx, e.target.value)}
                    placeholder={`Step ${idx + 1}`}
                    className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200 placeholder-slate-500 font-mono text-xs focus:outline-none focus:border-slate-500"
                  />
                  {steps.length > 1 && (
                    <button
                      onClick={() => handleRemoveStep(idx)}
                      className="text-slate-500 hover:text-red-400 transition-colors p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Code Blocks */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-mono text-slate-400 uppercase">Code Blocks</label>
              <button
                onClick={handleAddCodeBlock}
                className="text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                + Add Code
              </button>
            </div>
            <div className="space-y-3">
              {codeBlocks.map((block, idx) => (
                <div key={idx} className="border border-slate-700 rounded-lg p-3 bg-slate-800/50">
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={block.title}
                      onChange={(e) => handleCodeBlockChange(idx, 'title', e.target.value)}
                      placeholder="Code title (optional)"
                      className="flex-1 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-200 placeholder-slate-500 font-mono text-xs focus:outline-none focus:border-slate-500"
                    />
                    <select
                      value={block.language}
                      onChange={(e) => handleCodeBlockChange(idx, 'language', e.target.value)}
                      className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-200 font-mono text-xs focus:outline-none focus:border-slate-500"
                    >
                      {codeLanguages.map((lang) => (
                        <option key={lang} value={lang}>{lang}</option>
                      ))}
                    </select>
                    {codeBlocks.length > 1 && (
                      <button
                        onClick={() => handleRemoveCodeBlock(idx)}
                        className="text-slate-500 hover:text-red-400 transition-colors p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <textarea
                    value={block.code}
                    onChange={(e) => handleCodeBlockChange(idx, 'code', e.target.value)}
                    placeholder="Code here..."
                    className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-slate-200 placeholder-slate-500 font-mono text-xs focus:outline-none focus:border-slate-500 h-24"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-2 mt-6 pt-6 border-t border-slate-700">
          <button
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="flex-1 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors font-mono text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim()}
            className="flex-1 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-mono text-sm font-semibold"
          >
            {isEdit ? 'Save Changes' : 'Create Card'}
          </button>
        </div>
      </div>
    </div>
  );
}
