/**
 * Middleware: adminOnly
 * Allows super_admin and admin roles through.
 * Department staff must use requirePermission() instead.
 * MUST be used AFTER requireAuth in the route chain.
 */
const adminOnly = (req, res, next) => {
    const role = req.user?.role;
    if (role !== 'super_admin' && role !== 'admin') {
        return res.status(403).json({ 
            error: 'Access denied. Administrator privileges required for this operation.' 
        });
    }
    next();
};

module.exports = adminOnly;
