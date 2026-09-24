import { useEffect, useState } from 'react';
import { getAnalytics } from '../api';

export default function AdminAnalytics() {
  const [stats, setStats] = useState(null);
  useEffect(() => { getAnalytics().then(setStats); }, []);
  if (!stats) return <p>Loading…</p>;
  return (
    <div className="admin-analytics">
      <div className="stat-tile"><strong>{stats.totalAssets}</strong><span>Total Assets</span></div>
      <div className="stat-tile"><strong>{stats.usageEvents}</strong><span>Usage Events</span></div>
    </div>
  );
}
