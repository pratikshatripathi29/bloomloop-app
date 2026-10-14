import React, { useState } from 'react';
import { Users, Plus, Search, Filter, Download } from 'lucide-react';

export default function Customers() {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Customer Directory</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            View, search, and manage customer accounts and order histories.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5 shadow-sm">
            <Download className="w-4 h-4 text-slate-500" />
            Export
          </button>
          <button className="px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 transition-colors inline-flex items-center gap-1.5 shadow-sm shadow-brand-500/20">
            <Plus className="w-4 h-4" />
            Add Customer
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-colors">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            Filter by City
          </button>
        </div>
      </div>

      {/* Placeholder Empty State */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-4">
          <Users className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-800">Customers Route Ready</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mt-1.5">
          This page connects to your FastAPI backend at <code className="bg-slate-100 px-1.5 py-0.5 rounded text-brand-700 font-mono">GET /customers</code>.
        </p>
      </div>
    </div>
  );
}
