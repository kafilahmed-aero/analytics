import React from 'react';
import { AlertCircle, Inbox, Search, Trophy } from 'lucide-react';

export const AnalyticsTable = ({
  items = [],
  searchTerm = '',
  onSearchChange,
  isInitialLoading = false,
  error = null,
}) => {
  if (isInitialLoading) {
    return (
      <div className="health-card">
        <div className="loading-state">Loading channel performance rankings...</div>
      </div>
    );
  }

  return (
    <div className="health-card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Table Card Header with Search */}
      <div
        style={{
          padding: '1rem 1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--border-color)',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <Trophy size={20} style={{ color: 'var(--accent-primary)' }} />
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Channel Milestone Measurement Summary
            </h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Raw Independent Milestone Totals (XAUUSD)
            </span>
          </div>
        </div>

        {/* Channel Search Input */}
        <div style={{ position: 'relative', width: '260px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
            placeholder="Search channel name..."
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem 0.5rem 2.25rem',
              fontSize: '0.875rem',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Non-blocking Error Banner */}
      {error && (
        <div
          style={{
            background: 'var(--status-offline-bg)',
            borderBottom: '1px solid var(--status-offline-border)',
            padding: '0.625rem 1.25rem',
            color: 'var(--status-offline-text)',
            fontSize: '0.8125rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <AlertCircle size={14} />
          <span>Notice: {error}. Displaying last known live analytics.</span>
        </div>
      )}

      {/* Single Scrollable Table (Vertical & Horizontal) */}
      <div style={{ overflowX: 'auto', maxHeight: '600px', width: '100%' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'left',
            fontSize: '0.875rem',
          }}
        >
          <thead>
            <tr
              style={{
                background: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border-color)',
                color: 'var(--text-muted)',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                position: 'sticky',
                top: 0,
                zIndex: 10,
              }}
            >
              <th style={{ padding: '0.875rem 1.25rem', fontWeight: 600 }}>#</th>
              <th style={{ padding: '0.875rem 1.25rem', fontWeight: 600 }}>Channel Name</th>
              <th style={{ padding: '0.875rem 0.75rem', fontWeight: 600, textAlign: 'center' }}>Total Signals</th>
              <th style={{ padding: '0.875rem 0.75rem', fontWeight: 600, textAlign: 'center', color: '#10b981' }}>TP1</th>
              <th style={{ padding: '0.875rem 0.75rem', fontWeight: 600, textAlign: 'center', color: '#10b981' }}>TP2</th>
              <th style={{ padding: '0.875rem 0.75rem', fontWeight: 600, textAlign: 'center', color: '#10b981' }}>TP3</th>
              <th style={{ padding: '0.875rem 0.75rem', fontWeight: 600, textAlign: 'center', color: '#10b981' }}>Full TP</th>
              <th style={{ padding: '0.875rem 0.75rem', fontWeight: 600, textAlign: 'center', color: '#ef4444' }}>Original SL</th>
              <th style={{ padding: '0.875rem 0.75rem', fontWeight: 600, textAlign: 'center', color: '#f59e0b' }}>SL8</th>
              <th style={{ padding: '0.875rem 0.75rem', fontWeight: 600, textAlign: 'center', color: '#f59e0b' }}>SL10</th>
              <th style={{ padding: '0.875rem 0.75rem', fontWeight: 600, textAlign: 'center', color: '#f59e0b' }}>SL12</th>
              <th style={{ padding: '0.875rem 1.25rem', fontWeight: 600, textAlign: 'right' }}>Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan="12" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                    <Inbox size={28} />
                    <span>No channel analytics records found matching criteria.</span>
                  </div>
                </td>
              </tr>
            ) : (
              items.map((row, index) => (
                <tr
                  key={row.identifier}
                  style={{
                    borderBottom: '1px solid var(--border-color)',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '0.875rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    #{index + 1}
                  </td>
                  <td style={{ padding: '0.875rem 1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {row.identifier}
                  </td>
                  <td style={{ padding: '0.875rem 0.75rem', textAlign: 'center', fontWeight: 600 }}>
                    {row.totalSignals}
                  </td>
                  <td style={{ padding: '0.875rem 0.75rem', textAlign: 'center', color: '#10b981' }}>
                    {row.tp1Hits}
                  </td>
                  <td style={{ padding: '0.875rem 0.75rem', textAlign: 'center', color: '#10b981' }}>
                    {row.tp2Hits}
                  </td>
                  <td style={{ padding: '0.875rem 0.75rem', textAlign: 'center', color: '#10b981' }}>
                    {row.tp3Hits}
                  </td>
                  <td style={{ padding: '0.875rem 0.75rem', textAlign: 'center', fontWeight: 600, color: '#10b981' }}>
                    {row.fullTpHits}
                  </td>
                  <td style={{ padding: '0.875rem 0.75rem', textAlign: 'center', fontWeight: 600, color: '#ef4444' }}>
                    {row.originalSlHits}
                  </td>
                  <td style={{ padding: '0.875rem 0.75rem', textAlign: 'center', color: '#f59e0b' }}>
                    {row.sl8Hits}
                  </td>
                  <td style={{ padding: '0.875rem 0.75rem', textAlign: 'center', color: '#f59e0b' }}>
                    {row.sl10Hits}
                  </td>
                  <td style={{ padding: '0.875rem 0.75rem', textAlign: 'center', color: '#f59e0b' }}>
                    {row.sl12Hits}
                  </td>
                  <td style={{ padding: '0.875rem 1.25rem', textAlign: 'right', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    {row.lastUpdated ? new Date(row.lastUpdated).toLocaleTimeString() : 'N/A'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
