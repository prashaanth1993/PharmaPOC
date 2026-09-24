import { createContext, useContext, useState } from 'react';

const STORAGE_KEY = 'pharmapoc.role';
const RoleContext = createContext(null);

export function RoleProvider({ children }) {
  const [role, setRoleState] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) || 'Brand Manager'; } catch { return 'Brand Manager'; }
  });

  function setRole(next) {
    setRoleState(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore in private mode */ }
  }

  return <RoleContext.Provider value={{ role, setRole }}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole must be used inside a RoleProvider');
  return ctx;
}
