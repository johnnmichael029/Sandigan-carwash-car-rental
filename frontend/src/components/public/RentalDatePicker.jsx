import { useState, useRef, useEffect } from 'react';

/**
 * Custom Interactive Calendar Date Picker
 * Visually marks booked/unavailable dates in red, highlights selected range,
 * and prevents selection of already reserved dates.
 */
const RentalDatePicker = ({
    selectedDate,
    onSelectDate,
    bookedDates = [],
    durationDays = 1,
    minDate = new Date().toISOString().split('T')[0],
    placeholder = "Select Pick-up Date"
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [hoveredDate, setHoveredDate] = useState(null);
    const containerRef = useRef(null);

    // Initial month/year based on selectedDate or today
    const initialDate = selectedDate ? new Date(selectedDate) : new Date();
    const [viewMonth, setViewMonth] = useState(initialDate.getMonth());
    const [viewYear, setViewYear] = useState(initialDate.getFullYear());

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Format date string to YYYY-MM-DD in local time
    const formatDateKey = (year, month, day) => {
        const m = String(month + 1).padStart(2, '0');
        const d = String(day).padStart(2, '0');
        return `${year}-${m}-${d}`;
    };

    // Calculate calendar matrix
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const days = [];
    // Previous month padding
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
        const dayNum = daysInPrevMonth - i;
        const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
        const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
        days.push({
            day: dayNum,
            dateKey: formatDateKey(prevYear, prevMonth, dayNum),
            currentMonth: false
        });
    }

    // Current month days
    for (let dayNum = 1; dayNum <= daysInCurrentMonth; dayNum++) {
        days.push({
            day: dayNum,
            dateKey: formatDateKey(viewYear, viewMonth, dayNum),
            currentMonth: true
        });
    }

    // Next month padding (multiples of 7)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let dayNum = 1; dayNum <= remaining; dayNum++) {
        const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
        const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
        days.push({
            day: dayNum,
            dateKey: formatDateKey(nextYear, nextMonth, dayNum),
            currentMonth: false
        });
    }

    // Check if a date falls in selected range
    const isDateInRange = (dateKey) => {
        if (!selectedDate) return false;
        const start = new Date(selectedDate);
        const cur = new Date(dateKey);
        const daysCount = parseInt(durationDays, 10) || 1;
        const end = new Date(start);
        end.setDate(end.getDate() + (daysCount - 1));

        return cur >= start && cur <= end;
    };

    // Check if a date falls in hovered preview range
    const isDateInHoverRange = (dateKey) => {
        if (!hoveredDate || hoveredDate < minDate || bookedDates.includes(hoveredDate)) return false;
        const start = new Date(hoveredDate);
        const cur = new Date(dateKey);
        const daysCount = parseInt(durationDays, 10) || 1;
        const end = new Date(start);
        end.setDate(end.getDate() + (daysCount - 1));

        return cur >= start && cur <= end;
    };

    const isStartOfRange = (dateKey) => selectedDate === dateKey;

    const handleSelectDay = (dateItem) => {
        const isPast = dateItem.dateKey < minDate;
        const isBooked = bookedDates.includes(dateItem.dateKey);

        if (isPast || isBooked) return;

        onSelectDate(dateItem.dateKey);
        setIsOpen(false);
    };

    const todayStr = new Date().toISOString().split('T')[0];

    const formattedDisplay = selectedDate
        ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : '';

    return (
        <div className="position-relative w-100" ref={containerRef}>
            {/* Input Trigger Button */}
            <div
                onClick={() => setIsOpen(prev => !prev)}
                className="form-control d-flex align-items-center justify-content-between cursor-pointer"
                style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: isOpen ? '1px solid #23A0CE' : '1px solid rgba(255,255,255,0.12)',
                    color: selectedDate ? '#fff' : 'rgba(255,255,255,0.4)',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    userSelect: 'none',
                    boxShadow: isOpen ? '0 0 0 3px rgba(35,160,206,0.15)' : 'none',
                    transition: 'all 0.2s ease'
                }}
            >
                <div className="d-flex align-items-center gap-2">
                    <span style={{ fontSize: '1.1rem' }}>📅</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: selectedDate ? 600 : 400 }}>
                        {formattedDisplay || placeholder}
                    </span>
                </div>
                <span className="small opacity-50" style={{ fontSize: '0.75rem' }}>
                    {isOpen ? '▲' : '▼'}
                </span>
            </div>

            {/* Calendar Popover Dropdown */}
            {isOpen && (
                <div
                    className="position-absolute shadow-lg p-3 rounded-4"
                    style={{
                        top: 'calc(100% + 8px)',
                        left: 0,
                        width: '320px',
                        maxWidth: '92vw',
                        zIndex: 1050,
                        background: '#0f172a',
                        border: '1px solid rgba(35,160,206,0.3)',
                        backdropFilter: 'blur(16px)',
                        boxShadow: '0 12px 32px rgba(0,0,0,0.5)'
                    }}
                >
                    {/* Header: Month & Year Navigator */}
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <span className="fw-bold text-light" style={{ fontSize: '0.9rem' }}>
                            {monthNames[viewMonth]} {viewYear}
                        </span>
                        <div className="d-flex gap-1">
                            <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary py-0 px-2"
                                style={{ fontSize: '0.8rem', borderRadius: '6px', color: '#94a3b8', borderColor: '#334155' }}
                                onClick={() => {
                                    if (viewMonth === 0) {
                                        setViewMonth(11);
                                        setViewYear(prev => prev - 1);
                                    } else {
                                        setViewMonth(prev => prev - 1);
                                    }
                                }}
                            >
                                ‹
                            </button>
                            <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary py-0 px-2"
                                style={{ fontSize: '0.8rem', borderRadius: '6px', color: '#94a3b8', borderColor: '#334155' }}
                                onClick={() => {
                                    const now = new Date();
                                    setViewMonth(now.getMonth());
                                    setViewYear(now.getFullYear());
                                }}
                            >
                                •
                            </button>
                            <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary py-0 px-2"
                                style={{ fontSize: '0.8rem', borderRadius: '6px', color: '#94a3b8', borderColor: '#334155' }}
                                onClick={() => {
                                    if (viewMonth === 11) {
                                        setViewMonth(0);
                                        setViewYear(prev => prev + 1);
                                    } else {
                                        setViewMonth(prev => prev + 1);
                                    }
                                }}
                            >
                                ›
                            </button>
                        </div>
                    </div>

                    {/* Weekday Headers */}
                    <div className="d-grid mb-2 text-center" style={{ gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((w, idx) => (
                            <span key={w} style={{ fontSize: '0.75rem', fontWeight: 600, color: idx === 0 || idx === 6 ? '#23A0CE' : '#94a3b8' }}>
                                {w}
                            </span>
                        ))}
                    </div>

                    {/* Day Grid */}
                    <div className="d-grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
                        {days.map((item, idx) => {
                            const isPast = item.dateKey < minDate;
                            const isBooked = bookedDates.includes(item.dateKey);
                            const inRange = isDateInRange(item.dateKey);
                            const isStart = isStartOfRange(item.dateKey);
                            const isToday = item.dateKey === todayStr;
                            const isAvailable = !isPast && !isBooked && item.currentMonth && !isStart && !inRange;
                            const isHovered = hoveredDate === item.dateKey;
                            const inHoverRange = isDateInHoverRange(item.dateKey);

                            // Styles calculation
                            let bg = 'transparent';
                            let textColor = '#f8fafc';
                            let border = '1px solid transparent';
                            let cursor = 'pointer';
                            let opacity = item.currentMonth ? 1 : 0.35;
                            let transform = 'scale(1)';
                            let boxShadow = 'none';

                            if (isPast) {
                                textColor = '#475569';
                                cursor = 'not-allowed';
                                opacity = 0.4;
                            } else if (isBooked) {
                                bg = 'rgba(239, 68, 68, 0.2)';
                                textColor = '#ef4444';
                                border = '1px solid rgba(239, 68, 68, 0.4)';
                                cursor = 'not-allowed';
                                if (isHovered) {
                                    boxShadow = '0 0 10px rgba(239, 68, 68, 0.35)';
                                }
                            } else if (isStart) {
                                bg = '#23A0CE';
                                textColor = '#ffffff';
                                border = '1px solid #23A0CE';
                                boxShadow = '0 2px 8px rgba(35, 160, 206, 0.4)';
                            } else if (inRange) {
                                bg = 'rgba(35, 160, 206, 0.25)';
                                textColor = '#38bdf8';
                                border = '1px solid rgba(35, 160, 206, 0.4)';
                            } else if (isHovered && isAvailable) {
                                bg = 'rgba(35, 160, 206, 0.35)';
                                textColor = '#ffffff';
                                border = '1px solid #23A0CE';
                                transform = 'scale(1.1)';
                                boxShadow = '0 4px 14px rgba(35, 160, 206, 0.4)';
                            } else if (inHoverRange && isAvailable) {
                                bg = 'rgba(35, 160, 206, 0.15)';
                                textColor = '#7dd3fc';
                                border = '1px dashed rgba(35, 160, 206, 0.5)';
                            } else if (isToday) {
                                border = '1px solid rgba(35, 160, 206, 0.5)';
                            }

                            return (
                                <button
                                    key={idx}
                                    type="button"
                                    disabled={isPast || isBooked}
                                    onClick={() => handleSelectDay(item)}
                                    onMouseEnter={() => !isPast && setHoveredDate(item.dateKey)}
                                    onMouseLeave={() => setHoveredDate(null)}
                                    title={isBooked ? 'Vehicle Already Booked' : (isPast ? 'Past date' : `Select ${item.dateKey}`)}
                                    className="d-flex flex-column align-items-center justify-content-center p-0 rounded-2 position-relative"
                                    style={{
                                        height: '36px',
                                        background: bg,
                                        color: textColor,
                                        border: border,
                                        cursor: cursor,
                                        opacity: opacity,
                                        transform: transform,
                                        boxShadow: boxShadow,
                                        fontSize: '0.8rem',
                                        fontWeight: isStart || isBooked || isHovered ? 700 : 500,
                                        transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
                                        zIndex: isHovered || isStart ? 3 : 1
                                    }}
                                >
                                    <span>{item.day}</span>
                                    {isBooked ? (
                                        <span style={{ fontSize: '0.55rem', lineHeight: 1, marginTop: '-2px', color: '#ef4444', fontWeight: 700 }}>
                                            ✕
                                        </span>
                                    ) : isAvailable ? (
                                        <span
                                            style={{
                                                width: '4px',
                                                height: '4px',
                                                borderRadius: '50%',
                                                backgroundColor: '#22c55e',
                                                marginTop: '1px',
                                                display: 'inline-block',
                                                transform: isHovered ? 'scale(1.3)' : 'scale(1)',
                                                transition: 'transform 0.15s ease'
                                            }}
                                        />
                                    ) : null}
                                </button>
                            );
                        })}
                    </div>

                    {/* Legend */}
                    <div className="mt-3 pt-2 d-flex align-items-center justify-content-between text-light flex-wrap" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: '0.72rem' }}>
                        <div className="d-flex align-items-center gap-1">
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }}></span>
                            <span style={{ color: '#ef4444' }}>Booked</span>
                        </div>
                        <div className="d-flex align-items-center gap-1">
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#23A0CE', display: 'inline-block' }}></span>
                            <span style={{ color: '#38bdf8' }}>Selected</span>
                        </div>
                        <div className="d-flex align-items-center gap-1">
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}></span>
                            <span className="text-secondary">Available</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RentalDatePicker;
