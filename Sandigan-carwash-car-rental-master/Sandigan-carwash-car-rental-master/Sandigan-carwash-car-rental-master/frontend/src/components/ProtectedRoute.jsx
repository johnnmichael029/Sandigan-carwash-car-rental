import { Navigate } from 'react-router-dom';

/**
 * ProtectedRoute: guards employee-only pages.
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
        // If they are admin but trying to access staff page, redirect to admin
        if (employee.role === 'admin') return <Navigate to="/admin" replace />;
        // If they are staff but trying to access admin page, redirect to employee
        return <Navigate to="/employee" replace />;
    }

    return children;
};

export default ProtectedRoute;