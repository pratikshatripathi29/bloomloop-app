import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  DollarSign,
  TrendingUp,
  UserPlus,
  RefreshCw,
  AlertCircle,
  ArrowUpRight,
  Send,
  Mail,
  MessageSquare,
  Phone,
  BarChart3,
  MapPin,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Bot,
  Search,
  ChevronRight,
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
  Cell,
  Legend,
} from 'recharts';

import useDashboard from '../hooks/useDashboard';
import aiApi from '../services/aiApi';

// Palette for City Chart
const CITY_COLORS = [
  '#0284c7', // Sky
  '#10b981', // Emerald
  '#8b5cf6', // Purple
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#6366f1', // Indigo
  '#64748b', // Slate
];

export default function DashboardPage() {
  const { data, loading, error, refetch } = useDashboard();

  // AI Business Intelligence Query State (Requirement 3)
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiError, setAiError] = useState('');

  const handleAskAnalytics = async (customPrompt) => {
    const promptToUse = typeof customPrompt === 'string' ? customPrompt : aiQuestion;
    if (!promptToUse.trim()) return;
    setAiLoading(true);
    setAiError('');
    try {
      const response = await aiApi.askAnalytics({ question: promptToUse.trim() });
      setAiResult(response);
      setAiQuestion(promptToUse);
    } catch (err) {
      setAiError(err?.message || 'Failed to process AI analytics query.');
    } finally {
      setAiLoading(false);
    }
  };

  // Helper formatting functions
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  const formatNumber = (val) => {
    return new Intl.NumberFormat('en-US').format(val || 0);
  };

  // Channel icon helper
  const getChannelIcon = (channel) => {
    switch (channel?.toLowerCase()) {
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
  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
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

  // Loading Skeleton State
  if (loading && !data) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Banner Skeleton */}
        <div className="h-36 rounded-3xl bg-slate-200" />

        {/* Metric Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-white rounded-2xl p-5 border border-slate-200 space-y-3">
              <div className="w-10 h-10 bg-slate-200 rounded-xl" />
              <div className="h-6 w-24 bg-slate-200 rounded" />
              <div className="h-4 w-32 bg-slate-100 rounded" />
            </div>
          ))}
        </div>

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-white rounded-2xl p-6 border border-slate-200" />
          <div className="h-80 bg-white rounded-2xl p-6 border border-slate-200" />
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center max-w-xl mx-auto my-12">
        <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-red-900 mb-1">Error Loading Dashboard</h3>
        <p className="text-sm text-red-700 mb-4">{error}</p>
        <button
          onClick={refetch}
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors shadow-sm"
        >
          <RefreshCw className="w-4 h-4" /> Try Again
        </button>
      </div>
    );
  }

  const {
    total_customers = 0,
    total_revenue = 0,
    average_order_value = 0,
    new_customers_this_month = 0,
    customers_by_city = [],
    recent_campaigns = [],
  } = data || {};

  // Campaign chart data preparation
  const campaignChartData = recent_campaigns.map((c) => ({
    name: c.name.length > 14 ? `${c.name.slice(0, 14)}...` : c.name,
    fullName: c.name,
    delivered: c.delivered_count,
    failed: c.failed_count,
    total: c.total_recipients,
    deliveryRate: c.delivery_rate,
  }));

  return (
    <div className="space-y-6">
      {/* Welcome & Overview Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-brand-900 rounded-3xl p-6 lg:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold tracking-wider uppercase text-emerald-400 bg-emerald-950/60 border border-emerald-500/20 px-3 py-1 rounded-full">
            Real-Time Analytics
          </span>
          <h1 className="text-2xl lg:text-3xl font-extrabold mt-3 tracking-tight">
            BloomLoop CRM Overview
          </h1>
          <p className="text-slate-300 text-sm mt-1 max-w-xl">
            Live insights on customer growth, revenue health, and multichannel campaign delivery.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={refetch}
            disabled={loading}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-sm transition-colors border border-white/10 flex items-center gap-1.5"
            title="Refresh Metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <Link
            to="/customers"
            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm transition-colors shadow-sm inline-flex items-center gap-1.5"
          >
            Manage Customers
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* AI Business Intelligence Natural Language Query Section (Requirement 3) */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-purple-950 rounded-3xl p-5 sm:p-6 text-white shadow-xl border border-indigo-500/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-400/30 text-purple-300 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-300" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Ask AI Analytics
                <span className="text-[10px] font-semibold uppercase tracking-wider text-purple-300 bg-purple-900/60 border border-purple-400/20 px-2 py-0.5 rounded-full">
                  Groq Powered
                </span>
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Ask any question in plain English. The AI formulates a safe query spec; the backend builds and executes the SQL.
              </p>
            </div>
          </div>
          {aiResult && (
            <button
              onClick={() => {
                setAiResult(null);
                setAiQuestion('');
              }}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition-colors self-start sm:self-auto"
            >
              <X className="w-3.5 h-3.5" /> Clear Query
            </button>
          )}
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAskAnalytics();
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="e.g. What is our total revenue by city? or Average order value by city"
              value={aiQuestion}
              onChange={(e) => setAiQuestion(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/10 backdrop-blur-md border border-white/15 rounded-xl text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400/40 focus:border-purple-400 transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={aiLoading || !aiQuestion.trim()}
            className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all inline-flex items-center justify-center gap-2 shadow-lg shadow-purple-900/40 shrink-0"
          >
            {aiLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Translating query...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Ask AI</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Suggestion Chips */}
        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          <span className="text-[11px] text-slate-400 mr-1">Suggestions:</span>
          {[
            'Total revenue by city',
            'Average order value by city',
            'Total orders placed',
            'Average churn risk score',
          ].map((promptText) => (
            <button
              key={promptText}
              type="button"
              onClick={() => {
                setAiQuestion(promptText);
                handleAskAnalytics(promptText);
              }}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border border-white/10 transition-colors"
            >
              {promptText}
            </button>
          ))}
        </div>

        {/* Error State */}
        {aiError && (
          <div className="mt-4 p-3 rounded-xl bg-red-950/70 border border-red-500/30 text-red-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{aiError}</span>
          </div>
        )}

        {/* AI Result Card */}
        {aiResult && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/10 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    {aiResult.title}
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">{aiResult.summary}</p>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-2.5 py-1 rounded-lg self-start sm:self-auto">
                  Safe Backend-Built SQL
                </span>
              </div>

              {/* Scalar Metric Display */}
              {aiResult.result_type === 'scalar' ? (
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 inline-block min-w-[200px]">
                  <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                    {aiResult.title}
                  </div>
                  <div className="text-3xl font-extrabold text-emerald-400 mt-1">
                    {aiResult.format === 'currency'
                      ? formatCurrency(aiResult.value)
                      : formatNumber(aiResult.value)}
                  </div>
                </div>
              ) : (
                /* Grouped BarChart Display */
                <div className="h-64 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={aiResult.data}
                      margin={{ top: 10, right: 10, left: -15, bottom: 25 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis
                        dataKey="group"
                        tickLine={false}
                        axisLine={{ stroke: '#475569' }}
                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                        interval={0}
                        angle={-25}
                        textAnchor="end"
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                        tickFormatter={(val) =>
                          aiResult.format === 'currency' ? `$${val}` : val
                        }
                      />
                      <Tooltip
                        formatter={(val) => [
                          aiResult.format === 'currency'
                            ? formatCurrency(val)
                            : formatNumber(val),
                          aiResult.title,
                        ]}
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderRadius: '12px',
                          border: '1px solid #334155',
                          color: '#fff',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="value" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Customers */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full">
              Audience
            </span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-slate-900">
              {formatNumber(total_customers)}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-0.5">Total Customers</div>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
              Gross Sales
            </span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-slate-900">
              {formatCurrency(total_revenue)}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-0.5">Total Revenue</div>
          </div>
        </div>

        {/* Average Order Value */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full">
              Per Order
            </span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-slate-900">
              {formatCurrency(average_order_value)}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-0.5">Average Order Value</div>
          </div>
        </div>

        {/* New Customers This Month */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full">
              This Month
            </span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-slate-900">
              +{formatNumber(new_customers_this_month)}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-0.5">New Customers</div>
          </div>
        </div>
      </div>

      {/* Visual Analytics / Recharts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Customers by City */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-brand-600" />
                <h3 className="font-bold text-slate-800 text-base">Customers by City</h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Top regional distribution of customer accounts</p>
            </div>
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
              {customers_by_city.length} Cities
            </span>
          </div>

          {customers_by_city.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-sm">
              <MapPin className="w-8 h-8 text-slate-300 mb-2" />
              <span>No geographic customer data available yet</span>
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={customers_by_city}
                  margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="city"
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    formatter={(value) => [`${value} customers`, 'Audience']}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '12px',
                      border: 'none',
                      color: '#fff',
                      fontSize: '12px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {customers_by_city.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CITY_COLORS[index % CITY_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Chart 2: Recent Campaigns Delivery Performance */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-slate-800 text-base">Campaign Delivery Performance</h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Delivered vs failed messages on recent sends</p>
            </div>
            <Link
              to="/campaigns"
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              View All <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {campaignChartData.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-sm">
              <Send className="w-8 h-8 text-slate-300 mb-2" />
              <span>No campaigns dispatched yet</span>
              <Link
                to="/campaigns"
                className="mt-2 text-xs text-brand-600 font-semibold underline"
              >
                Launch your first campaign
              </Link>
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={campaignChartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '12px',
                      border: 'none',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Bar dataKey="delivered" name="Delivered" fill="#10b981" stackId="a" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="failed" name="Failed" fill="#ef4444" stackId="a" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Recent Campaigns Table with Delivery Rates */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-base">Recent Campaigns & Delivery Rates</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live status and delivery efficiency across marketing channels
            </p>
          </div>
          <Link
            to="/campaigns"
            className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
          >
            Create New Campaign <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recent_campaigns.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Send className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-600">No campaigns launched yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Create audience segments and run automated marketing campaigns.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/75 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-6">Campaign</th>
                  <th className="py-3.5 px-6">Channel</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Audience</th>
                  <th className="py-3.5 px-6">Delivery Rate</th>
                  <th className="py-3.5 px-6 text-right">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recent_campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-6 font-semibold text-slate-900">
                      {c.name}
                    </td>
                    <td className="py-4 px-6">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs capitalize font-medium">
                        {getChannelIcon(c.channel)}
                        {c.channel}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {getStatusBadge(c.status)}
                    </td>
                    <td className="py-4 px-6 text-slate-600">
                      <span className="font-medium text-slate-900">{c.delivered_count}</span>
                      <span className="text-xs text-slate-400"> / {c.total_recipients} sent</span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              c.delivery_rate >= 80
                                ? 'bg-emerald-500'
                                : c.delivery_rate >= 50
                                ? 'bg-amber-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, c.delivery_rate))}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-800">
                          {c.delivery_rate}%
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right text-xs text-slate-400">
                      {new Date(c.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
