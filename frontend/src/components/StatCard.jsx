import React from 'react';

export default function StatCard({ title, value, change, icon: Icon, color = 'text-brand-600', bg = 'bg-brand-50' }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className={`w-11 h-11 rounded-xl ${bg} ${color} flex items-center justify-center`}>
          {Icon && <Icon className="w-5 h-5" />}
        </div>
        {change && (
          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            {change}
          </span>
        )}
      </div>
      <div className="mt-4">
        <div className="text-2xl font-bold text-slate-900">{value}</div>
        <div className="text-xs font-medium text-slate-500 mt-0.5">{title}</div>
      </div>
    </div>
  );
}
