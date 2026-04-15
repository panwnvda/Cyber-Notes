import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';

export default function PageNotFound() {
  return (
    <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center px-4">
      <div className="text-center">
        <div className="flex justify-center mb-6">
          <Shield className="w-12 h-12 text-red-500/50" />
        </div>
        <h1 className="text-6xl font-bold font-mono text-slate-700 mb-2">404</h1>
        <p className="text-slate-500 font-mono text-sm mb-8">Page not found — target unreachable</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-mono text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Return to base
        </Link>
      </div>
    </div>
  );
}