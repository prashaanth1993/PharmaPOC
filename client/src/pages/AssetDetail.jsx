import { useEffect, useState } from 'react';
import { useRole } from '../context/RoleContext';
import { getAsset, submitAsset, annotateAsset, logUsage } from '../api';
import MetadataPanel from '../components/MetadataPanel';
import AnnotationCanvas from '../components/AnnotationCanvas';

export default function AssetDetail({ assetId, onBack }) {
  const { role } = useRole();
  const [asset, setAsset] = useState(null);

  useEffect(() => {
    getAsset(assetId).then((a) => {
      setAsset(a);
      logUsage({ assetId, action: 'View', persona: role, channel: 'DAM Demo' }).catch(() => {});
    });
  }, [assetId]);

  if (!asset) return <p className="loading-state">Loading…</p>;

  return (
    <div>
      <button className="back-btn" onClick={onBack}>
        ← Back to library
      </button>
      <div className="page-header">
        <div>
          <h2>{asset.NAME}</h2>
          <div className="asset-card-meta">
            <span className="meta-pill">{asset.BRAND}</span>
            <span className="meta-pill">{asset.ASSET_TYPE}</span>
          </div>
        </div>
        <span className={`status status-${asset.STATUS}`}>{asset.STATUS}</span>
      </div>
      <div className="asset-detail">
        <img src={asset.FILE_URL} alt={asset.NAME} className="hero" />
        <MetadataPanel asset={asset} />
        <AnnotationCanvas
          asset={asset}
          authorPersona={role}
          onAnnotate={(a) => annotateAsset(assetId, a)}
        />
        {asset.STATUS === 'Draft' && (
          <button
            className="btn btn-accent"
            onClick={() =>
              submitAsset(assetId, { actorPersona: role, actorRole: 'Brand Manager' }).then(() =>
                getAsset(assetId).then(setAsset)
              )
            }
          >
            Submit for review
          </button>
        )}
      </div>
    </div>
  );
}
