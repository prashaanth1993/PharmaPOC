import { useEffect, useState } from 'react';
import { getAudit } from '../api';

export default function AdminAudit() {
  const [audit, setAudit] = useState([]);
  useEffect(() => {
    getAudit().then(setAudit).catch(console.error);
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Audit trail</h2>
          <p>Every approval-workflow action, across every asset and persona.</p>
        </div>
      </div>
      <table className="admin-audit">
        <thead>
          <tr>
            <th>Asset</th>
            <th>Action</th>
            <th>Actor</th>
            <th>Comments</th>
            <th>When</th>
          </tr>
        </thead>
        <tbody>
          {audit.map((row) => (
            <tr key={row.ROWID}>
              <td>{row.ASSET_ID}</td>
              <td>
                <span className={`badge status-${row.ACTION}`}>{row.ACTION}</span>
              </td>
              <td>
                <div className="actor-cell">
                  <span>{row.ACTOR_PERSONA}</span>
                  <span className="meta-pill">{row.ACTOR_ROLE}</span>
                </div>
              </td>
              <td>{row.COMMENTS || '—'}</td>
              <td>{row.CREATEDTIME}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
