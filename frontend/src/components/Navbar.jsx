import React, { useState, useEffect } from 'react';
import logo from '../assets/logo/logo.png'; 
import '../css/nav.css';
import { Link, useLocation } from 'react-router-dom';
import brandlogo from '../assets/logo/brand-logo.png';

const Navbar = () => {
  const [activeSection, setActiveSection] = useState('home');
  const location = useLocation();
  
    useEffect(() => {
      if (location.pathname !== '/' && location.pathname !== '/home' && location.pathname !== '/about' && location.pathname !== '/services' && location.pathname !== '/contact') {
        setActiveSection(null); // Clear any active underline
        return; 
      }
        // 1. Define the sections we want to watch
        const sectionIds = ['home', 'services', 'contact', 'about'];
        
        const observerOptions = {
            root: null, // use the viewport
            rootMargin: '-40% 0px -40% 0px', // trigger when section is in the middle of the screen
            threshold: 0
        };

        const observerCallback = (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    setActiveSection(entry.target.id);
                }
            });
        };

        const observer = new IntersectionObserver(observerCallback, observerOptions);

        // 2. Start watching each section
        sectionIds.forEach((id) => {
            const el = document.getElementById(id);
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, []);

  // Helper function to check if the link is active
  const isActive = (id) => activeSection === id ? 'active' : '';

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
            <ul className="navbar-nav mb-lg-0 d-flex align-items-center gap-2">
              <li className="navbar-item">
                  <Link 
                    className={`navbar-link custom-link ${isActive('home')}`}
                    to="/home">
                      Home
                  </Link>
              </li>
              <li className="navbar-item">
                <Link 
                  className={`navbar-link custom-link ${isActive('about')}`}
                  to="/about">
                    About
                  </Link>
              </li>
              <li className="navbar-item">
                <Link 
                  className={`navbar-link custom-link ${isActive('services')}`}
                  to="/services">
                    Services
                </Link>
              </li>
              <li className="navbar-item">
                <Link 
                  className={`navbar-link custom-link ${isActive('contact')}`}
                  to="/contact">
                    Contact
                  </Link>
                </li>
            </ul>
          </div>

          <div className="">
            <Link
                to="/book"
                className="btn btn-primary btn-lg d-flex align-items-center justify-content-center text-white"
                style={{ width: '9rem', height: '3rem', borderRadius: '24px', border: 'none', fontSize: '1rem' }}
            >
                Book
            </Link>
          </div>

        </div>
      </nav>
    </header>
  );
};

export default Navbar;