export default function AssetCard({ asset, onOpen }) {
  return (
    <button className="asset-card" onClick={() => onOpen(asset)}>
      <img src={asset.THUMBNAIL_URL} alt={asset.NAME} />
      <div className="asset-card-body">
        <strong>{asset.NAME}</strong>
        <span>{asset.FUNCTION} · {asset.PROCESS}</span>
        <span>{asset.BRAND} · {asset.MARKET}</span>
        <span className={`status status-${asset.STATUS}`}>{asset.STATUS}</span>
      </div>
    </button>
  );
}
