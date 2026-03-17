import React from 'react';
import logo from '../assets/logo/logo.png'; 
import '../css/nav.css';

const Navbar = () => {
  return (
    <header className="sticky-top shadow-sm">
      <nav className="navbar navbar-custom navbar-expand-lg navbar-dark bg-dark py-2 sticky-top">
        <div className="container">
          {/* Mobile Toggler */}
          <button 
            className="navbar-toggler" 
            type="button" 
            data-bs-toggle="collapse" 
            data-bs-target="#navbarNav"
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          {/* Desktop Menu */}
          <div className="collapse navbar-collapse d-none d-lg-block">
            <ul className="navbar-nav me-auto mb-2 mb-lg-0">
              <li className="nav-item"><a className="nav-link custom-link" href="/#home-section">Home</a></li>
              <li className="nav-item"><a className="nav-link custom-link" href="/#services-section">Services</a></li>
              <li className="nav-item"><a className="nav-link custom-link" href="/#service-price-section">Price List</a></li>
              <li className="nav-item"><a className="nav-link custom-link" href="/#about-section">About</a></li>
              <li className="nav-item"><a className="nav-link custom-link" href="/#contact-section">Contact</a></li>
            </ul>
          </div>

          {/* Brand and Logo */}
          <div className="brand-container d-flex align-items-center">
            <div className="text-end me-2">
              <span className="small text-light d-block" style={{ fontSize: '.8rem' }}>
                Welcome to
              </span>
              <strong 
                className="brand-name" 
                style={{ color: '#00e8e9', letterSpacing: '2px', lineHeight: '1' }}
              >
                SANDIGAN
              </strong>
            </div>
            <img src={logo} alt="Sandigan Carwash Logo" style={{ height: '40px' }} />
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;