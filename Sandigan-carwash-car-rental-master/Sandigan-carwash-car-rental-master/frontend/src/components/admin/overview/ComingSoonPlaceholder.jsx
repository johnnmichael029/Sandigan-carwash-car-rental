const ModulePlaceholder = ({ title, icon, description }) => (
    <div>
        <div className="border-bottom pb-3 mb-4">
            <h4 className="mb-0 font-poppins text-dark-secondary" style={{ fontWeight: 700 }}>{title}</h4>
            <p className="mb-0 text-dark-gray400 font-poppins" style={{ fontSize: '0.85rem' }}>Enterprise Management Module</p>
        </div>
        <div
            className="rounded-4 p-5 text-center d-flex flex-column align-items-center justify-content-center"
            style={{
                minHeight: '400px',
                background: '#fff',
                border: '2px dashed rgba(35,160,206,0.3)',
                boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
            }}
        >
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>{icon}</div>
            <h5 className="fw-bold text-dark-secondary font-poppins mb-2">{title}</h5>
            <p className="text-muted font-poppins mb-4" style={{ maxWidth: '400px' }}>{description}</p>
            <span
                className="badge rounded-pill px-4 py-2 font-poppins"
                style={{ background: 'rgba(35,160,206,0.1)', color: '#23A0CE', fontSize: '0.85rem', fontWeight: 600 }}
            >
                Phase 2 — In Development
            </span>
        </div>
    </div>
);

export default ModulePlaceholder;