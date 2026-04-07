import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { QRCodeCanvas } from 'qrcode.react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { API_BASE, authHeaders } from '../../../api/config';
import sandiganLogo from '../../../assets/logo/sandigan-logo.png';
import AdminModalWrapper from '../../admin/shared/AdminModalWrapper';

const SMCCardModal = ({ data, onClose }) => {
    const cardRef = useRef();
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [config, setConfig] = useState(null);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await axios.get(`${API_BASE}/crm/config/smc`, {
                    headers: authHeaders(),
                    withCredentials: true
                });
                setConfig(res.data);
            } catch (err) {
                console.error("Failed to fetch SMC config", err);
                // Fallback to standard design to prevent infinite loading
                setConfig({
                    cardName: 'Sandigan Membership',
                    cardColor: '#0f172a',
                    abbreviation: 'SMC',
                    validityMonths: 12
                });
            }
        };
        fetchConfig();
    }, []);

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadPdf = async () => {
        if (!config || !cardRef.current) {
            Swal.fire('Wait', 'Card design is still loading. Please try again in a moment.', 'info');
            return;
        }

        setIsGeneratingPdf(true);
        try {
            // Give a tiny moment for QR & Fonts to settle
            await new Promise(r => setTimeout(r, 100));

            const canvas = await html2canvas(cardRef.current, {
                scale: 3,
                useCORS: true,
                backgroundColor: null,
                logging: false
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [85.6, 54] });
            pdf.addImage(imgData, 'PNG', 0, 0, 85.6, 54);
            pdf.save(`Sandigan_SMC_${data.smcId}.pdf`);
        } catch (error) {
            console.error("PDF Generation failed", error);
            Swal.fire('Error', 'Could not generate card PDF. Please try printing instead or refresh the page.', 'error');
        }
        setIsGeneratingPdf(false);
    };

    const qrLink = `https://sandigan-carwash.com/validate/${data.smcId}`;

    return (
        <AdminModalWrapper show={!!data} onClose={onClose}>
            <div className="modal-content rounded-4 shadow border-0 overflow-hidden bg-white">
                <div className="modal-header border-bottom-0 pb-0 pt-4 px-4 d-flex justify-content-between align-items-center no-print">
                    <h5 className="modal-title font-poppins fw-bold text-dark-secondary">Membership Card Preview</h5>
                    <button type="button" className="btn-close shadow-none" onClick={onClose}></button>
                </div>

                <div className="modal-body py-4">
                    {!config ? (
                        <div className="text-center py-4">
                            <div className="spinner-border text-primary spinner-border-sm" role="status"></div>
                            <p className="small text-muted mt-2">Loading card design...</p>
                        </div>
                    ) : (
                        <div id="smc-card-content" ref={cardRef} className="mx-auto" style={{
                            width: '400px',
                            height: '240px',
                            borderRadius: '16px',
                            background: `linear-gradient(135deg, ${config.cardColor || '#0f172a'} 0%, #1e3a8a 100%)`,
                            color: 'white',
                            position: 'relative',
                            overflow: 'hidden',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                            fontFamily: 'Poppins, sans-serif'
                        }}>
                            {/* Decorative Patterns */}
                            <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', borderRadius: '100px', background: 'rgba(255,255,255,0.05)' }}></div>
                            <div style={{ position: 'absolute', bottom: '-40px', left: '-40px', width: '150px', height: '150px', borderRadius: '75px', background: 'rgba(255,255,255,0.03)' }}></div>

                            <div className="p-4 h-100 d-flex flex-column justify-content-between">
                                <div className="d-flex justify-content-between align-items-start">
                                    <div className="d-flex align-items-center gap-2">
                                        <img src={sandiganLogo} alt="Logo" style={{ height: '35px' }} />
                                        <span style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '1px' }}>{config.cardName?.toUpperCase() || 'SANDIGAN'}</span>
                                    </div>
                                </div>

                                <div className="d-flex justify-content-between align-items-end mt-2">
                                    <div>
                                        <p className="mb-0 font-monospace fw-bold" style={{ fontSize: '1.3rem', letterSpacing: '4px' }}>{data.smcId}</p>
                                        <p className="mb-0 opacity-75 mt-1" style={{ fontSize: '0.65rem', fontWeight: 500, letterSpacing: '1px' }}>
                                            {data.smcExpiryDate || data.expiryDate ?
                                                `VALID UNTIL: ${new Date(data.smcExpiryDate || data.expiryDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}`
                                                : 'LIFETIME ACCESS'}
                                        </p>
                                    </div>
                                    <div className="bg-white p-1 rounded-3 shadow-sm">
                                        <QRCodeCanvas value={qrLink} size={60} level={"H"} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="modal-footer border-top-0 p-4 pt-2 no-print flex-column gap-2">
                    <button className="btn brand-primary rounded-pill px-4 shadow-sm w-100 font-poppins" style={{ fontSize: '0.85rem' }} onClick={handlePrint} disabled={!config}>
                        Print Membership Card
                    </button>
                    <button className="btn btn-outline-primary rounded-pill px-4 shadow-sm w-100 font-poppins" style={{ fontSize: '0.85rem' }} onClick={handleDownloadPdf} disabled={isGeneratingPdf || !config}>
                        {isGeneratingPdf ? 'Generating...' : 'Download for Customer'}
                    </button>
                    <button className="btn btn-light rounded-pill px-4 shadow-sm w-100 font-poppins" style={{ fontSize: '0.85rem' }} onClick={onClose}>Close</button>
                </div>

                <style>
                    {`
                    @media print {
                        body * { display: none !important; }
                        .modal, #smc-card-content, #smc-card-content * {
                            display: block !important;
                            visibility: visible !important;
                        }
                        .modal {
                            background: none !important;
                            position: absolute !important;
                            top: 0; left: 0;
                            z-index: 9999 !important;
                        }
                        #smc-card-content {
                            border-radius: 0 !important;
                            box-shadow: none !important;
                            margin: 20px auto !important;
                        }
                    }
                    `}
                </style>
            </div>
        </AdminModalWrapper>
    );
};

export default SMCCardModal;
