import { hasPermission } from '../utils/permissions';

/**
 * PermissionGate — conditionally renders children based on RBAC permissions.
 *
 * Usage:
 *   <PermissionGate user={user} department="Finance" action="delete">
 *     <button onClick={handleDelete}>Delete</button>
 *   </PermissionGate>
 *
 * Props:
 *   user        {object}    - Employee object (from AdminDashboard state/localStorage)
 *   department  {string}    - Department name: 'Finance' | 'Inventory' | 'Operations' | 'Workforce' | 'Clientele'
 *   action      {string}    - 'read' | 'create' | 'update' | 'delete'
 *   fallback    {ReactNode} - Optional: what to render if no permission (default: nothing)
 *   disabled    {boolean}   - If true, renders children but disables them instead of hiding
 *
 * Notes:
 *   - Super Admin and Admin always pass through.
 *   - Department Staff are checked against their permissions map.
 *   - If user is null, nothing is rendered.
 */
const PermissionGate = ({ user, department, action, children, fallback = null, disabled = false }) => {
    const allowed = hasPermission(user, department, action);

    if (!allowed) {
        if (disabled && children) {
            // Render children as disabled — wrap in a disabled overlay span
            return (
                <span
                    title={`You need '${action}' permission on ${department} to perform this action.`}
                    style={{ display: 'inline-block', opacity: 0.4, cursor: 'not-allowed', pointerEvents: 'none' }}
                >
                    {children}
                </span>
            );
        }
        return fallback;
    }

    return children;
};

export default PermissionGate;
