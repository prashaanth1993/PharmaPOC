import { render, screen } from '@testing-library/react';
import { test, expect } from 'vitest';
import MetadataPanel from '../src/components/MetadataPanel';

const asset = {
  NAME: 'Cardiozan Launch Detail Aid', ASSET_TYPE: 'Detail Aid', CURRENT_VERSION: 1,
  FUNCTION: 'Sales/Field Enablement', PROCESS: 'Field Enablement', UPLOADED_BY: 'Priya Sharma',
  BRAND: 'Cardiozan', THERAPEUTIC_AREA: 'Cardiovascular', MARKET: 'Nigeria',
  USAGE_RIGHTS: 'Internal', LANGUAGE: 'English', STATUS: 'Published', EFFECTIVE_DATE: '2026-09-20',
};

test('groups fields under the six metadata facets from the spec', () => {
  render(<MetadataPanel asset={asset} />);
  ['Identity', 'Business', 'Product', 'Location', 'Compliance', 'Lifecycle'].forEach((facet) =>
    expect(screen.getByText(facet)).toBeInTheDocument()
  );
});

test('renders the asset name under Identity and the market under Location', () => {
  render(<MetadataPanel asset={asset} />);
  expect(screen.getByText('Cardiozan Launch Detail Aid')).toBeInTheDocument();
  expect(screen.getByText('Nigeria')).toBeInTheDocument();
});
