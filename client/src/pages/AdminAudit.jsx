import { useEffect, useState } from 'react';
import { getAudit } from '../api';

export default function AdminAudit() {
  const [audit, setAudit] = useState([]);
  useEffect(() => { getAudit().then(setAudit); }, []);
  return (
    <table className="admin-audit">
      <thead><tr><th>Asset</th><th>Action</th><th>Actor</th><th>Comments</th><th>When</th></tr></thead>
      <tbody>
        {audit.map((row) => (
          <tr key={row.ROWID}>
            <td>{row.ASSET_ID}</td><td>{row.ACTION}</td><td>{row.ACTOR_PERSONA} ({row.ACTOR_ROLE})</td>
            <td>{row.COMMENTS}</td><td>{row.CREATEDTIME}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
