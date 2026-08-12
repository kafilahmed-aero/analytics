import React, { useState } from 'react';
import { Signal, RotateCcw, Download, Upload, ShieldCheck } from 'lucide-react';
import { resetAnalyticsApi, backupAnalyticsApi, restoreAnalyticsApi } from '../services/dashboard.service';

export const DashboardSummaryCards = ({ summary, isRefreshing, onRefresh }) => {
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  if (!summary) return null;

  const {
    channelsTracked = 0,
    pairsTracked = 0,
    totalSignalsProcessed = 0,
    cumulativeHits = {},
    baselineTimestamp = '2026-08-12T09:03:17.000Z',
  } = summary;

  const {
    tp1Hits = 0,
    tp1Dollars = 0,
    tp2Hits = 0,
    tp2Dollars = 0,
    tp3Hits = 0,
    tp3Dollars = 0,
    fullTpHits = 0,
    fullTpDollars = 0,
    originalSlHits = 0,
    originalSlDollars = 0,
    sl8Hits = 0,
    sl8Dollars = 0,
    sl10Hits = 0,
    sl10Dollars = 0,
    sl12Hits = 0,
    sl12Dollars = 0,
  } = cumulativeHits;

  const formatVal = (val) => (Number(val) || 0).toFixed(2);

  const handleReset = async () => {
    if (!window.confirm('Are you sure you want to clean reset all analytics and start fresh from the baseline timestamp?')) {
      return;
    }
    setActionLoading(true);
    setActionMessage(null);
    try {
      await resetAnalyticsApi();
      setActionMessage({ type: 'success', text: 'Clean reset successful! Analytics dashboard reset to baseline.' });
      if (onRefresh) onRefresh();
    } catch (err) {
      setActionMessage({ type: 'error', text: `Reset failed: ${err.message}` });
    } finally {
      setActionLoading(false);
    }
  };

  const handleBackup = async () => {
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await backupAnalyticsApi();
      setActionMessage({ type: 'success', text: 'Backup snapshot saved successfully!' });
    } catch (err) {
      setActionMessage({ type: 'error', text: `Backup failed: ${err.message}` });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!window.confirm('Restore all persistent analytics signal results from backup snapshot?')) {
      return;
    }
    setActionLoading(true);
    setActionMessage(null);
    try {
      await restoreAnalyticsApi();
      setActionMessage({ type: 'success', text: 'Persistent signal results restored successfully!' });
      if (onRefresh) onRefresh();
    } catch (err) {
      setActionMessage({ type: 'error', text: `Restore failed: ${err.message}` });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="health-card" style={{ marginBottom: '1.5rem' }}>
      <div className="card-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div className="card-title-group">
          <Signal size={20} style={{ color: 'var(--accent-primary)' }} />
          <h2 className="card-title">Cumulative Performance Analytics</h2>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleBackup}
            disabled={actionLoading}
            className="refresh-btn"
            title="Create persistent backup snapshot"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.4rem 0.75rem', cursor: 'pointer' }}
          >
            <Download size={14} /> Backup Snapshot
          </button>

          <button
            type="button"
            onClick={handleRestore}
            disabled={actionLoading}
            className="refresh-btn"
            title="Restore signal results from persistent snapshot"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.4rem 0.75rem', cursor: 'pointer' }}
          >
            <Upload size={14} /> Restore Results
          </button>

          <button
            type="button"
            onClick={handleReset}
            disabled={actionLoading}
            className="refresh-btn"
            title="Clean reset analytics dashboard and start fresh from baseline timestamp"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.4rem 0.75rem',
              color: '#ef4444',
              borderColor: 'rgba(239, 68, 68, 0.3)',
              cursor: 'pointer'
            }}
          >
            <RotateCcw size={14} /> Clean Reset
          </button>

          {isRefreshing && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Updating...</span>
          )}
        </div>
      </div>

      {/* Fresh Start Watermark Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 0.75rem',
          marginBottom: '1rem',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: '6px',
          fontSize: '0.8125rem',
          color: '#10b981',
        }}
      >
        <ShieldCheck size={16} />
        <span>
          <strong>UptimeRobot Connected & Zero-Loss Protection Active:</strong> Fresh Baseline Watermark: {' '}
          <code>{new Date(baselineTimestamp).toLocaleString()}</code>
        </span>
      </div>

      {actionMessage && (
        <div
          style={{
            padding: '0.5rem 0.75rem',
            marginBottom: '1rem',
            borderRadius: '6px',
            fontSize: '0.8125rem',
            backgroundColor: actionMessage.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            color: actionMessage.type === 'success' ? '#10b981' : '#ef4444',
          }}
        >
          {actionMessage.text}
        </div>
      )}

      <div className="health-grid">
        <div className="health-item">
          <span className="health-label">Processed Signals</span>
          <span className="health-value">{totalSignalsProcessed}</span>
        </div>

        <div className="health-item">
          <span className="health-label">Channels Tracked</span>
          <span className="health-value">{channelsTracked}</span>
        </div>

        <div className="health-item">
          <span className="health-label">Pairs Tracked</span>
          <span className="health-value">{pairsTracked}</span>
        </div>

        <div className="health-item">
          <span className="health-label">TP1 Milestone</span>
          <span className="health-value" style={{ color: '#10b981' }}>
            ${formatVal(tp1Dollars)} ({tp1Hits} hits)
          </span>
        </div>

        <div className="health-item">
          <span className="health-label">TP2 Milestone</span>
          <span className="health-value" style={{ color: '#10b981' }}>
            ${formatVal(tp2Dollars)} ({tp2Hits} hits)
          </span>
        </div>

        <div className="health-item">
          <span className="health-label">Full TP Milestone</span>
          <span className="health-value" style={{ color: '#10b981' }}>
            ${formatVal(fullTpDollars)} ({fullTpHits} hits)
          </span>
        </div>

        <div className="health-item">
          <span className="health-label">Original SL Milestone</span>
          <span className="health-value" style={{ color: '#ef4444' }}>
            ${formatVal(originalSlDollars)} ({originalSlHits} hits)
          </span>
        </div>

        <div className="health-item">
          <span className="health-label">SL8 / SL10 / SL12 Milestones</span>
          <span className="health-value" style={{ fontSize: '0.9375rem', color: '#ef4444' }}>
            ${formatVal(sl8Dollars)} / ${formatVal(sl10Dollars)} / ${formatVal(sl12Dollars)}
          </span>
        </div>
      </div>
    </div>
  );
};
