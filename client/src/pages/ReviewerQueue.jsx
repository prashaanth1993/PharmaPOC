import { useEffect, useState } from 'react';
import { useRole } from '../context/RoleContext';
import { listAssets, approveAsset, rejectAsset, delegateAsset } from '../api';
import MetadataPanel from '../components/MetadataPanel';
import AnnotationCanvas from '../components/AnnotationCanvas';

export default function ReviewerQueue() {
  const { role } = useRole();
  const [queue, setQueue] = useState([]);
  const [loaded, setLoaded] = useState(false);

  function refresh() {
    listAssets({ role, status: 'UnderReview' }).then((data) => {
      setQueue(data);
      setLoaded(true);
    });
  }
  useEffect(refresh, [role]);

  return (
    <div className="reviewer-queue-page">
      <div className="page-header">
        <div>
          <h2>Review queue</h2>
          <p>{queue.length} asset{queue.length === 1 ? '' : 's'} waiting on your sign-off.</p>
        </div>
      </div>
      {loaded && queue.length === 0 ? (
        <div className="empty-state">
          <strong>Nothing waiting on you right now</strong>
          Assets submitted by Brand Managers will appear here for approval.
        </div>
      ) : (
        <div className="reviewer-queue">
          {queue.map((asset) => (
            <div key={asset.ROWID} className="review-item">
              <div>
                <AnnotationCanvas asset={asset} authorPersona={role} onAnnotate={() => {}} />
              </div>
              <div>
                <div className="page-header">
                  <h3>{asset.NAME}</h3>
                  <span className={`status status-${asset.STATUS}`}>{asset.STATUS}</span>
                </div>
                <MetadataPanel asset={asset} />
                <div className="review-actions">
                  <button
                    className="btn btn-accent"
                    onClick={() =>
                      approveAsset(asset.ROWID, { actorPersona: role, actorRole: 'Reviewer' }).then(refresh)
                    }
                  >
                    Approve
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() =>
                      rejectAsset(asset.ROWID, {
                        actorPersona: role,
                        actorRole: 'Reviewer',
                        comments: 'Needs revision',
                      }).then(refresh)
                    }
                  >
                    Reject
                  </button>
                  <button
                    className="btn"
                    onClick={() =>
                      delegateAsset(asset.ROWID, {
                        actorPersona: role,
                        actorRole: 'Reviewer',
                        comments: 'Delegating',
                      }).then(refresh)
                    }
                  >
                    Delegate
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
