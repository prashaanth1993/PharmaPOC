import { useState } from 'react';
import { useRole } from '../context/RoleContext';
import { getSuggestions, createAsset } from '../api';
import UploadStepper from '../components/UploadStepper';

const ASSET_TYPES = ['Image', 'Video', 'Brochure', 'Detail Aid', 'Presentation', 'Social Post'];

export default function UploadAsset({ onUploaded }) {
  const { role } = useRole();
  const [stage, setStage] = useState('Ingest');
  const [file, setFile] = useState(null);
  const [fields, setFields] = useState({ name: '', assetType: 'Image', function: '', process: '', brand: '', market: '' });

  async function handleFileChange(e) {
    const chosen = e.target.files[0];
    setFile(chosen);
    setStage('Extract');
    setStage('Classify');
    const suggestions = await getSuggestions('new', fields.assetType);
    setStage('Enrich');
    setFields((f) => ({ ...f, function: suggestions.function, process: suggestions.process }));
    setStage('Validate');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const formData = new FormData();
    formData.append('file', file);
    Object.entries(fields).forEach(([k, v]) => formData.append(k, v));
    formData.append('uploadedBy', role);
    const asset = await createAsset(formData);
    setStage('Publish');
    onUploaded(asset);
  }

  return (
    <form className="upload-asset" onSubmit={handleSubmit}>
      <UploadStepper stage={stage} />
      <input type="file" onChange={handleFileChange} />
      <input placeholder="Asset name" value={fields.name} onChange={(e) => setFields({ ...fields, name: e.target.value })} />
      <select value={fields.assetType} onChange={(e) => setFields({ ...fields, assetType: e.target.value })}>
        {ASSET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      <input placeholder="Function (AI-suggested)" value={fields.function} onChange={(e) => setFields({ ...fields, function: e.target.value })} />
      <input placeholder="Process (AI-suggested)" value={fields.process} onChange={(e) => setFields({ ...fields, process: e.target.value })} />
      <input placeholder="Brand" value={fields.brand} onChange={(e) => setFields({ ...fields, brand: e.target.value })} />
      <input placeholder="Market" value={fields.market} onChange={(e) => setFields({ ...fields, market: e.target.value })} />
      <button type="submit" disabled={!file}>Ingest &amp; Submit for Review</button>
    </form>
  );
}
