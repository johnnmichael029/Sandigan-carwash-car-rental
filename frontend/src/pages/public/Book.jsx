import { useState, useEffect, useMemo } from 'react';
import Swal from 'sweetalert2'
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import '../../css/style.css';
import ReCAPTCHA from "react-google-recaptcha";
import { useNavigate } from 'react-router-dom';
import fluentbubblewhite from '../../assets/icon/fluent-bubble-white.png';

// 1. Keep the base hours as military for backend compatibility
const allHours = ["08", "09", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24"];

// 2. Helper function to convert military string "14" to "2:00 PM"
const formatTo12Hour = (hourStr) => {
    const hour = parseInt(hourStr);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12; // converts 0 to 12 and 13 to 1
    return `${displayHour}:00 ${ampm}`;
};

const Book = () => {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [vehicleType, setVehicleType] = useState('');
    const [serviceType, setServiceType] = useState('');
    const [privacyChecked, setPrivacyChecked] = useState(false);
    const [error, setError] = useState(null); 
    const [success, setSuccess] = useState(false);
    const [availability, setAvailability] = useState({});
    const [selectedHour, setSelectedHour] = useState('');
    const [captchaToken, setCaptchaToken] = useState(null);
    const navigate = useNavigate();

    // Define the URL
    const BASE_URL = window.location.hostname === 'localhost' 
            ? 'http://localhost:4000/api/booking' 
            : 'https://sandigan-backend-api-gzdvgkcphtbbcngq.japaneast-01.azurewebsites.net/api/booking';
      
    // 1. Calculate future hours using useMemo so it doesn't recalculate every millisecond
    const availableFutureHours = useMemo(() => {
        const currentHour = new Date().getHours(); 
        
        // 1. Filter by time AND by availability
        return allHours.filter(hour => {
            const hourInt = parseInt(hour);
            const hourKey = hour.toString().padStart(2, '0');
            const count = availability[hourKey] || 0;
            
            // ONLY keep the hour if it's in the future AND not full
            return hourInt > currentHour && count < 3;
            }).map(hour => ({
                raw: hour, // Sent to backend
                label: formatTo12Hour(hour) // Shown in UI
            }));
    }, [availability, allHours]);

    // 2. Fetch Availability AND Set Initial Hour
    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(`${BASE_URL}/availability`);
                const data = await response.json();
                setAvailability(data);
            } catch (err) {
                console.error("Failed to fetch availability", err);
            }
        };
        fetchData();

        // FIX: Set the initial selected hour ONLY ONCE when the component mounts
        if (availableFutureHours.length > 0) {
            setSelectedHour(availableFutureHours[0]);
        }
    }, [BASE_URL]); 

    // For auto-selecting the first valid slot
    useEffect(() => {
        if (availableFutureHours.length > 0 && !selectedHour) {
            setSelectedHour(availableFutureHours[0].raw);
        }
    }, [availableFutureHours, selectedHour]);

    // 3. Timer for Toast messages
    useEffect(() => {
        if (success || error) {
            const timer = setTimeout(() => {
                setSuccess(false);
                setError(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [success, error]);

    const handleSubmit = async (e) => {
        e.preventDefault();      

        if (!privacyChecked) {
            alert('Please agree to the Privacy Policy before booking.');
            return;
        }
        const bookingData = {
            firstName,
            lastName,
            emailAddress: email,   
            vehicleType,
            serviceType,
            bookingTime: selectedHour,
            captchaToken
        };

        try {
            const response = await fetch(BASE_URL, {
                method: 'POST',
                body: JSON.stringify(bookingData),
                headers: { 'Content-Type': 'application/json' },
            });

            const data = await response.json();

            if (response.ok) {
                setFirstName('');
                setLastName('');
                setEmail('');
                setVehicleType('');
                setServiceType('');
                setPrivacyChecked(false);
                setError(null);
                setSuccess(true);

                 // Trigger SweetAlert
                Swal.fire({
                    title: 'Booking Successful!',
                    text: 'Staff will contact you shortly.',
                    icon: 'success',
                    confirmButtonText: 'Okay',
                    confirmButtonColor: '#23A0CE',
                    background: '#111',
                    color: '#fff',
                    customClass: {
                        popup: 'rounded-5' // Optional: matches your UI rounding
                    }
                }).then((result) => {
                    if (result.isConfirmed) {
                        navigate('/'); // Go back to home
                    }
                });

            } else {
                setError(data.error);
                setSuccess(false);
            }
        } catch (err) {
            setError("Server connection failed.");
        }   
    };
  return (
    <>
        <Navbar />
        <section id="book" className="book-section">
            <div className="container">
                <div className="py-5">
                    <div className="row align-items-center my-5">
                        <div className="col-md-6 text-white">
                            <div className='section-badge d-flex align-items-center gap-2'>
                                <img src={fluentbubblewhite} alt="Fluent Bubble" />
                                <h6 className="text-uppercase fst-italic fw-light tracking-wider mb-1">Book Now</h6>
                            </div>
                            <h1 className="fw-bold hero-title display-1">Ready for <span style={{ color: '#1CB2E7' }}><br /> Cleaner / Ride? </span></h1>
                            <p className="fs-5 lead hero-description">Experience the best car wash service and car rental in the business.</p>
                        </div>
                        <form className="form col-md-6 p-5" onSubmit={handleSubmit}>
                            <div className="d-flex gap-3">
                                <div className="form-label flex-fill mb-3">
                                    <label for="formInput" className="form-label">First name</label>
                                    <input 
                                    type="text" 
                                    className="form-control" 
                                    onChange={(e) => setFirstName(e.target.value)}
                                    value={firstName}
                                    id="formInput" 
                                    placeholder="e.g., John Michael" 
                                    required
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
                                    required
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
                                required
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
                                required
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
                                        required    
                                    />                                                    
                                <datalist id="serviceOptions">
                                    <option value="Wash" />
                                    <option value="Armor Wash" />
                                    <option value="Wax Wash" />
                                    <option value="Engine Wash" />
                                </datalist>
                            </div>

                            <div className='form-label'>
                                <label class="form-label">Select time</label>
                              <select 
                                    className="form-select"
                                    value={selectedHour} 
                                    onChange={(e) => setSelectedHour(e.target.value)}
                                    required
                                >
                                    {availableFutureHours.length === 0 ? (
                                        <option value="">No more slots for today</option>
                                    ) : (
                                        <>
                                            <option value="">-- Select a Time --</option>
                                            {availableFutureHours.map((hourObj) => (
                                                <option key={hourObj.raw} value={hourObj.raw}>
                                                    {hourObj.label}
                                                </option>
                                            ))}
                                        </>
                                    )}
                                </select>
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
                            <div className="mb-3">
                                <ReCAPTCHA
                                    sitekey="6LeOuJAsAAAAAPJBVPFJQ5TVhRXJPf-3oQERKub4" 
                                    onChange={(token) => setCaptchaToken(token)}
                                    theme="dark"
                                /> 
                            </div>
                                           
                            {/* Added a submit button so the form is functional */}
                            <button type="submit" className="btn btn-primary w-100 btn-lg d-flex align-items-center justify-content-center text-white" >
                                Book
                            </button>                                                 
                           
                            <div className="mt-3">
                                {error && (
                                    <div class="toast show align-items-center text-bg-danger border-0" role="alert" aria-live="assertive" aria-atomic="true">
                                        <div class="d-flex">
                                            <div class="toast-body">
                                                ❌ {error}
                                            </div>
                                            <button 
                                                type="button" 
                                                className="btn-close btn-close-white me-2 m-auto" 
                                                onClick={() => setError(null)} 
                                                data-bs-dismiss="toast" 
                                                aria-label="Close">                                           
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
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