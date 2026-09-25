import { useEffect, useState } from 'react';
import './App.css';
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

const ROLE_TAGLINES = {
  'Brand Manager': 'Upload, tag and submit marketing and medical assets for review.',
  Reviewer: 'Approve, reject or delegate assets waiting on your sign-off.',
  Admin: 'Governance, taxonomy and usage across every market.',
  'Agency Viewer': 'Published assets available to your market.',
};

function TabBar({ tabs, activeKey, onSelect }) {
  return (
    <nav className="tab-bar">
      {Object.keys(tabs).map((t) => (
        <button
          key={t}
          className={`tab-btn${t === activeKey ? ' active' : ''}`}
          onClick={() => onSelect(t)}
        >
          {t}
        </button>
      ))}
    </nav>
  );
}

export default function App() {
  const { role } = useRole();
  const [openAssetId, setOpenAssetId] = useState(null);
  const [tab, setTab] = useState(null);

  useEffect(() => {
    setTab(null);
    setOpenAssetId(null);
  }, [role]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-lockup">
          <img src="/sun-pharma-logo.png" alt="Sun Pharma" className="brand-logo" />
          <div>
            <h1>Digital Asset Manager</h1>
            <p className="app-tagline">{ROLE_TAGLINES[role]}</p>
          </div>
        </div>
        <RoleSwitcher />
      </header>

      <main className="app-main">
        {openAssetId ? (
          <AssetDetail assetId={openAssetId} onBack={() => setOpenAssetId(null)} />
        ) : (
          <>
            {role === 'Brand Manager' && (() => {
              const activeKey = tab && BRAND_TABS[tab] ? tab : 'Library';
              const Page = BRAND_TABS[activeKey];
              return (
                <>
                  <TabBar tabs={BRAND_TABS} activeKey={activeKey} onSelect={setTab} />
                  <Page
                    onOpenAsset={(a) => setOpenAssetId(a.ROWID)}
                    onUploaded={() => setTab('Library')}
                  />
                </>
              );
            })()}

            {role === 'Reviewer' && <ReviewerQueue />}

            {role === 'Admin' && (() => {
              const activeKey = tab && ADMIN_TABS[tab] ? tab : 'Analytics';
              const Page = ADMIN_TABS[activeKey];
              return (
                <>
                  <TabBar tabs={ADMIN_TABS} activeKey={activeKey} onSelect={setTab} />
                  <Page />
                </>
              );
            })()}

            {role === 'Agency Viewer' && <AgencyLibrary />}
          </>
        )}
      </main>
    </div>
  );
}
