import React from 'react';
import { HealthCard } from '../components/HealthCard';
import { FxDeskProConnectionCard } from '../components/FxDeskProConnectionCard';
import { DashboardSummaryCards } from '../components/DashboardSummaryCards';
import { AnalyticsTable } from '../components/AnalyticsTable';
import { useDashboardData } from '../hooks/useDashboardData';

export const DashboardPage = () => {
  const {
    searchTerm,
    setSearchTerm,
    summary,
    channels,
    isInitialLoading,
    isRefreshing,
    error,
    refreshData,
  } = useDashboardData();

  return (
    <div className="dashboard-container">
      {/* 1. Welcome Banner */}
      <section className="welcome-section">
        <h2 className="welcome-title">Analytics Platform</h2>
        <p className="welcome-subtitle">
          Telegram Channel XAUUSD Performance Ranking & Live Signal Analytics.
        </p>
      </section>

      {/* 2. System Health */}
      <HealthCard />

      {/* 3. FX Desk Pro Connection */}
      <FxDeskProConnectionCard />

      {/* 4. Cumulative Performance Summary */}
      <DashboardSummaryCards summary={summary} isRefreshing={isRefreshing} onRefresh={refreshData} />

      {/* 5. Channel Analytics Table (Displays all channels, ranked by Total Signals DESC) */}
      <AnalyticsTable
        channels={channels}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        isLoading={isInitialLoading}
        error={error}
      />
    </div>
  );
};
