import React from 'react';
import { Search, X } from 'lucide-react';

export const SearchBar = ({ value, onChange, placeholder = 'Search identifier...' }) => {
  return (
    <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
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
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '0.5rem 0.75rem 0.5rem 2.25rem',
          color: 'var(--text-primary)',
          fontSize: '0.875rem',
          outline: 'none',
        }}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          type="button"
          style={{
            position: 'absolute',
            right: '0.75rem',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
          }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
};
