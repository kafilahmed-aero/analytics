import React from 'react';
import { Server, RefreshCw } from 'lucide-react';
import { useHealth } from '../hooks/useHealth';

export const HealthCard = () => {
  const { healthData, loading, error, refetch } = useHealth();

  if (loading) {
    return (
      <div className="health-card">
        <div className="loading-state">Checking system status...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="health-card">
        <div className="card-header">
          <div className="card-title-group">
            <Server size={20} style={{ color: 'var(--accent-primary)' }} />
            <h2 className="card-title">System Health</h2>
          </div>
          <button onClick={refetch} className="refresh-btn" type="button">
            <RefreshCw size={14} /> Retry
          </button>
        </div>
        <div className="error-state">{error}</div>
      </div>
    );
  }

  const { serverStatus, databaseStatus, uptime, timestamp } = healthData || {};

  return (
    <div className="health-card">
      <div className="card-header">
        <div className="card-title-group">
          <Server size={20} style={{ color: 'var(--accent-primary)' }} />
          <h2 className="card-title">System Health</h2>
        </div>
        <button onClick={refetch} className="refresh-btn" type="button">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="health-grid">
        <div className="health-item">
          <span className="health-label">Server Status</span>
          <div className={`status-badge ${serverStatus}`}>
            <span className="status-dot"></span>
            <span>{serverStatus}</span>
          </div>
        </div>

        <div className="health-item">
          <span className="health-label">Database Status</span>
          <div className={`status-badge ${databaseStatus}`}>
            <span className="status-dot"></span>
            <span>{databaseStatus}</span>
          </div>
        </div>

        <div className="health-item">
          <span className="health-label">Uptime</span>
          <span className="health-value">{uptime}</span>
        </div>

        <div className="health-item">
          <span className="health-label">Timestamp</span>
          <span className="health-value" style={{ fontSize: '0.875rem' }}>
            {new Date(timestamp).toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  );
};
