import { Navigate } from 'react-router-dom';

/**
 * ProtectedRoute: guards employee-only and admin pages.
 * Checks that employee data exists in localStorage (set on login).
 * The JWT itself is held in an httpOnly cookie (not readable from JS).
 * Real security is enforced by the JWT middleware on every protected backend API call.
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
    const stored = localStorage.getItem('employee');

    if (!stored) {
        return <Navigate to="/login" replace />;
    }

    const employee = JSON.parse(stored);

    // If allowedRoles is provided, check if the employee role matches
    if (allowedRoles && !allowedRoles.includes(employee.role)) {
        // Super Admin, Admin, and Department Staff all belong in the admin portal
        if (['super_admin', 'admin', 'department_staff'].includes(employee.role)) {
            return <Navigate to="/admin" replace />;
        }
        // Floor staff fall back to employee dashboard
        return <Navigate to="/employee" replace />;
    }

    return children;
};

export default ProtectedRoute;