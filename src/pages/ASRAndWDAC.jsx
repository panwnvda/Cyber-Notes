import React, { useState } from 'react';
import TechniqueCard from '../components/TechniqueCard';
import MapNode from '../components/MapNode';
import AddCardModal from '../components/AddCardModal';
import { Plus, X } from 'lucide-react';
import { asrTechniques } from './asr/techniquesASR';

const initialMapColumns = [
  {
    header: 'ASR',
    color: 'yellow',
    nodes: [
      { title: 'ASR Rules', subtitle: 'Enumerate GUIDs • mode mapping • SYSTEM exemption', id: 'asr-rules' },
      { title: 'ASR Exclusion Abuse', subtitle: 'Path & process exclusions • inject into excluded', id: 'asr-exclusions' },
      { title: 'GadgetToJScript', subtitle: 'COM gadget • JScript .NET load • Office ASR bypass', id: 'gadget-jscript' },
    ]
  },
  {
    header: 'WDAC',
    color: 'orange',
    nodes: [
      { title: 'WDAC Enumeration & Bypass', subtitle: 'p7b → XML • FileRules • LOLBAS • wildcard paths', id: 'wdac' },
      { title: 'Trusted Signers & Filename', subtitle: 'OriginalFilename spoof • cert chain • DLL sideload', id: 'trusted-signers' },
    ]
  },
];

const colorOptions=[{value:'cyan',name:'Cyan'},{value:'green',name:'Green'},{value:'red',name:'Red'},{value:'purple',name:'Purple'},{value:'orange',name:'Orange'},{value:'pink',name:'Pink'},{value:'blue',name:'Blue'},{value:'yellow',name:'Yellow'}];
const colorPreview={cyan:'bg-cyan-500',green:'bg-emerald-500',red:'bg-red-500',purple:'bg-purple-500',orange:'bg-orange-500',pink:'bg-pink-500',blue:'bg-blue-500',yellow:'bg-yellow-500'};
const headerColorMap={cyan:'text-cyan-400 border-cyan-500/30',green:'text-emerald-400 border-emerald-500/30',red:'text-red-400 border-red-500/30',purple:'text-purple-400 border-purple-500/30',orange:'text-orange-400 border-orange-500/30',pink:'text-pink-400 border-pink-500/30',blue:'text-blue-400 border-blue-500/30',yellow:'text-yellow-400 border-yellow-500/30'};

export default function ASRAndWDAC() {
  const [columns,setColumns]=useState(initialMapColumns);
  const [modalStep,setModalStep]=useState(null);
  const [columnName,setColumnName]=useState('');
  const [selectedColor,setSelectedColor]=useState('cyan');
  const [addingTopicCol,setAddingTopicCol]=useState(null);
  const [topicTitle,setTopicTitle]=useState('');
  const [topicTags,setTopicTags]=useState('');
  const [customCards,setCustomCards]=useState([]);
  const [cardModalOpen,setCardModalOpen]=useState(false);
  const handleAddColumnStart=()=>setModalStep('name');
  const handleNameSubmit=()=>{if(columnName.trim())setModalStep('color');};
  const handleColorSubmit=()=>{setColumns([...columns,{header:columnName.toUpperCase(),color:selectedColor,nodes:[]}]);setModalStep(null);setSelectedColor('cyan');setColumnName('');};
  const handleDeleteColumn=(i)=>setColumns(columns.filter((_,idx)=>idx!==i));
  const handleAddTopic=(ci)=>{if(topicTitle.trim()){const u=[...columns];u[ci].nodes.push({title:topicTitle,subtitle:'Add details here',tags:topicTags.split(',').map(t=>t.trim()).filter(t=>t)});setColumns(u);setAddingTopicCol(null);setTopicTitle('');setTopicTags('');}};
  const handleDeleteTopic=(ci,ni)=>{const u=[...columns];u[ci].nodes.splice(ni,1);setColumns(u);};
  const handleAddCard=(card)=>setCustomCards([...customCards,card]);
  const handleDeleteCard=(id)=>setCustomCards(customCards.filter(c=>c.id!==id));
  const scrollTo=(id)=>{const el=document.getElementById(id);if(el)el.scrollIntoView({behavior:'smooth',block:'start'});};
  return (
    <div className="space-y-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-5xl font-bold font-mono tracking-tight"><span className="text-slate-200">ASR & </span><span className="text-yellow-400">WDAC</span></h1>
        <p className="text-slate-500 font-mono text-sm mt-3">ASR Rule Enum • Exclusion Abuse • GadgetToJScript • WDAC Policy Parse • Filename Spoof • Trusted Signer</p>
      </div>
      <div className="overflow-x-auto pb-4"><div className="inline-flex gap-4 min-w-max">
        {columns.map((col,i)=>{const color=col.color||'cyan';return(
          <div key={i} className="flex flex-col gap-2 min-w-[180px] max-w-[200px] relative">
            <div className={`text-center py-2 border-b-2 mb-2 ${headerColorMap[color]} flex items-center justify-between px-2`}>
              <span className="font-mono text-[11px] font-bold tracking-[0.2em] uppercase flex-1">{col.header}</span>
              <button onClick={()=>handleDeleteColumn(i)} className="text-slate-500 hover:text-slate-300 p-0.5"><X className="w-3 h-3"/></button>
            </div>
            <div className="flex flex-col gap-2 border border-slate-800/50 rounded-lg p-2 bg-[#0d1117]">
              {col.nodes.map((node,j)=>(<div key={j} className="flex items-start gap-1 group"><div className="flex-1 min-w-0"><MapNode title={node.title} subtitle={node.tags&&node.tags.length>0?node.tags.join(' • '):node.subtitle} accentColor={color} onClick={()=>scrollTo(node.id)} small/></div><button onClick={()=>handleDeleteTopic(i,j)} className="text-slate-600 hover:text-red-400 p-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100"><X className="w-3 h-3"/></button></div>))}
              {addingTopicCol===i?(<div className="flex flex-col gap-1"><input type="text" value={topicTitle} onChange={e=>setTopicTitle(e.target.value)} placeholder="Topic name" className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-200 placeholder-slate-500 font-mono text-xs focus:outline-none" autoFocus onKeyDown={e=>{if(e.key==='Escape'){setAddingTopicCol(null);setTopicTitle('');setTopicTags('');}}}/>
              <input type="text" value={topicTags} onChange={e=>setTopicTags(e.target.value)} placeholder="Tags (comma-separated)" className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-200 placeholder-slate-500 font-mono text-xs focus:outline-none" onKeyDown={e=>{if(e.key==='Enter')handleAddTopic(i);if(e.key==='Escape'){setAddingTopicCol(null);setTopicTitle('');setTopicTags('');}}}/>
              <div className="flex gap-1"><button onClick={()=>handleAddTopic(i)} className="flex-1 px-2 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-mono rounded">Add</button><button onClick={()=>{setAddingTopicCol(null);setTopicTitle('');setTopicTags('');}} className="flex-1 px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-mono rounded">Cancel</button></div></div>
              ):(<button onClick={()=>setAddingTopicCol(i)} className="px-2 py-1 text-xs font-mono text-slate-500 hover:text-slate-300 border border-dashed border-slate-700 rounded hover:border-slate-500">+ Add Topic</button>)}
            </div>
          </div>
        );})}
        <div className="flex flex-col gap-2 min-w-[180px] max-w-[200px]"><button onClick={handleAddColumnStart} className="h-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-700 rounded-lg p-4 hover:border-slate-500 hover:bg-slate-800/20"><Plus className="w-6 h-6 text-slate-500"/><span className="text-xs font-mono text-slate-500 text-center">Add Column</span></button></div>
      </div></div>
      {modalStep&&(<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-[#0d1117] border border-slate-800 rounded-lg p-6 max-w-sm w-full mx-4">
        {modalStep==='name'&&(<div className="space-y-4"><h3 className="text-lg font-mono font-bold text-slate-200">Column Name</h3><input type="text" value={columnName} onChange={e=>setColumnName(e.target.value)} placeholder="e.g., Custom Category" className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 font-mono text-sm focus:outline-none" autoFocus onKeyDown={e=>e.key==='Enter'&&handleNameSubmit()}/><div className="flex gap-2"><button onClick={()=>setModalStep(null)} className="flex-1 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 font-mono text-sm">Cancel</button><button onClick={handleNameSubmit} className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-mono text-sm font-semibold">Next</button></div></div>)}
        {modalStep==='color'&&(<div className="space-y-4"><h3 className="text-lg font-mono font-bold text-slate-200">Choose Color</h3><div className="flex flex-col gap-2 max-h-64 overflow-y-auto">{colorOptions.map(o=>(<button key={o.value} onClick={()=>setSelectedColor(o.value)} className={`px-4 py-2 rounded-lg text-sm font-mono font-semibold flex items-center gap-2 ${selectedColor===o.value?`${colorPreview[o.value]} text-slate-900`:'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}><div className={`w-3 h-3 rounded-full ${colorPreview[o.value]}`}/>{o.name}</button>))}</div><div className="flex gap-2"><button onClick={()=>setModalStep('name')} className="flex-1 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 font-mono text-sm">Back</button><button onClick={handleColorSubmit} className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-mono text-sm font-semibold">Create</button></div></div>)}
      </div></div>)}
      <div><button onClick={()=>setCardModalOpen(true)} className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-mono rounded flex items-center gap-1"><Plus className="w-3 h-3"/> Add Technique</button></div>
      {customCards.length>0&&(<div className="border-t border-slate-800/50 pt-8"><h2 className="text-xl font-bold font-mono text-slate-200 mb-4">Custom Techniques</h2><div className="grid grid-cols-1 gap-4">{customCards.map(card=>(<div key={card.id} className="relative"><TechniqueCard title={card.title} subtitle={card.subtitle} tags={card.tags} accentColor={card.accentColor} overview={card.overview} steps={card.steps} commands={card.commands}/><button onClick={()=>handleDeleteCard(card.id)} className="absolute top-4 right-4 text-slate-600 hover:text-red-400 p-1 z-10"><X className="w-4 h-4"/></button></div>))}</div></div>)}
      <AddCardModal isOpen={cardModalOpen} onClose={()=>setCardModalOpen(false)} onSubmit={handleAddCard}/>
      <div className="border-t border-slate-800/50 pt-10 grid grid-cols-1 gap-4">{asrTechniques.map((t)=>(<div key={t.id} id={t.id}><TechniqueCard title={t.title} subtitle={t.subtitle} tags={t.tags} accentColor={t.accentColor} overview={t.overview} steps={t.steps} commands={t.commands}/></div>))}</div>
    </div>
  );
}