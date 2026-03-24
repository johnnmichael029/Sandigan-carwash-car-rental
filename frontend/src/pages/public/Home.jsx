import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { Link } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import '../../css/style.css';

// Asset Imports
import img1 from '../../assets/img/carwash-img1.jpg';
import img2 from '../../assets/img/carwash-img2.jpg';
import img3 from '../../assets/img/carwash-img3.jpg';
import img4 from '../../assets/img/carwash-img4.jpg';
import img5 from '../../assets/img/carwash-img5.jpg';
import bgimg from '../../assets/img/hero-bg-img.png';
import carbubble from '../../assets/img/car-bubble.png';
import bubble1 from '../../assets/img/bubble-container.png';
import bubble2 from '../../assets/img/bubble-container1.png';
import ellipse from '../../assets/img/ellipse.png';
import ellipseleft from '../../assets/img/ellipse2.png';
import fluentbubble from '../../assets/icon/fluent-bubble.png';
import fluentbubblewhite from '../../assets/icon/fluent-bubble-white.png';
import check from '../../assets/icon/check.png';
import serviceicon from '../../assets/icon/car-wash-light.png';
import serviceicon1 from '../../assets/icon/car-wash-light1.png';
import serviceicon2 from '../../assets/icon/car-wash-light2.png';


/* ═══════════════════════════════════════════
   SECTION 1: HERO
═══════════════════════════════════════════ */
const HeroSection = () => (
    <section id="home" className="home-section">
        <div className="hero-bg-image-container position-relative overflow-hidden">
            <div className="bubble-container d-flex align-items-center justify-content-between position-absolute w-100 h-100">
                <img src={bubble1} className="bubble bubble1" alt="" aria-hidden="true" />
                <img src={bubble2} className="bubble bubble2" alt="" aria-hidden="true" />
                <img src={ellipse} className="ellipse position-absolute top-0 end-0" alt="" aria-hidden="true" />
            </div>
            <img src={bgimg} className="hero-bg-image position-absolute" alt="" aria-hidden="true" />

            <div className="container py-5">
                <div className="row align-items-center py-5">

                    {/* ── Text Column ── */}
                    <div className="col-lg-6 col-md-7 text-center text-md-start">
                        <div className="brand-container d-flex align-items-center gap-1 justify-content-center justify-content-md-start mb-2">
                            <img src={fluentbubble} alt="" aria-hidden="true" />
                            <h6 className="brand-italic-weight text-uppercase brand-accent mb-0 fst-italic">
                                Drive with confidence
                            </h6>
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

                        <p className="lead hero-description fs-5 mt-3">
                            Professional car wash services that keep your vehicle clean, polished, and road-ready every day.
                        </p>

                        <div className="mt-4 d-flex flex-wrap gap-3 justify-content-center justify-content-md-start">
                            <Link
                                to="/book"
                                className="btn btn-primary btn-lg d-flex align-items-center justify-content-center text-white"
                                style={{ minWidth: '11rem', height: '3.25rem', borderRadius: '24px', border: 'none' }}
                            >
                                Book Now
                            </Link>
                            <Link
                                to="/services"
                                className="btn btn-outline-light btn-lg d-flex align-items-center justify-content-center"
                                style={{ minWidth: '10rem', height: '3.25rem', borderRadius: '24px' }}
                            >
                                Our Services
                            </Link>
                        </div>
                    </div>

                    {/* ── Car Image Column ── */}
                    <div className="col-lg-6 col-md-5 text-center mt-5 mt-md-0">
                        <div className="hero-image-container">
                            <img src={carbubble} className="img-fluid" alt="Carwash Service Vehicle" style={{ maxWidth: '90%' }} />
                        </div>
                    </div>

                </div>
            </div>
        </div>
    </section>
);


/* ═══════════════════════════════════════════
   SECTION 2: ABOUT
═══════════════════════════════════════════ */
const AboutSection = () => (
    <section id="about" className="about-section py-5 position-relative overflow-hidden">
        <div className="bubble-container position-relative">
            <img
                src={ellipseleft}
                className="ellipse position-absolute translate-middle"
                style={{ width: '100%' }}
                alt=""
                aria-hidden="true"
            />
        </div>
        <div className="container about-container">
            <div className="header-container d-flex flex-column text-center py-5">

                {/* Badge */}
                <div className="section-badge d-flex justify-content-center gap-2">
                    <img src={fluentbubblewhite} alt="" aria-hidden="true" />
                    <h6 className="text-uppercase fst-italic fw-light tracking-wider mb-1">About Us</h6>
                </div>

                {/* Heading */}
                <div className="about-header mb-2">
                    <h1 className="fw-bold hero-title display-1">
                        Why Choose <span className="brand-accent">SANDIGAN</span>?
                    </h1>
                </div>

                {/* Description */}
                <div className="about-description d-flex justify-content-center">
                    <p className="lead hero-description text-center fs-5" style={{ maxWidth: '700px' }}>
                        We don't just wash cars — we protect your investment using the latest engine wash technology and a team that cares about every detail.
                    </p>
                </div>

                {/* CTA */}
                <div className="about-cta d-flex justify-content-center mb-5">
                    <Link
                        to="/services"
                        className="btn btn-primary btn-lg d-flex align-items-center justify-content-center text-white"
                        style={{ width: '10rem', height: '3rem', borderRadius: '24px', border: 'none', fontSize: '1rem' }}
                    >
                        Learn More
                    </Link>
                </div>

                {/* Feature Cards */}
                <div className="d-flex flex-column flex-lg-row justify-content-between align-items-center gap-4 mb-4">
                    <div className="feature-card left-card d-flex align-items-center gap-3 p-4 p-md-5">
                        <div className="check-container flex-shrink-0">
                            <img src={check} alt="Check" />
                        </div>
                        <div className="text-container text-start">
                            <span className="feature-text">Fast and reliable car wash services for a spotless vehicle.</span>
                        </div>
                    </div>
                    <div className="feature-card right-card d-flex align-items-center justify-content-center gap-3 p-4 p-md-5">
                        <div className="check-container flex-shrink-0">
                            <img src={check} alt="Check" />
                        </div>
                        <div className="text-container text-start">
                            <span className="feature-text">Professional team committed to quality service.</span>
                        </div>
                    </div>
                </div>
                <div className="d-flex justify-content-center mb-4">
                    <div className="feature-card center-card d-flex align-items-center gap-3 p-4 p-md-5">
                        <div className="check-container flex-shrink-0">
                            <img src={check} alt="Check" />
                        </div>
                        <div className="text-container text-start">
                            <span className="feature-text">Affordable and flexible car rental options for any trip.</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
);


/* ═══════════════════════════════════════════
   SECTION 3: SERVICES
═══════════════════════════════════════════ */

// Reusable service card component
const ServiceCard = ({ image, title, duration, price, description, icons }) => (
    <div className="service-card d-flex flex-column align-items-start gap-3 p-4">
        {/* Card image */}
        <div className="service-img-wrapper w-100">
            <img src={image} className="img-fluid w-100 h-100" style={{ objectFit: 'cover', borderRadius: '16px' }} alt={title} />
        </div>

        {/* Text content */}
        <div className="service-text-container mt-2 w-100">
            <h3 className="service-title fw-bold mb-1 hero-title">{title}</h3>
            <div className="d-flex align-items-center gap-3 mb-3">
                {duration && <small className="brand-accent" style={{ fontSize: '12px' }}>• {duration}</small>}
                {price && <small className="brand-accent" style={{ fontSize: '12px' }}>• {price}</small>}
            </div>
            <p className="service-description hero-description mb-0" style={{ fontSize: '0.88rem', lineHeight: 1.6 }}>
                {description}
            </p>
        </div>

        {/* Icons + Book button */}
        <div className="d-flex align-items-center mt-auto w-100 gap-3 flex-wrap">
            <div className="d-flex gap-2">
                {icons.map((icon, i) => (
                    <div key={i} className="icon-container">
                        <img src={icon} alt={`Service feature ${i + 1}`} />
                    </div>
                ))}
            </div>
            <div className="ms-auto">
                <Link
                    to="/book"
                    className="btn btn-primary btn-sm d-flex align-items-center justify-content-center text-white"
                    style={{ minWidth: '8rem', height: '2.75rem', borderRadius: '24px', border: 'none', fontSize: '0.875rem', whiteSpace: 'nowrap' }}
                >
                    Book Now
                </Link>
            </div>
        </div>
    </div>
);

const serviceData = [
    {
        image: img1,
        title: 'Armor Wash',
        duration: '40 Mins',
        price: '₱150 – ₱750',
        description: 'Our signature deep-cleaning process that creates a protective barrier for your vehicle\'s exterior, shielding it from dirt and environmental damage.',
        icons: [serviceicon, serviceicon1, serviceicon2],
    },
    {
        image: img4,
        title: 'Premium Wax',
        duration: '60 Mins',
        price: '₱300 – ₱750',
        description: 'Long-lasting wax coating that enhances your car\'s shine and adds a glossy, showroom-quality finish that protects against UV rays and oxidation.',
        icons: [serviceicon, serviceicon1, serviceicon2],
    },
    {
        image: img2,
        title: 'Engine Wash',
        duration: '45 Mins',
        price: '₱400 – ₱700',
        description: 'Thorough engine bay cleaning that removes built-up grease and dirt, helping your engine run cooler and making maintenance checks easier.',
        icons: [serviceicon, serviceicon1, serviceicon2],
    },
];

const ServiceSection = () => (
    <section id="services" className="service-price-section position-relative py-5">
        <div className="bubble-container d-flex align-items-center justify-content-between position-absolute w-100 h-100" style={{ pointerEvents: 'none' }}>
            <img src={bubble1} className="bubble bubble1" alt="" aria-hidden="true" />
            <img src={bubble2} className="bubble bubble2" alt="" aria-hidden="true" />
        </div>

        <div className="container py-5">
            {/* Section header */}
            <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-end mb-5 gap-4">
                <div>
                    <div className="section-badge d-flex align-items-center gap-2 mb-1">
                        <img src={fluentbubblewhite} alt="" aria-hidden="true" />
                        <h6 className="text-uppercase fst-italic fw-light mb-0">Services</h6>
                    </div>
                    <h1 className="fw-bold hero-title display-1 mb-0">
                        What We <span className="brand-accent">Offer</span>
                    </h1>
                </div>
                <p className="lead hero-description mb-0" style={{ maxWidth: '480px' }}>
                    From keeping your vehicle spotless to providing reliable transportation, our services are designed to make every drive easier, cleaner, and more convenient.
                </p>
            </div>

            {/* Service cards grid — responsive */}
            <div className="row g-4 justify-content-center">
                {serviceData.map((service) => (
                    <div key={service.title} className="col-xl-4 col-md-6 col-12">
                        <ServiceCard {...service} />
                    </div>
                ))}
            </div>
        </div>
    </section>
);


/* ═══════════════════════════════════════════
   SECTION 4: CONTACT
═══════════════════════════════════════════ */
const ContactSection = () => (
    <section id="contact" className="contact-section py-5">
        <div className="container py-5">

            {/* Heading */}
            <div className="text-center mb-5">
                <div className="section-badge d-flex justify-content-center gap-2 mb-2">
                    <img src={fluentbubblewhite} alt="" aria-hidden="true" />
                    <h6 className="text-uppercase fst-italic fw-light mb-0">Get in Touch</h6>
                </div>
                <h1 className="fw-bold hero-title display-5">
                    Contact <span className="brand-accent">Sandigan</span>
                </h1>
                <div className="mx-auto mt-3" style={{ height: '3px', width: '60px', borderRadius: '2px', background: 'var(--brand-accent)' }} />
            </div>

            {/* Form */}
            <div className="row justify-content-center">
                <div className="col-lg-7 col-md-9">
                    <form className="form-container p-4 p-md-5">
                        <div className="mb-4">
                            <label htmlFor="contact-name" className="form-label fw-semibold">Full Name</label>
                            <input
                                type="text"
                                className="form-control"
                                id="contact-name"
                                placeholder="Juan dela Cruz"
                                autoComplete="name"
                            />
                        </div>
                        <div className="mb-4">
                            <label htmlFor="contact-email" className="form-label fw-semibold">Email</label>
                            <input
                                type="email"
                                className="form-control"
                                id="contact-email"
                                placeholder="email@example.com"
                                autoComplete="email"
                            />
                        </div>
                        <div className="mb-4">
                            <label htmlFor="contact-message" className="form-label fw-semibold">Message</label>
                            <textarea
                                className="form-control"
                                id="contact-message"
                                rows="5"
                                placeholder="How can we help you?"
                                style={{ background: 'transparent', border: 'var(--input-border)', color: 'var(--text-primary)', resize: 'vertical' }}
                            />
                        </div>
                        <div className="d-grid">
                            <button
                                type="submit"
                                className="btn btn-primary btn-lg text-white"
                                style={{ borderRadius: '12px', height: '3.25rem', border: 'none' }}
                            >
                                Send Message
                            </button>
                        </div>
                    </form>
                </div>
            </div>

        </div>
    </section>
);


/* ═══════════════════════════════════════════
   MAIN HOME COMPONENT
═══════════════════════════════════════════ */
const Home = () => {
    const { pathname } = useLocation();

    useEffect(() => {
        const scrollMap = {
            '/home': 'home',
            '/about': 'about',
            '/services': 'services',
            '/contact': 'contact',
        };
        const targetId = scrollMap[pathname];
        if (targetId) {
            const element = document.getElementById(targetId);
            if (element) element.scrollIntoView({ behavior: 'smooth' });
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [pathname]);

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