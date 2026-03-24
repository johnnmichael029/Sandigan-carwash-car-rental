import React, { useState, useEffect } from 'react';
import '../css/nav.css';
import { Link, useLocation } from 'react-router-dom';
import brandlogo from '../assets/logo/brand-logo.png';
import menuIcon from '../assets/icon/menu.png';

const Navbar = () => {
  const [activeSection, setActiveSection] = useState('home');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  // Close drawer whenever route changes
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  // IntersectionObserver for active section tracking
  useEffect(() => {
    const publicPaths = ['/', '/home', '/about', '/services', '/contact'];
    if (!publicPaths.includes(location.pathname)) {
      setActiveSection(null);
      return;
    }

    const sectionIds = ['home', 'about', 'services', 'contact'];
    const observerOptions = {
      root: null,
      rootMargin: '-40% 0px -40% 0px',
      threshold: 0,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActiveSection(entry.target.id);
      });
    }, observerOptions);

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [location.pathname]);

  const isActive = (id) => activeSection === id ? 'active' : '';

  const navLinks = [
    { id: 'home', label: 'Home', to: '/home' },
    { id: 'about', label: 'About', to: '/about' },
    { id: 'services', label: 'Services', to: '/services' },
    { id: 'contact', label: 'Contact', to: '/contact' },
  ];

  return (
    <>
      <header className="fixed-top">
        <nav className="navbar navbar-custom navbar-expand-lg py-2">
          <div className="container navbar-container">

            {/* ── Mobile hamburger (visible only on small screens) ── */}
            <button
              id="mobile-menu-btn"
              className="navbar-toggler-custom d-lg-none"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
            >
              <img src={menuIcon} alt="Menu" style={{ width: 22, height: 22, filter: 'invert(1)' }} />
            </button>

            {/* ── Brand logo ── */}
            <div className="logo-container d-flex align-items-center">
              <Link to="/home">
                <img src={brandlogo} alt="Sandigan Carwash Logo" style={{ height: '40px' }} />
              </Link>
            </div>

            {/* ── Desktop menu (hidden on mobile) ── */}
            <div className="d-none d-lg-flex flex-grow-1 justify-content-center">
              <ul className="navbar-nav mb-0 d-flex align-items-center gap-2" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {navLinks.map(({ id, label, to }) => (
                  <li key={id} className="navbar-item">
                    <Link className={`navbar-link custom-link ${isActive(id)}`} to={to}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* ── Book button ── */}
            <div>
              <Link
                id="nav-book-btn"
                to="/book"
                className="btn btn-primary d-flex align-items-center justify-content-center text-white"
                style={{ width: '8rem', height: '2.75rem', borderRadius: '24px', border: 'none', fontSize: '0.95rem' }}
              >
                Book Now
              </Link>
            </div>

          </div>
        </nav>
      </header>

      {/* ── Mobile Backdrop ── */}
      {drawerOpen && (
        <div
          className="drawer-backdrop"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile Slide-in Drawer ── */}
      <nav className={`nav-drawer ${drawerOpen ? 'show' : ''}`} aria-label="Mobile navigation">
        {/* Drawer header */}
        <div className="drawer-header d-flex align-items-center justify-content-between px-4 py-3 border-bottom border-secondary">
          <img src={brandlogo} alt="Sandigan Logo" style={{ height: '36px' }} />
          <button
            id="close-drawer-btn"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close menu"
            style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        {/* Drawer links */}
        <ul style={{ listStyle: 'none', padding: '1.5rem 1rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {navLinks.map(({ id, label, to }) => (
            <li key={id}>
              <Link
                className={`navbar-link ${isActive(id)}`}
                to={to}
                onClick={() => setDrawerOpen(false)}
                style={{ display: 'block', padding: '0.75rem 1rem', borderRadius: '8px' }}
              >
                {label}
              </Link>
            </li>
          ))}
          <li style={{ marginTop: '1rem' }}>
            <Link
              to="/book"
              onClick={() => setDrawerOpen(false)}
              className="btn btn-primary text-white w-100 d-flex align-items-center justify-content-center"
              style={{ borderRadius: '24px', height: '2.75rem', border: 'none' }}
            >
              Book Now
            </Link>
          </li>
        </ul>
      </nav>
    </>
  );
};

export default Navbar;