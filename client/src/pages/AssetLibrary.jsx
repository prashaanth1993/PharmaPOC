import { useEffect, useState } from 'react';
import { useRole } from '../context/RoleContext';
import { listAssets } from '../api';
import SmartSearchBar from '../components/SmartSearchBar';
import AssetCard from '../components/AssetCard';

export default function AssetLibrary({
  onOpenAsset,
  title = 'Asset library',
  subtitle = 'Search, filter and manage every marketing, medical and corporate asset.',
}) {
  const { role } = useRole();
  const [assets, setAssets] = useState([]);
  const [filters, setFilters] = useState({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
    listAssets({ role, ...filters })
      .then((data) => {
        setAssets(data);
        setLoaded(true);
      })
      .catch(console.error);
  }, [role, filters]);

  return (
    <div className="asset-library">
      <div className="page-header">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>
      <SmartSearchBar onChange={setFilters} />
      {loaded && assets.length === 0 ? (
        <div className="empty-state">
          <strong>No assets match your filters</strong>
          Try clearing the search or widening the market and function filters.
        </div>
      ) : (
        <div className="asset-grid">
          {assets.map((asset) => (
            <AssetCard key={asset.ROWID} asset={asset} onOpen={onOpenAsset} />
          ))}
        </div>
      )}
    </div>
  );
}
