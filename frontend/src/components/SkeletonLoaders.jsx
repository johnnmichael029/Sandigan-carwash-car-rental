import React from 'react';
import '../css/SkeletonLoaders.css';

// A generic full-page skeleton mimicking the admin dashboard layout
export const PageSkeleton = () => {
    return (
        <div className="skeleton-wrapper animate-fade-in py-3 w-100">
            {/* Header skeleton */}
            <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">
                <div>
                    <div className="skeleton-title mb-2" style={{ width: '250px', height: '32px', borderRadius: '6px' }}></div>
                    <div className="skeleton-text mb-0" style={{ width: '380px', height: '14px' }}></div>
                </div>
                <div className="d-flex gap-2">
                    <div className="skeleton-btn" style={{ width: '120px', height: '36px', borderRadius: '8px' }}></div>
                    <div className="skeleton-btn" style={{ width: '140px', height: '36px', borderRadius: '8px' }}></div>
                </div>
            </div>

            {/* Metric Cards Skeleton */}
            <div className="row g-3 mb-4">
                {[1, 2, 3, 4].map(i => (
                    <div className="col-6 col-md-3" key={i}>
                        <div className="card shadow-sm rounded-4 h-100 p-3 skeleton-card border-0">
                            <div className="skeleton-icon mb-3" style={{ width: '40px', height: '40px', borderRadius: '8px' }}></div>
                            <div className="skeleton-text mb-2" style={{ width: '45%', height: '12px' }}></div>
                            <div className="skeleton-text mb-2" style={{ width: '70%', height: '28px' }}></div>
                            <div className="skeleton-text" style={{ width: '55%', height: '10px' }}></div>
                        </div>
                    </div>
                ))}
            </div>

            <TableSkeleton />
        </div>
    );
};

// A customized skeleton for dashboard charts
export const ChartSkeleton = () => {
    return (
        <div className="d-flex justify-content-between align-items-end gap-2 p-3 w-100 mt-3 skeleton-wrapper" style={{ height: 250, borderLeft: '1px solid #f8fafc', borderBottom: '1px solid #f8fafc' }}>
            {[30, 45, 20, 60, 85, 40, 75, 55, 30, 90, 65, 50].map((h, i) => (
                <div key={i} className="skeleton-chart-bar" style={{ height: `${h}%`, width: '100%', maxWidth: '30px' }}></div>
            ))}
        </div>
    );
};

// A dedicated skeleton for table sections 
export const TableSkeleton = () => {
    return (
        <div className="card shadow-sm rounded-4 border-0 p-4 skeleton-card bg-white w-100 skeleton-wrapper">
            <div className="d-flex justify-content-between mb-4">
                <div className="skeleton-text" style={{ width: '180px', height: '22px' }}></div>
                <div className="skeleton-text" style={{ width: '120px', height: '32px', borderRadius: '8px' }}></div>
            </div>

            {/* Table Row Mocks */}
            <div className="d-flex flex-column gap-3 mt-2">
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="d-flex gap-3 align-items-center pb-3 border-bottom">
                        <div className="skeleton-icon" style={{ width: '40px', height: '40px', borderRadius: '50%' }}></div>
                        <div className="w-100">
                            <div className="skeleton-text mb-2" style={{ width: '20%', height: '15px' }}></div>
                            <div className="skeleton-text" style={{ width: '35%', height: '12px' }}></div>
                        </div>
                        <div className="skeleton-text" style={{ width: '70px', height: '20px', borderRadius: '15px' }}></div>
                    </div>
                ))}
            </div>
        </div>
    );
};
