import { useEffect, useState } from 'react';
import { useRole } from '../context/RoleContext';
import { listAssets, approveAsset, rejectAsset, delegateAsset } from '../api';
import MetadataPanel from '../components/MetadataPanel';
import AnnotationCanvas from '../components/AnnotationCanvas';

export default function ReviewerQueue() {
  const { role } = useRole();
  const [queue, setQueue] = useState([]);

  function refresh() { listAssets({ role, status: 'UnderReview' }).then(setQueue); }
  useEffect(refresh, [role]);

  return (
    <div className="reviewer-queue">
      {queue.map((asset) => (
        <div key={asset.ROWID} className="review-item">
          <img src={asset.FILE_URL} alt={asset.NAME} />
          <MetadataPanel asset={asset} />
          <AnnotationCanvas asset={asset} authorPersona={role} onAnnotate={(a) => {}} />
          <button onClick={() => approveAsset(asset.ROWID, { actorPersona: role, actorRole: 'Reviewer' }).then(refresh)}>Approve</button>
          <button onClick={() => rejectAsset(asset.ROWID, { actorPersona: role, actorRole: 'Reviewer', comments: 'Needs revision' }).then(refresh)}>Reject</button>
          <button onClick={() => delegateAsset(asset.ROWID, { actorPersona: role, actorRole: 'Reviewer', comments: 'Delegating' }).then(refresh)}>Delegate</button>
        </div>
      ))}
    </div>
  );
}
