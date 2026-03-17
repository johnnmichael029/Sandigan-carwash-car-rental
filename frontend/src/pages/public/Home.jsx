import React from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { Link } from 'react-router-dom';
import '../../css/style.css';
import img1 from '../../assets/img/carwash-img1.jpg'; // Ensure this image exists in the specified path
import img2 from '../../assets/img/carwash-img2.jpg'; // Ensure this image exists in the specified path
import img4 from '../../assets/img/carwash-img4.jpg';
import img5 from '../../assets/img/carwash-img5.jpg';


const Home = () => {
    // Note: In a real app, you'll fetch this from your backend (port 8080)
    // For now, I've added a mock array so the .map() function doesn't crash.
    const priceList = [
        { _id: '1', VehicleType: 'Sedan', Wash: 150, Wax: 300, Engine: 400 },
        { _id: '2', VehicleType: 'SUV', Wash: 200, Wax: 400, Engine: 500 }
    ];

    return (
        <>
            <Navbar />
            <main className="landing-wrapper">
                {/* Hero Section */}
                <section id="home-section" className="home-section py-5">
                    <div className="container py-5">
                        <div className="row align-items-center py-5">
                            <div className="col-md-6">
                                <h1 className="display-3 fw-bold hero-title">
                                    Sandigan Carwash <br />
                                    <span className="brand-accent">Quality Service.</span>
                                </h1>
                                <p className="lead hero-description mt-3">
                                    Experience the best carwash in town with Sandigan Carwash.
                                </p>
                                <div className="mt-4">
                                    <Link
                                        to="/book"
                                        className="btn btn-primary btn-lg shadow-lg d-flex align-items-center justify-content-center text-dark"
                                        style={{ width: '13rem', height: '3.5rem', borderRadius: '12px', backgroundColor: '#00e8e9', border: 'none' }}
                                    >
                                        Book Now
                                    </Link>
                                </div>
                            </div>
                            <div className="col-md-6 text-center mt-5 mt-md-0">
                                <div className="hero-image-container shadow-lg">
                                    <img src={img1} className="img-fluid" alt="Carwash Service" />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Services Section */}
                <section id="services-section" className="service-section py-5">
                    <div className="container py-5">
                        <div className="text-center mb-5">
                            <h6 className="text-primary fw-bold text-uppercase tracking-wider">Our Expertise</h6>
                            <h2 className="display-5 fw-bold text-dark">Premium Carwash Services</h2>
                            <div className="mx-auto bg-dark mt-3" style={{ height: '4px', width: '60px', borderRadius: '2px' }}></div>
                        </div>
                        <div className="row g-4 py-5">
                            {/* Service Card 1 */}
                            <div className="col-md-4">
                                <div className="service-card shadow-sm p-4 bg-white text-center h-100 border-bottom border-4">
                                    <div className="service-image-wrapper">
                                        <img src={img4} className="img-fluid" alt="Armor Wash" />
                                    </div>
                                    <h4 className="fw-bold text-dark mt-3">Armor Wash</h4>
                                    <p className="text-muted small">Our signature deep-cleaning process that creates a protective barrier.</p>
                                    <hr className="my-4 opacity-25" />
                                    <ul className="list-unstyled text-center small">
                                        <li className="mb-2">Protective foam finish</li>
                                        <li>Superior paint shield</li>
                                    </ul>
                                </div>
                            </div>
                            {/* Service Card 2 */}
                            <div className="col-md-4">
                                <div className="service-card shadow-sm p-4 bg-white text-center h-100 border-bottom border-4">
                                    <div className="service-image-wrapper">
                                        <img src={img2} className="img-fluid" alt="Wax Wash" />
                                    </div>
                                    <h4 className="fw-bold text-dark mt-3">Wax Wash</h4>
                                    <p className="text-muted small">Deep cleaning and premium waxing for a showroom shine.</p>
                                    <hr className="my-4 opacity-25" />
                                    <ul className="list-unstyled text-center small">
                                        <li className="mb-2">Vacuum Sanitize</li>
                                        <li>Acid Rain Removal</li>
                                    </ul>
                                </div>
                            </div>
                            {/* Service Card 3 */}
                            <div className="col-md-4">
                                <div className="service-card shadow-sm p-4 bg-white text-center h-100 border-bottom border-4">
                                    <div className="service-image-wrapper">
                                        <img src={img5} className="img-fluid" alt="Engine Wash" />
                                    </div>
                                    <h4 className="fw-bold text-dark mt-3">Engine Wash</h4>
                                    <p className="text-muted small">Ultimate protection with specialized engine washing treatments.</p>
                                    <hr className="my-4 opacity-25" />
                                    <ul className="list-unstyled text-center small">
                                        <li className="mb-2">Deep grease removal</li>
                                        <li>Safe detail cleaning</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Price Table Section */}
                <section id="service-price-section" className="service-price-section py-5">
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
                {/* Contact Section */}
                <section id="contact-section" className="contact-section py-5 bg-dark">
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
            </main>
            <Footer />
        </>
    );
};

export default Home;