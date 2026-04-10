import { useState, useEffect, useMemo } from 'react';
import Swal from 'sweetalert2'
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import '../../css/style.css';
import ReCAPTCHA from "react-google-recaptcha";
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import carwashIcon from '../../assets/icon/carwash-png.png';
import carRentalIcon from '../../assets/icon/car-rental1.png';
import fluentbubblewhite from '../../assets/icon/fluent-bubble-white.png';
import jsPDF from "jspdf";
import bgimg from '../../assets/img/hero-bg-img.png';
import bubble1 from '../../assets/img/bubble-container.png';
import bubble2 from '../../assets/img/bubble-container1.png';
import ellipse from '../../assets/img/ellipse.png';
import { API_BASE, SOCKET_URL, authHeaders } from '../../api/config';
import { io } from 'socket.io-client';

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
    const location = useLocation();
    const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);

    const [activeCategory, setActiveCategory] = useState(queryParams.get('type') === 'rental' ? 'rental' : 'wash');
    const [rentalFleet, setRentalFleet] = useState([]);
    const [destination, setDestination] = useState('');
    const [address, setAddress] = useState('');
    const [rentalStartDate, setRentalStartDate] = useState('');
    const [rentalDurationDays, setRentalDurationDays] = useState(1);
    const [selectedRentalVehicle, setSelectedRentalVehicle] = useState(null);

    useEffect(() => {
        if (activeCategory === 'rental' && rentalFleet.length === 0) {
            axios.get(`${API_BASE}/rental-fleet`)
                .then(res => {
                    setRentalFleet(res.data);
                    const vId = queryParams.get('vehicleId');
                    if (vId) {
                        const v = res.data.find(v => v._id === vId);
                        if (v) {
                            setSelectedRentalVehicle(v);
                            setVehicleType(v.vehicleName);
                        }
                    }
                })
                .catch(err => console.error(err));
        }
    }, [activeCategory, queryParams]);

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

    useEffect(() => {
        fetchData();

        // Real-time updates for pricing settings
        const socket = io(SOCKET_URL, { withCredentials: true });
        socket.on('pricing_updated', () => {
            fetchData();
        });

        return () => socket.disconnect();
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

    // Step validation helpers
    const validateStep1 = () => {
        if (activeCategory === 'rental') {
            if (!selectedRentalVehicle) { setError("Please select a vehicle to rent."); return false; }
            if (!rentalStartDate) { setError("Please select a pick-up date."); return false; }
            if (!rentalDurationDays || rentalDurationDays < 1) { setError("Please specify duration (minimum 1 day)."); return false; }
            if (!destination.trim()) { setError("Please provide your destination."); return false; }
        } else {
            if (!vehicleType.trim()) { setError("Please select your vehicle type."); return false; }
            if (!serviceType.length) { setError("Please select at least one service."); return false; }
        }
        return true;
    };

    const validateStep2 = () => {
        if (activeCategory === 'wash') {
            if (!selectedHour || selectedHour === "default") { setError("Please select a booking time."); return false; }
        }
        // Requirements check for rental is handled by the checkbox in Step 3
        return true;
    };

    const validateStep3 = () => {
        if (!firstName.trim()) { setError("First name is required."); return false; }
        if (!lastName.trim()) { setError("Last name is required."); return false; }
        if (!phoneNumber.trim()) { setError("Phone number is required."); return false; }
        if (phoneNumber.length < 10) { setError("Please enter a valid 10-digit phone number."); return false; }
        if (!email.trim()) { setError("Email address is required."); return false; }
        if (activeCategory === 'rental' && !address.trim()) { setError("Home address is required for rentals."); return false; }
        if (!privacyChecked) { setError("You must agree to the Privacy Policy."); return false; }

        // Final rental check
        if (activeCategory === 'rental') {
            const reqAck = document.getElementById('rentalRequirementsAck');
            if (reqAck && !reqAck.checked) {
                setError("Please acknowledge the rental requirements.");
                return false;
            }
        } else {
            const timeAg = document.getElementById('timeAgreement');
            const puncAg = document.getElementById('punctualityAcknowledge');
            const contAg = document.getElementById('contactAcknowledge');
            if (!timeAg?.checked || !puncAg?.checked || !contAg?.checked) {
                setError("Please acknowledge all service agreements.");
                return false;
            }
        }

        if (!captchaToken) { setError("Please solve the captcha to proceed."); return false; }
        return true;
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateStep3()) return;

        setIsLoading(true);

        const isRentalMode = activeCategory === 'rental';
        const SUBMIT_URL = isRentalMode ? `${API_BASE}/car-rentals` : `${API_BASE}/booking`;

        // Sanitize all inputs before sending to the server to prevent XSS
        const cleanData = isRentalMode ? {
            fullName: `${sanitizeInput(firstName)} ${sanitizeInput(lastName)}`,
            contactNumber: phoneNumber.trim(),
            emailAddress: email.trim().toLowerCase(),
            address: sanitizeInput(address),
            vehicleId: selectedRentalVehicle?._id,
            rentalStartDate: rentalStartDate,
            returnDate: new Date(new Date(rentalStartDate).getTime() + (parseInt(rentalDurationDays) * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
            destination: sanitizeInput(destination),
            notes: `Booked via Web Portal`,
            requirementsAcknowledged: true, // Checkbox validated by step logic
            captchaToken
        } : {
            firstName: sanitizeInput(firstName),
            lastName: sanitizeInput(lastName),
            vehicleType: sanitizeInput(vehicleType),
            phoneNumber: phoneNumber.trim(),
            emailAddress: email.trim().toLowerCase(),
            serviceType: serviceType,
            bookingTime: selectedHour,
            captchaToken,
            isRental: false
        };

        try {
            const response = await fetch(SUBMIT_URL, {
                method: 'POST',
                body: JSON.stringify(cleanData),
                headers: authHeaders(),
                credentials: 'include',
            });

            const data = await response.json();

            if (!response.ok) {
                // If the server sends an error (like "Captcha required"), show that specifically
                throw new Error(data.error || `Server Error: ${response.status}`);
            }

            // If we reach here, it's successful (response.ok is true)
            setFirstName('');
            setLastName('');
            setEmail('');
            setPhoneNumber('');
            setVehicleType('');
            setServiceType([]);
            setAddress('');
            setPrivacyChecked(false);
            setError(null);
            setSuccess(true);
            setStep(1);

            // Get the ID from the server response (it's called batchId for wash, rentalId for rent)
            const finalDisplayId = isRentalMode ? data.rentalId : data.batchId;


            // Trigger SweetAlert
            Swal.fire({
                title: activeCategory === 'rental' ? 'Rental Request Successful!' : 'Booking Successful!',
                html: `Your ${activeCategory === 'rental' ? 'Rental ID' : 'BookID'} is: <b>${finalDisplayId}</b><br>Staff will contact you shortly.`,
                icon: 'success',
                showDenyButton: true,
                showConfirmButton: false,
                denyButtonText: 'Download PDF',
                denyButtonColor: '#23A0CE',
                background: '#111',
                color: '#FAFAFA',
                customClass: { popup: 'rounded-5' }
            }).then((result) => {
                if (result.isDenied) {
                    console.log(`Downloading PDF for ${activeCategory === 'rental' ? 'RentalID' : 'BookID'}:`, finalDisplayId);
                    generatePDF(finalDisplayId);

                    // Small delay to ensure browser captures the download trigger
                    setTimeout(() => {
                        Swal.fire({
                            title: 'Download Started!',
                            html: 'Your receipt is ready to download.',
                            icon: 'info',
                            confirmButtonText: 'Back to Home',
                            confirmButtonColor: '#23A0CE',
                            background: '#111',
                            color: '#FAFAFA',
                        }).then(() => {
                            navigate('/');
                        });
                    }, 500);
                } else {
                    navigate('/');
                }
            });
        } catch (err) {
            // Show the actual message (e.g., "Please solve the captcha first.")
            setError(err.message || "Server connection failed. Please try again.");
            setSuccess(false);
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
    const generatePDF = (finalId) => {
        const doc = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: [80, 100]
        });


        // Header
        doc.setFont("courier", "bold");
        doc.setFontSize(16);
        doc.text("SANDIGAN CARWASH", 40, 15, { align: "center" });

        doc.setFontSize(10);
        doc.setFont("courier", "normal");
        doc.text("----------------------------", 40, 22, { align: "center" });
        doc.text(new Date().toLocaleString(), 40, 28, { align: "center" });
        doc.text("----------------------------", 40, 34, { align: "center" });

        // Main ID (Big and Bold like Jollibee Kiosk)
        doc.setFontSize(12);
        doc.text(activeCategory === 'rental' ? "YOUR RENTAL ID:" : "YOUR BOOKING NUMBER:", 40, 45, { align: "center" });

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
        const fileName = activeCategory === 'rental' ? `rental_Receipt_${finalId}.pdf` : `book_Receipt_${finalId}.pdf`;
        doc.save(fileName);
    };

    // Step Titles for Progress Bar
    const stepTitles = activeCategory === 'rental' ? {
        1: "Rental Details",
        2: "Requirements",
        3: "Personal Information"
    } : {
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
                                        {/* Category Toggle */}
                                        <div className="service-toggle-wrapper mb-4 d-flex justify-content-center">
                                            <div className="service-toggle-wrapper">
                                                <div className="toggle-capsule shadow-sm">
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
                                        </div>

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

                                        {/*Step 1: Vehicle/Rental Information */}
                                        <div className="step1-container">
                                            {step === 1 && (
                                                <>
                                                    {activeCategory === 'wash' ? (
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
                                                    ) : (
                                                        <div className="rental-information-container text-light">
                                                            <div className="input-container mb-3">
                                                                <label className="form-label brand-accent">Select Vehicle to Rent</label>
                                                                <select
                                                                    className="form-select"
                                                                    required
                                                                    value={selectedRentalVehicle?._id || ''}
                                                                    onChange={(e) => {
                                                                        const v = rentalFleet.find(v => v._id === e.target.value);
                                                                        setSelectedRentalVehicle(v);
                                                                        setVehicleType(v?.vehicleName || '');
                                                                        setServiceType(["Car Rental"]);
                                                                    }}
                                                                >
                                                                    <option value="">-- Select Rental Vehicle --</option>
                                                                    {rentalFleet.map(v => (
                                                                        <option key={v._id} value={v._id}>{v.vehicleName} ({v.seats}-Seater) - ₱{v.pricePerDay?.toLocaleString()}/day</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <div className="input-container mb-3">
                                                                <label className="form-label text-light">Pick-up Date</label>
                                                                <input type="date" className="form-control text-light" required value={rentalStartDate} onChange={e => setRentalStartDate(e.target.value)} min={new Date().toISOString().split('T')[0]} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }} />
                                                            </div>
                                                            <div className="input-container mb-3">
                                                                <label className="form-label text-light">Duration (Days)</label>
                                                                <input type="number" className="form-control text-light" min="1" required value={rentalDurationDays} onChange={e => { setRentalDurationDays(Math.max(1, e.target.value)); }} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }} />
                                                            </div>
                                                            <div className="input-container mb-4">
                                                                <label className="form-label text-light">Destination</label>
                                                                <input type="text" className="form-control text-light" placeholder="e.g. Tagaytay City, Metro Manila" required value={destination} onChange={e => setDestination(e.target.value)} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }} />
                                                            </div>

                                                            {selectedRentalVehicle && rentalDurationDays && (
                                                                <div className="px-3 py-2 rounded-3 d-flex justify-content-between align-items-center mb-3" style={{ background: 'rgba(35,160,206,0.12)', border: '1px solid rgba(35,160,206,0.3)' }}>
                                                                    <span className="text-light" style={{ fontSize: '0.85rem' }}>Estimated Total</span>
                                                                    <span className="fw-bold" style={{ color: '#23A0CE', fontSize: '1.1rem' }}>₱{(selectedRentalVehicle.pricePerDay * parseInt(rentalDurationDays)).toLocaleString()}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
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
                                                            onClick={() => {
                                                                if (validateStep1()) setStep(2);
                                                            }}
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
                                                    {activeCategory === 'wash' ? (
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
                                                    ) : (
                                                        <div className="requirements-container text-light mb-4 p-4 rounded-3 shadow-sm" style={{ border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                                            <h5 className="brand-accent mb-3 d-flex align-items-center gap-2">
                                                                <i className="bi bi-card-checklist text-warning" style={{ fontSize: '1.2rem' }}></i> Rental Requirements
                                                            </h5>
                                                            <p className="small opacity-75 mb-3">Please bring the original and photocopies of the following documents upon vehicle pick-up:</p>
                                                            <ul className="list-unstyled mb-0 d-flex flex-column gap-3 small ms-2">
                                                                <li className="d-flex align-items-start gap-3">
                                                                    <span className="text-success fw-bold" style={{ fontSize: '1.1rem' }}>✓</span>
                                                                    <span style={{ paddingTop: '2px' }}>Valid Professional Driver's License</span>
                                                                </li>
                                                                <li className="d-flex align-items-start gap-3">
                                                                    <span className="text-success fw-bold" style={{ fontSize: '1.1rem' }}>✓</span>
                                                                    <span style={{ paddingTop: '2px' }}>1 Additional Valid Government ID</span>
                                                                </li>
                                                                <li className="d-flex align-items-start gap-3">
                                                                    <span className="text-success fw-bold" style={{ fontSize: '1.1rem' }}>✓</span>
                                                                    <span style={{ paddingTop: '2px' }}>Latest Proof of Billing (Must match ID address)</span>
                                                                </li>
                                                                <li className="d-flex align-items-start gap-3">
                                                                    <span className="text-success fw-bold" style={{ fontSize: '1.1rem' }}>✓</span>
                                                                    <span style={{ paddingTop: '2px' }}>Security Deposit (₱5,000 - Refundable)</span>
                                                                </li>
                                                            </ul>
                                                        </div>
                                                    )}
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
                                                                onClick={() => {
                                                                    if (validateStep2()) setStep(3);
                                                                }}
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
                                                {activeCategory === 'rental' && (
                                                    <div className="input-container mb-3">
                                                        <label className="form-label text-light">Current Address</label>
                                                        <input
                                                            type="text"
                                                            className="form-control text-light"
                                                            placeholder="e.g., 123 Street, Brgy, City"
                                                            onChange={(e) => setAddress(e.target.value)}
                                                            value={address}
                                                            required
                                                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
                                                        />
                                                    </div>
                                                )}
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
                                                {activeCategory === 'wash' ? (
                                                    <>
                                                        <div className="form-check d-flex align-items-start gap-3 mb-3">
                                                            <input
                                                                className="form-check-input flex-shrink-0"
                                                                type="checkbox"
                                                                id="timeAgreement"
                                                                required
                                                                style={{ width: '1.5em', height: '1.5em', cursor: 'pointer' }}
                                                            />
                                                            <label className="form-check-label text-light opacity-75 small" htmlFor="timeAgreement" style={{ cursor: 'pointer', lineHeight: '1.5' }}>
                                                                I agree to arrive on time for my scheduled booking. Late arrivals may result in rescheduling or cancellation of the booking.
                                                            </label>
                                                        </div>
                                                        <div className="form-check d-flex align-items-start gap-3 mb-3">
                                                            <input
                                                                className="form-check-input flex-shrink-0"
                                                                type="checkbox"
                                                                id="punctualityAcknowledge"
                                                                required
                                                                style={{ width: '1.5em', height: '1.5em', cursor: 'pointer' }}
                                                            />
                                                            <label className="form-check-label text-light opacity-75 small" htmlFor="punctualityAcknowledge" style={{ cursor: 'pointer', lineHeight: '1.5' }}>
                                                                I understand that punctuality is essential to ensure a smooth and efficient service experience for all customers.
                                                            </label>
                                                        </div>
                                                        <div className="form-check d-flex align-items-start gap-3 mb-3">
                                                            <input
                                                                className="form-check-input flex-shrink-0"
                                                                type="checkbox"
                                                                id="contactAcknowledge"
                                                                required
                                                                style={{ width: '1.5em', height: '1.5em', cursor: 'pointer' }}
                                                            />
                                                            <label className="form-check-label text-light opacity-75 small" htmlFor="contactAcknowledge" style={{ cursor: 'pointer', lineHeight: '1.5' }}>
                                                                I acknowledge that if I am unable to arrive on time, I will contact the company as soon as possible to discuss alternative arrangements.
                                                            </label>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="form-check d-flex align-items-start gap-3 mb-3">
                                                        <input
                                                            className="form-check-input flex-shrink-0"
                                                            type="checkbox"
                                                            id="rentalRequirementsAck"
                                                            required
                                                            style={{ width: '1.5em', height: '1.5em', cursor: 'pointer' }}
                                                        />
                                                        <label className="form-check-label text-light opacity-75 small" htmlFor="rentalRequirementsAck" style={{ cursor: 'pointer', lineHeight: '1.5' }}>
                                                            I acknowledge that I must bring the complete physical documents stated in the requirements checklist and pay the refundable security deposit upon vehicle pick-up. Otherwise, my booking may be forfeited.
                                                        </label>
                                                    </div>
                                                )}
                                                <div className="mb-3">
                                                    <ReCAPTCHA
                                                        sitekey="6LeOuJAsAAAAAPJBVPFJQ5TVhRXJPf-3oQERKub4"
                                                        onChange={(token) => setCaptchaToken(token)}
                                                        theme="dark"
                                                    />
                                                </div>
                                                <button
                                                    type="submit"
                                                    disabled={isLoading || !captchaToken}
                                                    className="btn btn-primary w-100 btn-lg d-flex align-items-center justify-content-center text-white"
                                                >
                                                    {isLoading ? (
                                                        <>
                                                            <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                                                            <span role="status">Processing...</span>
                                                        </>
                                                    ) : (
                                                        activeCategory === 'rental' ? "Submit Rental Request" : "Book"
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