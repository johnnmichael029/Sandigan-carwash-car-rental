/**
 * AccessDenied — Shown when a department_staff user navigates to a tab
 * they don't have 'read' permission for.
 */
const AccessDenied = ({ department, onGoBack }) => {
    return (
        <div
            className="d-flex flex-column align-items-center justify-content-center text-center"
            style={{ minHeight: '60vh', padding: '3rem' }}
        >
            {/* Shield icon */}
            <div style={{
                width: 96, height: 96, borderRadius: 28,
                background: 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(239,68,68,0.06))',
                border: '1px solid rgba(239,68,68,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '2.8rem', marginBottom: '1.5rem',
                boxShadow: '0 8px 32px rgba(239,68,68,0.08)'
            }}>
                🔒
            </div>

            <h3 style={{
                fontWeight: 800, fontSize: '1.4rem',
                color: 'var(--theme-content-text)', marginBottom: '0.5rem'
            }}>
                Access Restricted
            </h3>

            <p style={{
                color: 'var(--theme-muted-text)', fontSize: '0.9rem',
                maxWidth: 360, lineHeight: 1.7, marginBottom: '2rem'
            }}>
                You don't have permission to view the{' '}
                <strong style={{ color: 'var(--theme-content-text)' }}>{department}</strong>{' '}
                module. Please contact your Super Admin if you need access.
            </p>

            <div className="d-flex gap-2">
                <button
                    className="btn btn-sm rounded-3 fw-semibold"
                    style={{
                        padding: '9px 22px',
                        background: 'rgba(35,160,206,0.1)',
                        color: '#23A0CE',
                        border: '1px solid rgba(35,160,206,0.25)',
                        fontSize: '0.85rem'
                    }}
                    onClick={onGoBack}
                >
                    ← Go to Dashboard
                </button>
            </div>
        </div>
    );
};

export default AccessDenied;
