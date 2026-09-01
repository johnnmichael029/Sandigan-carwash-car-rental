import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import sandiganLogo from '../../assets/logo/sandigan-logo.png';
import bgimg from '../../assets/img/hero-bg-img.png';
import bubble1 from '../../assets/img/bubble-container.png';
import bubble2 from '../../assets/img/bubble-container1.png';
import ellipse from '../../assets/img/ellipse.png';
import { API_BASE, authHeaders } from '../../api/config';

const AdminSetup = () => {
    const [form, setForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isChecking, setIsChecking] = useState(true);
    const [error, setError] = useState(null);
    const [strength, setStrength] = useState(0);
    const navigate = useNavigate();

    // Guard: if setup is already done, redirect to login
    useEffect(() => {
        const check = async () => {
            try {
                const res = await fetch(`${API_BASE}/employees/setup-status`);
                const data = await res.json();
                if (!data.setupRequired) {
                    navigate('/login', { replace: true });
                }
            } catch {
                navigate('/login', { replace: true });
            } finally {
                setIsChecking(false);
            }
        };
        check();
    }, [navigate]);

    // Password strength calculator
    useEffect(() => {
        const p = form.password;
        let score = 0;
        if (p.length >= 8) score++;
        if (/[A-Z]/.test(p)) score++;
        if (/[0-9]/.test(p)) score++;
        if (/[^A-Za-z0-9]/.test(p)) score++;
        setStrength(score);
    }, [form.password]);

    const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'];
    const strengthColor = ['', '#ef4444', '#f59e0b', '#3b82f6', '#22c55e'];

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (form.password !== form.confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (form.password.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE}/employees/setup`, {
                method: 'POST',
                headers: { ...authHeaders(), 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    fullName: form.fullName.trim(),
                    email: form.email.trim().toLowerCase(),
                    password: form.password,
                    role: 'admin'
                })
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.message || data.error || 'Setup failed. Please try again.');
                return;
            }

            await Swal.fire({
                icon: 'success',
                title: 'Admin Account Created!',
                html: `<p style="color:#9ca3af;font-size:0.9rem">Welcome, <b style="color:#FAFAFA">${form.fullName}</b>!<br>Your admin account is ready. Please log in to continue.</p>`,
                confirmButtonColor: '#23A0CE',
                confirmButtonText: 'Go to Login',
                background: '#0d1b1b',
                color: '#FAFAFA',
                customClass: { popup: 'rounded-4' }
            });

            navigate('/login', { replace: true });
        } catch {
            setError('Server is unreachable. Please try again later.');
        } finally {
            setIsLoading(false);
        }
    };

    if (isChecking) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d1b1b' }}>
                <div className="spinner-border text-info" />
            </div>
        );
    }

    return (
        <section className="login-section">
            <div className='hero-bg-image-container position-relative overflow-hidden d-flex align-items-center justify-content-center'>
                <div className='bubble-container d-flex align-items-center justify-content-between position-absolute w-100 h-100'>
                    <img src={bubble1} className="bubble bubble1" alt="Bubble" />
                    <img src={bubble2} className="bubble bubble2" alt="Bubble" />
                    <img src={ellipse} className="ellipse position-absolute top-0 end-0" alt="Ellipse" />
                </div>
                <img src={bgimg} className='hero-bg-image position-absolute' alt='Hero Background' />

                <div className="form-container card p-5 animate-fade-in" style={{ width: '100%', maxWidth: '440px', borderRadius: '20px' }}>
                    <img src={sandiganLogo} alt="Sandigan Logo" className="mb-3" />

                    {/* Header */}
                    <div className="mb-4">
                        <div className="d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill mb-2" style={{ background: 'rgba(35,160,206,0.12)', border: '1px solid rgba(35,160,206,0.3)' }}>
                            <span style={{ width: '6px', height: '6px', background: '#23A0CE', borderRadius: '50%', display: 'inline-block' }} />
                            <small style={{ color: '#23A0CE', fontWeight: 600, fontSize: '0.72rem', letterSpacing: '0.5px', textTransform: 'uppercase' }}>First-Time Setup</small>
                        </div>
                        <h5 className="fw-bold mb-1 brand-primary" >Create Your Admin Account</h5>
                        <p className="text-light-gray200 mb-0" style={{ fontSize: '0.82rem' }}>This page will be permanently locked once completed.</p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        {/* Full Name */}
                        <div className="mb-3">
                            <label className="form-label fw-light text-light-gray200" style={{ fontSize: '0.82rem' }}>Full Name</label>
                            <input
                                type="text"
                                name="fullName"
                                className="form-control rounded-3"
                                placeholder="e.g. Juan dela Cruz"
                                value={form.fullName}
                                onChange={handleChange}
                                required
                                autoComplete="name"
                            />
                        </div>

                        {/* Email */}
                        <div className="mb-3">
                            <label className="form-label fw-light text-light-gray200" style={{ fontSize: '0.82rem' }}>Email Address</label>
                            <input
                                type="email"
                                name="email"
                                className="form-control rounded-3"
                                placeholder="admin@yourbusiness.com"
                                value={form.email}
                                onChange={handleChange}
                                required
                                autoComplete="email"
                            />
                        </div>

                        {/* Password */}
                        <div className="mb-2">
                            <label className="form-label fw-light text-light-gray200" style={{ fontSize: '0.82rem' }}>Password</label>
                            <div className="input-group">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    className="form-control rounded-start-3"
                                    placeholder="Min. 8 characters"
                                    value={form.password}
                                    onChange={handleChange}
                                    required
                                    autoComplete="new-password"
                                />
                                <button type="button" className="btn btn-outline-secondary rounded-end-3" onClick={() => setShowPassword(p => !p)}>
                                    {showPassword ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                            <path d="M10.79 12.912l-1.614-1.615a3.5 3.5 0 0 1-4.474-4.474l-2.06-2.06C.939 6.065 0 8 0 8s3 5.5 8 5.5a7.07 7.07 0 0 0 2.79-.588M5.21 3.088A7.07 7.07 0 0 1 8 2.5c5 0 8 5.5 8 5.5s-.939 1.935-2.642 3.179zm4.653 4.653a2.5 2.5 0 0 1-3.499-3.499z" /><path d="m13.646 14.354-12-12 .708-.708 12 12z" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                            <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8M1.173 8a13 13 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5s3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5s-3.879-1.168-5.168-2.457A13 13 0 0 1 1.172 8z" /><path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0" />
                                        </svg>
                                    )}
                                </button>
                            </div>

                            {/* Strength Bar */}
                            {form.password.length > 0 && (
                                <div className="mt-2">
                                    <div className="d-flex gap-1 mb-1">
                                        {[1, 2, 3, 4].map(i => (
                                            <div key={i} style={{
                                                height: '4px', flex: 1, borderRadius: '99px',
                                                background: i <= strength ? strengthColor[strength] : '#e5e7eb',
                                                transition: 'background 0.3s'
                                            }} />
                                        ))}
                                    </div>
                                    <small style={{ color: strengthColor[strength], fontWeight: 600, fontSize: '0.72rem' }}>
                                        {strengthLabel[strength]}
                                    </small>
                                </div>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div className="mb-4">
                            <label className="form-label fw-light text-light-gray200" style={{ fontSize: '0.82rem' }}>Confirm Password</label>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                name="confirmPassword"
                                className="form-control rounded-3"
                                placeholder="Repeat your password"
                                value={form.confirmPassword}
                                onChange={handleChange}
                                required
                                autoComplete="new-password"
                            />
                            {form.confirmPassword && form.password !== form.confirmPassword && (
                                <small className="text-danger mt-1 d-block" style={{ fontSize: '0.72rem' }}>Passwords do not match</small>
                            )}
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="toast show align-items-center text-bg-danger border-0 mb-3 w-100" role="alert">
                                <div className="d-flex">
                                    <div className="toast-body">{error}</div>
                                    <button type="button" className="btn-close btn-close-white me-2 m-auto" onClick={() => setError(null)} />
                                </div>
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            id="btn-setup-submit"
                            type="submit"
                            className="btn btn-primary w-100 py-2 rounded-3 fw-semibold"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" />
                                    <span>Creating Account...</span>
                                </>
                            ) : 'Create Admin Account & Lock Setup'}
                        </button>

                        <p className="text-center text-light-gray200 mt-3 mb-0" style={{ fontSize: '0.75rem' }}>
                            This setup page will be permanently locked after submission.
                        </p>
                    </form>
                </div>
            </div>
        </section >
    );
};

export default AdminSetup;
