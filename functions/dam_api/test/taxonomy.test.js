const { suggestClassification } = require('../src/taxonomy');

describe('suggestClassification', () => {
  test('returns the canned Function/Process/Tags for a known asset type', () => {
    expect(suggestClassification('Video')).toEqual({ function: 'Marketing', process: 'Product Launch', tags: ['Video', 'Launch'] });
  });

  test('falls back to the default suggestion for an unknown asset type', () => {
    expect(suggestClassification('Podcast')).toEqual({ function: 'Marketing', process: 'Campaign', tags: ['General'] });
  });

  test('returns a fresh tags array each call so callers cannot mutate the shared default', () => {
    const a = suggestClassification('Video');
    a.tags.push('Extra');
    const b = suggestClassification('Video');
    expect(b.tags).toEqual(['Video', 'Launch']);
  });
});
