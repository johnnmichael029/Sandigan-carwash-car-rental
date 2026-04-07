import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { QRCodeCanvas } from 'qrcode.react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { API_BASE, authHeaders } from '../../../api/config';
import sandiganLogo from '../../../assets/logo/sandigan-logo.png';
import AdminModalWrapper from '../../admin/shared/AdminModalWrapper';

const ReceiptModal = ({ booking, onClose }) => {
    const receiptRef = useRef();
    const [dynamicPricingData, setDynamicPricingData] = useState([]);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    // Fetch dynamic pricing data
    useEffect(() => {
        axios.get(`${API_BASE}/pricing`)
            .then(res => {
                if (res.data && res.data.dynamicPricing) {
                    setDynamicPricingData(res.data.dynamicPricing);
                }
            })
            .catch(err => console.error("Failed to fetch receipt pricing", err));
    }, []);

    const getServicePrice = (label) => {
        const activeVehicleData = dynamicPricingData.find(v => v.vehicleType === booking.vehicleType);
        if (!activeVehicleData) return null;
        const serv = activeVehicleData.services?.find(s => s.name === label);
        const add = activeVehicleData.addons?.find(a => a.name === label);
        if (serv) return serv.price;
        if (add) return add.price;
        return null;
    };

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadPdf = async () => {
        if (!receiptRef.current) return;
        setIsGeneratingPdf(true);
        try {
            const canvas = await html2canvas(receiptRef.current, {
                scale: 3, // Higher scale for crisp text on small prints
                logging: false,
                useCORS: true,
                backgroundColor: "#ffffff"
            });
            const imgData = canvas.toDataURL('image/png');

            // Set for 80mm thermal paper width
            const widthMm = 80;
            const heightMm = (canvas.height * widthMm) / canvas.width;

            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: [widthMm, heightMm]
            });

            pdf.addImage(imgData, 'PNG', 0, 0, widthMm, heightMm);
            pdf.save(`Sandigan-Receipt-${booking.batchId || booking._id.substring(0, 8)}.pdf`);
        } catch (err) {
            console.error("PDF generation failed:", err);
            Swal.fire('Error', 'Could not generate PDF.', 'error');
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const qrLink = "https://sandigan-carwash-carrental-akd8a6cde6hpg4cc.japaneast-01.azurewebsites.net";

    return (
        <AdminModalWrapper show={!!booking} onClose={onClose} dialogStyle={{ maxWidth: '400px' }} dialogClassName="no-print-dialog">
            <div className="modal-content rounded-4 shadow border-0 overflow-hidden bg-white">
                <div className="modal-header border-bottom-0 pb-0 pt-4 px-4 d-flex justify-content-between align-items-center no-print">
                    <h5 className="modal-title font-poppins fw-bold text-dark-secondary">Receipt Preview</h5>
                    <button type="button" className="btn-close shadow-none" onClick={onClose}></button>
                </div>

                <div className="modal-body p-0 pt-3">
                    {/* THE ACTUAL RECEIPT CONTAINER */}
                    <div id="receipt-content" ref={receiptRef} className="receipt-paper mx-auto p-4 bg-white" style={{ fontFamily: 'monospace', color: '#333' }}>
                        <div className="text-center mb-4">
                            <img src={sandiganLogo} alt="Logo" style={{ width: '80px', marginBottom: '10px', filter: 'grayscale(1)' }} />
                            <p className="mb-0 fw-bold" style={{ fontSize: '0.9rem' }}>Carwash & Car Rental</p>
                            <p className="mb-0 text-muted" style={{ fontSize: '0.65rem' }}>68 Ruhale st. Calzada Tipas Taguig City</p>
                            <p className="mb-0 text-muted" style={{ fontSize: '0.65rem' }}>+63 912 345 6789</p>
                        </div>

                        <div className="d-flex justify-content-between mb-2" style={{ borderTop: '1px dashed #ccc', paddingTop: '10px' }}>
                            <span style={{ fontSize: '0.75rem' }}>RECEIPT #: {booking.batchId}</span>
                            <span style={{ fontSize: '0.75rem' }}>{new Date().toLocaleDateString()}</span>
                        </div>

                        <div className="mb-3" style={{ borderBottom: '1px dashed #ccc', paddingBottom: '10px' }}>
                            <p className="mb-1" style={{ fontSize: '0.8rem' }}><strong>Customer:</strong> {booking.firstName} {booking.lastName}</p>
                            <p className="mb-1" style={{ fontSize: '0.8rem' }}><strong>Vehicle:</strong> {booking.vehicleType}</p>
                            <p className="mb-0" style={{ fontSize: '0.8rem' }}><strong>Detailer:</strong> {booking.detailer || 'Management'}</p>

                        </div>

                        <div className="mb-3">
                            <div className="d-flex justify-content-between fw-bold border-bottom pb-1 mb-2" style={{ fontSize: '0.8rem' }}>
                                <span>SERVICE</span>
                                <span>PRICE</span>
                            </div>
                            {booking.serviceType?.map((service, idx) => {
                                const price = getServicePrice(service);
                                return (
                                    <div key={idx} className="d-flex justify-content-between mb-1" style={{ fontSize: '0.75rem' }}>
                                        <span>{service}</span>
                                        <span>₱{price !== null ? price.toLocaleString() : '---'}</span>
                                    </div>
                                );
                            })}
                            {booking.purchasedProducts && booking.purchasedProducts.length > 0 && (
                                <>
                                    <div className="d-flex justify-content-between fw-bold border-bottom pb-1 mt-2 mb-2" style={{ fontSize: '0.8rem' }}>
                                        <span>RETAIL ITEMS</span>

                                    </div>
                                    {booking.purchasedProducts.map((prod, idx) => (
                                        <div key={idx} className="d-flex justify-content-between mb-1" style={{ fontSize: '0.75rem' }}>
                                            <span>{prod.productName} x{prod.quantity}</span>
                                            <span>₱{(prod.price * prod.quantity).toLocaleString()}</span>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>

                        <div className="pt-2 border-top" style={{ borderTop: '2px solid #333 !important' }}>
                            {booking.discountAmount > 0 && (
                                <div className="d-flex justify-content-between mb-1" style={{ fontSize: '0.8rem' }}>
                                    <span>SMC DISCOUNT</span>
                                    <span>-₱{booking.discountAmount.toLocaleString()}</span>
                                </div>
                            )}
                            {booking.promoDiscount > 0 && (
                                <div className="d-flex justify-content-between mb-1" style={{ fontSize: '0.8rem' }}>
                                    <span>PROMO DISCOUNT</span>
                                    <span>-₱{booking.promoDiscount.toLocaleString()}</span>
                                </div>
                            )}
                            <div className="d-flex justify-content-between fw-bold" style={{ fontSize: '1.1rem' }}>
                                <span>TOTAL</span>
                                <span>₱{booking.totalPrice?.toLocaleString()}</span>
                            </div>
                            <p className="text-center mt-2 text-uppercase fw-bold" style={{ fontSize: '0.8rem', letterSpacing: '4px', opacity: 0.8 }}>*** PAID ***</p>
                        </div>

                        <div className="text-center mt-4">
                            <div className="d-flex justify-content-center mb-2">
                                <QRCodeCanvas
                                    value={qrLink}
                                    size={90}
                                    level={"H"}
                                    includeMargin={true}
                                />
                            </div>
                            <p className="mb-1" style={{ fontSize: '0.70rem', fontWeight: 600 }}>SCAN TO VISIT US</p>
                            <p className="mb-0" style={{ fontSize: '0.6rem' }}>sandigan-carwash.com</p>
                        </div>

                        <div className="text-center mt-4 pt-3" style={{ borderTop: '1px dashed #ccc' }}>
                            <p className="mb-0" style={{ fontSize: '0.7rem' }}>THANK YOU FOR YOUR BUSINESS!</p>
                            <p className="mb-0" style={{ fontSize: '0.6rem', color: '#888' }}>Please come again soon</p>
                        </div>
                    </div>
                </div>

                <div className="modal-footer border-top-0 p-4 pt-2 no-print flex-column gap-2">
                    <button className="btn brand-primary rounded-pill px-4 shadow-sm w-100 font-poppins" style={{ fontSize: '0.85rem' }} onClick={handlePrint}>
                        <span className="me-2"></span> Print Receipt
                    </button>
                    <button className="btn btn-outline-success rounded-pill px-4 shadow-sm w-100 font-poppins" style={{ fontSize: '0.85rem' }} onClick={handleDownloadPdf} disabled={isGeneratingPdf}>
                        <span className="me-2"></span> {isGeneratingPdf ? 'Generating PDF...' : 'Download as PDF'}
                    </button>
                    <button className="btn btn-light rounded-pill px-4 shadow-sm w-100 font-poppins" style={{ fontSize: '0.85rem' }} onClick={onClose}>Close</button>
                </div>

                {/* Print-only CSS injection */}
                <style>
                    {`
                    @media print {
                        @page {
                            margin: 0;
                            size: auto;
                        }
                        body * {
                            display: none !important;
                        }
                        .modal, .modal div, #receipt-content, #receipt-content * {
                            display: block !important;
                            visibility: visible !important;
                        }
                        .modal {
                            background: none !important;
                            position: absolute !important;
                            top: 0 !important;
                            left: 0 !important;
                            width: 100% !important;
                            height: auto !important;
                            z-index: 9999 !important;
                        }
                        .modal-dialog {
                            margin: 0 !important;
                            padding: 0 !important;
                            max-width: 100% !important;
                        }
                        .modal-content {
                            border: none !important;
                            box-shadow: none !important;
                        }
                        .no-print {
                            display: none !important;
                        }
                        #receipt-content {
                            width: 100% !important;
                            max-width: 80mm !important; /* Standard thermal receipt width */
                            margin: 0 auto !important;
                            padding: 10mm !important;
                            box-shadow: none !important;
                            border: none !important;
                        }
                    }
                    `}
                </style>
            </div>
        </AdminModalWrapper>
    );
};

export default ReceiptModal;
