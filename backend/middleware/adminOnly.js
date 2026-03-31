/**
 * Middleware: adminOnly
 * Checks if the user is an admin based on the role decoded in requireAuth.
 * MUST be used AFTER requireAuth in the route chain.
 */
const adminOnly = (req, res, next) => {
    if (req.employeeRole !== 'admin') {
        return res.status(403).json({ 
            error: 'Access denied. Administrator privileges required for this operation.' 
        });
    }
    next();
};

module.exports = adminOnly;
