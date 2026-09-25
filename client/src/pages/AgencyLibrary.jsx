import AssetLibrary from './AssetLibrary';

export default function AgencyLibrary() {
  return (
    <div className="agency-library">
      <span className="access-note">View-only access to Published assets in your market</span>
      <AssetLibrary
        onOpenAsset={() => {}}
        title="Published assets"
        subtitle="Approved marketing and medical assets available for your market."
      />
    </div>
  );
}
