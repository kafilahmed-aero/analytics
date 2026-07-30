import React from 'react';
import { Activity } from 'lucide-react';

export const Header = () => {
  return (
    <header className="header">
      <div className="header-left">
        <Activity size={20} className="text-accent" style={{ color: 'var(--accent-primary)' }} />
        <h1 className="header-title">Analytics Engine Architecture</h1>
      </div>
      <div className="header-right">
        <span className="env-badge">Production Ready</span>
      </div>
    </header>
  );
};
