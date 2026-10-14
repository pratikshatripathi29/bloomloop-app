import React from 'react';
import { Layers, Plus, Sparkles, Filter } from 'lucide-react';

export default function Segments() {
  const dummySegments = [
    { name: 'High-Value Champions', count: 12, criteria: 'Total spent > $1,000', badge: 'bg-emerald-50 text-emerald-700' },
    { name: 'Recent Buyers', count: 28, criteria: 'Ordered in last 30 days', badge: 'bg-blue-50 text-blue-700' },
    { name: 'At Risk / Inactive', count: 8, criteria: 'No orders in 90+ days', badge: 'bg-amber-50 text-amber-700' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Customer Segments</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Group customers dynamically based on spending behavior and engagement.
          </p>
        </div>
        <button className="px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 transition-colors inline-flex items-center gap-1.5 shadow-sm shadow-brand-500/20">
          <Plus className="w-4 h-4" />
          Create Segment
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {dummySegments.map((seg) => (
          <div key={seg.name} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${seg.badge}`}>
                {seg.name}
              </span>
              <Layers className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mt-4">
              <div className="text-2xl font-bold text-slate-900">{seg.count} customers</div>
              <div className="text-xs text-slate-500 mt-1">{seg.criteria}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
