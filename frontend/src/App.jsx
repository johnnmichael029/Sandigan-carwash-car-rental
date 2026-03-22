import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/public/Home'; 
import Book from './pages/public/Book';
import Login from './pages/login/Login';

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

        {/* Booking Page */}
        <Route path="/book" element={<Book />} />

        {/* Admin Section */}
        <Route path="/admin" element={<div>Admin Dashboard Coming Soon</div>} />

        {/* Employee Section */}
        <Route path="/employee" element={<div>Employee Panel Coming Soon</div>} />
      </Routes>
    </Router>
  );
}

export default App;