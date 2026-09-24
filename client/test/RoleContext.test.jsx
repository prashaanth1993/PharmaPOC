// client/test/RoleContext.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { RoleProvider, useRole } from '../src/context/RoleContext';

function Probe() {
  const { role, setRole } = useRole();
  return (
    <div>
      <span data-testid="role">{role}</span>
      <button onClick={() => setRole('Admin')}>Become Admin</button>
    </div>
  );
}

beforeEach(() => localStorage.clear());

test('defaults to Brand Manager when nothing is stored', () => {
  render(<RoleProvider><Probe /></RoleProvider>);
  expect(screen.getByTestId('role').textContent).toBe('Brand Manager');
});

test('setRole updates state and persists to localStorage', () => {
  render(<RoleProvider><Probe /></RoleProvider>);
  fireEvent.click(screen.getByText('Become Admin'));
  expect(screen.getByTestId('role').textContent).toBe('Admin');
  expect(localStorage.getItem('pharmapoc.role')).toBe('Admin');
});

test('restores a previously persisted role on mount', () => {
  localStorage.setItem('pharmapoc.role', 'Reviewer');
  render(<RoleProvider><Probe /></RoleProvider>);
  expect(screen.getByTestId('role').textContent).toBe('Reviewer');
});
