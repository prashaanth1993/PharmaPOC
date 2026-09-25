import { useEffect, useState } from 'react';
import { getAnalytics } from '../api';

export default function AdminAnalytics() {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    getAnalytics().then(setStats).catch(console.error);
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Usage analytics</h2>
          <p>Adoption and activity across every market and persona.</p>
        </div>
      </div>
      {!stats ? (
        <p className="loading-state">Loading…</p>
      ) : (
        <div className="admin-analytics">
          <div className="stat-tile">
            <strong>{stats.totalAssets}</strong>
            <span>Total assets</span>
          </div>
          <div className="stat-tile">
            <strong>{stats.usageEvents}</strong>
            <span>Usage events</span>
          </div>
        </div>
      )}
    </div>
  );
}
