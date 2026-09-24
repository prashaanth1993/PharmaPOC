import AssetLibrary from './AssetLibrary';

export default function AgencyLibrary() {
  return (
    <div className="agency-library">
      <p>Read-only view — Published assets in your market only.</p>
      <AssetLibrary onOpenAsset={() => {}} />
    </div>
  );
}
