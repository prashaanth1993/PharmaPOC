import { useEffect, useState } from 'react';
import { useRole } from '../context/RoleContext';
import { getAsset, submitAsset, annotateAsset, logUsage } from '../api';
import MetadataPanel from '../components/MetadataPanel';
import AnnotationCanvas from '../components/AnnotationCanvas';

export default function AssetDetail({ assetId }) {
  const { role } = useRole();
  const [asset, setAsset] = useState(null);

  useEffect(() => {
    getAsset(assetId).then((a) => {
      setAsset(a);
      logUsage({ assetId, action: 'View', persona: role, channel: 'DAM Demo' }).catch(() => {});
    });
  }, [assetId]);
  if (!asset) return <p>Loading…</p>;

  return (
    <div className="asset-detail">
      <img src={asset.FILE_URL} alt={asset.NAME} className="hero" />
      <MetadataPanel asset={asset} />
      <AnnotationCanvas asset={asset} authorPersona={role} onAnnotate={(a) => annotateAsset(assetId, a)} />
      {asset.STATUS === 'Draft' && (
        <button onClick={() => submitAsset(assetId, { actorPersona: role, actorRole: 'Brand Manager' }).then(() => getAsset(assetId).then(setAsset))}>
          Submit for Review
        </button>
      )}
    </div>
  );
}
