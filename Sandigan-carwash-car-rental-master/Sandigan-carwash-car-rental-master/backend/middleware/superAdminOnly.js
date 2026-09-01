/**
 * Middleware: superAdminOnly
 * Restricts a route to super_admin role only.
 * MUST be used AFTER requireAuth in the route chain.
 *
 * Used for:
 *   - User & Role Management (create/deactivate admin accounts)
 *   - System Settings (loyalty config, pricing config, etc.)
 *   - Full Audit Log access
 *   - System backup / data export
 *
 * Usage:
 *   router.delete('/:id', requireAuth, superAdminOnly, deleteAdminHandler)
 */
const superAdminOnly = (req, res, next) => {
    if (req.user?.role !== 'super_admin') {
        return res.status(403).json({
            error: 'Access denied. Super Administrator privileges required for this operation.'
        });
    }
    next();
};

module.exports = superAdminOnly;
