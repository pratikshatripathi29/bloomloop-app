import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SignedIn, SignedOut, SignIn } from '@clerk/clerk-react';
import { Sparkles } from 'lucide-react';

import AppLayout from './layout/AppLayout';
import DashboardPage from './pages/DashboardPage';
import CustomersPage from './pages/CustomersPage';
import SegmentsPage from './pages/SegmentsPage';
import Campaigns from './pages/Campaigns';
import NotFound from './pages/NotFound';

function App() {
  return (
    <BrowserRouter>
      {/* 1. Signed-In Users: Full CRM Dashboard */}
      <SignedIn>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="segments" element={<SegmentsPage />} />
            <Route path="campaigns" element={<Campaigns />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </SignedIn>

      {/* 2. Signed-Out Users: Centered Sign-In Screen */}
      <SignedOut>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-brand-950 flex flex-col items-center justify-center p-4">
          <div className="mb-6 text-center">
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-white mb-3">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <span className="font-bold text-lg tracking-tight">BloomLoop CRM</span>
            </div>
            <p className="text-slate-300 text-xs">
              Welcome back! Please sign in to access your CRM workspace.
            </p>
          </div>
          <SignIn routing="hash" />
        </div>
      </SignedOut>
    </BrowserRouter>
  );
}

export default App;
