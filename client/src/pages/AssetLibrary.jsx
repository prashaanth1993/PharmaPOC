import { useEffect, useState } from 'react';
import { useRole } from '../context/RoleContext';
import { listAssets } from '../api';
import SmartSearchBar from '../components/SmartSearchBar';
import AssetCard from '../components/AssetCard';

export default function AssetLibrary({ onOpenAsset }) {
  const { role } = useRole();
  const [assets, setAssets] = useState([]);
  const [filters, setFilters] = useState({});

  useEffect(() => {
    listAssets({ role, ...filters }).then(setAssets).catch(console.error);
  }, [role, filters]);

  return (
    <div className="asset-library">
      <SmartSearchBar onChange={setFilters} />
      <div className="asset-grid">
        {assets.map((asset) => <AssetCard key={asset.ROWID} asset={asset} onOpen={onOpenAsset} />)}
      </div>
    </div>
  );
}
