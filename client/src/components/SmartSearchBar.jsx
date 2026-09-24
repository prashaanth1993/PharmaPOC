import { useState } from 'react';

const MARKETS = ['', 'Nigeria', 'Philippines', 'Kenya', 'Vietnam', 'Indonesia', 'Global'];
const FUNCTIONS = ['', 'Marketing', 'Medical Affairs', 'Training & Learning', 'Corporate Communications', 'Sales/Field Enablement'];

export default function SmartSearchBar({ onChange }) {
  const [filters, setFilters] = useState({ search: '', market: '', function: '' });

  function update(next) {
    const merged = { ...filters, ...next };
    setFilters(merged);
    onChange(merged);
  }

  return (
    <div className="smart-search-bar">
      <input
        placeholder="Search assets"
        value={filters.search}
        onChange={(e) => update({ search: e.target.value })}
      />
      <label>
        Market
        <select aria-label="Market" value={filters.market} onChange={(e) => update({ market: e.target.value })}>
          {MARKETS.map((m) => <option key={m} value={m}>{m || 'All Markets'}</option>)}
        </select>
      </label>
      <label>
        Function
        <select aria-label="Function" value={filters.function} onChange={(e) => update({ function: e.target.value })}>
          {FUNCTIONS.map((f) => <option key={f} value={f}>{f || 'All Functions'}</option>)}
        </select>
      </label>
    </div>
  );
}
