import React from 'react';
import { Layers, Radio } from 'lucide-react';
import { HealthCard } from '../components/HealthCard';
import { FxDeskProConnectionCard } from '../components/FxDeskProConnectionCard';
import { DashboardSummaryCards } from '../components/DashboardSummaryCards';
import { SearchBar } from '../components/SearchBar';
import { FilterControls } from '../components/FilterControls';
import { AnalyticsTable } from '../components/AnalyticsTable';
import { PaginationControls } from '../components/PaginationControls';
import { useDashboardData } from '../hooks/useDashboardData';

export const DashboardPage = () => {
  const {
    activeTab,
    setActiveTab,
    searchTerm,
    setSearchTerm,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    minSignals,
    setMinSignals,
    page,
    setPage,
    limit,
    setLimit,
    summary,
    tableItems,
    pagination,
    isInitialLoading,
    isRefreshing,
    error,
  } = useDashboardData();

  return (
    <div className="dashboard-container">
      {/* Welcome Banner */}
      <section className="welcome-section">
        <h2 className="welcome-title">Analytics Platform</h2>
        <p className="welcome-subtitle">
          Real-time performance analytics & live active signal monitoring.
        </p>
      </section>

      {/* Infrastructure Readiness Cards */}
      <HealthCard />
      <FxDeskProConnectionCard />

      {/* Overall Cumulative Summary Metrics */}
      <DashboardSummaryCards summary={summary} isRefreshing={isRefreshing} />

      {/* Analytics Dashboard Controls & Table Section */}
      <div className="health-card">
        {/* Tab Selection Header */}
        <div className="card-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setActiveTab('channels')}
              type="button"
              className={`nav-item ${activeTab === 'channels' ? 'active' : ''}`}
              style={{ cursor: 'pointer', border: 'none' }}
            >
              <Radio size={16} />
              <span>Channel Analytics</span>
            </button>

            <button
              onClick={() => setActiveTab('pairs')}
              type="button"
              className={`nav-item ${activeTab === 'pairs' ? 'active' : ''}`}
              style={{ cursor: 'pointer', border: 'none' }}
            >
              <Layers size={16} />
              <span>Pair Analytics</span>
            </button>
          </div>

          {isRefreshing && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Auto refreshing...
            </span>
          )}
        </div>

        {/* Search & Filter Controls Bar */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', margin: '1rem 0' }}>
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder={`Search ${activeTab === 'channels' ? 'channel' : 'currency pair'}...`}
          />

          <FilterControls
            sortBy={sortBy}
            setSortBy={setSortBy}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
            minSignals={minSignals}
            setMinSignals={setMinSignals}
          />
        </div>

        {/* Unified Presentational Table */}
        <AnalyticsTable
          type={activeTab}
          items={tableItems}
          isInitialLoading={isInitialLoading}
          isRefreshing={isRefreshing}
          error={error}
        />

        {/* Pagination Footer Controls */}
        <PaginationControls
          pagination={pagination}
          onPageChange={(newPage) => setPage(newPage)}
          onLimitChange={(newLimit) => {
            setLimit(newLimit);
            setPage(1);
          }}
        />
      </div>
    </div>
  );
};
