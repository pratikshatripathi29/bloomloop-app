import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  Users,
  Sparkles,
  Filter,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  X,
} from 'lucide-react';
import segmentsApi from '../services/segmentsApi';
import aiApi from '../services/aiApi';
import useDebouncedValue from '../hooks/useDebouncedValue';

const INITIAL_FILTERS = {
  city: '',
  min_total_spent: '',
  max_total_spent: '',
  min_order_count: '',
  days_since_last_order: '',
  churn_score_min: '',
};

export default function SegmentsPage() {
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter builder form state
  const [showBuilder, setShowBuilder] = useState(false);
  const [segmentName, setSegmentName] = useState('');
  const [segmentDescription, setSegmentDescription] = useState('');
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  // Live matching preview state
  const [matchingCount, setMatchingCount] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // AI Segment Suggester state
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiExplanation, setAiExplanation] = useState('');
  const [aiError, setAiError] = useState('');

  const handleAiSuggest = async (e) => {
    e?.preventDefault();
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiError('');
    try {
      const result = await aiApi.suggestSegmentFilters({ description: aiPrompt.trim() });
      if (result?.filters) {
        setFilters((prev) => ({
          ...INITIAL_FILTERS,
          ...result.filters,
        }));
        if (!segmentName.trim()) {
          setSegmentName(aiPrompt.trim().slice(0, 40));
        }
        if (result.explanation) {
          setAiExplanation(result.explanation);
        }
      }
    } catch (err) {
      setAiError(err?.message || 'Failed to generate AI filter suggestion.');
    } finally {
      setAiLoading(false);
    }
  };

  // Debounce filter inputs for live preview
  const debouncedFilters = useDebouncedValue(filters, 400);

  // Fetch all existing segments
  const fetchSegments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await segmentsApi.getSegments();
      setSegments(data || []);
    } catch (err) {
      setError(err?.message || 'Failed to load customer segments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSegments();
  }, [fetchSegments]);

  // Clean filters for preview / submission
  const getCleanedFilters = useCallback((raw) => {
    const cleaned = {};
    if (raw.city?.trim()) cleaned.city = raw.city.trim();
    if (raw.min_total_spent !== '') cleaned.min_total_spent = Number(raw.min_total_spent);
    if (raw.max_total_spent !== '') cleaned.max_total_spent = Number(raw.max_total_spent);
    if (raw.min_order_count !== '') cleaned.min_order_count = parseInt(raw.min_order_count, 10);
    if (raw.days_since_last_order !== '') cleaned.days_since_last_order = parseInt(raw.days_since_last_order, 10);
    if (raw.churn_score_min !== '') cleaned.churn_score_min = Number(raw.churn_score_min);
    return cleaned;
  }, []);

  // Update live matching customer count
  useEffect(() => {
    if (!showBuilder) return;

    let isMounted = true;
    const fetchPreview = async () => {
      setPreviewLoading(true);
      try {
        const cleaned = getCleanedFilters(debouncedFilters);
        const res = await segmentsApi.previewFilters(cleaned);
        if (isMounted) {
          setMatchingCount(res.matching_customer_count);
        }
      } catch (err) {
        if (isMounted) setMatchingCount(null);
      } finally {
        if (isMounted) setPreviewLoading(false);
      }
    };

    fetchPreview();
    return () => {
      isMounted = false;
    };
  }, [debouncedFilters, showBuilder, getCleanedFilters]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleResetBuilder = () => {
    setSegmentName('');
    setSegmentDescription('');
    setFilters(INITIAL_FILTERS);
    setSaveError('');
    setMatchingCount(null);
  };

  const handleSaveSegment = async (e) => {
    e.preventDefault();
    if (!segmentName.trim()) {
      setSaveError('Segment name is required.');
      return;
    }

    setSaving(true);
    setSaveError('');

    try {
      const cleaned = getCleanedFilters(filters);
      await segmentsApi.createSegment({
        name: segmentName.trim(),
        description: segmentDescription.trim() || null,
        filters: cleaned,
      });

      handleResetBuilder();
      setShowBuilder(false);
      await fetchSegments();
    } catch (err) {
      setSaveError(err?.message || 'Failed to save segment.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSegment = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete segment "${name}"?`)) return;
    try {
      await segmentsApi.deleteSegment(id);
      await fetchSegments();
    } catch (err) {
      alert(`Failed to delete segment: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">
            Customer Segments
          </h2>
          <p className="text-xs lg:text-sm text-slate-500 mt-0.5">
            Build dynamic audience segments based on spending, activity, location, and churn risk.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchSegments()}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => {
              setShowBuilder(!showBuilder);
              if (!showBuilder) handleResetBuilder();
            }}
            className="px-4 py-2.5 rounded-xl bg-brand-600 text-white text-xs lg:text-sm font-semibold hover:bg-brand-700 transition-colors inline-flex items-center gap-2 shadow-sm shadow-brand-500/20"
          >
            {showBuilder ? (
              <>
                <X className="w-4 h-4" />
                <span>Close Builder</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Create Segment</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Segment Filter Builder Card */}
      {showBuilder && (
        <div className="bg-white rounded-3xl border border-brand-200 shadow-xl shadow-brand-900/5 p-6 lg:p-8 space-y-6 transition-all animate-in fade-in slide-in-from-top-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
                <Filter className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Segment Filter Builder</h3>
                <p className="text-xs text-slate-500">
                  Combine rules to target the exact customer group you want.
                </p>
              </div>
            </div>

            {/* Live Matching Customer Count Badge */}
            <div className="flex items-center gap-2.5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 px-4 py-2.5 rounded-2xl self-start md:self-auto shadow-sm">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <div className="text-xs text-emerald-900">
                <span className="font-bold text-sm text-emerald-700 mr-1.5">
                  {previewLoading ? (
                    <Loader2 className="w-4 h-4 inline animate-spin" />
                  ) : matchingCount !== null ? (
                    matchingCount
                  ) : (
                    '—'
                  )}
                </span>
                customers match this filter
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveSegment} className="space-y-6">
            {saveError && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{saveError}</span>
              </div>
            )}

            {/* AI Segment Filter Assistant Card */}
            <div className="bg-gradient-to-r from-purple-50 via-indigo-50/50 to-brand-50/30 p-4 rounded-2xl border border-purple-200/80 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-sm shadow-purple-500/20">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">AI Segment Assistant</h4>
                    <p className="text-[11px] text-slate-500">
                      Describe your audience in plain English, and AI will configure the criteria.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAiAssistant((prev) => !prev)}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition-colors inline-flex items-center gap-1.5 shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {showAiAssistant ? 'Hide AI Assistant' : 'Use AI Filter'}
                </button>
              </div>

              {showAiAssistant && (
                <div className="mt-4 pt-3 border-t border-purple-200/60 space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Customers in Chicago who spent over $400 and are at risk of churning"
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAiSuggest();
                        }
                      }}
                      className="flex-1 px-3.5 py-2 bg-white border border-purple-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    />
                    <button
                      type="button"
                      disabled={aiLoading || !aiPrompt.trim()}
                      onClick={handleAiSuggest}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-sm shrink-0"
                    >
                      {aiLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Analyzing...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Suggest Filters</span>
                        </>
                      )}
                    </button>
                  </div>

                  {aiExplanation && (
                    <div className="p-2.5 rounded-lg bg-purple-100/70 border border-purple-200 text-purple-900 text-[11px] flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <span><strong>Applied:</strong> {aiExplanation}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAiExplanation('')}
                        className="text-purple-600 hover:text-purple-800 text-xs font-bold px-1"
                      >
                        ×
                      </button>
                    </div>
                  )}

                  {aiError && (
                    <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[11px] flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{aiError}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Segment Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Segment Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VIP High Spenders"
                  value={segmentName}
                  onChange={(e) => setSegmentName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Customers with over $1,000 in lifetime value"
                  value={segmentDescription}
                  onChange={(e) => setSegmentDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                />
              </div>
            </div>

            {/* Filter Rules Matrix */}
            <div>
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                Targeting Criteria
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* 1. City */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">City</label>
                  <input
                    type="text"
                    placeholder="e.g. Austin, New York"
                    value={filters.city}
                    onChange={(e) => handleFilterChange('city', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                  <span className="text-[10px] text-slate-400">Match customers located in city</span>
                </div>

                {/* 2. Min Total Spent */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Min Total Spent ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 500"
                    value={filters.min_total_spent}
                    onChange={(e) => handleFilterChange('min_total_spent', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                  <span className="text-[10px] text-slate-400">Total revenue generated &ge; $X</span>
                </div>

                {/* 3. Max Total Spent */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Max Total Spent ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 2000"
                    value={filters.max_total_spent}
                    onChange={(e) => handleFilterChange('max_total_spent', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                  <span className="text-[10px] text-slate-400">Total revenue generated &le; $X</span>
                </div>

                {/* 4. Min Order Count */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Min Order Count
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 3"
                    value={filters.min_order_count}
                    onChange={(e) => handleFilterChange('min_order_count', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                  <span className="text-[10px] text-slate-400">Placed at least N orders</span>
                </div>

                {/* 5. Days Since Last Order */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Days Since Last Order
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 60 (inactive for 60+ days)"
                    value={filters.days_since_last_order}
                    onChange={(e) => handleFilterChange('days_since_last_order', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                  <span className="text-[10px] text-slate-400">Inactivity period &ge; N days</span>
                </div>

                {/* 6. Churn Score Min */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Min Churn Risk Score
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="e.g. 50 (at-risk customers)"
                    value={filters.churn_score_min}
                    onChange={(e) => handleFilterChange('churn_score_min', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                  <span className="text-[10px] text-slate-400">Predicted churn risk (0-100)</span>
                </div>
              </div>
            </div>

            {/* Builder Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleResetBuilder}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors"
              >
                Reset Filters
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-brand-600 text-white text-xs lg:text-sm font-semibold hover:bg-brand-700 transition-colors shadow-sm shadow-brand-500/20 inline-flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Segment...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Save Segment</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Segments Display Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800 text-base">Active Segments</h3>
          <span className="text-xs text-slate-400">{segments.length} saved</span>
        </div>

        {error && (
          <div className="bg-red-50 p-6 rounded-2xl border border-red-200 text-center space-y-2">
            <p className="text-xs text-red-600">{error}</p>
            <button
              onClick={() => fetchSegments()}
              className="text-xs font-semibold text-red-700 underline"
            >
              Try Again
            </button>
          </div>
        )}

        {loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200/80 animate-pulse space-y-3">
                <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                <div className="h-3 bg-slate-100 rounded w-3/4"></div>
                <div className="h-8 bg-slate-100 rounded-xl w-1/3"></div>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && segments.length === 0 && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-4">
              <Layers className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No Segments Created Yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
              Target high-value customers, churn risks, or regional groups using the Segment Filter Builder.
            </p>
            <button
              onClick={() => {
                setShowBuilder(true);
                handleResetBuilder();
              }}
              className="px-4 py-2.5 rounded-xl bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 transition-colors inline-flex items-center gap-2 shadow-sm shadow-brand-500/20"
            >
              <Plus className="w-4 h-4" />
              Build Your First Segment
            </button>
          </div>
        )}

        {!loading && !error && segments.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {segments.map((seg) => {
              const ruleKeys = Object.entries(seg.filters || {}).filter(([_, v]) => v !== '' && v !== null);

              return (
                <div
                  key={seg.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-base text-slate-900 group-hover:text-brand-700 transition-colors">
                          {seg.name}
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                          {seg.description || 'No description provided'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteSegment(seg.id, seg.name)}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete segment"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Customer Count Pill */}
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 font-semibold text-xs border border-emerald-100">
                      <Users className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{seg.customer_count ?? 0} matching customers</span>
                    </div>

                    {/* Filter Tags */}
                    {ruleKeys.length > 0 && (
                      <div className="pt-2 flex flex-wrap gap-1.5">
                        {ruleKeys.map(([k, v]) => (
                          <span
                            key={k}
                            className="text-[11px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md"
                          >
                            {k.replace(/_/g, ' ')}: <strong className="text-slate-800">{String(v)}</strong>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-400">
                    Created on {new Date(seg.created_at).toLocaleDateString()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
