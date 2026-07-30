import React, { useState, useEffect } from 'react';
import { Network, Send, CheckCircle2, XCircle, HelpCircle } from 'lucide-react';
import { testFxDeskProConnection } from '../services/fxdeskpro.service';

export const FxDeskProConnectionCard = () => {
  const [statusState, setStatusState] = useState({
    tested: false,
    connected: false,
    baseUrl: 'Loading...',
    lastChecked: null,
    lastSuccessful: null,
    error: null,
  });
  const [testing, setTesting] = useState(false);

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const response = await testFxDeskProConnection();
      const data = response.data || {};

      setStatusState((prev) => ({
        tested: true,
        connected: !!data.connected,
        baseUrl: data.baseUrl || prev.baseUrl,
        lastChecked: data.lastChecked || new Date().toISOString(),
        lastSuccessful: data.connected ? (data.lastChecked || new Date().toISOString()) : prev.lastSuccessful,
        error: data.connected ? null : (data.error || 'Target server unreachable'),
      }));
    } catch (err) {
      setStatusState((prev) => ({
        tested: true,
        connected: false,
        baseUrl: prev.baseUrl !== 'Loading...' ? prev.baseUrl : 'N/A',
        lastChecked: new Date().toISOString(),
        lastSuccessful: prev.lastSuccessful,
        error: err.message || 'Connection test failed',
      }));
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    handleTestConnection();
  }, []);

  const renderStatusBadge = () => {
    if (!statusState.tested) {
      return (
        <div className="status-badge" style={{ background: 'rgba(148, 163, 184, 0.12)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
          <HelpCircle size={14} />
          <span>Not Tested</span>
        </div>
      );
    }

    if (statusState.connected) {
      return (
        <div className="status-badge online">
          <CheckCircle2 size={14} />
          <span>Connected</span>
        </div>
      );
    }

    return (
      <div className="status-badge offline">
        <XCircle size={14} />
        <span>Disconnected</span>
      </div>
    );
  };

  return (
    <div className="health-card">
      <div className="card-header">
        <div className="card-title-group">
          <Network size={20} style={{ color: 'var(--accent-primary)' }} />
          <h2 className="card-title">FX Desk Pro Connection</h2>
        </div>
        <button
          onClick={handleTestConnection}
          disabled={testing}
          className="refresh-btn"
          type="button"
          style={{ opacity: testing ? 0.7 : 1 }}
        >
          <Send size={14} className={testing ? 'spin' : ''} />
          {testing ? 'Testing...' : 'Test Connection'}
        </button>
      </div>

      <div className="health-grid">
        <div className="health-item">
          <span className="health-label">Connection Status</span>
          {renderStatusBadge()}
        </div>

        <div className="health-item">
          <span className="health-label">Target Service URL</span>
          <span className="health-value" style={{ fontSize: '0.875rem', fontFamily: 'monospace' }}>
            {statusState.baseUrl}
          </span>
        </div>

        <div className="health-item">
          <span className="health-label">Last Successful Connection</span>
          <span className="health-value" style={{ fontSize: '0.875rem' }}>
            {statusState.lastSuccessful
              ? new Date(statusState.lastSuccessful).toLocaleTimeString()
              : 'None'}
          </span>
        </div>
      </div>

      {statusState.error && (
        <div className="error-state" style={{ padding: '0.75rem 1rem', marginTop: '0.5rem', textAlign: 'left', borderRadius: '6px', background: 'var(--status-offline-bg)' }}>
          <strong>Error:</strong> {statusState.error}
        </div>
      )}
    </div>
  );
};
