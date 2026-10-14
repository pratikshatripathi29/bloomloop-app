import React, { useState } from 'react';
import {
  Users,
  Search,
  Filter,
  Plus,
  RefreshCw,
  Trash2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  Building,
  MapPin,
  Calendar,
  DollarSign,
} from 'lucide-react';

import useCustomers from '../hooks/useCustomers';
import useDebouncedValue from '../hooks/useDebouncedValue';
import AddCustomerDrawer from '../components/AddCustomerDrawer';

const CITIES = [
  'All Cities',
  'New York',
  'San Francisco',
  'Austin',
  'Seattle',
  'Chicago',
  'Boston',
  'Denver',
  'Miami',
  'Atlanta',
  'Los Angeles',
  'Portland',
  'San Diego',
  'Dallas',
];

export default function CustomersPage() {
  const [searchInput, setSearchInput] = useState('');
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [currentPage, setCurrentPage] = useState(1);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Debounce search input by 350ms
  const debouncedSearch = useDebouncedValue(searchInput, 350);

  // Active city query (pass empty if "All Cities")
  const cityParam = selectedCity === 'All Cities' ? '' : selectedCity;

  // Pattern: page -> hook -> API service -> backend
  const {
    customers,
    total,
    totalPages,
    page,
    limit,
    loading,
    error,
    refetch,
    removeCustomer,
  } = useCustomers({
    search: debouncedSearch,
    city: cityParam,
    page: currentPage,
    limit: 10,
  });

  const handleSearchChange = (e) => {
    setSearchInput(e.target.value);
    setCurrentPage(1); // Reset to page 1 on new search
  };

  const handleCityChange = (e) => {
    setSelectedCity(e.target.value);
    setCurrentPage(1); // Reset to page 1 on filter
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setSelectedCity('All Cities');
    setCurrentPage(1);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete customer "${name}"?`)) {
      return;
    }
    setDeletingId(id);
    try {
      await removeCustomer(id);
    } catch (err) {
      alert(`Failed to delete customer: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No orders yet';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Pagination bounds
  const startItem = total === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">
            Customers
          </h2>
          <p className="text-xs lg:text-sm text-slate-500 mt-0.5">
            Manage your customer database, lifetime value, and order engagement.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refetch()}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm disabled:opacity-50"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-brand-600 text-white text-xs lg:text-sm font-semibold hover:bg-brand-700 transition-colors inline-flex items-center gap-2 shadow-sm shadow-brand-500/20"
          >
            <Plus className="w-4 h-4" />
            Add Customer
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        {/* Debounced Search Box */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchInput}
            onChange={handleSearchChange}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-slate-400"
          />
        </div>

        {/* City Filter & Reset */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={selectedCity}
              onChange={handleCityChange}
              className="w-full sm:w-auto pl-8 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all appearance-none cursor-pointer"
            >
              {CITIES.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>

          {(searchInput || selectedCity !== 'All Cities') && (
            <button
              onClick={handleClearFilters}
              className="text-xs text-brand-700 hover:text-brand-800 font-medium px-2.5 py-1.5 rounded-lg hover:bg-brand-50 transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* 1. Error State */}
        {error && (
          <div className="p-8 text-center bg-red-50/50">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Failed to load customers</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">{error}</p>
            <button
              onClick={() => refetch()}
              className="mt-4 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Try Again
            </button>
          </div>
        )}

        {/* 2. Loading Skeleton */}
        {loading && !error && (
          <div className="divide-y divide-slate-100">
            <div className="px-6 py-4 bg-slate-50/75 border-b border-slate-100 hidden md:grid grid-cols-12 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <div className="col-span-4">Customer</div>
              <div className="col-span-3">Company & Phone</div>
              <div className="col-span-2">Location</div>
              <div className="col-span-2 text-right">Orders / Spent</div>
              <div className="col-span-1 text-right">Actions</div>
            </div>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="p-5 flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-3.5 w-1/3">
                  <div className="w-10 h-10 rounded-xl bg-slate-200 shrink-0"></div>
                  <div className="space-y-2 w-full">
                    <div className="h-3.5 bg-slate-200 rounded-md w-3/4"></div>
                    <div className="h-3 bg-slate-100 rounded-md w-1/2"></div>
                  </div>
                </div>
                <div className="h-3 bg-slate-200 rounded-md w-1/6 hidden md:block"></div>
                <div className="h-3 bg-slate-200 rounded-md w-1/6 hidden md:block"></div>
                <div className="h-3.5 bg-slate-200 rounded-md w-1/8 hidden md:block"></div>
              </div>
            ))}
          </div>
        )}

        {/* 3. Empty State */}
        {!loading && !error && customers.length === 0 && (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
              <Users className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No customers found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {searchInput || selectedCity !== 'All Cities'
                ? 'No customers match your active filter criteria. Try resetting your search.'
                : 'Your customer database is currently empty. Run the seed script or add your first customer!'}
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              {(searchInput || selectedCity !== 'All Cities') ? (
                <button
                  onClick={handleClearFilters}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Clear Filters
                </button>
              ) : (
                <button
                  onClick={() => setIsDrawerOpen(true)}
                  className="px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 transition-colors inline-flex items-center gap-1.5 shadow-sm shadow-brand-500/20"
                >
                  <Plus className="w-4 h-4" />
                  Add Customer
                </button>
              )}
            </div>
          </div>
        )}

        {/* 4. Populated Customers Table */}
        {!loading && !error && customers.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Customer</th>
                  <th className="py-3.5 px-6 hidden md:table-cell">Company</th>
                  <th className="py-3.5 px-6 hidden sm:table-cell">City</th>
                  <th className="py-3.5 px-6 text-center">Orders</th>
                  <th className="py-3.5 px-6 text-right">Total Spent</th>
                  <th className="py-3.5 px-6 hidden lg:table-cell">Last Active</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {customers.map((c) => {
                  const initials = c.name
                    ? c.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)
                    : 'BL';

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Name & Email */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-700 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                            {initials}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 group-hover:text-brand-700 transition-colors">
                              {c.name}
                            </div>
                            <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3 text-slate-300" />
                              <span>{c.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Company & Phone */}
                      <td className="py-4 px-6 hidden md:table-cell">
                        <div className="text-slate-800 text-xs font-medium">
                          {c.company || '—'}
                        </div>
                        {c.phone && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-300" />
                            <span>{c.phone}</span>
                          </div>
                        )}
                      </td>

                      {/* City & State */}
                      <td className="py-4 px-6 hidden sm:table-cell">
                        <div className="inline-flex items-center gap-1 text-xs text-slate-600 bg-slate-100/70 px-2.5 py-1 rounded-lg">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{c.city ? `${c.city}${c.state ? `, ${c.state}` : ''}` : '—'}</span>
                        </div>
                      </td>

                      {/* Order Count */}
                      <td className="py-4 px-6 text-center">
                        <span
                          className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                            c.order_count > 0
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {c.order_count}
                        </span>
                      </td>

                      {/* Total Spent */}
                      <td className="py-4 px-6 text-right font-semibold text-slate-900 text-xs sm:text-sm">
                        {formatCurrency(c.total_spent)}
                      </td>

                      {/* Last Order Date */}
                      <td className="py-4 px-6 hidden lg:table-cell text-xs text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDate(c.last_order_at)}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => handleDelete(c.id, c.name)}
                          disabled={deletingId === c.id}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                          title="Delete customer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. Pagination Footer */}
        {!loading && !error && total > 0 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Showing <span className="font-semibold text-slate-700">{startItem}</span> to{' '}
              <span className="font-semibold text-slate-700">{endItem}</span> of{' '}
              <span className="font-semibold text-slate-700">{total}</span> customers
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage <= 1}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>

              <div className="px-3 py-1 font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg">
                {currentPage} / {totalPages || 1}
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage >= totalPages}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Customer Slide-Over Drawer */}
      <AddCustomerDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSuccess={() => {
          refetch();
        }}
      />
    </div>
  );
}
