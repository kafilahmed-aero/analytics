import React from 'react';
import { Signal, Radio, Layers, CheckCircle, Target, AlertTriangle } from 'lucide-react';

export const DashboardSummaryCards = ({ summary, isRefreshing }) => {
  if (!summary) return null;

  const {
    channelsTracked = 0,
    pairsTracked = 0,
    totalSignalsProcessed = 0,
    cumulativeHits = {},
  } = summary;

  const {
    tp1Hits = 0,
    tp2Hits = 0,
    tp3Hits = 0,
    fullTpHits = 0,
    originalSlHits = 0,
    sl8Hits = 0,
    sl10Hits = 0,
    sl12Hits = 0,
  } = cumulativeHits;

  return (
    <div className="health-card" style={{ marginBottom: '1.5rem' }}>
      <div className="card-header">
        <div className="card-title-group">
          <Signal size={20} style={{ color: 'var(--accent-primary)' }} />
          <h2 className="card-title">Cumulative Performance Summary</h2>
        </div>
        {isRefreshing && (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Updating...</span>
        )}
      </div>

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
          <span className="health-label">TP1 Hits</span>
          <span className="health-value" style={{ color: '#10b981' }}>{tp1Hits}</span>
        </div>

        <div className="health-item">
          <span className="health-label">TP2 Hits</span>
          <span className="health-value" style={{ color: '#10b981' }}>{tp2Hits}</span>
        </div>

        <div className="health-item">
          <span className="health-label">TP3 / Full TP Hits</span>
          <span className="health-value" style={{ color: '#10b981' }}>{fullTpHits}</span>
        </div>

        <div className="health-item">
          <span className="health-label">Original SL Hits</span>
          <span className="health-value" style={{ color: '#ef4444' }}>{originalSlHits}</span>
        </div>

        <div className="health-item">
          <span className="health-label">SL8 / SL10 / SL12 Hits</span>
          <span className="health-value" style={{ fontSize: '0.9375rem', color: '#f59e0b' }}>
            {sl8Hits} / {sl10Hits} / {sl12Hits}
          </span>
        </div>
      </div>
    </div>
  );
};
