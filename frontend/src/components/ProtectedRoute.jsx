import { Navigate } from 'react-router-dom';

/**
 * ProtectedRoute: guards employee-only pages.
 * Checks that employee data exists in localStorage (set on login).
 * The JWT itself is held in an httpOnly cookie (not readable from JS).
 * Real security is enforced by the JWT middleware on every protected backend API call.
 */
const ProtectedRoute = ({ children }) => {
    const employee = localStorage.getItem('employee');

    if (!employee) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default ProtectedRoute;