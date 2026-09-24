import { useState } from 'react';
import { useRole } from './context/RoleContext';
import RoleSwitcher from './components/RoleSwitcher';
import AssetLibrary from './pages/AssetLibrary';
import UploadAsset from './pages/UploadAsset';
import AssetDetail from './pages/AssetDetail';
import ReviewerQueue from './pages/ReviewerQueue';
import AdminAnalytics from './pages/AdminAnalytics';
import AdminTaxonomy from './pages/AdminTaxonomy';
import AdminAudit from './pages/AdminAudit';
import AgencyLibrary from './pages/AgencyLibrary';

const BRAND_TABS = { Library: AssetLibrary, Upload: UploadAsset };
const ADMIN_TABS = { Analytics: AdminAnalytics, Taxonomy: AdminTaxonomy, Audit: AdminAudit };

export default function App() {
  const { role } = useRole();
  const [openAssetId, setOpenAssetId] = useState(null);
  const [tab, setTab] = useState(null);

  if (openAssetId) return <AssetDetail assetId={openAssetId} />;

  return (
    <div className="app-shell">
      <header className="app-header">
        <img src="/sun-pharma-logo.png" alt="Sun Pharma" className="brand-logo" />
        <h1>Sun Pharma DAM Demo</h1>
        <RoleSwitcher />
      </header>
      {role === 'Brand Manager' && (
        <>
          <nav>{Object.keys(BRAND_TABS).map((t) => <button key={t} onClick={() => setTab(t)}>{t}</button>)}</nav>
          {(() => { const Page = BRAND_TABS[tab] || AssetLibrary; return <Page onOpenAsset={(a) => setOpenAssetId(a.ROWID)} onUploaded={() => setTab('Library')} />; })()}
        </>
      )}
      {role === 'Reviewer' && <ReviewerQueue />}
      {role === 'Admin' && (
        <>
          <nav>{Object.keys(ADMIN_TABS).map((t) => <button key={t} onClick={() => setTab(t)}>{t}</button>)}</nav>
          {(() => { const Page = ADMIN_TABS[tab] || AdminAnalytics; return <Page />; })()}
        </>
      )}
      {role === 'Agency Viewer' && <AgencyLibrary />}
    </div>
  );
}
