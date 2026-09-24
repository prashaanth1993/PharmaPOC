import { useEffect, useState } from 'react';
import { getTags } from '../api';

export default function AdminTaxonomy() {
  const [tags, setTags] = useState([]);
  useEffect(() => { getTags().then(setTags).catch(console.error); }, []);
  return (
    <div className="admin-taxonomy">
      <h3>Controlled Vocabularies</h3>
      <p>Metadata Stewards maintain this list; Domain Owners (Brand Manager, Reviewer) consume it during Classify/Enrich.</p>
      <ul>
        {tags.map((t) => <li key={t.ROWID}>{t.TAG_NAME} <em>({t.TAG_CATEGORY})</em></li>)}
      </ul>
    </div>
  );
}
