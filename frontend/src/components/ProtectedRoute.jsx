import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
    const employee = localStorage.getItem('employee');

    if (!employee) {
        // If no employee is logged in, redirect to login page
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default ProtectedRoute;