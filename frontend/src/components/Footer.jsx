import React from 'react';
import "../css/footer.css";
import logo from '../assets/logo/logo.png';

const Footer = () => {
    return (
        <footer className="sticky-bottom footer-custom bg-dark text-white pt-5 pb-3">
            <div className="container">
                <div className="row g-4">
                    <div className="col-lg-4 col-md-6">
                        <div className="d-flex align-items-center mb-3">
                            <img src={logo} alt="Sandigan Logo" style={{ height: '40px' }} className="me-2" />
                            <strong className="fs-4 brand-name" style={{ color: '#00e8e9', letterSpacing: '2px' }}>SANDIGAN</strong>
                        </div>
                        <p className="text-secondary small">
                            Providing premium carwash and detailing services with a focus on quality and customer satisfaction. Your vehicle deserves the best care.
                        </p>
                        <div className="social-links mt-4">
                            <a href="#" className="me-3 text-white fs-5"><i className="bi bi-facebook"></i></a>
                            <a href="#" className="me-3 text-white fs-5"><i className="bi bi-instagram"></i></a>
                            <a href="#" className="text-white fs-5"><i className="bi bi-messenger"></i></a>
                        </div>
                    </div>

                    <div className="col-lg-2 col-md-6">
                        <h5 className="fw-bold mb-4 border-bottom border-primary pb-2 d-inline-block">Quick Links</h5>
                        <ul className="list-unstyled footer-links">
                            <li className="mb-2"><a href="#home-section" className="text-secondary text-decoration-none">Home</a></li>
                            <li className="mb-2"><a href="#services-section" className="text-secondary text-decoration-none">Services</a></li>
                            <li className="mb-2"><a href="#service-price-section" className="text-secondary text-decoration-none">Price List</a></li>
                            <li className="mb-2"><a href="#about-section" className="text-secondary text-decoration-none">About Us</a></li>
                        </ul>
                    </div>

                    <div className="col-lg-3 col-md-6">
                        <h5 className="fw-bold mb-4 border-bottom border-primary pb-2 d-inline-block">Operating Hours</h5>
                        <ul className="list-unstyled text-secondary small">
                            <li className="d-flex justify-content-between mb-2">
                                <span>Monday - Saturday:</span>
                                <span className="text-white">8:00 AM - 6:00 PM</span>
                            </li>
                            <li className="d-flex justify-content-between mb-2">
                                <span>Sunday:</span>
                                <span className="text-white">8:00 AM - 5:00 PM</span>
                            </li>
                            <li className="mt-3 text-info small">
                                <i className="bi bi-info-circle me-1">Holiday hours may vary</i>
                            </li>
                        </ul>
                    </div>

                    <div className="col-lg-3 col-md-6">
                        <h5 className="fw-bold mb-4 border-bottom border-primary pb-2 d-inline-block">Contact Us</h5>
                        <ul className="list-unstyled text-secondary small">
                            <li className="mb-3 d-flex align-items-start">
                                <i className="bi bi-geo-alt-fill text-primary"></i>
                                <span>123 Sandigan St., Brgy. Sample, Taguig City, Philippines</span>
                            </li>
                            <li className="mb-3 d-flex align-items-center">
                                <i className    ="bi bi-telephone-fill text-primary"></i>
                                <span>+63 912 345 6789</span>
                            </li>
                            <li className="d-flex align-items-center">
                                <i className="bi bi-envelope-fill text-primary"></i>
                                <span>contact@sandigancarwash.com</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <hr className="mt-5 mb-4 border-secondary opacity-25"></hr>

                <div className="row align-items-center">
                    <div className="col-md-6 text-center text-md-start">
                        <p className="small text-secondary mb-0">© 2026 Sandigan Carwash. All Rights Reserved.</p>
                    </div>
                    <div className="col-md-6 text-center text-md-end mt-3 mt-md-0">
                        <p className="small text-secondary mb-0">BSIS-3B</p>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
