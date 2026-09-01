/**
 * permissions.js — Client-side RBAC helpers
 *
 * These helpers read from the localStorage 'employee' object and are used
 * for UI-level show/hide decisions. Backend enforcement is always the source
 * of truth; these are purely for UX (hiding buttons the user cannot use).
 */

/**
 * Returns the logged-in employee object from localStorage.
 * @returns {object|null}
 */
export const getUser = () => {
    try {
        const stored = localStorage.getItem('employee');
        return stored ? JSON.parse(stored) : null;
    } catch {
        return null;
    }
};

/**
 * Checks if the current user has a specific action permission on a department.
 *
 * Super Admin and Admin always return true (full access).
 * Department Staff are checked against their permissions map.
 * Other roles always return false.
 *
 * @param {object} user  - The employee object (from props or localStorage)
 * @param {string} department - e.g. 'Finance', 'Inventory', 'Workforce', 'Clientele', 'Operations'
 * @param {string} action - 'read' | 'create' | 'update' | 'delete'
 * @returns {boolean}
 */
export const hasPermission = (user, department, action) => {
    if (!user) return false;

    // Super Admin and Admin have full access to everything
    if (user.role === 'super_admin' || user.role === 'admin') return true;

    // Department Staff: check their specific permissions map
    if (user.role === 'department_staff') {
        const deptPerms = user.permissions?.[department];
        return Array.isArray(deptPerms) && deptPerms.includes(action);
    }

    // All other roles (employee, detailer) have no admin portal permissions
    return false;
};

/**
 * Checks if the user has access to at least 'read' on a department.
 * Shorthand for hasPermission(user, department, 'read').
 *
 * @param {object} user
 * @param {string} department
 * @returns {boolean}
 */
export const canView = (user, department) => hasPermission(user, department, 'read');

/**
 * Checks if the user is a Super Admin.
 * @param {object} user
 * @returns {boolean}
 */
export const isSuperAdmin = (user) => user?.role === 'super_admin';

/**
 * Checks if the user is an Admin or Super Admin.
 * @param {object} user
 * @returns {boolean}
 */
export const isAdmin = (user) => user?.role === 'admin' || user?.role === 'super_admin';
