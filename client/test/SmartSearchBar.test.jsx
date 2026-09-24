import { render, screen, fireEvent } from '@testing-library/react';
import { vi, test, expect } from 'vitest';
import SmartSearchBar from '../src/components/SmartSearchBar';

test('calls onChange with the search term as the user types', () => {
  const onChange = vi.fn();
  render(<SmartSearchBar onChange={onChange} />);
  fireEvent.change(screen.getByPlaceholderText(/search assets/i), { target: { value: 'launch' } });
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ search: 'launch' }));
});

test('calls onChange with the selected market filter', () => {
  const onChange = vi.fn();
  render(<SmartSearchBar onChange={onChange} />);
  fireEvent.change(screen.getByLabelText(/market/i), { target: { value: 'Nigeria' } });
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ market: 'Nigeria' }));
});

test('calls onChange with the selected function filter', () => {
  const onChange = vi.fn();
  render(<SmartSearchBar onChange={onChange} />);
  fireEvent.change(screen.getByLabelText(/function/i), { target: { value: 'Marketing' } });
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ function: 'Marketing' }));
});
