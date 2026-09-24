const FACETS = [
  { label: 'Identity', fields: [['Name', 'NAME'], ['Asset Type', 'ASSET_TYPE'], ['Version', 'CURRENT_VERSION']] },
  { label: 'Business', fields: [['Function', 'FUNCTION'], ['Process', 'PROCESS'], ['Owner', 'UPLOADED_BY']] },
  { label: 'Product', fields: [['Brand', 'BRAND'], ['Therapeutic Area', 'THERAPEUTIC_AREA']] },
  { label: 'Location', fields: [['Market', 'MARKET']] },
  { label: 'Compliance', fields: [['Usage Rights', 'USAGE_RIGHTS'], ['Language', 'LANGUAGE']] },
  { label: 'Lifecycle', fields: [['Status', 'STATUS'], ['Effective Date', 'EFFECTIVE_DATE']] },
];

export default function MetadataPanel({ asset }) {
  return (
    <div className="metadata-panel">
      {FACETS.map(({ label, fields }) => (
        <section key={label}>
          <h4>{label}</h4>
          <dl>
            {fields.map(([caption, key]) => (
              <div key={key}>
                <dt>{caption}</dt>
                <dd>{asset[key] || '—'}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
