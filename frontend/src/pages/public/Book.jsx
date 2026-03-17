import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import '../../css/style.css';

const Book = () => {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [vehicleType, setVehicleType] = useState('');
    const [serviceType, setServiceType] = useState('');
    const [privacyChecked, setPrivacyChecked] = useState(false);
    const [error, setError] = useState(null); 
    const [success, setSuccess] = useState(false);

    useEffect(() => {
    if (success || error) {
        const timer = setTimeout(() => {
            setSuccess(false);
            setError(null);
        }, 5000); // 5000ms = 5 seconds

        return () => clearTimeout(timer); // Cleanup timer if user leaves page
    }
    }, [success, error]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!privacyChecked) {
            alert('Please agree to the Privacy Policy before booking.');
            return;
        }

        const bookingData = {
            firstName ,
            lastName,
            emailAddress: email,   
            vehicleType,
            serviceType
        };
        try {
            const response = await fetch('http://localhost:4000/api/booking', {
                method: 'POST',
                body: JSON.stringify(bookingData),
                headers: {
                    'Content-Type': 'application/json'
                },
            });

            const data = await response.json(); // Use 'data' consistently

            if (response.ok) {
                console.log('New booking added:', data);
                
                // Reset form
                setFirstName('');
                setLastName('');
                setEmail('');
                setVehicleType('');
                setServiceType('');
                setPrivacyChecked(false);
                setError(null);
                setSuccess(true);
            } else {
                setError(data.error);
                setSuccess(false);
            }
        } 
        catch (err) {
            console.error(err);
        }   
    };
  return (
    <>
        <Navbar />
        <section id="book-section" className="book-section">
            <div className="container">
                <div className="py-5">
                    <div className="row align-items-center">
                        <div className="col-md-6 text-white">
                            <h6 className="text-uppercase"><i> BOOK NOW </i></h6>
                            <h1 className="fw-bold">Ready for</h1>
                            <h1 className="fw-bold" style={{ color: '#1CB2E7' }}>Cleaner / Ride?</h1>
                            <p className="fs-6 hero-description">Experience the best car wash service and car rental in the business.</p>
                        </div>
                        <form className="form col-md-6 p-5" onSubmit={handleSubmit}>
                            <div className="d-flex gap-3">
                                <div className="form-label flex-fill mb-3">
                                    <label for="formInput" class="form-label">First name</label>
                                    <input 
                                    type="text" 
                                    className="form-control" 
                                    onChange={(e) => setFirstName(e.target.value)}
                                    value={firstName}
                                    id="formInput" 
                                    placeholder="e.g., John Michael" 
                                    />                           
                                </div>
                                <div className="form-label flex-fill mb-3">
                                    <label class="form-label">Last name</label>
                                    <input 
                                    type="text" 
                                    className="form-control" 
                                    onChange={(e) => setLastName(e.target.value)}
                                    value={lastName}
                                    id="floatingInput" 
                                    placeholder="e.g., Doe" 
                                    />                              
                                </div>
                            </div>                        
                            <div className="form-label mb-3">
                                <label class="form-label">Email address</label>
                                <input 
                                type="email" 
                                className="form-control" 
                                onChange={(e) => setEmail(e.target.value)}
                                value={email}
                                id="floatingInput" 
                                placeholder="e.g., name@example.com" 
                                />                         
                            </div>
                            <div className="form-label mb-3">
                                <label class="form-label">Vehicle type</label>
                                <input 
                                type="text" 
                                className="form-control" 
                                onChange={(e) => setVehicleType(e.target.value)}
                                value={vehicleType}
                                id="floatingVehicle" 
                                list="vehicleOptions" 
                                placeholder="e.g., Sedan" 
                                />                          
                                <datalist id="vehicleOptions">
                                    <option value="Sedan" />
                                    <option value="SUV" />
                                    <option value="Truck" />
                                    <option value="Coupe" />
                                </datalist>
                            </div>   
                            <div className="form-label">
                                <label class="form-label">Service type</label>
                            <input 
                                    type="text" 
                                    className="form-control" 
                                    id="floatingService" 
                                    onChange={(e) => setServiceType(e.target.value)}
                                    value={serviceType}
                                    list="serviceOptions" 
                                    placeholder="e.g., Wash" 
                                />                                                    
                                <datalist id="serviceOptions">
                                    <option value="Wash" />
                                    <option value="Armor Wash" />
                                    <option value="Wax Wash" />
                                    <option value="Engine Wash" />
                                </datalist>
                            </div>
                            <div className="form-check d-flex align-items-start gap-3 my-3">
                                <input 
                                    className="form-check-input flex-shrink-0" 
                                    type="checkbox" 
                                    checked={privacyChecked}
                                    onChange={(e) => setPrivacyChecked(e.target.checked)}
                                    id="privacyPolicy" 
                                    required 
                                    style={{ width: '1.5em', height: '1.5em', cursor: 'pointer' }}
                                />
                                <label className="form-check-label text-light opacity-75 small" htmlFor="privacyPolicy" style={{ cursor: 'pointer', lineHeight: '1.5' }}>
                                    By clicking this box, I agree that the company may use my personal information in accordance with the terms of its <a href="#" className="text-decoration-none" style={{ color: '#00e8e9' }}>Privacy Policy</a>.
                                </label>
                            </div>                 
                            {/* Added a submit button so the form is functional */}
                            <button type="submit" className="btn btn-primary w-100" >
                                Book Now
                            </button>

                           {success && (
                                <div className="alert alert-success mt-3 alert-dismissible fade show d-flex justify-content-between align-items-center" role="alert">
                                    <span>✅ Booking Successful!</span>
                                    <button 
                                        type="button" 
                                        className="btn-close" 
                                        onClick={() => setSuccess(false)} 
                                        aria-label="Close"
                                    ></button>
                                </div>
                            )}
                            {error && (
                                <div className="alert alert-danger mt-3 alert-dismissible fade show d-flex justify-content-between align-items-center" role="alert">
                                    <span>❌ {error}</span>
                                    <button 
                                        type="button" 
                                        className="btn-close" 
                                        onClick={() => setError(null)} 
                                        aria-label="Close"
                                    ></button>
                                </div>
                            )}
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