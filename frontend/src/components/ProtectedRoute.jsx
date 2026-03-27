import { Navigate } from 'react-router-dom';

/**
 * ProtectedRoute: guards employee-only pages.
 * Checks that BOTH a token AND employee data exist in localStorage.
 * If either is missing, the user is sent back to /login.
 *
 * Note: This is a client-side guard only. Real security is enforced
 * by the JWT middleware on every protected backend API call.
 */
const ProtectedRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    const employee = localStorage.getItem('employee');

    if (!token || !employee) {
        // Clear any partial/stale data before redirecting
        localStorage.removeItem('token');
        localStorage.removeItem('employee');
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default ProtectedRoute;