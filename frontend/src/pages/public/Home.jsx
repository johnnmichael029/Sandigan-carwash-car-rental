import React, { useState, useEffect } from 'react'; 
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { Link } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import '../../css/style.css';

// Asset Imports
import img1 from '../../assets/img/carwash-img1.jpg';
import bgimg from '../../assets/img/hero-bg-img.png';
import carbubble from '../../assets/img/car-bubble.png';
import bubble1 from '../../assets/img/bubble-container.png';
import bubble2 from '../../assets/img/bubble-container1.png';
import ellipse from '../../assets/img/ellipse.png';
import ellipse2 from '../../assets/img/ellipse-left.png';
import fluentbubble from '../../assets/icon/fluent-bubble.png';
import fluentbubblewhite from '../../assets/icon/fluent-bubble-white.png';
import check from '../../assets/icon/check.png';

// --- SECTION 1: HERO ---
const HeroSection = () => (
    <section id="home" className="home-section">
        <div className='hero-bg-image-container position-relative'>
            <div className='bubble-container d-flex align-items-center justify-content-between position-absolute w-100 h-100'>
                <img src={bubble1} className="bubble bubble1" alt="Bubble" />
                <img src={bubble2} className="bubble bubble2" alt="Bubble" />
                <img src={ellipse} className="ellipse position-absolute top-0 end-0" alt="Ellipse" />
            </div>                    
            <img src={bgimg} className='hero-bg-image position-absolute' alt='Hero Background' />
            <div className="container py-5">                       
                <div className="row align-items-center py-5">
                    <div className="col-md-6">
                        <div className='brand-container d-flex align-items-center gap-1'>
                            <img src={fluentbubble} alt="Fluent Bubble" />
                            <h6 className="brand-italic text-uppercase brand-accent mb-0 fst-italic">Drive with confidence</h6>
                        </div>                                 
                        <h1 className="display-3 fw-bold hero-title text-uppercase">
                            We make <br /> cars <br />
                            <span className="brand-accent roller-container">
                                <span className="roller-list">
                                    <span>SPOTLESS.</span>
                                    <span>SHINY.</span>
                                    <span>CLEAN.</span>
                                    <span>ROAD-READY.</span>                                  
                                    <span>SPOTLESS.</span>
                                </span>
                            </span>
                        </h1>
                        <p className="lead hero-description fs-5">
                            Professional car wash services that keep your vehicle clean, polished, and road-ready every day.
                        </p>
                        <div className="mt-5">
                            <Link to="/book" className="btn btn-primary btn-lg shadow-lg d-flex align-items-center justify-content-center text-white"
                                style={{ width: '13rem', height: '3.5rem', borderRadius: '24px', backgroundColor: '#23A0CE', border: 'none' }}>
                                Book Now
                            </Link>
                        </div>
                    </div>
                    <div className="col-md-6 text-center mt-5 mt-md-0">
                        <div className="hero-image-container">
                            <img src={carbubble} className="img-fluid" alt="Carwash Service" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
);

// --- SECTION 2: ABOUT ---
const AboutSection = () => (
    <section id="about" className="about-section py-5 position-relative overflow-hidden">
        <div className='bubble-container position-relative'>
            <img src={ellipse2} className="ellipse position-absolute translate-middle" 
            style={{
                width: '100%',
            }} 
            alt="Ellipse" />
        </div> 
        <div className='container about-container'>        
            <div className="header-container d-flex flex-column py-5">               
                <div className='section-badge d-flex justify-content-center gap-2'>
                    <img src={fluentbubblewhite} alt="Fluent Bubble" />
                    <h6 className="text-uppercase fst-italic fw-light tracking-wider mb-1">About Us</h6>
                </div>
                <div className='about-header d-flex justify-content-center mb-2'>
                    <h1 className='fw-bold hero-title'>Why Choose <span className="brand-accent">SANDIGAN</span>?</h1>
                </div>
                <div className='about-description d-flex justify-content-center'>
                    <p className="lead hero-description text-center fs-5" style={{ maxWidth: '700px', fontSize: '1.125rem' }}>
                        We don't just wash cars we protect your investment using the latest Engine wash and a team that cares about every detail.
                    </p>
                </div>
                <div className='about-features mt-3'>                   
                    <div className='about-cta d-flex justify-content-center mb-5'>
                        <Link to="/learn-more" className="btn btn-primary btn-lg shadow-lg d-flex align-items-center justify-content-center text-white"
                            style={{ width: '10rem', height: '3rem', borderRadius: '24px', backgroundColor: '#23A0CE', border: 'none', fontSize: '1rem' }}>
                            Learn More
                        </Link>
                    </div>
                    <div className='d-flex flex-column flex-lg-row justify-content-between align-items-center mb-5'>

                        <div className='feature-card left-card d-flex align-items-center gap-3 p-5 mb-5 mb-lg-0'>
                            <div className='check-container'>
                                <img src={check} alt="Check Icon" />
                            </div>
                            <div className='text-container'>
                                <span className='feature-text'>Fast and reliable car wash services for a spotless vehicle.</span>
                            </div>                     
                        </div>

                        <div className='feature-card right-card d-flex align-items-center justify-content-center gap-3 p-5'>
                            <div className='check-container'>
                                <img src={check} alt="Check Icon" />
                            </div>
                            <div className='text-container'>
                                <span className='feature-text'>Professional team committed to quality service.</span>
                            </div>                     
                        </div>

                    </div>
                    <div className='d-flex justify-content-center mb-5'>
                        <div className='feature-card center-card d-flex align-items-center gap-3 p-5 '>
                            <div className='check-container'>
                                <img src={check} alt="Check Icon" />
                            </div>
                            <div className='text-container'>
                                <span className='feature-text'>Affordable and flexible car rental options for any trip.</span>
                            </div>                     
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
);

// --- SECTION 2: SERVICES / PRICE LIST ---
const ServiceSection = () => {
    const priceList = [
        { _id: '1', VehicleType: 'Sedan', Wash: 150, Wax: 300, Engine: 400 },
        { _id: '2', VehicleType: 'SUV', Wash: 200, Wax: 400, Engine: 500 }
    ];

    return (
        <section id="services" className="service-price-section py-5">
            <div className="container py-5">
                <div className="text-center mb-5">
                    <h6 className="text-primary fw-bold text-uppercase tracking-wider">Our Rates</h6>
                    <h2 className="display-5 fw-bold text-dark">Vehicle Service Menu</h2>
                    <div className="mx-auto bg-dark mt-3" style={{ height: '4px', width: '60px', borderRadius: '2px' }}></div>
                </div>
                <div className="table-responsive shadow-lg rounded-4 overflow-hidden">
                    <table className="table table-hover align-middle mb-0">
                        <thead className="table-dark">
                            <tr>
                                <th className="py-3 ps-4">Vehicle Type</th>
                                <th className="py-3 text-center">Body Wash</th>
                                <th className="py-3 text-center">Wax Wash</th>
                                <th className="py-3 text-center">Engine Wash</th>
                            </tr>
                        </thead>
                        <tbody>
                            {priceList.map((item, index) => (
                                <tr key={item._id || index}>
                                    <td className="fw-bold ps-4 text-dark">{item.VehicleType}</td>
                                    <td className="text-center text-muted">₱{item.Wash}</td>
                                    <td className="text-center text-muted">₱{item.Wax}</td>
                                    <td className="text-center text-muted">₱{item.Engine}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    );
};

// --- SECTION 3: CONTACT ---
const ContactSection = () => (
    <section id="contact" className="contact-section py-5 bg-dark">
        <div className="container py-5">
            <div className="text-center mb-5">
                <h6 className="text-light fw-bold text-uppercase tracking-wider">Get in Touch</h6>
                <h2 className="display-5 fw-bold" style={{ color: '#00e8e9' }}>Contact Sandigan Carwash</h2>
                <div className="mx-auto bg-light mt-3" style={{ height: '4px', width: '60px', borderRadius: '2px' }}></div>
            </div>
            <div className="row justify-content-center">
                <div className="col-md-8">
                    <form>
                        <div className="mb-4">
                            <label htmlFor="name" className="form-label fw-bold text-white">Name</label>
                            <input type="text" className="form-control" id="name" placeholder="Full Name" />
                        </div>
                        <div className="mb-4">
                            <label htmlFor="email" className="form-label fw-bold text-white">Email</label>
                            <input type="email" className="form-control" id="email" placeholder="email@example.com" />
                        </div>
                        <div className="mb-4">
                            <label htmlFor="message" className="form-label fw-bold text-white">Message</label>
                            <textarea className="form-control" id="message" rows="5" placeholder="How can we help?"></textarea>
                        </div>
                        <div className="d-grid">
                            <button type="submit" className="btn btn-primary btn-lg shadow-lg text-dark" style={{ backgroundColor: '#00e8e9', border: 'none', borderRadius: '12px', height: '3.5rem' }}>
                                Send Message
                            </button>
                        </div>
                    </form> 
                </div>
            </div>
        </div>
    </section>
);

// --- MAIN HOME COMPONENT ---
const Home = () => {
    const { pathname } = useLocation();

    useEffect(() => {
        // Map the URL path to the section ID
        const scrollMap = {
            '/home': 'home',
            '/about': 'about',
            '/services': 'services',
            '/contact': 'contact',
        };

        const targetId = scrollMap[pathname];
        if (targetId) {
            const element = document.getElementById(targetId);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
            }
        } else {
            // If just "/" or unknown, scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [pathname]); // Runs every time the URL changes

    return (
        <>
            <Navbar />
            <main className="landing-wrapper">
                <HeroSection />
                <AboutSection />
                <ServiceSection />
                <ContactSection />
            </main>
            <Footer />
        </>
    );
};

export default Home;