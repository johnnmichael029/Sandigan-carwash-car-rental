/**
 * Middleware: adminOnly
<<<<<<< HEAD
 * Allows super_admin and admin roles through.
 * Department staff must use requirePermission() instead.
 * MUST be used AFTER requireAuth in the route chain.
 */
const adminOnly = (req, res, next) => {
    const role = req.user?.role;
    if (role !== 'super_admin' && role !== 'admin') {
=======
 * Checks if the user is an admin based on the role decoded in requireAuth.
 * MUST be used AFTER requireAuth in the route chain.
 */
const adminOnly = (req, res, next) => {
    if (req.employeeRole !== 'admin') {
>>>>>>> b1d1b6bc1ab4fe98040e5c50349f87e080246976
        return res.status(403).json({ 
            error: 'Access denied. Administrator privileges required for this operation.' 
        });
    }
    next();
};

module.exports = adminOnly;
