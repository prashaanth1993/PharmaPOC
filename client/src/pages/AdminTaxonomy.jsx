import { useEffect, useState } from 'react';
import { getTags } from '../api';

export default function AdminTaxonomy() {
  const [tags, setTags] = useState([]);
  useEffect(() => {
    getTags().then(setTags).catch(console.error);
  }, []);

  return (
    <div className="admin-taxonomy">
      <div className="page-header">
        <div>
          <h2>Controlled vocabularies</h2>
        </div>
      </div>
      <p>
        Metadata Stewards maintain this list; Domain Owners (Brand Manager, Reviewer) consume it
        during the Classify and Enrich stages of every upload.
      </p>
      <ul>
        {tags.map((t) => (
          <li key={t.ROWID}>
            {t.TAG_NAME}
            <span className="tag-category-badge">{t.TAG_CATEGORY}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
