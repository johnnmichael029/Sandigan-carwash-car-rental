import React from 'react';
import '../css/SkeletonLoaders.css';

/* ══════════════════════════════════════════════════════════
   SANDIGAN — Skeleton Loader Components
   Each component mirrors the actual UI layout it replaces.
   ══════════════════════════════════════════════════════════ */

// ── Shorthand helper ──────────────────────────────────────
const S = ({ w = '100%', h = 14, r = 6, className = '', style = {} }) => (
    <span
        className={`sk ${className}`}
        style={{ width: w, height: h, borderRadius: r, display: 'block', ...style }}
    />
);

// ── KPI Card Skeleton (shared by Dashboard + ERP modules) ─
export const KPICardSkeleton = () => (
    <div className="card border-0 shadow-sm rounded-4 h-100 p-3 sk-card">
        <div className="position-relative">
            <S w={40} h={40} r={10} className="mb-3" />
            <S w="55%" h={10} r={4} className="mb-2" />
            <S w="75%" h={28} r={6} className="mb-2" />
            <S w="50%" h={10} r={4} />
        </div>
    </div>
);

// ── 4-card KPI Row ─────────────────────────────────────────
const KPIRow = ({ cols = 4 }) => (
    <div className="row g-3 mb-4">
        {Array.from({ length: cols }).map((_, i) => (
            <div className={`col-6 col-md-${12 / cols}`} key={i}>
                <KPICardSkeleton />
            </div>
        ))}
    </div>
);

// ── Table Row Stubs ────────────────────────────────────────
const TableRows = ({ rows = 6, cols = 4, avatar = false }) => (
    <div className="d-flex flex-column">
        {Array.from({ length: rows }).map((_, i) => (
            <div
                key={i}
                className="d-flex align-items-center gap-3 px-4 py-3 border-bottom"
                style={{ borderColor: '#f8fafc' }}
            >
                {avatar && (
                    <S w={36} h={36} r={50} className="flex-shrink-0" />
                )}
                {Array.from({ length: cols }).map((_, j) => (
                    <S
                        key={j}
                        w={j === 0 ? '22%' : j === cols - 1 ? '10%' : '18%'}
                        h={13}
                        r={5}
                        className="flex-shrink-0"
                    />
                ))}
            </div>
        ))}
    </div>
);

// ── Table Card Shell (header + rows) ──────────────────────
const TableShell = ({ title = true, rows = 6, cols = 4, avatar = false }) => (
    <div className="card border-0 shadow-sm rounded-4 overflow-hidden sk-card">
        {title && (
            <div className="d-flex justify-content-between align-items-center px-4 py-3 border-bottom" style={{ borderColor: '#f8fafc' }}>
                <S w={160} h={18} r={6} />
                <S w={110} h={32} r={8} />
            </div>
        )}
        <TableRows rows={rows} cols={cols} avatar={avatar} />
    </div>
);

/* ══════════════════════════════════════════════════════════
   1. DASHBOARD SKELETON
   Layout: 4 KPI cards → 2 chart panels (8+4 col split)
   ══════════════════════════════════════════════════════════ */
export const DashboardSkeleton = () => (
    <div className="skeleton-wrapper">
        <KPIRow cols={4} />
        <div className="row g-4 mb-4">
            {/* Revenue bar chart panel */}
            <div className="col-12 col-xl-8">
                <div className="sk-card p-4 h-100">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <div>
                            <S w={180} h={16} r={5} className="mb-2" />
                            <S w={240} h={11} r={4} />
                        </div>
                        <div className="d-flex gap-2">
                            {[60, 60, 70, 60].map((w, i) => <S key={i} w={w} h={30} r={6} />)}
                        </div>
                    </div>
                    <ChartSkeleton />
                </div>
            </div>
            {/* Pie chart panel */}
            <div className="col-12 col-xl-4">
                <div className="sk-card p-4 h-100">
                    <S w={150} h={16} r={5} className="mb-2" />
                    <S w={120} h={11} r={4} className="mb-4" />
                    <div className="d-flex justify-content-center align-items-center" style={{ height: 200 }}>
                        <S w={160} h={160} r={50} className="sk-circle" style={{ background: 'linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%)', backgroundSize: '400% 100%' }} />
                    </div>
                </div>
            </div>
        </div>
    </div>
);

/* ══════════════════════════════════════════════════════════
   2. FINANCE SKELETON
   Layout: 4 KPI cards → tab pills → income/expense table
   ══════════════════════════════════════════════════════════ */
export const FinanceSkeleton = () => (
    <div className="skeleton-wrapper">
        {/* Tab header area */}
        <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
                <S w={200} h={22} r={6} className="mb-2" />
                <S w={280} h={12} r={4} />
            </div>
            <S w={120} h={36} r={8} />
        </div>
        <KPIRow cols={4} />
        {/* Tab Pills */}
        <div className="d-flex gap-2 mb-4">
            {[90, 110, 90, 100, 80].map((w, i) => <S key={i} w={w} h={34} r={20} />)}
        </div>
        <TableShell avatar={false} rows={7} cols={5} />
    </div>
);

/* ══════════════════════════════════════════════════════════
   3. VENDOR PAYABLES SKELETON
   Layout: Header → 4 KPI cards → tab pills → bills table
   ══════════════════════════════════════════════════════════ */
export const VendorSkeleton = () => (
    <div className="skeleton-wrapper">
        <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
                <S w={220} h={22} r={6} className="mb-2" />
                <S w={310} h={12} r={4} />
            </div>
            <div className="d-flex gap-2">
                <S w={110} h={36} r={8} />
                <S w={100} h={36} r={8} />
            </div>
        </div>
        <KPIRow cols={4} />
        {/* Tab Pills */}
        <div className="d-flex gap-2 mb-4">
            <S w={95} h={36} r={20} />
            <S w={130} h={36} r={20} />
        </div>
        {/* Bills table — date | vendor | bill# | description | balance */}
        <div className="sk-card overflow-hidden">
            <div className="px-4 py-3 border-bottom" style={{ borderColor: '#f8fafc' }}>
                <S w={160} h={16} />
            </div>
            <TableRows rows={6} cols={5} avatar={false} />
        </div>
    </div>
);

/* ══════════════════════════════════════════════════════════
   4. HRIS SKELETON
   Layout: tab pills → employee directory with avatars
   ══════════════════════════════════════════════════════════ */
export const HRISSkeleton = () => (
    <div className="skeleton-wrapper">
        {/* Top header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
                <S w={180} h={22} r={6} className="mb-2" />
                <S w={260} h={12} r={4} />
            </div>
            <S w={130} h={36} r={8} />
        </div>
        {/* HRIS Tab pills */}
        <div className="d-flex gap-2 mb-4">
            {[90, 100, 110, 90, 80, 90].map((w, i) => <S key={i} w={w} h={34} r={20} />)}
        </div>
        {/* Employee directory card */}
        <div className="sk-card overflow-hidden">
            <div className="d-flex justify-content-between align-items-center px-4 py-3 border-bottom" style={{ borderColor: '#f8fafc' }}>
                <S w={170} h={16} />
                <div className="d-flex gap-2">
                    <S w={140} h={32} r={20} />
                    <S w={100} h={32} r={8} />
                </div>
            </div>
            {/* Employee rows with avatars */}
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="d-flex align-items-center gap-3 px-4 py-3 border-bottom" style={{ borderColor: '#f8fafc' }}>
                    <S w={40} h={40} r={50} className="flex-shrink-0" />
                    <div className="flex-grow-1">
                        <S w="30%" h={13} r={4} className="mb-2" />
                        <S w="18%" h={10} r={4} />
                    </div>
                    <S w={70} h={22} r={12} />
                    <S w={80} h={22} r={12} />
                    <S w={60} h={22} r={12} />
                    <S w={32} h={32} r={8} />
                </div>
            ))}
        </div>
    </div>
);

/* ══════════════════════════════════════════════════════════
   5. CRM SKELETON
   Layout: KPI row → search bar → client card grid
   ══════════════════════════════════════════════════════════ */
export const CRMSkeleton = () => (
    <div className="skeleton-wrapper">
        <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
                <S w={180} h={22} r={6} className="mb-2" />
                <S w={260} h={12} r={4} />
            </div>
            <S w={130} h={36} r={8} />
        </div>
        <KPIRow cols={4} />
        {/* Search + filter bar */}
        <div className="d-flex gap-2 mb-4">
            <S w={220} h={36} r={20} />
            <S w={100} h={36} r={8} />
            <S w={100} h={36} r={8} />
        </div>
        {/* Client card grid */}
        <div className="row g-3">
            {Array.from({ length: 8 }).map((_, i) => (
                <div className="col-md-6 col-lg-4 col-xl-3" key={i}>
                    <div className="sk-card p-3">
                        <div className="d-flex align-items-center gap-3 mb-3">
                            <S w={44} h={44} r={50} className="flex-shrink-0" />
                            <div className="flex-grow-1">
                                <S w="70%" h={14} r={4} className="mb-2" />
                                <S w="45%" h={10} r={4} />
                            </div>
                        </div>
                        <div className="d-flex gap-1 mb-3">
                            <S w={50} h={20} r={20} />
                            <S w={60} h={20} r={20} />
                        </div>
                        <S w="100%" h={32} r={8} />
                    </div>
                </div>
            ))}
        </div>
    </div>
);

/* ══════════════════════════════════════════════════════════
   6. INVENTORY SKELETON
   Layout: header → tab pills → product grid with images
   ══════════════════════════════════════════════════════════ */
export const InventorySkeleton = () => (
    <div className="skeleton-wrapper">
        <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
                <S w={190} h={22} r={6} className="mb-2" />
                <S w={270} h={12} r={4} />
            </div>
            <S w={130} h={36} r={8} />
        </div>
        {/* Tab pills */}
        <div className="d-flex gap-2 mb-4">
            <S w={110} h={34} r={20} />
            <S w={100} h={34} r={20} />
            <S w={100} h={34} r={20} />
        </div>
        {/* Product grid cards */}
        <div className="row g-3">
            {Array.from({ length: 8 }).map((_, i) => (
                <div className="col-6 col-md-4 col-xl-3" key={i}>
                    <div className="sk-card">
                        <S w="100%" h={140} r={0} className="mb-0" style={{ borderRadius: '12px 12px 0 0' }} />
                        <div className="p-3">
                            <S w="80%" h={14} r={4} className="mb-2" />
                            <S w="50%" h={11} r={4} className="mb-2" />
                            <S w="35%" h={20} r={6} />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

/* ══════════════════════════════════════════════════════════
   7. PROMOTIONS SKELETON
   Layout: header → promo card list with badge + dates
   ══════════════════════════════════════════════════════════ */
export const PromotionsSkeleton = () => (
    <div className="skeleton-wrapper">
        <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
                <S w={200} h={22} r={6} className="mb-2" />
                <S w={280} h={12} r={4} />
            </div>
            <S w={130} h={36} r={8} />
        </div>
        <div className="row g-3">
            {Array.from({ length: 6 }).map((_, i) => (
                <div className="col-12 col-md-6 col-xl-4" key={i}>
                    <div className="sk-card p-4">
                        <div className="d-flex justify-content-between align-items-start mb-3">
                            <S w="60%" h={16} r={5} />
                            <S w={60} h={22} r={20} />
                        </div>
                        <S w="80%" h={11} r={4} className="mb-2" />
                        <S w="45%" h={11} r={4} className="mb-4" />
                        <div className="d-flex gap-2">
                            <S w={80} h={30} r={8} />
                            <S w={80} h={30} r={8} />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

/* ══════════════════════════════════════════════════════════
   8. TABLE SKELETON (upgraded — used for audit log, generic tables)
   Layout: card → header → 6 rows with icon + text + badge
   ══════════════════════════════════════════════════════════ */
export const TableSkeleton = () => (
    <div className="card shadow-sm rounded-4 border-0 bg-white w-100 skeleton-wrapper sk-card overflow-hidden">
        <div className="d-flex justify-content-between align-items-center px-4 py-3 border-bottom" style={{ borderColor: '#f8fafc' }}>
            <S w={180} h={18} r={6} />
            <S w={110} h={32} r={8} />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="d-flex align-items-center gap-3 px-4 py-3 border-bottom" style={{ borderColor: '#f8fafc' }}>
                <S w={36} h={36} r={50} className="flex-shrink-0" />
                <div className="flex-grow-1">
                    <S w="28%" h={13} r={4} className="mb-2" />
                    <S w="42%" h={10} r={4} />
                </div>
                <S w={70} h={22} r={12} />
                <S w={90} h={13} r={4} />
            </div>
        ))}
    </div>
);

/* ══════════════════════════════════════════════════════════
   9. CHART SKELETON (upgraded)
   Layout: animated bar chart placeholder
   ══════════════════════════════════════════════════════════ */
export const ChartSkeleton = () => (
    <div
        className="skeleton-wrapper d-flex align-items-end gap-2 w-100 mt-2 px-2"
        style={{ height: 220, borderLeft: '2px solid #f0f0f0', borderBottom: '2px solid #f0f0f0' }}
    >
        {[38, 55, 28, 70, 90, 48, 82, 60, 35, 75, 50, 65].map((h, i) => (
            <div
                key={i}
                className="sk flex-fill"
                style={{
                    height: `${h}%`,
                    borderRadius: '4px 4px 0 0',
                    minWidth: 8,
                    animationDelay: `${i * 0.06}s`
                }}
            />
        ))}
    </div>
);

/* ══════════════════════════════════════════════════════════
   10. PAGE SKELETON (legacy compat — full page layout)
   ══════════════════════════════════════════════════════════ */
export const PageSkeleton = () => (
    <div className="skeleton-wrapper animate-fade-in py-3 w-100">
        <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">
            <div>
                <S w={250} h={32} r={6} className="mb-2" />
                <S w={380} h={14} r={4} />
            </div>
            <div className="d-flex gap-2">
                <S w={120} h={36} r={8} />
                <S w={140} h={36} r={8} />
            </div>
        </div>
        <KPIRow cols={4} />
        <TableSkeleton />
    </div>
);
