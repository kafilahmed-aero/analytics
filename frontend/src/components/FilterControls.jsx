import React from 'react';
import { ArrowUpDown, Filter } from 'lucide-react';

export const FilterControls = ({
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  minSignals,
  setMinSignals,
}) => {
  return (
    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
      {/* Sort By Dropdown */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
        <ArrowUpDown size={14} style={{ color: 'var(--text-muted)' }} />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '0.45rem 0.625rem',
            color: 'var(--text-primary)',
            fontSize: '0.8125rem',
            outline: 'none',
          }}
        >
          <option value="totalSignals">Sort: Total Signals</option>
          <option value="fullTpHits">Sort: Full TP Hits</option>
          <option value="tp1Hits">Sort: TP1 Hits</option>
          <option value="originalSlHits">Sort: Original SL Hits</option>
          <option value="identifier">Sort: Identifier A-Z</option>
        </select>
      </div>

      {/* Sort Order Toggle */}
      <button
        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
        type="button"
        className="refresh-btn"
        style={{ padding: '0.45rem 0.625rem', fontSize: '0.8125rem' }}
      >
        {sortOrder.toUpperCase()}
      </button>

      {/* Min Signals Filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
        <Filter size={14} style={{ color: 'var(--text-muted)' }} />
        <input
          type="number"
          min="0"
          value={minSignals}
          onChange={(e) => setMinSignals(e.target.value)}
          placeholder="Min Signals..."
          style={{
            width: '110px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '0.45rem 0.625rem',
            color: 'var(--text-primary)',
            fontSize: '0.8125rem',
            outline: 'none',
          }}
        />
      </div>
    </div>
  );
};
