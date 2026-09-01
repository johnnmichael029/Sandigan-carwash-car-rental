/**
 * Middleware: requirePermission
 * Factory that returns a middleware enforcing department-level permission checks.
 *
 * Usage:
 *   router.get('/', requireAuth, requirePermission('Finance', 'read'), handler)
 *   router.delete('/:id', requireAuth, requirePermission('Finance', 'delete'), handler)
 *
 * Access rules:
 *   - super_admin → always allowed
 *   - admin       → always allowed
 *   - department_staff → allowed only if their permissions[department] includes the action
 *   - employee / detailer → always denied (use adminOnly for those routes)
 */
const requirePermission = (department, action) => {
    return (req, res, next) => {
        const user = req.user;

        if (!user) {
            return res.status(401).json({ error: 'Unauthorized. Please log in.' });
        }

        // Super Admin and Admin bypass all permission checks
        if (user.role === 'super_admin' || user.role === 'admin') {
            return next();
        }

        // Department staff: check if they have the required permission
        if (user.role === 'department_staff') {
            const userPermissions = user.permissions instanceof Map
                ? user.permissions.get(department)
                : (user.permissions?.[department]);

            if (Array.isArray(userPermissions) && userPermissions.includes(action)) {
                return next();
            }

            return res.status(403).json({
                error: `Access denied. You do not have '${action}' permission for the ${department} department.`
            });
        }

        // All other roles (employee, detailer) are denied
        return res.status(403).json({
            error: 'Access denied. Insufficient role privileges.'
        });
    };
};

module.exports = requirePermission;
