import React from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import '../../css/style.css';

const Book = () => {
  return (
    <>
        <Navbar />
        <section id="book-section" className="book-section">
        <div className="container">
            <div className="py-5">
                <div className="row align-items-center rounded py-5 px-4">
                    <div className="col-md-6 text-white">
                        <h6 className="text-uppercase"><i> BOOK NOW </i></h6>
                        <h1 className="fw-bold">Ready for</h1>
                        <h1 className="fw-bold" style={{ color: '#1CB2E7' }}>Cleaner / Ride?</h1>
                        <p className="fs-6 hero-description">Experience the best car wash service and car rental in the business.</p>
                    </div>
                    <form className="form col-md-6 p-5 g-5">
                        <div className="d-flex gap-3">
                            <div className="flex-fill form-floating mb-3">
                                <input 
                                type="text" 
                                className="form-control" 
                                id="floatingInput" 
                                placeholder="John Michael" 
                                />
                                <label htmlFor="floatingInput">First name</label>
                            </div>
                            <div className="flex-fill form-floating mb-3">
                                <input 
                                type="text" 
                                className="form-control" 
                                id="floatingInput" 
                                placeholder="John Michael" 
                                />
                                <label htmlFor="floatingInput">Last name</label>
                            </div>
                        </div>
                         
                        <div className="form-floating mb-3">
                            <input 
                            type="email" 
                            className="form-control" 
                            id="floatingInput" 
                            placeholder="name@example.com" 
                            />
                            <label htmlFor="floatingInput">Email address</label>
                        </div>
                        <div className="form-floating mb-3">
                            <input 
                            type="text" 
                            className="form-control" 
                            id="floatingVehicle" 
                            list="vehicleOptions" 
                            placeholder="Vehicle type" 
                            />
                            <label htmlFor="floatingVehicle">Vehicle type</label>
                             <datalist id="vehicleOptions">
                                <option value="Sedan" />
                                <option value="SUV" />
                                <option value="Truck" />
                                <option value="Coupe" />
                            </datalist>
                        </div>   
                        <div className="form-floating">
                           <input 
                                type="text" 
                                className="form-control" 
                                id="floatingService" 
                                list="serviceOptions" 
                                placeholder="Service type" 
                            />
                            <label htmlFor="floatingService">Service type</label>

                            <datalist id="serviceOptions">
                                <option value="Car Wash" />
                                <option value="Car Rental" />
                                <option value="Detailing" />
                                <option value="Oil Change" />
                            </datalist>
                        </div>
                        <div className="form-check d-flex align-items-start gap-3 my-3">
                            <input 
                                className="form-check-input flex-shrink-0" 
                                type="checkbox" 
                                value="" 
                                id="privacyPolicy" 
                                required 
                                style={{ width: '1.5em', height: '1.5em', cursor: 'pointer' }}
                            />
                            <label className="form-check-label text-light opacity-75 small" htmlFor="privacyPolicy" style={{ cursor: 'pointer', lineHeight: '1.5' }}>
                                By clicking this box, I agree that the company may use my personal information in accordance with the terms of its <a href="#" className="text-decoration-none" style={{ color: '#00e8e9' }}>Privacy Policy</a>.
                            </label>
                        </div>                 
                    {/* Added a submit button so the form is functional */}
                    <button type="submit" className="btn btn-primary w-100">
                        Book Now
                    </button>
                    </form>
            </div>
            </div>
        </div>
        </section>
        <Footer />
    </> 
  );
};

export default Book;