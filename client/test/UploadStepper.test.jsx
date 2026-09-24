import { render, screen } from '@testing-library/react';
import { test, expect } from 'vitest';
import UploadStepper from '../src/components/UploadStepper';

const STAGES = ['Ingest', 'Extract', 'Classify', 'Enrich', 'Validate', 'Publish'];

test('renders all six pipeline stages', () => {
  render(<UploadStepper stage="Classify" />);
  STAGES.forEach((s) => expect(screen.getByText(s)).toBeInTheDocument());
});

test('marks the current stage as active and earlier stages as done', () => {
  render(<UploadStepper stage="Enrich" />);
  expect(screen.getByText('Ingest').closest('li')).toHaveClass('done');
  expect(screen.getByText('Enrich').closest('li')).toHaveClass('active');
  expect(screen.getByText('Publish').closest('li')).toHaveClass('pending');
});
