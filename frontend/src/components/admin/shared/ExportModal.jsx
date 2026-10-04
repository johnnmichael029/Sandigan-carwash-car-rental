import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import axios from 'axios';
import { API_BASE, authHeaders } from '../../../api/config';
import AdminModalWrapper from './AdminModalWrapper';

const DATE_PRESETS = [
    { id: 'all', label: 'All Time' },
    { id: 'today', label: 'Today' },
    { id: 'this_week', label: 'This Week' },
    { id: 'this_month', label: 'This Month' },
    { id: 'last_month', label: 'Last Month' },
    { id: 'this_year', label: 'This Year' },
    { id: 'custom', label: 'Custom Range' },
];

const ExportModal = ({ show, onClose, datasetKey = null, title = 'Export Report', departmentKey = null }) => {
    const [format, setFormat] = useState('xlsx');
    const [preset, setPreset] = useState('all');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [loading, setLoading] = useState(false);

    // Multi-dataset state (used if datasetKey is null)
    const [availableDepts, setAvailableDepts] = useState([]);
    const [selectedKeys, setSelectedKeys] = useState([]);
    const [multiFormat, setMultiFormat] = useState('xlsx');

    // Fetch available datasets when opening multi mode
    useEffect(() => {
        if (show && !datasetKey) {
            axios.get(`${API_BASE}/exports/datasets`, { headers: authHeaders(), withCredentials: true })
                .then(res => {
                    const depts = res.data.departments || [];
                    setAvailableDepts(depts);
                    // Select all by default or filter by departmentKey if provided
                    if (departmentKey) {
                        const targetDept = depts.find(d => d.departmentKey === departmentKey);
                        if (targetDept) {
                            setSelectedKeys(targetDept.datasets.map(d => d.key));
                        }
                    } else {
                        const allKeys = depts.flatMap(d => d.datasets.map(item => item.key));
                        setSelectedKeys(allKeys);
                    }
                })
                .catch(err => {
                    console.error('Failed to load export datasets:', err);
                });
        }
    }, [show, datasetKey, departmentKey]);

    // Compute from/to date based on preset
    useEffect(() => {
        if (preset === 'custom' || preset === 'all') return;

        const now = new Date();
        let start = new Date();
        let end = new Date();

        if (preset === 'today') {
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
        } else if (preset === 'this_week') {
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
            start = new Date(now.setDate(diff));
            start.setHours(0, 0, 0, 0);
            end = new Date();
        } else if (preset === 'this_month') {
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date();
        } else if (preset === 'last_month') {
            start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        } else if (preset === 'this_year') {
            start = new Date(now.getFullYear(), 0, 1);
            end = new Date();
        }

        setFromDate(start.toISOString().slice(0, 10));
        setToDate(end.toISOString().slice(0, 10));
    }, [preset]);

    const handleSingleExport = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ format });
            if (preset !== 'all') {
                if (fromDate) params.append('from', fromDate);
                if (toDate) params.append('to', toDate);
            }

            const response = await axios.get(`${API_BASE}/exports/${datasetKey}?${params.toString()}`, {
                headers: authHeaders(),
                responseType: 'blob',
                withCredentials: true
            });

            // Trigger download
            const blob = new Blob([response.data], { type: response.headers['content-type'] });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const contentDisposition = response.headers['content-disposition'];
            let fname = `${datasetKey}_export.${format}`;
            if (contentDisposition) {
                const match = contentDisposition.match(/filename="?([^"]+)"?/);
                if (match) fname = match[1];
            }
            link.setAttribute('download', fname);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            Swal.fire({
                icon: 'success',
                title: 'Export Downloaded!',
                text: `${title} has been exported successfully.`,
                timer: 2000,
                showConfirmButton: false
            });
            onClose();
        } catch (err) {
            console.error('Export failed:', err);
            let msg = 'Failed to generate export file.';
            if (err.response?.data instanceof Blob) {
                try {
                    const text = await err.response.data.text();
                    const json = JSON.parse(text);
                    if (json.error) msg = json.error;
                } catch (e) { }
            } else if (err.response?.data?.error) {
                msg = err.response.data.error;
            }
            Swal.fire('Export Failed', msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleMultiExport = async () => {
        if (selectedKeys.length === 0) {
            Swal.fire('No Datasets Selected', 'Please select at least one dataset to export.', 'warning');
            return;
        }

        setLoading(true);
        try {
            const body = {
                datasetKeys: selectedKeys,
                format: multiFormat,
                from: preset !== 'all' && fromDate ? fromDate : undefined,
                to: preset !== 'all' && toDate ? toDate : undefined,
            };

            const response = await axios.post(`${API_BASE}/exports/multi`, body, {
                headers: authHeaders(),
                responseType: 'blob',
                withCredentials: true
            });

            const blob = new Blob([response.data], { type: response.headers['content-type'] });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const contentDisposition = response.headers['content-disposition'];
            let fname = `sandigan_report.${multiFormat === 'zip' ? 'zip' : 'xlsx'}`;
            if (contentDisposition) {
                const match = contentDisposition.match(/filename="?([^"]+)"?/);
                if (match) fname = match[1];
            }
            link.setAttribute('download', fname);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            Swal.fire({
                icon: 'success',
                title: 'Report Downloaded!',
                background: 'var(--theme-card-bg)', color: 'var(--theme-content-text)',
                text: `Exported ${selectedKeys.length} dataset(s) successfully.`,
                timer: 2000,
                showConfirmButton: false
            });
            onClose();
        } catch (err) {
            console.error('Multi export failed:', err);
            let msg = 'Failed to generate report package.';
            if (err.response?.data instanceof Blob) {
                try {
                    const text = await err.response.data.text();
                    const json = JSON.parse(text);
                    if (json.error) msg = json.error;
                } catch (e) { }
            } else if (err.response?.data?.error) {
                msg = err.response.data.error;
            }
            Swal.fire('Export Failed', msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    const toggleSelectKey = (key) => {
        setSelectedKeys(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
    };

    const selectAllDepts = () => {
        const all = availableDepts.flatMap(d => d.datasets.map(i => i.key));
        setSelectedKeys(all);
    };

    const deselectAllDepts = () => {
        setSelectedKeys([]);
    };

    return (
        <AdminModalWrapper show={show} onClose={onClose} size={datasetKey ? 'md' : 'lg'}>
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden" style={{ background: 'var(--theme-card-bg)', color: 'var(--theme-content-text)' }}>
                {/* Modal Header */}
                <div className="p-4 border-bottom d-flex align-items-center justify-content-between" style={{ borderColor: 'var(--theme-content-border)', background: 'var(--theme-card-header-bg)' }}>
                    <div className="d-flex align-items-center gap-3">
                        <div className="rounded-3 p-2 d-flex align-items-center justify-content-center text-white" style={{ background: 'linear-gradient(135deg, #23A0CE, #0284c7)', width: 42, height: 42 }}>
                            <i className="bi bi-file-earmark-arrow-down-fill fs-5"></i>
                        </div>
                        <div>
                            <h5 className="fw-bold mb-0 font-poppins">{datasetKey ? `Export: ${title}` : 'Multi-Department Data Export'}</h5>
                            <small className="text-muted" style={{ fontSize: '0.78rem' }}>
                                {datasetKey ? 'Download report in your preferred file format' : 'Select datasets to build a combined workbook or ZIP file'}
                            </small>
                        </div>
                    </div>
                    <button type="button" className="btn-close" onClick={onClose} disabled={loading}></button>
                </div>

                {/* Modal Body */}
                <div className="p-4">
                    {/* SINGLE DATASET MODE */}
                    {datasetKey ? (
                        <div>
                            {/* Format Selector */}
                            <label className="form-label fw-bold small text-muted text-uppercase mb-2" style={{ letterSpacing: '0.5px' }}>
                                1. Select File Format
                            </label>
                            <div className="row g-2 mb-4">
                                {[
                                    { id: 'xlsx', label: 'Excel (.xlsx)', icon: 'bi-file-earmark-excel-fill', color: '#16a34a', desc: 'Formatted table with peso styles' },
                                    { id: 'csv', label: 'CSV (.csv)', icon: 'bi-file-earmark-code-fill', color: '#0284c7', desc: 'Raw data for spreadsheets/software' },
                                    { id: 'pdf', label: 'PDF Document', icon: 'bi-file-earmark-pdf-fill', color: '#dc2626', desc: 'Printable report document' },
                                ].map(item => (
                                    <div className="col-4" key={item.id}>
                                        <div
                                            onClick={() => setFormat(item.id)}
                                            className={`p-3 rounded-3 text-center transition-all cursor-pointer border h-100 ${format === item.id ? 'shadow-sm' : ''}`}
                                            style={{
                                                background: format === item.id ? `${item.color}15` : 'var(--theme-input-bg)',
                                                borderColor: format === item.id ? item.color : 'var(--theme-content-border)',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <i className={`bi ${item.icon} fs-3 d-block mb-1`} style={{ color: item.color }}></i>
                                            <span className="fw-bold d-block" style={{ fontSize: '0.85rem', color: 'var(--theme-content-text)' }}>{item.label}</span>
                                            <small className="text-muted d-none d-md-block" style={{ fontSize: '0.7rem' }}>{item.desc}</small>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Date Filter */}
                            <label className="form-label fw-bold small text-muted text-uppercase mb-2" style={{ letterSpacing: '0.5px' }}>
                                2. Select Date Range Filter
                            </label>
                            <div className="d-flex flex-wrap gap-2 mb-3">
                                {DATE_PRESETS.map(p => (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => setPreset(p.id)}
                                        className={`btn btn-sm rounded-pill px-3 py-1 fw-semibold ${preset === p.id ? 'btn-save text-white shadow-sm' : 'btn-light border'}`}
                                        style={{ fontSize: '0.78rem' }}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>

                            {preset === 'custom' && (
                                <div className="row g-2 mb-3 p-3 rounded-3 border" style={{ backgroundColor: 'var(--theme-input-bg)', borderColor: 'var(--theme-content-border)' }}>
                                    <div className="col-6">
                                        <label className="form-label small text-muted mb-1">From Date</label>
                                        <input type="date" className="form-control form-control-sm" value={fromDate} onChange={e => setFromDate(e.target.value)} />
                                    </div>
                                    <div className="col-6">
                                        <label className="form-label small text-muted mb-1">To Date</label>
                                        <input type="date" className="form-control form-control-sm" value={toDate} onChange={e => setToDate(e.target.value)} />
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* MULTI DATASET MODE (DASHBOARD) */
                        <div>
                            {/* Format & Presets top bar */}
                            <div className="row g-3 mb-4 align-items-center">
                                <div className="col-12 col-md-6">
                                    <label className="form-label fw-bold small text-muted text-uppercase mb-2" style={{ letterSpacing: '0.5px' }}>
                                        Package Format
                                    </label>
                                    <div className="btn-group w-100 shadow-sm">
                                        <button
                                            type="button"
                                            onClick={() => setMultiFormat('xlsx')}
                                            className={`btn btn-sm py-2 text-capitalize fw-bold ${multiFormat === 'xlsx' ? 'btn-success text-white' : 'btn-light border'}`}
                                        >
                                            <i className="bi bi-file-earmark-excel-fill me-1"></i> Multi-Sheet Excel (.xlsx)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setMultiFormat('zip')}
                                            className={`btn btn-sm py-2 text-capitalize fw-bold ${multiFormat === 'zip' ? 'btn-primary text-white' : 'btn-light border'}`}
                                        >
                                            <i className="bi bi-file-earmark-zip-fill me-1"></i> ZIP of CSV Files
                                        </button>
                                    </div>
                                </div>

                                <div className="col-12 col-md-6">
                                    <label className="form-label fw-bold small text-muted text-uppercase mb-2" style={{ letterSpacing: '0.5px' }}>
                                        Date Filter
                                    </label>
                                    <select
                                        className="form-select form-select-sm"
                                        value={preset}
                                        onChange={e => setPreset(e.target.value)}
                                        style={{
                                            backgroundColor: 'var(--theme-input-bg)',
                                            color: 'var(--theme-content-text)',
                                            borderColor: 'var(--theme-content-border)'
                                        }}
                                    >
                                        {DATE_PRESETS.map(p => (
                                            <option key={p.id} value={p.id}>{p.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Dataset Checkbox List by Department */}
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <label className="form-label fw-bold small text-muted text-uppercase mb-0" style={{ letterSpacing: '0.5px' }}>
                                    Select Datasets to Include ({selectedKeys.length} Selected)
                                </label>
                                <div className="d-flex gap-2">
                                    <button type="button" className="btn btn-link btn-sm p-0 text-decoration-none text-accent fw-semibold" onClick={selectAllDepts} style={{ fontSize: '0.78rem' }}>Select All</button>
                                    <span className="text-muted">|</span>
                                    <button type="button" className="btn btn-link btn-sm p-0 text-decoration-none text-danger fw-semibold" onClick={deselectAllDepts} style={{ fontSize: '0.78rem' }}>Deselect All</button>
                                </div>
                            </div>

                            <div className="rounded-3 border p-3" style={{ maxHeight: 300, overflowY: 'auto', backgroundColor: 'var(--theme-input-bg)', borderColor: 'var(--theme-content-border)', color: 'var(--theme-content-text)' }}>
                                {availableDepts.length === 0 ? (
                                    <p className="text-muted text-center py-4 mb-0">Loading available export permissions...</p>
                                ) : availableDepts.map(dept => (
                                    <div key={dept.departmentKey} className="mb-3">
                                        <div className="fw-bold font-poppins small mb-2 border-bottom pb-1" style={{ fontSize: '0.8rem', color: '#23A0CE', borderColor: 'var(--theme-content-border)' }}>
                                            {dept.departmentLabel} {dept.adminOnly && <span className="badge bg-warning text-dark ms-1" style={{ fontSize: '0.65rem' }}>Admin Only</span>}
                                        </div>
                                        <div className="row g-2">
                                            {dept.datasets.map(ds => {
                                                const isChecked = selectedKeys.includes(ds.key);
                                                return (
                                                    <div className="col-12 col-md-6" key={ds.key}>
                                                        <label className="d-flex align-items-center gap-2 p-2 rounded-2 cursor-pointer border transition-all" style={{
                                                            backgroundColor: isChecked ? 'rgba(35,160,206,0.12)' : 'var(--theme-card-bg)',
                                                            borderColor: isChecked ? '#23A0CE' : 'var(--theme-content-border)',
                                                            color: 'var(--theme-content-text)',
                                                            fontSize: '0.82rem'
                                                        }}>
                                                            <input
                                                                type="checkbox"
                                                                className="form-check-input mt-0"
                                                                checked={isChecked}
                                                                onChange={() => toggleSelectKey(ds.key)}
                                                                style={{ cursor: 'pointer' }}
                                                            />
                                                            <span className="fw-semibold font-poppins" style={{ color: 'var(--theme-content-text)' }}>{ds.label}</span>
                                                        </label>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="p-3 border-top d-flex align-items-center justify-content-between" style={{ borderColor: 'var(--theme-content-border)', background: 'var(--theme-card-header-bg)' }}>
                    <button type="button" className="btn btn-light border px-4 rounded-3" onClick={onClose} disabled={loading}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="btn btn-save text-white px-4 rounded-3 fw-bold d-flex align-items-center gap-2 shadow-sm"
                        onClick={datasetKey ? handleSingleExport : handleMultiExport}
                        disabled={loading || (!datasetKey && selectedKeys.length === 0)}
                    >
                        {loading ? (
                            <>
                                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                Generating File...
                            </>
                        ) : (
                            <>
                                <i className="bi bi-download"></i>
                                {datasetKey ? `Download ${format.toUpperCase()}` : `Export ${selectedKeys.length} Datasets`}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </AdminModalWrapper>
    );
};

export default ExportModal;
