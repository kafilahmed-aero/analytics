import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const PaginationControls = ({
  pagination = {},
  onPageChange,
  onLimitChange,
}) => {
  const {
    page = 1,
    limit = 10,
    totalItems = 0,
    totalPages = 1,
    hasNext = false,
    hasPrev = false,
  } = pagination;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justify: 'space-between',
        padding: '0.75rem 1rem',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        marginTop: '1rem',
        flexWrap: 'wrap',
        gap: '0.75rem',
      }}
    >
      <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
        Showing Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalItems} total records)
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Limit Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Per page:</span>
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              padding: '0.25rem 0.5rem',
              color: 'var(--text-primary)',
              fontSize: '0.8125rem',
              outline: 'none',
            }}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>

        {/* Page Prev/Next Navigation */}
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={!hasPrev}
            className="refresh-btn"
            type="button"
            style={{ opacity: hasPrev ? 1 : 0.4, cursor: hasPrev ? 'pointer' : 'not-allowed' }}
          >
            <ChevronLeft size={14} /> Prev
          </button>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={!hasNext}
            className="refresh-btn"
            type="button"
            style={{ opacity: hasNext ? 1 : 0.4, cursor: hasNext ? 'pointer' : 'not-allowed' }}
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
