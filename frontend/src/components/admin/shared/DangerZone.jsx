import { useState, useCallback } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { API_BASE, authHeaders } from '../../../api/config';

// ── Helper: fetch CSRF token ──────────────────────────────────────────────────
async function getCsrfToken() {
    try {
        const res = await axios.get(`${API_BASE}/csrf-token`, { withCredentials: true });
        return res.data.csrfToken;
    } catch {
        return null;
    }
}

// ── Stat card component ───────────────────────────────────────────────────────
const StatCard = ({ label, count, color }) => (
    <div
        className="rounded-3 p-3 d-flex justify-content-between align-items-center"
        style={{
            background: 'var(--theme-input-bg)',
            border: '1px solid var(--theme-content-border)',
        }}
    >
        <span style={{ fontSize: '0.8rem', color: 'var(--theme-content-text-secondary)', fontWeight: 500 }}>
            {label}
        </span>
        <span
            className="fw-bold rounded-pill px-2 py-1"
            style={{ fontSize: '0.75rem', background: color + '22', color, whiteSpace: 'nowrap' }}
        >
            {typeof count === 'number' ? count.toLocaleString() : count}
        </span>
    </div>
);

// ── Action card component ─────────────────────────────────────────────────────
const ActionCard = ({ icon, title, subtitle, subtitleColor, description, bullets, btnLabel, btnStyle, onAction, disabled }) => (
    <div
        className="rounded-4 p-4 h-100 d-flex flex-column"
        style={{
            background: 'var(--theme-card-bg)',
            border: `1px solid var(--theme-content-border)`,
            transition: 'border-color 0.2s ease',
        }}
    >
        <div className="d-flex align-items-center gap-3 mb-3">
            <div
                className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                style={{
                    width: 44, height: 44,
                    background: btnStyle.iconBg,
                    border: `1px solid ${btnStyle.iconBorder}`,
                    fontSize: '1.25rem',
                }}
            >
                {icon}
            </div>
            <div>
                <h6 className="mb-0 fw-bold" style={{ color: btnStyle.titleColor || 'var(--theme-content-text)' }}>
                    {title}
                </h6>
                <small style={{ color: subtitleColor || 'var(--theme-content-text-secondary)' }}>{subtitle}</small>
            </div>
        </div>

        <p className="flex-grow-1" style={{ fontSize: '0.83rem', color: 'var(--theme-content-text-secondary)', lineHeight: 1.65 }}>
            {description}
        </p>

        <ul style={{ fontSize: '0.8rem', color: 'var(--theme-content-text-secondary)', paddingLeft: '1.2rem', marginBottom: '1.25rem', lineHeight: 1.8 }}>
            {bullets.map((b, i) => (
                <li key={i} style={b.color ? { color: b.color } : {}}>{b.text}</li>
            ))}
        </ul>

        <button
            className="btn fw-semibold rounded-3 w-100"
            onClick={onAction}
            disabled={disabled}
            style={{
                background: btnStyle.bg,
                color: '#fff',
                border: 'none',
                padding: '10px',
                fontSize: '0.88rem',
                boxShadow: btnStyle.shadow,
                opacity: disabled ? 0.7 : 1,
                transition: 'opacity 0.2s',
            }}
        >
            {btnLabel}
        </button>
    </div>
);

// ── Main DangerZone Component ─────────────────────────────────────────────────
const DangerZone = () => {
    const [stats, setStats] = useState(null);
    const [loadingStats, setLoadingStats] = useState(false);
    const [isWiping, setIsWiping] = useState(false);
    const [isBackingUp, setIsBackingUp] = useState(false);

    const loadStats = useCallback(async () => {
        setLoadingStats(true);
        try {
            const res = await axios.get(`${API_BASE}/danger-zone/stats`, {
                headers: authHeaders(),
                withCredentials: true,
            });
            setStats(res.data);
        } catch (err) {
            Swal.fire('Error', err.response?.data?.error || 'Failed to load system stats.', 'error');
        } finally {
            setLoadingStats(false);
        }
    }, []);

    // ── Wipe handler ───────────────────────────────────────────────────────────
    const handleWipe = async (scope) => {
        const isFullWipe = scope === 'full';
        const phrase = isFullWipe ? 'DELETE EVERYTHING' : 'DELETE ALL DATA';

        const step1 = await Swal.fire({
            title: isFullWipe ? '🚨 Full System Wipe' : '⚠️ Wipe Operational Data',
            html: `
                <div style="text-align:left;font-size:0.9rem;line-height:1.7;">
                    <p style="color:#ef4444;font-weight:600;">This action is <u>irreversible</u>. Deleted data cannot be recovered.</p>
                    ${isFullWipe
                    ? `<p style="color:var(--theme-content-text,#111);">This will delete <strong>ALL data</strong> including user accounts, system settings, pricing, fleet, and all operational records.</p>`
                    : `<p style="color:var(--theme-content-text,#111);">Deletes all operational records — bookings, transactions, employees, inventory, customers, audit logs — while keeping user accounts and settings.</p>`
                }
                    <p style="color:var(--theme-content-text,#111);">Type exactly to confirm: <code style="background:rgba(239,68,68,0.12);color:#ef4444;padding:2px 8px;border-radius:4px;font-size:0.85rem;">${phrase}</code></p>
                    <input id="swal-confirm-phrase" class="swal2-input mt-1" placeholder="${phrase}" style="font-family:monospace;font-size:0.85rem;" />
                </div>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: isFullWipe ? '🚨 Wipe Everything' : '🗑️ Wipe Data',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            background: 'var(--theme-modal-bg)',
            color: 'var(--theme-content-text)',
            focusConfirm: false,
            preConfirm: () => {
                const val = document.getElementById('swal-confirm-phrase')?.value?.trim();
                if (val !== phrase) {
                    Swal.showValidationMessage(`Please type exactly: "${phrase}"`);
                    return false;
                }
                return val;
            },
        });

        if (!step1.isConfirmed) return;

        const step2 = await Swal.fire({
            title: 'Are you absolutely sure?',
            text: 'This is your last chance. All selected data will be permanently deleted.',
            icon: 'error',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'No, go back',
            confirmButtonColor: '#ef4444',
            background: 'var(--theme-modal-bg)',
            color: 'var(--theme-content-text)',
        });

        if (!step2.isConfirmed) return;

        setIsWiping(true);
        try {
            const csrf = await getCsrfToken();
            const res = await axios.post(
                `${API_BASE}/danger-zone/wipe`,
                { scope, confirmPhrase: step1.value },
                { headers: { ...authHeaders(), 'X-CSRF-Token': csrf }, withCredentials: true }
            );
            Swal.fire({
                title: '✅ Wipe Complete',
                html: `<p style="color:var(--theme-content-text,#111)">${res.data.message}</p><p style="font-size:0.85rem;color:var(--theme-content-text-secondary,#666)">Total records deleted: <strong>${res.data.totalDeleted?.toLocaleString()}</strong></p>`,
                icon: 'success',
                confirmButtonColor: '#22c55e',
                background: 'var(--theme-modal-bg)',
                color: 'var(--theme-content-text)',
            });
            setStats(null);
        } catch (err) {
            Swal.fire('Wipe Failed', err.response?.data?.error || 'An error occurred.', 'error');
        } finally {
            setIsWiping(false);
        }
    };

    // ── Backup handler ────────────────────────────────────────────────────────
    const handleBackup = async () => {
        const confirm = await Swal.fire({
            title: '💾 Download Full Backup',
            html: `
                <div style="text-align:left;font-size:0.9rem;line-height:1.7;">
                    <p style="color:var(--theme-content-text,#111);">A complete JSON backup of all database collections will be downloaded as a <strong>.zip</strong> file.</p>
                    <p style="color:#f59e0b;font-weight:500;">⚠️ The backup may contain sensitive data. Store it securely.</p>
                </div>`,
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: '💾 Download Backup',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#23A0CE',
            background: 'var(--theme-modal-bg)',
            color: 'var(--theme-content-text)',
        });

        if (!confirm.isConfirmed) return;

        setIsBackingUp(true);
        try {
            const csrf = await getCsrfToken();
            const response = await fetch(`${API_BASE}/danger-zone/backup`, {
                method: 'GET',
                headers: { ...authHeaders(), 'X-CSRF-Token': csrf || '' },
                credentials: 'include',
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || `Server error ${response.status}`);
            }

            const blob = await response.blob();
            const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `sandigan_backup_${timestamp}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            Swal.fire({
                title: 'Backup Downloaded',
                text: 'Your backup has been saved. Store it in a secure location.',
                icon: 'success',
                confirmButtonColor: '#22c55e',
                background: 'var(--theme-modal-bg)',
                color: 'var(--theme-content-text)',
            });
        } catch (err) {
            Swal.fire('Backup Failed', err.message || 'An error occurred during backup.', 'error');
        } finally {
            setIsBackingUp(false);
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="px-1 py-2">

            {/* ── Warning Banner ── */}
            <div
                className="rounded-4 p-4 mb-4 d-flex align-items-start gap-3"
                style={{
                    background: 'linear-gradient(135deg, rgba(239,68,68,0.12) 0%, rgba(239,68,68,0.06) 100%)',
                    border: '1px solid rgba(239,68,68,0.3)',
                }}
            >
                <div
                    className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{
                        width: 48, height: 48,
                        background: 'rgba(239,68,68,0.15)',
                        border: '1px solid rgba(239,68,68,0.3)',
                        fontSize: '1.4rem',
                    }}
                >
                    ⚠️
                </div>
                <div>
                    <h5 className="mb-1 fw-bold" style={{ color: '#ef4444' }}>
                        Danger Zone
                    </h5>
                    <p className="mb-0" style={{ color: 'var(--theme-content-text-secondary)', fontSize: '0.85rem', lineHeight: 1.6 }}>
                        These actions are <strong style={{ color: '#ef4444' }}>permanent and irreversible</strong>.
                        Proceed with extreme caution. All critical actions are recorded in the audit log.
                        Only Super Administrators can access this section.
                    </p>
                </div>
            </div>

            {/* ── System Stats Panel ── */}
            <div
                className="rounded-4 p-4 mb-4"
                style={{
                    background: 'var(--theme-card-bg)',
                    border: '1px solid var(--theme-content-border)',
                }}
            >
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                        <h6 className="fw-bold mb-0" style={{ color: 'var(--theme-content-text)' }}>
                            📊 System Record Counts
                        </h6>
                        <p className="mb-0" style={{ fontSize: '0.78rem', color: 'var(--theme-content-text-secondary)' }}>
                            Review current data before performing any destructive action.
                        </p>
                    </div>
                    <button
                        className="btn btn-sm rounded-3 fw-semibold"
                        onClick={loadStats}
                        disabled={loadingStats}
                        style={{
                            background: 'var(--theme-input-bg)',
                            border: '1px solid var(--theme-content-border)',
                            color: 'var(--theme-content-text)',
                            fontSize: '0.8rem',
                            padding: '6px 16px',
                        }}
                    >
                        {loadingStats ? '⏳ Loading...' : '🔍 Check Stats'}
                    </button>
                </div>

                {stats ? (
                    <>
                        {/* Total count highlight */}
                        <div
                            className="rounded-3 p-3 mb-3 text-center"
                            style={{
                                background: 'rgba(239,68,68,0.08)',
                                border: '1px solid rgba(239,68,68,0.18)',
                            }}
                        >
                            <span style={{ fontSize: '2rem', fontWeight: 800, color: '#ef4444' }}>
                                {stats.total?.toLocaleString()}
                            </span>
                            <p className="mb-0 mt-1" style={{ fontSize: '0.8rem', color: 'var(--theme-content-text-secondary)' }}>
                                Total records in database
                            </p>
                        </div>
                        <div className="row g-2">
                            {Object.entries(stats.stats || {})
                                .sort(([, a], [, b]) => b - a)
                                .map(([col, count]) => (
                                    <div key={col} className="col-6 col-md-4 col-lg-3">
                                        <StatCard
                                            label={col}
                                            count={count}
                                            color={count > 1000 ? '#ef4444' : count > 100 ? '#f59e0b' : '#22c55e'}
                                        />
                                    </div>
                                ))}
                        </div>
                    </>
                ) : (
                    <div
                        className="rounded-3 p-4 text-center"
                        style={{
                            background: 'var(--theme-input-bg)',
                            border: '1px dashed var(--theme-content-border)',
                        }}
                    >
                        <p className="mb-0" style={{ color: 'var(--theme-content-text-secondary)', fontSize: '0.85rem' }}>
                            Click "Check Stats" to see current record counts before any action.
                        </p>
                    </div>
                )}
            </div>

            {/* ── Action Cards Row ── */}
            <div className="row g-4">

                {/* Backup */}
                <div className="col-12 col-lg-4">
                    <ActionCard
                        icon="💾"
                        title="Backup Data"
                        subtitle="Full system JSON snapshot"
                        description="Downloads a complete backup of all database collections as a ZIP file. Recommended before performing any wipe."
                        bullets={[
                            { text: 'All collections as JSON files' },
                            { text: 'Collection manifest included' },
                            { text: 'Audit logged automatically' },
                        ]}
                        btnLabel={isBackingUp ? '⏳ Preparing Backup...' : '💾 Download Backup'}
                        btnStyle={{
                            bg: '#23A0CE',
                            shadow: '0 4px 14px rgba(35,160,206,0.2)',
                            iconBg: 'rgba(35,160,206,0.12)',
                            iconBorder: 'rgba(35,160,206,0.3)',
                            titleColor: 'var(--theme-content-text)',
                        }}
                        onAction={handleBackup}
                        disabled={isBackingUp}
                    />
                </div>

                {/* Wipe Operational */}
                <div className="col-12 col-lg-4">
                    <ActionCard
                        icon="🗑️"
                        title="Wipe Operational Data"
                        subtitle="Keeps users & settings"
                        subtitleColor="#f59e0b"
                        description="Permanently deletes all operational records — bookings, transactions, employees, inventory, CRM, audit logs — while preserving user accounts and system configuration."
                        bullets={[
                            { text: 'Bookings, rentals, revenues' },
                            { text: 'Employees, payroll, attendance' },
                            { text: 'Inventory, CRM, audit logs' },
                            { text: '✓ User accounts preserved', color: '#22c55e' },
                            { text: '✓ Settings preserved', color: '#22c55e' },
                        ]}
                        btnLabel={isWiping ? '⏳ Processing...' : '🗑️ Wipe Operational Data'}
                        btnStyle={{
                            bg: '#f59e0b',
                            shadow: '0 4px 14px rgba(245,158,11,0.2)',
                            iconBg: 'rgba(245,158,11,0.12)',
                            iconBorder: 'rgba(245,158,11,0.3)',
                            titleColor: 'var(--theme-content-text)',
                        }}
                        onAction={() => handleWipe('operational')}
                        disabled={isWiping}
                    />
                </div>

                {/* Full Reset */}
                <div className="col-12 col-lg-4">
                    <ActionCard
                        icon="🚨"
                        title="Full System Reset"
                        subtitle="Wipes everything"
                        subtitleColor="rgba(239,68,68,0.7)"
                        description="Performs a complete factory reset. Deletes ALL data including user accounts, settings, pricing, vehicle types, rental fleet, and all operational records."
                        bullets={[
                            { text: '✗ All user accounts deleted', color: '#ef4444' },
                            { text: '✗ All settings reset', color: '#ef4444' },
                            { text: '✗ Pricing & fleet deleted', color: '#ef4444' },
                            { text: '✗ All operational records deleted', color: '#ef4444' },
                        ]}
                        btnLabel={isWiping ? '⏳ Processing...' : '🚨 Full System Reset'}
                        btnStyle={{
                            bg: 'linear-gradient(135deg, #dc2626, #7f1d1d)',
                            shadow: '0 4px 14px rgba(239,68,68,0.25)',
                            iconBg: 'rgba(239,68,68,0.12)',
                            iconBorder: 'rgba(239,68,68,0.3)',
                            titleColor: '#ef4444',
                        }}
                        onAction={() => handleWipe('full')}
                        disabled={isWiping}
                    />
                </div>

            </div>

            {/* ── Footer note ── */}
            <div
                className="mt-4 rounded-3 p-3 d-flex align-items-center gap-2"
                style={{
                    background: 'rgba(239,68,68,0.06)',
                    border: '1px solid rgba(239,68,68,0.15)',
                }}
            >
                <span style={{ fontSize: '1rem', flexShrink: 0 }}>🔒</span>
                <small style={{ color: 'var(--theme-content-text-secondary)', fontSize: '0.78rem', lineHeight: 1.5 }}>
                    All Danger Zone actions are <strong>permanently recorded in the Audit Log</strong> and cannot be undone.
                    Always <strong>download a backup first</strong>. Access is restricted to Super Admin accounts only.
                </small>
            </div>

        </div>
    );
};

export default DangerZone;
