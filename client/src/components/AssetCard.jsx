import { useState } from 'react';

export default function AssetCard({ asset, onOpen }) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <button className="asset-card" onClick={() => onOpen(asset)}>
      {imageFailed ? (
        <div className="asset-card-fallback" aria-hidden="true">
          {asset.ASSET_TYPE || 'Asset'}
        </div>
      ) : (
        <img src={asset.THUMBNAIL_URL} alt={asset.NAME} onError={() => setImageFailed(true)} />
      )}
      <div className="asset-card-body">
        <strong className="asset-card-title">{asset.NAME}</strong>
        <div className="asset-card-meta">
          <span className="meta-pill">{asset.FUNCTION}</span>
          <span className="meta-pill">{asset.MARKET}</span>
        </div>
        <span className={`status status-${asset.STATUS}`}>{asset.STATUS}</span>
      </div>
    </button>
  );
}
