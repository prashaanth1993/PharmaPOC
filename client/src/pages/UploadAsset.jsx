import { useState } from 'react';
import { useRole } from '../context/RoleContext';
import { getSuggestions, createAsset } from '../api';
import UploadStepper from '../components/UploadStepper';

const ASSET_TYPES = ['Image', 'Video', 'Brochure', 'Detail Aid', 'Presentation', 'Social Post'];

export default function UploadAsset({ onUploaded }) {
  const { role } = useRole();
  const [stage, setStage] = useState('Ingest');
  const [file, setFile] = useState(null);
  const [fields, setFields] = useState({
    name: '',
    assetType: 'Image',
    function: '',
    process: '',
    brand: '',
    market: '',
  });

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
    <div>
      <div className="page-header">
        <div>
          <h2>Upload asset</h2>
          <p>Every upload runs through the six-stage Ingest → Publish pipeline.</p>
        </div>
      </div>
      <form className="upload-asset" onSubmit={handleSubmit}>
        <UploadStepper stage={stage} />

        <div className="field field-full">
          <label className="field-label" htmlFor="upload-file">
            Asset file
          </label>
          <input id="upload-file" type="file" onChange={handleFileChange} />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="upload-name">
            Asset name
          </label>
          <input
            id="upload-name"
            value={fields.name}
            onChange={(e) => setFields({ ...fields, name: e.target.value })}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="upload-type">
            Asset type
          </label>
          <select
            id="upload-type"
            value={fields.assetType}
            onChange={(e) => setFields({ ...fields, assetType: e.target.value })}
          >
            {ASSET_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="upload-function">
            Function (AI-suggested)
          </label>
          <input
            id="upload-function"
            value={fields.function}
            onChange={(e) => setFields({ ...fields, function: e.target.value })}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="upload-process">
            Process (AI-suggested)
          </label>
          <input
            id="upload-process"
            value={fields.process}
            onChange={(e) => setFields({ ...fields, process: e.target.value })}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="upload-brand">
            Brand
          </label>
          <input
            id="upload-brand"
            value={fields.brand}
            onChange={(e) => setFields({ ...fields, brand: e.target.value })}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="upload-market">
            Market
          </label>
          <input
            id="upload-market"
            value={fields.market}
            onChange={(e) => setFields({ ...fields, market: e.target.value })}
          />
        </div>

        <button className="btn btn-accent" type="submit" disabled={!file}>
          Ingest &amp; submit for review
        </button>
      </form>
    </div>
  );
}
