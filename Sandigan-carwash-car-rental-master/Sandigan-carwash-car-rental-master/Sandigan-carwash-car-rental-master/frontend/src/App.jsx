import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/public/Home'; 
import Book from './pages/public/Book';
import Login from './pages/login/Login';
import AdminSetup from './pages/login/AdminSetup';
import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import { initCsrf } from './api/config';

function App() {
  useEffect(() => {
    initCsrf();
  }, []);

  return (
    <Router>   
      <Routes>
        {/* Landing Page */}
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />
        <Route path="/about" element={<Home />} />
        <Route path="/services" element={<Home />} />
        <Route path="/contact" element={<Home />} />

        {/* Login Page */}
        <Route path="/login" element={<Login />} />

        {/* First-Run Admin Setup — self-locking */}
        <Route path="/setup" element={<AdminSetup />} />

        {/* Employee Dashboard */}
        <Route path="/employee" element={
          <ProtectedRoute allowedRoles={['employee']}>
            <EmployeeDashboard />
          </ProtectedRoute>
        } />

        {/* Admin Dashboard */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        {/* Booking Page */}
        <Route path="/book" element={<Book />} />
      </Routes>
    </Router>
  );
}

export default App;