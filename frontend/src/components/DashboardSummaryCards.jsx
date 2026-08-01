import React from 'react';
import { Signal } from 'lucide-react';

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

  return (
    <div className="health-card" style={{ marginBottom: '1.5rem' }}>
      <div className="card-header">
        <div className="card-title-group">
          <Signal size={20} style={{ color: 'var(--accent-primary)' }} />
          <h2 className="card-title">Cumulative Milestone Measurement Summary</h2>
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
          <span className="health-label">TP1 Milestone</span>
          <span className="health-value" style={{ color: '#10b981' }}>
            {formatVal(tp1Dollars)}
          </span>
        </div>

        <div className="health-item">
          <span className="health-label">TP2 Milestone</span>
          <span className="health-value" style={{ color: '#10b981' }}>
            {formatVal(tp2Dollars)}
          </span>
        </div>

        <div className="health-item">
          <span className="health-label">Full TP Milestone</span>
          <span className="health-value" style={{ color: '#10b981' }}>
            {formatVal(fullTpDollars)}
          </span>
        </div>

        <div className="health-item">
          <span className="health-label">Original SL Milestone</span>
          <span className="health-value" style={{ color: '#ef4444' }}>
            {formatVal(originalSlDollars)}
          </span>
        </div>

        <div className="health-item">
          <span className="health-label">SL8 / SL10 / SL12 Milestones</span>
          <span className="health-value" style={{ fontSize: '0.9375rem', color: '#ef4444' }}>
            {formatVal(sl8Dollars)} / {formatVal(sl10Dollars)} / {formatVal(sl12Dollars)}
          </span>
        </div>
      </div>
    </div>
  );
};
