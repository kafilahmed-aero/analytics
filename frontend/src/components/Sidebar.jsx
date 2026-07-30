import React from 'react';
import { LayoutDashboard, BarChart3 } from 'lucide-react';

export const Sidebar = () => {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="brand-icon">
          <BarChart3 size={20} />
        </div>
        <span className="brand-name">Analytics</span>
      </div>
      <nav className="sidebar-nav">
        <a href="#dashboard" className="nav-item active">
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </a>
      </nav>
    </aside>
  );
};
