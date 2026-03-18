import React from 'react';
import logo from '../assets/logo/logo.png'; 
import '../css/nav.css';
import { Link } from 'react-router-dom';
import brandlogo from '../assets/logo/brand-logo.png';

const Navbar = () => {
  return (
    <header className="fixed-top">
      <nav className="navbar navbar-custom navbar-expand-lg py-2 ">
        <div className="container navbar-container">
          {/* Mobile Toggler */}
          <button 
            className="navbar-toggler" 
            type="button" 
            data-bs-toggle="collapse" 
            data-bs-target="#navbarNav"
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          {/* Brand and Logo */}
          <div className="brand-container d-flex flex-column">
            <div className="text-end me-2">
            </div>
            <img src={brandlogo} alt="Sandigan Carwash Logo" style={{ height: '40px' }} />
          </div>

          {/* Desktop Menu */}
          <div className="collapse navbar-collapse d-flex justify-content-center">
            <ul className="navbar-nav mb-lg-0">
              <li className="nav-item"><a className="nav-link custom-link" href="/#home-section">Home</a></li>
              <li className="nav-item"><a className="nav-link custom-link" href="/#services-section">Services</a></li>
              <li className="nav-item"><a className="nav-link custom-link" href="/#service-price-section">Price List</a></li>
              <li className="nav-item"><a className="nav-link custom-link" href="/#about-section">About</a></li>
              <li className="nav-item"><a className="nav-link custom-link" href="/#contact-section">Contact</a></li>
            </ul>
          </div>

          <div className="">
            <Link
                to="/book"
                className="btn btn-primary btn-lg shadow-lg d-flex align-items-center justify-content-center text-white"
                style={{ width: '9rem', height: '3rem', borderRadius: '24px', backgroundColor: '#23A0CE', border: 'none', fontSize: '1rem' }}
            >
                Book Now
            </Link>
        </div>

        </div>
      </nav>
    </header>
  );
};

export default Navbar;