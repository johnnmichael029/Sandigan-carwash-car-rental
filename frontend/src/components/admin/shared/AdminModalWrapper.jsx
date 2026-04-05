import React, { useEffect, useRef } from 'react';

const AdminModalWrapper = ({ 
    show, 
    onClose, 
    children, 
    size = 'md', // sm, md, lg, xl
    animation = 'animate-fade-in',
    dialogClassName = '',
    dialogStyle = {}
}) => {
    const modalRef = useRef(null);

    // ESC to close
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && show) {
                onClose();
            }
        };
        if (show) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [show, onClose]);

    // Scroll Lock
    useEffect(() => {
        if (show) {
            // Keep original to restore it
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => { document.body.style.overflow = originalOverflow; };
        }
    }, [show]);

    // Focus Trap - Initialize focus
    useEffect(() => {
        if (show && modalRef.current) {
            const focusableElements = modalRef.current.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            if (focusableElements.length > 0) {
                setTimeout(() => focusableElements[0].focus(), 50);
            }
        }
    }, [show]);

    const handleTabKey = (e) => {
        if (e.key !== 'Tab' || !modalRef.current) return;
        
        const focusableElements = modalRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) { // Shift + Tab
            if (document.activeElement === firstElement) {
                lastElement.focus();
                e.preventDefault();
            }
        } else { // Tab
            if (document.activeElement === lastElement) {
                firstElement.focus();
                e.preventDefault();
            }
        }
    };

    const handleBackdropClick = (e) => {
        // If the user directly clicked the backdrop (and not something inside the modal content)
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    if (!show) return null;

    let sizeClass = 'modal-dialog-centered';
    if (size === 'sm') sizeClass += ' modal-sm';
    if (size === 'lg') sizeClass += ' modal-lg';
    if (size === 'xl') sizeClass += ' modal-xl';

    return (
        <div 
            className={`modal show d-block ${animation}`} 
            style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1055, overflowY: 'auto' }}
            onMouseDown={handleBackdropClick} 
            onKeyDown={handleTabKey}
        >
            <div className={`modal-dialog ${sizeClass} ${dialogClassName}`} style={dialogStyle} ref={modalRef}>
                {children}
            </div>
        </div>
    );
};

export default AdminModalWrapper;
