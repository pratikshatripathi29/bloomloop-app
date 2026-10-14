import React, { useState, useEffect, useCallback } from 'react';
import {
  Megaphone,
  Plus,
  Sparkles,
  Send,
  Mail,
  Phone,
  MessageSquare,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Trash2,
  AlertCircle,
  Copy,
  ChevronRight,
  Layers,
  BarChart3,
  X,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

import campaignsApi from '../services/campaignsApi';
import segmentsApi from '../services/segmentsApi';
import aiApi from '../services/aiApi';

const TONES = [
  'Friendly & Warm',
  'Urgent / Limited-Time',
  'Professional & Direct',
  'Exciting & Enthusiastic',
  'Exclusive VIP',
];

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // New Campaign Form State
  const [showDrawer, setShowDrawer] = useState(false);
  const [name, setName] = useState('');
  const [segmentId, setSegmentId] = useState('');
  const [channel, setChannel] = useState('email');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // AI Message Generator Modal State
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiGoal, setAiGoal] = useState('');
  const [aiTone, setAiTone] = useState(TONES[0]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDrafts, setAiDrafts] = useState([]);
  const [aiError, setAiError] = useState('');

  // Selected campaign for delivery stats inspection
  const [selectedCampaign, setSelectedCampaign] = useState(null);

  // Fetch campaigns and segments
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [camps, segs] = await Promise.all([
        campaignsApi.getCampaigns().catch(() => []),
        segmentsApi.getSegments().catch(() => []),
      ]);
      setCampaigns(camps || []);
      setSegments(segs || []);
      if (camps && camps.length > 0 && !selectedCampaign) {
        setSelectedCampaign(camps[0]);
      }
    } catch (err) {
      setError(err?.message || 'Failed to load campaigns.');
    } finally {
      setLoading(false);
    }
  }, [selectedCampaign]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // AI Message Draft Generation Handler
  const handleGenerateAiDrafts = async (e) => {
    e?.preventDefault();
    if (!aiGoal.trim()) return;
    setAiLoading(true);
    setAiError('');
    try {
      const result = await aiApi.generateCampaignMessages({
        goal: aiGoal.trim(),
        tone: aiTone,
        channel,
      });
      setAiDrafts(result.drafts || []);
    } catch (err) {
      setAiError(err?.message || 'Failed to generate message drafts with AI.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleUseDraft = (draftText) => {
    setMessage(draftText);
    setShowAiModal(false);
    setAiDrafts([]);
  };

  // Submit New Campaign
  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    if (!name.trim() || !message.trim()) {
      setFormError('Please provide a campaign name and message.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      const payload = {
        name: name.trim(),
        segment_id: segmentId ? parseInt(segmentId, 10) : null,
        channel,
        message: message.trim(),
      };
      await campaignsApi.createCampaign(payload);
      setShowDrawer(false);
      setName('');
      setMessage('');
      setSegmentId('');
      fetchData();
    } catch (err) {
      setFormError(err?.message || 'Failed to create and dispatch campaign.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Campaign
  const handleDeleteCampaign = async (id) => {
    if (!window.confirm('Are you sure you want to delete this campaign?')) return;
    try {
      await campaignsApi.deleteCampaign(id);
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
      if (selectedCampaign?.id === id) {
        setSelectedCampaign(null);
      }
    } catch (err) {
      alert(err?.message || 'Failed to delete campaign');
    }
  };

  // Channel helper
  const getChannelIcon = (ch) => {
    switch (ch?.toLowerCase()) {
      case 'sms':
        return <Phone className="w-3.5 h-3.5 text-blue-500" />;
      case 'whatsapp':
        return <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />;
      case 'email':
      default:
        return <Mail className="w-3.5 h-3.5 text-purple-500" />;
    }
  };

  // Status badge helper
  const getStatusBadge = (st) => {
    switch (st?.toLowerCase()) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Completed
          </span>
        );
      case 'sending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
            <RefreshCw className="w-3 h-3 animate-spin" /> In Progress
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            <XCircle className="w-3 h-3" /> Failed
          </span>
        );
      case 'queued':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" /> Queued
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Multichannel Campaigns</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200">
              {campaigns.length} Total
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Automate targeted email, SMS, and WhatsApp communications with simulated real-time delivery.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setShowAiModal(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 text-xs font-semibold transition-colors inline-flex items-center gap-1.5 shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span>AI Draft Assistant</span>
          </button>
          <button
            onClick={() => setShowDrawer(true)}
            className="px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 transition-colors inline-flex items-center gap-1.5 shadow-sm shadow-brand-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>New Campaign</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Campaigns List & Delivery Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Campaigns List (2 cols on large) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Campaign Directory</h3>
                <p className="text-xs text-slate-400 mt-0.5">Select a campaign to inspect live delivery analytics</p>
              </div>
              <button
                onClick={fetchData}
                disabled={loading}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {loading && campaigns.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm animate-pulse">
                Loading campaigns...
              </div>
            ) : error ? (
              <div className="p-6 text-center text-red-600 text-xs">
                {error}
              </div>
            ) : campaigns.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <Megaphone className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">No campaigns created yet</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Launch your first marketing campaign to reach targeted customer segments.
                </p>
                <button
                  onClick={() => setShowDrawer(true)}
                  className="mt-4 px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-semibold hover:bg-brand-700 transition-colors inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Create Campaign
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {campaigns.map((camp) => {
                  const isSelected = selectedCampaign?.id === camp.id;
                  const delRate =
                    camp.total_recipients > 0
                      ? Math.round((camp.delivered_count / camp.total_recipients) * 100)
                      : 0;

                  return (
                    <div
                      key={camp.id}
                      onClick={() => setSelectedCampaign(camp)}
                      className={`p-4 sm:p-5 flex items-center justify-between cursor-pointer transition-colors ${
                        isSelected ? 'bg-purple-50/50 border-l-4 border-l-brand-600' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                          {getChannelIcon(camp.channel)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900 truncate">
                              {camp.name}
                            </h4>
                            <span className="capitalize text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                              {camp.channel}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                            {camp.message}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0 pl-2">
                        {getStatusBadge(camp.status)}
                        <div className="text-right hidden sm:block">
                          <div className="text-xs font-bold text-slate-800">{delRate}%</div>
                          <div className="text-[10px] text-slate-400">
                            {camp.delivered_count}/{camp.total_recipients}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCampaign(camp.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                          title="Delete Campaign"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Campaign Delivery Stats & Chart (1 col on large) */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-brand-600" />
              <h3 className="font-bold text-slate-900 text-sm">Delivery Results</h3>
            </div>

            {selectedCampaign ? (
              <div className="space-y-5">
                <div>
                  <div className="text-base font-bold text-slate-900">
                    {selectedCampaign.name}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {getChannelIcon(selectedCampaign.channel)}
                    <span className="text-xs text-slate-500 capitalize">
                      {selectedCampaign.channel} broadcast
                    </span>
                    <span className="text-slate-300">•</span>
                    {getStatusBadge(selectedCampaign.status)}
                  </div>
                </div>

                {/* Stat Breakdown Grid */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="text-lg font-bold text-slate-800">
                      {selectedCampaign.total_recipients || 0}
                    </div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Total</div>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                    <div className="text-lg font-bold text-emerald-700">
                      {selectedCampaign.delivered_count || 0}
                    </div>
                    <div className="text-[10px] text-emerald-600 uppercase font-semibold">Delivered</div>
                  </div>
                  <div className="p-3 bg-red-50 rounded-xl border border-red-100">
                    <div className="text-lg font-bold text-red-700">
                      {selectedCampaign.failed_count || 0}
                    </div>
                    <div className="text-[10px] text-red-600 uppercase font-semibold">Failed</div>
                  </div>
                </div>

                {/* Delivery Chart */}
                <div className="h-48 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        {
                          name: 'Results',
                          Delivered: selectedCampaign.delivered_count || 0,
                          Failed: selectedCampaign.failed_count || 0,
                        },
                      ]}
                      margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderRadius: '10px',
                          color: '#fff',
                          fontSize: '11px',
                        }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                      <Bar dataKey="Delivered" fill="#10b981" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="Failed" fill="#ef4444" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs">
                Select a campaign to view delivery telemetry and charts.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Drawer: Create Campaign */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
            onClick={() => setShowDrawer(false)}
          />
          <div className="relative w-full max-w-lg bg-white shadow-2xl h-full flex flex-col z-10">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Create Campaign</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Queue broadcast messages with background delivery simulation
                </p>
              </div>
              <button
                onClick={() => setShowDrawer(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleCreateCampaign} className="p-6 overflow-y-auto flex-1 space-y-4">
              {formError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Campaign Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VIP Spring Re-engagement"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              {/* Target Segment */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Segment
                </label>
                <select
                  value={segmentId}
                  onChange={(e) => setSegmentId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                >
                  <option value="">All Customers (No filter)</option>
                  {segments.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Only customers matching this segment criteria will receive messages.
                </span>
              </div>

              {/* Channel */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Delivery Channel
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['email', 'sms', 'whatsapp'].map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => setChannel(ch)}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors capitalize ${
                        channel === ch
                          ? 'bg-brand-50 border-brand-500 text-brand-700'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {getChannelIcon(ch)}
                      {ch}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message + AI Generator Prompt */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Message Content <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAiModal(true)}
                    className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate with AI</span>
                  </button>
                </div>
                <textarea
                  rows={5}
                  required
                  placeholder="Hi {{first_name}}, we're thrilled to offer you 25% off your next purchase..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowDrawer(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-md shadow-brand-500/20 transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Queueing...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Dispatch Campaign</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: AI Campaign Message Generator (Requirement 1) */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setShowAiModal(false)}
          />
          <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden z-10 border border-slate-100">
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-purple-900 to-indigo-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-purple-300" />
                </div>
                <div>
                  <h3 className="font-bold text-base">AI Campaign Copywriter</h3>
                  <p className="text-xs text-purple-200 mt-0.5">
                    Generate 3 high-converting drafts powered by Groq
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAiModal(false)}
                className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Prompt Form */}
            <div className="p-6 space-y-4">
              {aiError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{aiError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Campaign Goal / Offer <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 20% discount on summer apparel for dormant customers"
                  value={aiGoal}
                  onChange={(e) => setAiGoal(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Desired Tone
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {TONES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setAiTone(t)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                        aiTone === t
                          ? 'bg-purple-50 border-purple-500 text-purple-700 shadow-sm'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                disabled={aiLoading || !aiGoal.trim()}
                onClick={handleGenerateAiDrafts}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-colors inline-flex items-center justify-center gap-2 shadow-md shadow-purple-500/20"
              >
                {aiLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Writing 3 Drafts with Groq...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate 3 Message Drafts</span>
                  </>
                )}
              </button>

              {/* Draft Results */}
              {aiDrafts.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                  <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Select a Draft
                  </div>
                  {aiDrafts.map((draft, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-purple-50/40 hover:border-purple-300 transition-all flex flex-col justify-between gap-3"
                    >
                      <div className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                        {draft}
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleUseDraft(draft)}
                          className="px-3 py-1.5 rounded-xl bg-purple-600 text-white hover:bg-purple-700 text-xs font-semibold transition-colors inline-flex items-center gap-1 shadow-sm"
                        >
                          <span>Use this draft</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
