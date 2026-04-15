import React from 'react';

export default function SectionHeader({ title, subtitle, accentColor = 'cyan' }) {
  const colorMap = {
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
    <div className="text-center mb-10">
      <h1 className="text-3xl md:text-5xl font-bold font-mono tracking-tight">
        <span className="text-slate-200">{title.split(' ').slice(0, -1).join(' ')} </span>
        <span className={colorMap[accentColor]}>{title.split(' ').slice(-1)}</span>
      </h1>
      {subtitle && (
        <p className="text-slate-500 font-mono text-sm mt-3">{subtitle}</p>
      )}
    </div>
  );
}