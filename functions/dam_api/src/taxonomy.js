'use strict';

const SUGGESTIONS_BY_TYPE = {
  Image: { function: 'Marketing', process: 'Campaign', tags: ['Visual Aid', 'Digital'] },
  Video: { function: 'Marketing', process: 'Product Launch', tags: ['Video', 'Launch'] },
  Brochure: { function: 'Medical Affairs', process: 'Medical Education', tags: ['Print', 'Education'] },
  'Detail Aid': { function: 'Sales/Field Enablement', process: 'Field Enablement', tags: ['Field', 'Detailing'] },
  Presentation: { function: 'Training & Learning', process: 'Onboarding', tags: ['Training', 'Slides'] },
  'Social Post': { function: 'Corporate Communications', process: 'Campaign', tags: ['Social', 'Digital'] },
};

const DEFAULT_SUGGESTION = { function: 'Marketing', process: 'Campaign', tags: ['General'] };

function suggestClassification(assetType) {
  const base = SUGGESTIONS_BY_TYPE[assetType] || DEFAULT_SUGGESTION;
  return { function: base.function, process: base.process, tags: [...base.tags] };
}

module.exports = { suggestClassification, SUGGESTIONS_BY_TYPE };
