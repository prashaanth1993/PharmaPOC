import { useRole } from '../context/RoleContext';

const ROLES = ['Brand Manager', 'Reviewer', 'Admin', 'Agency Viewer'];

export default function RoleSwitcher() {
  const { role, setRole } = useRole();
  return (
    <select aria-label="Continue as" value={role} onChange={(e) => setRole(e.target.value)}>
      {ROLES.map((r) => <option key={r} value={r}>Continue as: {r}</option>)}
    </select>
  );
}
