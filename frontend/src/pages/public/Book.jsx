import { useState, useEffect, useMemo } from 'react';
import Swal from 'sweetalert2'
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import '../../css/style.css';
import ReCAPTCHA from "react-google-recaptcha";
import { useNavigate } from 'react-router-dom';
import fluentbubblewhite from '../../assets/icon/fluent-bubble-white.png';
import { jsPDF } from "jspdf";
import bgimg from '../../assets/img/hero-bg-img.png';
import bubble1 from '../../assets/img/bubble-container.png';
import bubble2 from '../../assets/img/bubble-container1.png';
import ellipse from '../../assets/img/ellipse.png';
import { API_BASE, authHeaders } from '../../api/config';

// 1. Keep the base hours as military for backend compatibility
const allHours = ["08", "09", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24"];


const Book = () => {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState("");
    const [email, setEmail] = useState('');
    const [vehicleType, setVehicleType] = useState('');
    const [serviceType, setServiceType] = useState([]);
    const [privacyChecked, setPrivacyChecked] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [availability, setAvailability] = useState({});
    const [priceListDict, setPriceListDict] = useState(null);
    const [dynamicPricingData, setDynamicPricingData] = useState([]);
    const [armorPrice, setArmorPrice] = useState(100);
    const [selectedHour, setSelectedHour] = useState('');
    const [captchaToken, setCaptchaToken] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState(1);
    const navigate = useNavigate();

    // Define the URL using central config
    const BASE_URL = `${API_BASE}/booking`;

    // Helper function to convert military time to 12-hour format
    const formatTo12Hour = (hourStr) => {
        const hour = parseInt(hourStr);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12; // converts 0 to 12 and 13 to 1
        return `${displayHour}:00 ${ampm}`;
    };
    // Calculate future hours using useMemo so it doesn't recalculate every millisecond
    const availableFutureHours = useMemo(() => {
        const currentHour = new Date().getHours();
        const MAX_CAPACITY = 3;

        // 1. Filter by time AND by availability
        return allHours.filter(hour => {
            const hourInt = parseInt(hour);
            const hourKey = hour.toString().padStart(2, '0');
            const count = availability[hourKey] || 0;

            // ONLY keep the hour if it's in the future AND not full
            return hourInt > currentHour && count < MAX_CAPACITY;
        }).map(hour => {
            const hourKey = hour.toString().padStart(2, '0');
            const bookedCount = availability[hourKey] || 0;
            const slotsLeft = MAX_CAPACITY - bookedCount;
            const slotText = slotsLeft <= 3 ? ` (${slotsLeft} slot${slotsLeft === 1 ? '' : 's'} left)` : '';

            return {
                raw: hour, // Sent to backend
                label: `${formatTo12Hour(hour)}${slotText}` // Shown in UI
            };
        });
    }, [availability]);

    // Fetch Availability AND Set Initial Hour
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch availability and pricing concurrently
                const [availRes, pricingRes] = await Promise.all([
                    fetch(`${BASE_URL}/availability`),
                    fetch(`${API_BASE}/pricing`)
                ]);
                const availData = await availRes.json();
                const pricingData = await pricingRes.json();

                setAvailability(availData);
                if (pricingData && pricingData.priceList) {
                    setPriceListDict(pricingData.priceList);
                    setArmorPrice(pricingData.armorPrice);
                    setDynamicPricingData(pricingData.dynamicPricing || []);
                }
            } catch (err) {
                console.error("Failed to fetch initial data", err);
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

    // Timer for Toast messages
    useEffect(() => {
        if (success || error) {
            const timer = setTimeout(() => {
                setSuccess(false);
                setError(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [success, error]);

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        // Sanitize all inputs before sending to the server to prevent XSS
        const cleanData = {
            // 1. HIGH RISK (Users type anything here - Sanitize strictly)
            firstName: sanitizeInput(firstName),
            lastName: sanitizeInput(lastName),
            vehicleType: sanitizeInput(vehicleType),

            // 2. FORMATTED DATA (Use Validation instead of just Sanitization)
            // You want to make sure these LOOK like a phone/email, not just clean text.
            phoneNumber: phoneNumber.trim(),
            emailAddress: email.trim().toLowerCase(),

            // 3. CONTROLLED DATA (These come from your own dropdowns/buttons)
            // Since the user *picks* these from a list you provided, they are safer.
            serviceType: serviceType,
            bookingTime: selectedHour,
            captchaToken
        };

        try {
            const response = await fetch(BASE_URL, {
                method: 'POST',
                body: JSON.stringify(cleanData),
                headers: authHeaders(),
                credentials: 'include',
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(`Error: ${response.status} ${response.statusText}`);
            }

            if (response.ok) {
                setFirstName('');
                setLastName('');
                setEmail('');
                setPhoneNumber('');
                setVehicleType('');
                setServiceType('');
                setPrivacyChecked(false);
                setError(null);
                setSuccess(true);
                setStep(1);

                // Get the batchID from the server response
                const bookIdFromTheServer = data.batchId;

                const today = new Date();
                const dateStr = `${today.getMonth() + 1}${today.getDate()}${today.getFullYear().toString().slice(-2)}`;
                const finalDisplayId = `${dateStr}-${bookIdFromTheServer}`;
                // Trigger SweetAlert
                Swal.fire({
                    title: 'Booking Successful!',
                    html: `Your BookID is: <b>${finalDisplayId}</b><br>Staff will contact you shortly.`,
                    icon: 'success',
                    showDenyButton: true,
                    showConfirmButton: false, // Hides the default Okay button
                    denyButtonText: 'Download PDF',
                    denyButtonColor: '#23A0CE', // Matching your light blue theme
                    background: '#111',
                    bordeer: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#FAFAFA',
                    customClass: {
                        popup: 'rounded-5'
                    }
                }).then((result) => {
                    if (result.isDenied) {
                        // 1. Trigger Download
                        generatePDF(bookIdFromTheServer);

                        // 2. Show the "Download Started" alert with the final Okay button
                        Swal.fire({
                            title: 'Download Started!',
                            html: 'Your receipt is ready to download. Click <b>Save</b> to finish.',
                            icon: 'info',
                            confirmButtonText: 'Back to Home',
                            confirmButtonColor: '#23A0CE',
                            background: '#111',
                            color: '#FAFAFA',
                        }).then(() => {
                            navigate('/'); // Only goes home AFTER they click Okay
                        });
                    } else if (result.isConfirmed) {
                        navigate('/'); // Goes home immediately
                    }
                });

            } else {
                setError(data.error);
                setSuccess(false);
            }
        } catch (err) {
            setError("Server connection failed.");
        } finally {
            setIsLoading(false);
        }
    };

    // Handle phone number input to allow only digits and limit to 10 characters
    const handlePhoneChange = (e) => {
        const value = e.target.value;
        // This regex says: Replace anything that is NOT a digit (0-9) with an empty string
        const onlyNums = value.replace(/[^0-9]/g, "");

        // Optional: Limit to 10 digits since you already have +63
        if (onlyNums.length <= 10) {
            setPhoneNumber(onlyNums);
        }
    };

    // Generate PDF Receipt
    const generatePDF = (bookId) => {
        const doc = new jsPDF({
            unit: "mm",
            format: [80, 100]
        });

        const today = new Date();
        // 32126 format
        const dateStr = `${today.getMonth() + 1}${today.getDate()}${today.getFullYear().toString().slice(-2)}`;
        const finalId = `${dateStr}-${bookId}`;

        // Header
        doc.setFont("courier", "bold");
        doc.setFontSize(16);
        doc.text("SANDIGAN CARWASH", 40, 15, { align: "center" });

        doc.setFontSize(10);
        doc.setFont("courier", "normal");
        doc.text("----------------------------", 40, 22, { align: "center" });
        doc.text(today.toLocaleString(), 40, 28, { align: "center" });
        doc.text("----------------------------", 40, 34, { align: "center" });

        // Main ID (Big and Bold like Jollibee Kiosk)
        doc.setFontSize(12);
        doc.text("YOUR BOOKING NUMBER:", 40, 45, { align: "center" });

        doc.setFontSize(22); // Extra large
        doc.setFont("courier", "bold");
        doc.text(finalId, 40, 58, { align: "center" });

        // Footer
        doc.setFont("courier", "normal");
        doc.setFontSize(10);
        doc.text("----------------------------", 40, 70, { align: "center" });
        doc.text("Please present this to", 40, 78, { align: "center" });
        doc.text("the staff upon arrival.", 40, 84, { align: "center" });

        // Save/Download
        doc.save(`book_Receipt_${finalId}.pdf`);
    };

    // Step Titles for Progress Bar
    const stepTitles = {
        1: "Vehicle Information",
        2: "Date and Time",
        3: "Personal Information"
    };

    // Sanitize input to prevent XSS (basic example, consider using a library for production)
    const sanitizeInput = (input) => {
        // 1. Remove leading/trailing whitespace
        // 2. Remove any HTML tags (the < > characters)
        // 3. Escape special characters
        return input.replace(/<[^>]*>?/gm, '').trim();
    };

    // Active vehicle data mapped dynamically
    const activeVehicleData = useMemo(() => {
        return dynamicPricingData.find(v => v.vehicleType === vehicleType) || null;
    }, [dynamicPricingData, vehicleType]);

    // Live price calculation
    const totalPrice = useMemo(() => {
        if (!activeVehicleData) return 0;
        return serviceType.reduce((sum, name) => {
            const serv = activeVehicleData.services?.find(s => s.name === name);
            const add = activeVehicleData.addons?.find(a => a.name === name);
            if (serv) return sum + serv.price;
            if (add) return sum + add.price;
            return sum;
        }, 0);
    }, [activeVehicleData, serviceType]);

    // Toggle service selection
    const toggleService = (serviceLabel) => {
        if (serviceType.includes(serviceLabel)) {
            // If already there, remove it (Deselect)
            setServiceType(serviceType.filter(item => item !== serviceLabel));
        } else {
            // If not there, add it (Select)
            setServiceType([...serviceType, serviceLabel]);
        }
    };
    return (
        <>
            <Navbar />
            <section id="book" className="book-section d-flex align-items-center">
                <div className="hero-bg-image-container position-relative overflow-hidden">
                    <div className='bubble-container d-flex align-items-center justify-content-between position-absolute w-100 h-100'>
                        <img src={bubble1} className="bubble bubble1" alt="Bubble" />
                        <img src={bubble2} className="bubble bubble2" alt="Bubble" />
                        <img src={ellipse} className="ellipse position-absolute top-0 end-0" alt="Ellipse" />
                    </div>
                    <img src={bgimg} className='hero-bg-image position-absolute' alt='Hero Background' />
                    <div className="container">
                        <div className="py-5">
                            <div className="row align-items-center my-5">
                                <div className="col-md-6 text-white  text-center text-md-start">
                                    <div className='section-badge d-flex align-items-center gap-2 justify-content-center justify-content-md-start'>
                                        <img src={fluentbubblewhite} alt="Fluent Bubble" />
                                        <h6 className="text-uppercase fst-italic fw-light tracking-wider mb-1">Book Now</h6>
                                    </div>
                                    <h1 className="fw-bold hero-title display-1">Ready for <span style={{ color: '#1CB2E7' }}><br /> Cleaner / Ride? </span></h1>
                                    <p className="fs-5 lead hero-description">Experience the best car wash service and car rental in the business.</p>
                                </div>
                                <div className="col-md-6">
                                    <form className="form-container p-5 w-100" onSubmit={handleSubmit}>
                                        {/* Progress Bar Header */}
                                        <div className="mb-4">
                                            <div className="d-flex justify-content-between mb-1">
                                                <span className="text-light small">Step {step} of 3</span>
                                                <span className='hero-description text-uppercase fw-bold' style={{ fontSize: '0.85rem', letterSpacing: '1px' }}>
                                                    {stepTitles[step]}
                                                </span>
                                            </div>
                                            <div className="progress" role="progressbar" aria-valuenow={(step / 3) * 100} aria-valuemin="0" aria-valuemax="100" style={{ height: '2px', backgroundColor: '#333' }}>
                                                <div
                                                    className="progress-bar"
                                                    style={{
                                                        width: `${(step / 3) * 100}%`,
                                                        backgroundColor: '#00e8e9', // Matching your cyan theme
                                                        transition: 'width 0.4s ease' // Makes the bar slide smoothly
                                                    }}
                                                ></div>
                                            </div>
                                        </div>

                                        {/*Step 1: Vehicle Information */}
                                        <div className="step1-container">
                                            {step === 1 && (
                                                <>
                                                    <div className="vehicle-information-container">
                                                        <div className="input-container vehicle-type-container mb-3">
                                                            <label className="form-label">Vehicle type</label>
                                                            <select
                                                                className="form-select"
                                                                onChange={(e) => { setVehicleType(e.target.value); setServiceType([]); }}
                                                                value={vehicleType}
                                                                required
                                                                disabled={!priceListDict}
                                                            >
                                                                <option value="">{priceListDict ? "-- Select Vehicle --" : "Loading vehicles..."}</option>
                                                                {dynamicPricingData && dynamicPricingData.map(v => (
                                                                    <option key={v._id} value={v.vehicleType}>{v.vehicleType}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div className="service-type-container">
                                                            <label className="form-label brand-accent" >Core Services</label>
                                                            <div className="mb-3 row row-cols-2 row-cols-lg-4 g-3">
                                                                {activeVehicleData?.services?.map((service) => {
                                                                    const isSelected = serviceType.includes(service.name);
                                                                    return (
                                                                        <div key={service.name} className="col mb-3">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => toggleService(service.name)}
                                                                                className={`btn rounded-pill px-2 w-100 ${isSelected ? "btn-primary" : "btn-outline-secondary text-light"}`}
                                                                            >
                                                                                {isSelected && <span className="me-1">✓</span>}
                                                                                {service.name}
                                                                                <span style={{ fontSize: '0.7rem', display: 'block', opacity: 0.7 }}>₱{service.price}</span>
                                                                            </button>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>

                                                            {activeVehicleData?.addons?.length > 0 && (
                                                                <>
                                                                    <label className="form-label brand-accent">Add-ons & Extras</label>
                                                                    <div className="mb-4 row row-cols-2 row-cols-lg- g-3">
                                                                        {activeVehicleData.addons.map((addon) => {
                                                                            const isSelected = serviceType.includes(addon.name);
                                                                            return (
                                                                                <div key={addon.name} className="col mb-3">
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => toggleService(addon.name)}
                                                                                        className={`btn rounded-pill px-2 w-100 ${isSelected ? "btn-info text-white border-0 bg-info" : "btn-outline-secondary text-light"}`}
                                                                                    >
                                                                                        {isSelected && <span className="me-1">✓</span>}
                                                                                        {addon.name}
                                                                                        <span style={{ fontSize: '0.7rem', display: 'block', opacity: 0.8 }}>₱{addon.price}</span>
                                                                                    </button>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </>
                                                            )}

                                                            {/* Live Total */}
                                                            {vehicleType && serviceType.length > 0 && (
                                                                <div className="px-3 py-2 rounded-3 d-flex justify-content-between align-items-center mb-3" style={{ background: 'rgba(35,160,206,0.12)', border: '1px solid rgba(35,160,206,0.3)' }}>
                                                                    <span className="text-light" style={{ fontSize: '0.85rem' }}>Estimated Total</span>
                                                                    <span className="fw-bold" style={{ color: '#23A0CE', fontSize: '1.1rem' }}>₱{totalPrice.toLocaleString()}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="button-container d-flex justify-content-between">
                                                        <a className="icon-link icon-link-hover" style={{ color: 'var(--text-secondary)', fontSize: '.9rem', textDecoration: 'underline' }} href="#">
                                                            Learn more service price
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="bi" viewBox="0 0 16 16" aria-hidden="true">
                                                                <path d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8z" />
                                                            </svg>
                                                        </a>
                                                        <button
                                                            type="button"
                                                            className="btn btn-primary w-100"
                                                            style={{ maxWidth: '100px' }}
                                                            onClick={() => setStep(2)}
                                                            disabled={!vehicleType.trim() || !serviceType.length}
                                                        >
                                                            Next
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {/*Step 2: Date and Time */}
                                        <div className="step2-container">
                                            {step === 2 && (
                                                <>
                                                    <div className='input-container mb-3'>
                                                        <label className="form-label">Select time</label>
                                                        <select
                                                            className="form-select time-picker"
                                                            value={selectedHour}
                                                            onChange={(e) => setSelectedHour(e.target.value)}
                                                            required
                                                        >
                                                            {availableFutureHours.length === 0 ? (
                                                                <option value="">No more slots for today</option>
                                                            ) : (
                                                                <>
                                                                    <option className='default-option' value="default">-- Select a Time --</option>
                                                                    {availableFutureHours.map((hourObj) => (
                                                                        <option key={hourObj.raw} value={hourObj.raw}>
                                                                            {hourObj.label}
                                                                        </option>
                                                                    ))}
                                                                </>
                                                            )}
                                                        </select>
                                                    </div>
                                                    <div className="buttons d-flex justify-content-between mb-3">
                                                        <div className="button-container">
                                                            <button type="button" className="btn btn-secondary" style={{ width: '100px' }} onClick={() => setStep(1)}>
                                                                Previous
                                                            </button>
                                                        </div>
                                                        <div className="button-container">
                                                            <button
                                                                type="button"
                                                                className="btn btn-primary"
                                                                style={{ width: '100px' }}
                                                                onClick={() => setStep(3)}
                                                                disabled={!selectedHour || selectedHour === "default"} // Disable if no hour is selected
                                                            >
                                                                Next
                                                            </button>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {/* Step 3: Personal Information */}
                                        {step === 3 && (
                                            <>
                                                <div className="input-container d-flex gap-3">
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
                                                        <label className="form-label">Last name</label>
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
                                                <div className="input-container">
                                                    <label for="formInput" className="form-label">Phone number</label>
                                                    <div className="input-group mb-3">
                                                        <span className="input-group-text" id="basic-addon1">+63</span>
                                                        <input
                                                            type="text"
                                                            className="form-control"
                                                            placeholder="e.g., 9123456789"
                                                            aria-label="Phone number"
                                                            aria-describedby="basic-addon1"
                                                            inputMode="numeric"
                                                            maxLength="10"
                                                            onChange={handlePhoneChange}
                                                            value={phoneNumber}
                                                            required
                                                        >
                                                        </input>
                                                    </div>
                                                </div>
                                                <div className="input-container mb-3">
                                                    <label className="form-label">Email address</label>
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
                                                <div className="buttons d-flex justify-content-between mb-3">
                                                    <div className="button-container">
                                                        <button
                                                            type="button"
                                                            className="btn btn-secondary"
                                                            style={{ width: '100px' }}
                                                            onClick={() => setStep(2)}
                                                            disabled={isLoading} // Disable while loading to prevent navigation
                                                        >
                                                            Previous
                                                        </button>
                                                    </div>
                                                </div>

                                                {/*Privacy Policy and CAPTCHA */}
                                                <div className="form-check d-flex align-items-start gap-3 mb-3">
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
                                                        By clicking this box, I agree that the company may use my personal information in accordance with the <a href="#" className="text-decoration-none" style={{ color: '#00e8e9' }}>Terms &</a> <a href="#" className="text-decoration-none" style={{ color: '#00e8e9' }}>Privacy Policy</a>.
                                                    </label>
                                                </div>
                                                <div className="form-check d-flex align-items-start gap-3 mb-3">
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
                                                        I agree to arrive on time for my scheduled booking. Late arrivals may result in rescheduling or cancellation of the booking.
                                                    </label>
                                                </div>
                                                <div className="form-check d-flex align-items-start gap-3 mb-3">
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
                                                        I understand that punctuality is essential to ensure a smooth and efficient service experience for all customers.
                                                    </label>
                                                </div>
                                                <div className="form-check d-flex align-items-start gap-3 mb-3">
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
                                                        I acknowledge that if I am unable to arrive on time, I will contact the company as soon as possible to discuss alternative arrangements.
                                                    </label>
                                                </div>
                                                <div className="mb-3">
                                                    <ReCAPTCHA
                                                        sitekey="6LeOuJAsAAAAAPJBVPFJQ5TVhRXJPf-3oQERKub4"
                                                        onChange={(token) => setCaptchaToken(token)}
                                                        theme="dark"
                                                    />
                                                </div>
                                                <button
                                                    type="submit"
                                                    disabled={isLoading} // Prevents duplicate clicks while loading
                                                    className="btn btn-primary w-100 btn-lg d-flex align-items-center justify-content-center text-white"
                                                >
                                                    {isLoading ? (
                                                        <>
                                                            <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                                                            <span role="status">Processing...</span>
                                                        </>
                                                    ) : (
                                                        "Book"
                                                    )}
                                                </button>
                                            </>
                                        )}

                                        <div className="">
                                            {error && (
                                                <div className="toast show align-items-center text-bg-danger border-0 mt-3" role="alert" aria-live="assertive" aria-atomic="true">
                                                    <div className="d-flex">
                                                        <div className="toast-body">
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
                    </div>
                </div>
            </section>
            <Footer />
        </>
    );
};

export default Book;