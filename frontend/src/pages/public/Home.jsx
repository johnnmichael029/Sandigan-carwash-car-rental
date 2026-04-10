import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { Link } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { API_BASE, SOCKET_URL } from '../../api/config';
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
import rentalcar1Img from '../../assets/img/rental-car1.png';
import rentalcar2Img from '../../assets/img/car-rental2.png';
import carwashIcon from '../../assets/icon/carwash-png.png';
import carRentalIcon from '../../assets/icon/car-rental1.png';

import testimonial1 from '../../assets/img/testimonial1.png';
import testimonial2 from '../../assets/img/testimonial2.png';
import testimonial3 from '../../assets/img/testimonial3.png';
import testimonial4 from '../../assets/img/testimonial4.png';
import testimonial5 from '../../assets/img/testimonial5.png';
import testimonial6 from '../../assets/img/testimonial6.png';
import testimonial7 from '../../assets/img/testimonial7.png';
import testimonial8 from '../../assets/img/testimonial8.png';
import testimonial10 from '../../assets/img/testimonial10.png';
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
                        <div className="d-flex align-items-center gap-1 justify-content-center justify-content-md-start mb-2">
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
                                className="btn btn-services text-primary border-outline-primary btn-lg d-flex align-items-center justify-content-center"
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
   SECTION 1.5: LIVE BAY MONITOR
   (Now with real-time animations)
═══════════════════════════════════════════ */
const BayVisualization = ({ status }) => {
    const isOccupied = status === 'Occupied';

    return (
        <div className={`bay-viz-container ${isOccupied ? 'occupied' : 'available'}`}>
            <div className="bay-floor"></div>
            <div className="bay-wall-left"></div>
            <div className="bay-wall-right"></div>

            {/* Animated Car */}
            {isOccupied && (
                <div className="animated-car-wrapper">
                    <svg viewBox="0 0 100 60" className="vector-car">
                        <path d="M15,35 Q15,25 25,22 L75,22 Q85,25 85,35 L85,50 L15,50 Z" fill="var(--brand-primary)" />
                        <path d="M25,22 L35,10 Q40,8 60,8 L65,10 L75,22 Z" fill="rgba(255,255,255,0.3)" />
                        <circle cx="25" cy="50" r="7" fill="#333" />
                        <circle cx="75" cy="50" r="7" fill="#333" />
                        <rect x="78" y="32" width="10" height="5" rx="2" fill="#ffcc00" className="headlight" />
                    </svg>

                    {/* Wash Effects */}
                    <div className="wash-particles">
                        <div className="particle shower"></div>
                        <div className="particle wash-bubble b1"></div>
                        <div className="particle wash-bubble b2"></div>
                        <div className="particle wash-bubble b3"></div>
                        <div className="particle mist"></div>
                    </div>
                </div>
            )}

            {!isOccupied && (
                <div className="bay-ready-pulse">
                    <div className="pulse-circle"></div>
                    <span className="ready-text">READY</span>
                </div>
            )}
        </div>
    );
};

const BayProgress = ({ startTime }) => {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        if (!startTime) return;

        const calculate = () => {
            const start = new Date(startTime).getTime();
            const now = new Date().getTime();
            const diffMin = Math.floor((now - start) / 60000);
            setElapsed(diffMin);
        };

        calculate();
        const interval = setInterval(calculate, 60000); // Update every minute
        return () => clearInterval(interval);
    }, [startTime]);

    if (!startTime) return null;

    return (
        <div className="mt-2">
            <span className="badge fw-normal px-2 py-1" style={{ color: "#6dbbfcff" }}>
                Started {elapsed} mins ago
            </span>
        </div>
    );
};

const LiveBayStatus = () => {
    const [bays, setBays] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Initial Fetch
        axios.get(`${API_BASE}/bays`)
            .then(res => {
                setBays(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch bays:", err);
                setLoading(false);
            });

        // Socket listener for real-time updates
        const socket = io(SOCKET_URL, {
            withCredentials: true
        });

        socket.on('connect', () => console.log('Bay Monitor Connected to Socket'));

        socket.on('update_bay', (updatedBay) => {
            console.log('Bay Update received:', updatedBay.name);
            setBays(prev => prev.map(b => b._id === updatedBay._id ? updatedBay : b));
        });

        socket.on('add_bay', (newBay) => {
            console.log('New Bay received:', newBay.name);
            setBays(prev => {
                const exists = prev.find(b => b._id === newBay._id);
                if (exists) return prev;
                return [...prev, newBay];
            });
        });

        socket.on('delete_bay', (bayId) => {
            console.log('Bay Delete received:', bayId);
            setBays(prev => prev.filter(b => b._id !== bayId));
        });

        return () => socket.disconnect();
    }, []);

    if (loading && bays.length === 0) return null;

    return (
        <section className="live-bay-section py-5">
            <div className="container">
                <div className="text-center mb-5">
                    <div className="d-flex justify-content-center align-items-center gap-2 mb-2">
                        <span className="live-dot pulse"></span>
                        <h6 className="text-uppercase tracking-wider brand-accent mb-0 fw-bold">Live Status</h6>
                    </div>
                    <h2 className="display-5 fw-bold hero-title text-uppercase">Current Bay <span className="brand-accent">Availability</span></h2>
                    <p className="hero-description mx-auto mt-2" style={{ maxWidth: '600px' }}>
                        See our operations in real-time. If a bay is occupied, we're currently making a car spotless!
                    </p>
                </div>

                <div className="row g-4 justify-content-center">
                    {bays.slice(0, 3).map((bay) => (
                        <div key={bay._id} className="col-lg-5 col-md-6">
                            <div className={`bay-card-outer p-4 rounded-4 shadow-sm ${bay.status === 'Occupied' ? 'bg-occupied' : 'bg-available'}`}>
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <div>
                                        <h4 className="fw-bold mb-0 hero-title text-uppercase">{bay.name}</h4>
                                        {bay.currentBookingId && (
                                            <div className="small font-poppins mt-1" style={{ fontSize: '0.75rem', color: '#6dbbfcff' }}>
                                                ID: {bay.currentBookingId}
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-end">
                                        <span className={`badge rounded-pill px-3 py-2 ${bay.status === 'Occupied' ? 'bg-warning text-dark' : 'bg-success'}`}>
                                            {bay.status}
                                        </span>
                                        {bay.status === 'Occupied' && <BayProgress startTime={bay.startTime} />}
                                    </div>
                                </div>

                                <BayVisualization status={bay.status} />

                                <div className="mt-3 text-center">
                                    <small className=" fst-italic brand-accent">
                                        {bay.status === 'Occupied' ? 'Service in progress...' : 'Drive in now!'}
                                    </small>
                                </div>
                            </div>
                        </div>
                    ))}
                    {bays.length === 0 && (
                        <div className="text-center py-4">
                            <p className="text-muted">No bays currently active.</p>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};

const AboutSection = () => (
    <section id="about" className="about-section py-5 position-relative overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="bubble-container position-absolute top-0 start-0 w-100 h-100" style={{ pointerEvents: 'none', zIndex: 1 }}>
            <img
                src={ellipseleft}
                className="ellipse position-absolute translate-middle"

                alt=""
                aria-hidden="true"
            />
        </div>

        {/* Eclipse Lines */}
        <div className="eclipse-lines d-none d-lg-block">
            <div className="eclipse-line line1"></div>
            <div className="eclipse-line line2"></div>
            <div className="eclipse-line line3"></div>
            <div className="eclipse-line line4"></div>
            <div className="eclipse-line line5"></div>
        </div>

        <div className="container about-container position-relative z-3">
            <div className="header-container d-flex flex-column text-center py-5">
                {/* Badge */}
                <div className="section-badge d-flex justify-content-center gap-2 mb-3">
                    <img src={fluentbubblewhite} alt="" aria-hidden="true" style={{ width: '18px' }} />
                    <h6 className="text-uppercase fst-italic fw-light tracking-wider mb-0" style={{ letterSpacing: '2px' }}>About Us</h6>
                </div>

                {/* Heading */}
                <div className="about-header mb-3">
                    <h1 className="fw-bold hero-title display-3">
                        Why Choose <span className="brand-accent">SANDIGAN</span>?
                    </h1>
                </div>

                {/* Description */}
                <div className="about-description d-flex justify-content-center mb-4">
                    <p className="lead hero-description text-center fs-5" style={{ maxWidth: '800px', fontWeight: 300, color: 'rgba(255,255,255,0.8)' }}>
                        We don't just wash cars — we protect your investment using the latest engine wash technology and a team that cares about every detail.
                    </p>
                </div>

                {/* CTA */}
                <div className="about-cta d-flex justify-content-center mb-5 pb-lg-5">
                    <Link
                        to="/services"
                        className="btn btn-pill-outline d-flex align-items-center gap-2 px-5 py-3 shadow-none"
                    >
                        Learn More
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14m-7-7 7 7-7 7" /></svg>
                    </Link>
                </div>

                {/* Dynamic Feature Arc Layout */}
                <div className="feature-arc-wrapper pt-4">
                    <div className="row g-4 justify-content-between align-items-start">
                        {/* Top Left */}
                        <div className="col-lg-5 col-md-6 order-1">
                            <div className="feature-pill left">
                                <div className="check-icon">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                                </div>
                                <span className="text-start">Fast and reliable car wash services for a spotless vehicle.</span>
                            </div>
                        </div>

                        {/* Top Right */}
                        <div className="col-lg-5 col-md-6 order-2">
                            <div className="feature-pill right">
                                <div className="check-icon">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                                </div>
                                <span className="text-start">Professional team committed to quality service.</span>
                            </div>
                        </div>

                        {/* Bottom Center */}
                        <div className="col-lg-12 d-flex justify-content-center pt-lg-2 order-3">
                            <div className="feature-pill center" style={{ maxWidth: '480px' }}>
                                <div className="check-icon">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                                </div>
                                <span className="text-start">Affordable and flexible car rental options for any trip.</span>
                            </div>
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
const ServiceCard = ({ image, title, duration, price, description, icons, type }) => (
    <div className="service-card d-flex flex-column align-items-start gap-0 ">
        {/* Card image - Edge to Edge */}
        <div className="service-img-wrapper w-100 overflow-hidden" style={{ borderTopLeftRadius: '24px', borderTopRightRadius: '24px' }}>
            <img src={image} className="img-fluid w-100" style={{ objectFit: 'cover', aspectRatio: '16/12' }} alt={title} />
        </div>

        {/* Text content - Padded */}
        <div className="service-text-container p-4 w-100">
            <h3 className="service-title fw-bold mb-1 hero-title" style={{ fontSize: '1.25rem' }}>{title}</h3>

            {type === 'rental' ? (
                <div className="rental-info m-0 p-0 d-flex gap-3 mt-3">
                    <span className="d-flex align-items-center gap-2">
                        <span className="indicator-dot"></span> {price}
                    </span>
                    <span className="d-flex align-items-center gap-2">
                        <span className="indicator-dot"></span> {duration}
                    </span>
                </div>
            ) : (
                <div className="d-flex align-items-center gap-3 mb-3">
                    {duration && <small className="brand-accent" style={{ fontSize: '12px' }}>• {duration}</small>}
                    {price && <small className="brand-accent" style={{ fontSize: '12px' }}>• {price}</small>}
                </div>
            )}

            {description && (
                <p className="service-description hero-description mb-0 mt-2" style={{ fontSize: '0.88rem', lineHeight: 1.6 }}>
                    {description}
                </p>
            )}

            {/* Icons + Book button - Only show for wash if needed */}
            {type !== 'rental' && (
                <div className="d-flex align-items-center mt-4 w-100 gap-3 flex-wrap">
                    <div className="d-flex gap-2">
                        {icons?.map((icon, i) => (
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
            )}
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
        type: 'wash'
    },
    {
        image: img4,
        title: 'Premium Wax',
        duration: '60 Mins',
        price: '₱300 – ₱750',
        description: 'Long-lasting wax coating that enhances your car\'s shine and adds a glossy, showroom-quality finish that protects against UV rays and oxidation.',
        icons: [serviceicon, serviceicon1, serviceicon2],
        type: 'wash'
    },
    {
        image: img2,
        title: 'Engine Wash',
        duration: '45 Mins',
        price: '₱400 – ₱700',
        description: 'Thorough engine bay cleaning that removes built-up grease and dirt, helping your engine run cooler and making maintenance checks easier.',
        icons: [serviceicon, serviceicon1, serviceicon2],
        type: 'wash'
    },
];

const rentalData = [
    {
        image: rentalcar1Img,
        title: 'Luxurious Red Sports Car',
        duration: '5-SEATER',
        price: '₱2500.00',
        type: 'rental'
    },
    {
        image: rentalcar1Img,
        title: 'Luxurious Red Sports Car',
        duration: '5-SEATER',
        price: '₱2500.00',
        type: 'rental'
    },
    {
        image: rentalcar1Img,
        title: 'Luxurious Red Sports Car',
        duration: '5-SEATER',
        price: '₱2500.00',
        type: 'rental'
    },
    {
        image: rentalcar1Img,
        title: 'Luxurious Red Sports Car',
        duration: '5-SEATER',
        price: '₱2500.00',
        type: 'rental'
    },
    {
        image: rentalcar1Img,
        title: 'Luxurious Red Sports Car',
        duration: '5-SEATER',
        price: '₱2500.00',
        type: 'rental'
    },
    {
        image: rentalcar1Img,
        title: 'Luxurious Red Sports Car',
        duration: '5-SEATER',
        price: '₱2500.00',
        type: 'rental'
    },
    {
        image: rentalcar1Img,
        title: 'Luxurious Red Sports Car',
        duration: '5-SEATER',
        price: '₱2500.00',
        type: 'rental'
    },
    {
        image: rentalcar1Img,
        title: 'Luxurious Red Sports Car',
        duration: '5-SEATER',
        price: '₱2500.00',
        type: 'rental'
    },
];

const ServiceSection = () => {
    const [activeCategory, setActiveCategory] = useState('wash');
    const scrollRef = useRef(null);
    const displayData = activeCategory === 'wash' ? serviceData : rentalData;

    const scroll = (direction) => {
        if (scrollRef.current) {
            const container = scrollRef.current;
            const { scrollLeft, scrollWidth, clientWidth } = container;
            const scrollAmount = clientWidth * 0.8;

            let scrollTo;
            if (direction === 'left') {
                scrollTo = scrollLeft - scrollAmount;
                // If at the very start, loop to the end
                if (scrollLeft <= 5) {
                    scrollTo = scrollWidth - clientWidth;
                }
            } else {
                scrollTo = scrollLeft + scrollAmount;
                // If at the very end, loop back to start
                if (scrollLeft + clientWidth >= scrollWidth - 5) {
                    scrollTo = 0;
                }
            }

            container.scrollTo({
                left: scrollTo,
                behavior: 'smooth'
            });
        }
    };

    return (
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

                {/* Category Toggle */}
                <div className="service-toggle-wrapper">
                    <div className="toggle-capsule shadow-lg">
                        <button
                            className={`toggle-btn  ${activeCategory === 'wash' ? 'active' : ''}`}
                            onClick={() => setActiveCategory('wash')}
                        >
                            <img src={carwashIcon} alt="Car Wash" /> Car Wash
                        </button>
                        <button
                            className={`toggle-btn ${activeCategory === 'rental' ? 'active' : ''}`}
                            onClick={() => setActiveCategory('rental')}
                        >
                            <img src={carRentalIcon} alt="Car Rental" /> Car Rental
                        </button>
                    </div>
                </div>

                {/* Service cards grid — with navigation arrows for rental */}
                <div className="position-relative">
                    {activeCategory === 'rental' && (
                        <>
                            <button
                                className="carousel-nav-btn prev shadow-lg"
                                onClick={() => scroll('left')}
                            >
                                <svg width="24" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                            </button>
                            <button
                                className="carousel-nav-btn next shadow-lg"
                                onClick={() => scroll('right')}
                            >
                                <svg width="24" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                            </button>
                        </>
                    )}

                    <div
                        ref={scrollRef}
                        className={`row g-4 ${activeCategory === 'rental' ? 'flex-nowrap overflow-hidden justify-content-start ps-2' : 'justify-content-center'}`}
                        style={{ scrollBehavior: 'smooth' }}
                    >
                        {displayData.map((service, index) => (
                            <div key={`${service.title}-${index}`} className={activeCategory === 'wash' ? "col-xl-4 col-md-6 col-12" : "col-xl-3 col-lg-4 col-md-6 col-12 flex-shrink-0"}>
                                <ServiceCard {...service} />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bottom CTA */}
                <div className="mt-5 pt-3 text-center">
                    <Link
                        to="/services"
                        className="btn btn-primary d-inline-flex align-items-center gap-2 px-5 py-3 text-white shadow-sm"
                        style={{ borderRadius: '50px', fontWeight: 600, fontSize: '1rem' }}
                    >
                        Learn More About What We Offer
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14m-7-7 7 7-7 7" />
                        </svg>
                    </Link>
                </div>
            </div>
        </section>
    );
}; const GallerySection = () => {
    const galleryRef = useRef(null);
    const [progress, setProgress] = useState(0);
    const [resetKey, setResetKey] = useState(0); // Used to reset the auto-slide timer

    const galleryData = [
        { image: rentalcar1Img, category: 'Car Wash', title: 'Project ABC', size: 'large' },
        { image: rentalcar2Img, category: 'Car Detailing', title: 'Project XYZ', size: 'small' },
        { image: img3, category: 'Car Wash', title: 'Signature Shine', size: 'large' },
        { image: img5, category: 'Detailing', title: 'Internal Deep Clean', size: 'small' },
    ];

    const scrollGallery = (direction) => {
        if (galleryRef.current) {
            const container = galleryRef.current;
            const scrollAmount = 500; // Move by a fixed width or percentage
            let scrollTo;

            if (direction === 'next') {
                scrollTo = container.scrollLeft + scrollAmount;
                if (container.scrollLeft + container.clientWidth >= container.scrollWidth - 10) {
                    scrollTo = 0;
                }
            } else {
                scrollTo = container.scrollLeft - scrollAmount;
                if (container.scrollLeft <= 10) {
                    scrollTo = container.scrollWidth;
                }
            }

            container.scrollTo({ left: scrollTo, behavior: 'smooth' });
        }
    };

    // Manual scroll handler that resets the timer
    const handleManualScroll = (direction) => {
        scrollGallery(direction);
        setResetKey(prev => prev + 1); // Triggers useEffect cleanup and restart
    };

    // Auto-slide logic (3s interval) with reset capability
    useEffect(() => {
        const interval = setInterval(() => {
            scrollGallery('next');
        }, 3000);

        const handleScroll = () => {
            if (galleryRef.current) {
                const { scrollLeft, scrollWidth, clientWidth } = galleryRef.current;
                const newProgress = ((scrollLeft + clientWidth) / scrollWidth) * 100;
                setProgress(newProgress);
            }
        };

        const currentGallery = galleryRef.current;
        if (currentGallery) {
            currentGallery.addEventListener('scroll', handleScroll);
        }

        return () => {
            clearInterval(interval);
            if (currentGallery) currentGallery.removeEventListener('scroll', handleScroll);
        };
    }, [resetKey]); // Restarts whenever resetKey changes

    return (
        <section id="gallery" className="gallery-section py-5">
            <div className="container py-5">
                {/* Header */}
                <div className="text-center mb-5">
                    <div className="section-badge d-flex justify-content-center align-items-center gap-2 mb-3">
                        <img src={fluentbubblewhite} alt="" style={{ width: '18px' }} />
                        <h6 className="text-uppercase fst-italic fw-light mb-0" style={{ letterSpacing: '2px' }}>Gallery</h6>
                    </div>
                    <h1 className="fw-bold hero-title display-5 px-lg-5">
                        See The Results Of Our <span className="brand-accent">Expert Car Wash</span><br className="d-none d-lg-block" />
                        And <span className="brand-accent">Detailing Services</span>
                    </h1>
                </div>

                {/* Staggered Gallery Slider */}
                <div
                    ref={galleryRef}
                    className="gallery-container overflow-hidden"
                >
                    {galleryData.map((item, index) => (
                        <div key={index} className={`gallery-card ${item.size}`}>
                            <div className="gallery-img-wrapper">
                                <img src={item.image} alt={item.title} />
                            </div>
                            <div className="gallery-overlay"></div>
                            <div className="gallery-badge">{item.category}</div>
                            <div className="gallery-subtitle">{item.title}</div>
                        </div>
                    ))}
                </div>

                {/* Footer Navigation */}
                <div className="gallery-footer">
                    <div className="gallery-progress-bar">
                        <div className="gallery-progress-inner" style={{ width: `${progress}%` }}></div>
                    </div>

                    <div className="gallery-nav-arrows">
                        <button className="gallery-nav-btn" onClick={() => handleManualScroll('prev')}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                        </button>
                        <button className="gallery-nav-btn" onClick={() => handleManualScroll('next')}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}; const TestimonialSection = () => {
    const [activeIndex, setActiveIndex] = useState(0);

    const testimonials = [
        { id: 1, name: 'Linda Walker', text: 'The best carwash in town! My SUV looks brand new every time I leave Sandigan. Highly recommended, I rated this 719 points!', image: testimonial1, stars: 5 },
        { id: 2, name: 'James Doe', text: 'Amazing service and very professional staff. The premium wax really makes a difference. My classic car has never looked better!', image: testimonial2, stars: 5 },
        { id: 3, name: 'Sarah Miller', text: 'Quick, efficient, and super friendly. The engine wash is a must-have for maintenance. I will definitely be coming back every month.', image: testimonial3, stars: 4 },
        { id: 4, name: 'Mike Ross', text: 'Outstanding attention to detail. They got stains out of my seats that I thought were permanent. Five stars all the way!', image: testimonial4, stars: 5 },
        { id: 5, name: 'Emma Wilson', text: 'The car rental service was seamless. The vehicle was spotless and drove like a dream. Perfect for my weekend getaway.', image: testimonial5, stars: 5 },
        { id: 6, name: 'David Chen', text: 'Great value for money. The Armor Wash provided a shine that lasted through multiple rainstorms. Highly impressed.', image: testimonial6, stars: 5 },
        { id: 7, name: 'Rachel Green', text: 'I love the online booking system! So convenient to schedule my wash while I am at work and just drop off the car.', image: testimonial7, stars: 4 },
        { id: 8, name: 'Joey Tribbiani', text: 'How you doin? My car is doin great after the deep clean. The staff here really knows what they are doing.', image: testimonial8, stars: 5 },
    ];

    const rotateTestimonials = (direction) => {
        if (direction === 'next') {
            setActiveIndex((prev) => (prev + 1) % testimonials.length);
        } else {
            setActiveIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
        }
    };

    // Helper to get testimonial for a specific "slot" based on rotation
    const getTestiForSlot = (slotOffset) => {
        const index = (activeIndex + slotOffset) % testimonials.length;
        return testimonials[index];
    };

    const currentTesti = testimonials[activeIndex];

    return (
        <section id="testimonials" className="testimonials-section py-5">
            <div className="container position-relative z-3">
                {/* Header */}
                <div className="text-center mb-5">
                    <div className="section-badge d-flex justify-content-center align-items-center gap-2 mb-3">
                        <img src={fluentbubblewhite} alt="" style={{ width: '18px' }} />
                        <h6 className="text-uppercase fst-italic fw-light mb-0" style={{ letterSpacing: '2px' }}>Testimonials</h6>
                    </div>
                    <h1 className="fw-bold hero-title display-5">
                        What Our Customer Says <span className="brand-accent">About Us</span>
                    </h1>
                </div>

                {/* Main Card */}
                <div className="testimonial-main-card shadow-sm">
                    <span className="testimonial-quote-icon start">“</span>
                    <p className="testimonial-text mt-4">{currentTesti.text}</p>
                    <span className="testimonial-quote-icon end">”</span>

                    <div className="reviewer-info">
                        <img src={currentTesti.image} alt={currentTesti.name} className="reviewer-img" />
                        <h4 className="reviewer-name">{currentTesti.name}</h4>
                        <div className="stars">
                            {[...Array(5)].map((_, i) => (
                                <i key={i} className={`fas fa-star ${i < currentTesti.stars ? 'text-warning' : 'text-secondary'}`} style={{ fontSize: '14px' }}>
                                    ★
                                </i>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Nav Arrows */}
                <div className="testimonial-nav">
                    <button className="testi-nav-btn" onClick={() => rotateTestimonials('prev')}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                    </button>
                    <button className="testi-nav-btn" onClick={() => rotateTestimonials('next')}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                    </button>
                </div>
            </div>

            {/* Floating Avatars Background */}
            <div className="floating-avatars-container">
                {[1, 2, 3, 4, 5, 6, 7].map((slot) => {
                    const testi = getTestiForSlot(slot);
                    return (
                        <div
                            key={testi.id}
                            className={`floating-avatar pos-${slot}`}
                            style={{ backgroundImage: `url(${testi.image})` }}
                        ></div>
                    );
                })}
            </div>
        </section>
    );
};


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
                <LiveBayStatus />
                <AboutSection />
                <ServiceSection />
                <GallerySection />
                <TestimonialSection />
                <ContactSection />
            </main>
            <Footer />
        </>
    );
};

export default Home;