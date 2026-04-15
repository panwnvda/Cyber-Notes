import React from 'react';

export default function MapNode({ title, subtitle, accentColor = 'cyan', onClick, small = false }) {
  const colorMap = {
    cyan: 'border-cyan-500/40 hover:border-cyan-400/60 hover:shadow-cyan-500/10',
    green: 'border-emerald-500/40 hover:border-emerald-400/60 hover:shadow-emerald-500/10',
    red: 'border-red-500/40 hover:border-red-400/60 hover:shadow-red-500/10',
    purple: 'border-purple-500/40 hover:border-purple-400/60 hover:shadow-purple-500/10',
    orange: 'border-orange-500/40 hover:border-orange-400/60 hover:shadow-orange-500/10',
    pink: 'border-pink-500/40 hover:border-pink-400/60 hover:shadow-pink-500/10',
    blue: 'border-blue-500/40 hover:border-blue-400/60 hover:shadow-blue-500/10',
    yellow: 'border-yellow-500/40 hover:border-yellow-400/60 hover:shadow-yellow-500/10',
  };

  const headerColorMap = {
    cyan: 'text-cyan-400',
    green: 'text-emerald-400',
    red: 'text-red-400',
    purple: 'text-purple-400',
    orange: 'text-orange-400',
    pink: 'text-pink-400',
    blue: 'text-blue-400',
    yellow: 'text-yellow-400',
  };

  return (
    <div
      onClick={onClick}
      className={`map-node bg-[#111827] border ${colorMap[accentColor]} rounded-lg cursor-pointer hover:shadow-lg transition-all ${small ? 'px-3 py-2' : 'px-4 py-3'}`}
    >
      <p className={`font-mono font-semibold ${small ? 'text-xs' : 'text-sm'} ${headerColorMap[accentColor]} leading-tight`}>
        {title}
      </p>
      {subtitle && (
        <p className={`text-slate-500 font-mono ${small ? 'text-[10px]' : 'text-xs'} mt-1 leading-tight`}>
          {subtitle}
        </p>
      )}
    </div>
  );
}