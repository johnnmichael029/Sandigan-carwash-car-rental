import React from 'react';
import "../css/footer.css";
import brandlogo from '../assets/logo/brand-logo.png';
import locationMap from '../assets/img/sandigan-location.png';
import { Link } from 'react-router-dom';

const Footer = () => {
    return (
        <footer className="footer-custom pt-5 pb-3">
            <div className="container">
                <div className="row g-4 align-items-start">

                    {/* ── COL 1: Brand + Tagline + Follow Us ── */}
                    <div className="col-lg-3 col-md-6 col-12">
                        <div className="mb-3">
                            <img src={brandlogo} alt="Sandigan Logo" style={{ height: '44px' }} />
                        </div>
                        <p className="footer-tagline mb-4">
                            Providing premium carwash and detailing services with a focus on quality and customer satisfaction. Your vehicle deserves the best care.
                        </p>
                        <p className="footer-section-label mb-2">Follow Us</p>
                        <div className="social-links d-flex gap-2">
                            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="Facebook">
                                <i className="bi bi-facebook"></i>
                            </a>
                            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="LinkedIn">
                                <i className="bi bi-linkedin"></i>
                            </a>
                            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="Instagram">
                                <i className="bi bi-instagram"></i>
                            </a>
                        </div>
                    </div>

                    {/* ── COL 2: Services ── */}
                    <div className="col-lg-2 col-md-3 col-6">
                        <h6 className="footer-section-label mb-3">Services</h6>
                        <ul className="list-unstyled footer-links">
                            <li className="mb-2">
                                <Link to="/services" className="footer-link">Car Wash</Link>
                            </li>
                            <li className="mb-2">
                                <Link to="/services" className="footer-link">Detailing</Link>
                            </li>
                            <li className="mb-2">
                                <Link to="/services" className="footer-link">Car Rentals</Link>
                            </li>
                        </ul>
                    </div>

                    {/* ── COL 3: Quick Links ── */}
                    <div className="col-lg-2 col-md-3 col-6">
                        <h6 className="footer-section-label mb-3">Quick Links</h6>
                        <ul className="list-unstyled footer-links">
                            <li className="mb-2">
                                <Link to="/home" className="footer-link">Home</Link>
                            </li>
                            <li className="mb-2">
                                <Link to="/about" className="footer-link">About us</Link>
                            </li>
                            <li className="mb-2">
                                <Link to="/contact" className="footer-link">Contact Us</Link>
                            </li>
                            <li className="mb-2">
                                <Link to="/book" className="footer-link">Book Now</Link>
                            </li>
                        </ul>
                    </div>

                    {/* ── COL 4: Find Us ── */}
                    <div className="col-lg-5 col-md-12 col-12">
                        <h6 className="footer-section-label mb-3">Find Us</h6>
                        <div className="d-flex flex-column flex-sm-row gap-3 align-items-start">
                            <div className="footer-contact-info flex-grow-1">
                                <div className="d-flex align-items-start gap-2 mb-2">
                                    <i className="bi bi-geo-alt-fill footer-icon mt-1"></i>
                                    <span className="footer-tagline">68 Ruhale St. Taguig, 1630 Metro Manila</span>
                                </div>
                                <div className="d-flex align-items-center gap-2">
                                    <i className="bi bi-telephone-fill footer-icon"></i>
                                    <span className="footer-tagline">0956 691 8854</span>
                                </div>
                            </div>
                            <div className="footer-map-container flex-shrink-0">
                                <img
                                    src={locationMap}
                                    alt="Sandigan Carwash Location Map"
                                    className="footer-map-img"
                                />
                            </div>
                        </div>
                    </div>

                </div>

                {/* ── Divider ── */}
                <hr className="footer-divider mt-5 mb-4" />

                {/* ── Bottom bar ── */}
                <div className="row align-items-center">
                    <div className="col-md-6 text-center text-md-start">
                        <p className="footer-copyright mb-0">2026. Copyright © SANDIGAN. All Rights Reserved.</p>
                    </div>
                    <div className="col-md-6 text-center text-md-end mt-3 mt-md-0">
                        <a href="#" className="footer-bottom-link me-3">Privacy Policy</a>
                        <a href="#" className="footer-bottom-link">Terms of Use</a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
