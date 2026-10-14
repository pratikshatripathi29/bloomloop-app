import React from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center max-w-lg mx-auto shadow-sm my-12">
      <div className="text-6xl font-extrabold text-slate-200 mb-2">404</div>
      <h3 className="text-lg font-bold text-slate-800">Page Not Found</h3>
      <p className="text-xs text-slate-500 mt-1 mb-6">
        The route you are looking for doesn't exist or has moved.
      </p>
      <Link
        to="/"
        className="px-4 py-2.5 rounded-xl bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 transition-colors inline-flex items-center gap-1.5 shadow-sm shadow-brand-500/20"
      >
        <Home className="w-4 h-4" />
        Return to Dashboard
      </Link>
    </div>
  );
}
