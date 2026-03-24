import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/public/Home'; 
import Book from './pages/public/Book';
import Login from './pages/login/Login';
import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
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

        {/* Employee Dashboard */}
        <Route path="/employee" element={
          <ProtectedRoute>
            <EmployeeDashboard />
          </ProtectedRoute>
        } />

        {/* Booking Page */}
        <Route path="/book" element={<Book />} />

        {/* Admin Section — placeholder until AdminDashboard is built */}
        <Route path="/admin" element={<div>Admin Dashboard Coming Soon</div>} />
      </Routes>
    </Router>
  );
}

export default App;