import { useState, useRef, useEffect, useLayoutEffect } from 'react';

/**
 * RentalDatePicker — Airline-Style Range Calendar with Time Picker
 *
 * Flow:
 *   Click 1 → sets startDate, keeps calendar open (selectionStep = 'end')
 *   Click 2 → sets endDate, closes calendar (selectionStep resets to 'start')
 *
 * Props:
 *   startDate     {string}   "YYYY-MM-DD" — selected pick-up date
 *   endDate       {string}   "YYYY-MM-DD" — selected return date
 *   pickupTime    {string}   "HH:MM" (24-hr) — shared pick-up/return time
 *   onRangeSelect {fn}       (startDate: string, endDate: string) => void
 *   onTimeChange  {fn}       (time: string) => void
 *   bookedDates   {string[]} ["YYYY-MM-DD", ...] — blocked/unavailable dates
 *   minDate       {string}   "YYYY-MM-DD" — earliest selectable date (default: today)
 *   placeholder   {string}   Placeholder text for the trigger button
 */
const RentalDatePicker = ({
    startDate = '',
    endDate = '',
    pickupTime = '08:00',
    onRangeSelect,
    onTimeChange,
    bookedDates = [],
    minDate = new Date().toISOString().split('T')[0],
    placeholder = 'Select Pick-up Date',
}) => {
    const [isOpen, setIsOpen] = useState(false);
    // 'start' = waiting for 1st click | 'end' = waiting for 2nd click
    const [selectionStep, setSelectionStep] = useState('start');
    const [hoveredDate, setHoveredDate] = useState(null);
    // Pending start while user picks the end date (not yet committed to parent)
    const [pendingStart, setPendingStart] = useState(startDate || null);
    const containerRef = useRef(null);
    // ── AM row drag-scroll refs ──
    const amScrollRef   = useRef(null);
    const amThumbRef    = useRef(null);
    const amDragging    = useRef(false);
    const amDragX       = useRef(0);
    const amDragScroll  = useRef(0);
    const amHasDragged  = useRef(false);
    // ── PM row drag-scroll refs ──
    const pmScrollRef   = useRef(null);
    const pmThumbRef    = useRef(null);
    const pmDragging    = useRef(false);
    const pmDragX       = useRef(0);
    const pmDragScroll  = useRef(0);
    const pmHasDragged  = useRef(false);

    const [popoverPlacement, setPopoverPlacement] = useState('bottom');

    // ── Smart Viewport-Aware Placement (Top vs Bottom) ──
    useLayoutEffect(() => {
        if (isOpen && containerRef.current) {
            const updatePlacement = () => {
                const rect = containerRef.current.getBoundingClientRect();
                const spaceBelow = window.innerHeight - rect.bottom;
                const spaceAbove = rect.top;
                // If space below is less than ~420px AND space above is greater, open upwards
                if (spaceBelow < 420 && spaceAbove > spaceBelow) {
                    setPopoverPlacement('top');
                } else {
                    setPopoverPlacement('bottom');
                }
            };
            updatePlacement();
            window.addEventListener('resize', updatePlacement);
            window.addEventListener('scroll', updatePlacement, true);
            return () => {
                window.removeEventListener('resize', updatePlacement);
                window.removeEventListener('scroll', updatePlacement, true);
            };
        }
    }, [isOpen]);

    // Sync pendingStart only when startDate is externally cleared (e.g. vehicle change)
    // Do NOT reset selectionStep here — that would break mid-selection on click 1.
    useEffect(() => {
        if (!startDate) {
            setPendingStart(null);
            setSelectionStep('start');
        }
    }, [startDate]);

    // Calendar view month/year
    const initDate = startDate ? new Date(startDate + 'T00:00:00') : new Date();
    const [viewMonth, setViewMonth] = useState(initDate.getMonth());
    const [viewYear, setViewYear] = useState(initDate.getFullYear());

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    // ── Time slots: 08:00 to 20:00 in 1-hour increments ──────────────────────
    const timeSlots = [];
    for (let h = 8; h <= 20; h++) {
        const val = `${String(h).padStart(2, '0')}:00`;
        const label = h === 12 ? '12:00 PM'
            : h > 12 ? `${h - 12}:00 PM`
                : `${h}:00 AM`;
        timeSlots.push({ value: val, label });
    }

    // ── Close on outside click ────────────────────────────────────────────────
    useEffect(() => {
        const handler = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
                // If user clicked outside mid-selection, reset pending
                if (selectionStep === 'end') {
                    setSelectionStep('start');
                    setPendingStart(startDate || null);
                }
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [selectionStep, startDate]);

    // ── Format YYYY-MM-DD from year/month/day ─────────────────────────────────
    const fmtKey = (y, m, d) =>
        `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    // ── Build calendar day grid ───────────────────────────────────────────────
    const firstDow = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrev = new Date(viewYear, viewMonth, 0).getDate();

    const days = [];
    for (let i = firstDow - 1; i >= 0; i--) {
        const pm = viewMonth === 0 ? 11 : viewMonth - 1;
        const py = viewMonth === 0 ? viewYear - 1 : viewYear;
        days.push({ day: daysInPrev - i, dateKey: fmtKey(py, pm, daysInPrev - i), currentMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
        days.push({ day: d, dateKey: fmtKey(viewYear, viewMonth, d), currentMonth: true });
    }
    const rem = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= rem; d++) {
        const nm = viewMonth === 11 ? 0 : viewMonth + 1;
        const ny = viewMonth === 11 ? viewYear + 1 : viewYear;
        days.push({ day: d, dateKey: fmtKey(ny, nm, d), currentMonth: false });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // ── Range helpers ─────────────────────────────────────────────────────────
    const isInCommittedRange = (dk) => {
        if (!startDate || !endDate) return false;
        return dk > startDate && dk < endDate;
    };

    const isInHoverRange = (dk) => {
        // Only show hover preview during step 'end' when user hasn't clicked yet
        if (selectionStep !== 'end' || !pendingStart || !hoveredDate) return false;
        if (hoveredDate <= pendingStart) return false;
        return dk > pendingStart && dk < hoveredDate;
    };

    const isHoverEnd = (dk) => {
        if (selectionStep !== 'end' || !pendingStart || !hoveredDate) return false;
        return dk === hoveredDate && hoveredDate > pendingStart;
    };

    // Check if any date in a range overlaps with booked dates
    const rangeHasConflict = (from, to) => {
        const cur = new Date(from + 'T00:00:00');
        const end = new Date(to + 'T00:00:00');
        while (cur <= end) {
            const k = cur.toISOString().split('T')[0];
            if (bookedDates.includes(k)) return true;
            cur.setDate(cur.getDate() + 1);
        }
        return false;
    };

    // ── Handle day click ──────────────────────────────────────────────────────
    const handleDayClick = (item) => {
        if (!item.currentMonth) return;
        if (item.dateKey < minDate) return;
        if (bookedDates.includes(item.dateKey)) return;

        if (selectionStep === 'start') {
            // ── Click 1: set start date, keep calendar open ──
            // Do NOT call onRangeSelect here — changing the startDate prop would
            // re-trigger effects and silently reset selectionStep back to 'start'.
            setPendingStart(item.dateKey);
            setSelectionStep('end');
        } else {
            // ── Click 2: set end date, commit range, close ──
            if (item.dateKey <= pendingStart) {
                // Clicked same or earlier — restart from this date (still step 'end')
                setPendingStart(item.dateKey);
                return;
            }
            // Block if the selected range contains any booked dates
            if (rangeHasConflict(pendingStart, item.dateKey)) return;

            // Only now do we notify the parent with the full committed range
            onRangeSelect?.(pendingStart, item.dateKey);
            setSelectionStep('start');
            setIsOpen(false);
        }
    };

    // ── Open calendar ─────────────────────────────────────────────────────────
    const handleOpen = () => {
        // Always restart range selection from scratch on open
        setSelectionStep('start');
        setPendingStart(startDate || null);
        setIsOpen(true);
    };

    // ── Formatted display string for trigger button ───────────────────────────
    const fmtDisplay = (dateStr) => {
        if (!dateStr) return null;
        return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
    };

    const fmtTime = (t) => {
        if (!t) return '';
        const [h, m] = t.split(':').map(Number);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const hr = h % 12 || 12;
        return `${hr}:${String(m).padStart(2, '0')} ${ampm}`;
    };

    const triggerLabel = (() => {
        // While mid-selection (step 2), show pendingStart in the trigger so user
        // can see which start date they already clicked
        const displayStart = (isOpen && selectionStep === 'end' && pendingStart)
            ? pendingStart
            : startDate;
        if (!displayStart) return placeholder;
        return `${fmtDisplay(displayStart)}  —  ${fmtTime(pickupTime)}`;
    })();

    // ── Hint text while picking end ───────────────────────────────────────────
    const stepHint = selectionStep === 'end'
        ? `Pick-up: ${fmtDisplay(pendingStart)} — Now select return date`
        : null;

    return (
        <div className="position-relative w-100" ref={containerRef}>

            {/* ── Trigger Button ── */}
            <div
                onClick={handleOpen}
                className="form-control d-flex align-items-center justify-content-between"
                style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: isOpen ? '1px solid #23A0CE' : '1px solid rgba(255,255,255,0.12)',
                    color: startDate ? '#fff' : 'rgba(255,255,255,0.4)',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    userSelect: 'none',
                    boxShadow: isOpen ? '0 0 0 3px rgba(35,160,206,0.15)' : 'none',
                    transition: 'all 0.2s ease',
                }}
            >
                <div className="d-flex align-items-center gap-2">
                    <span style={{ fontSize: '1.1rem' }}>📅</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: startDate ? 600 : 400 }}>
                        {triggerLabel}
                    </span>
                </div>
                <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>{isOpen ? '▲' : '▼'}</span>
            </div>

            {/* ── Calendar Popover ── */}
            {isOpen && (
                <>
                    <style>{`
                        .custom-date-popover::-webkit-scrollbar {
                            width: 6px;
                        }
                        .custom-date-popover::-webkit-scrollbar-track {
                            background: rgba(15, 23, 42, 0.6);
                            border-radius: 8px;
                        }
                        .custom-date-popover::-webkit-scrollbar-thumb {
                            background: rgba(35, 160, 206, 0.5);
                            border-radius: 8px;
                        }
                        .custom-date-popover::-webkit-scrollbar-thumb:hover {
                            background: rgba(35, 160, 206, 0.85);
                        }
                    `}</style>
                    <div
                        className="position-absolute shadow-lg rounded-4 custom-date-popover"
                        style={{
                            ...(popoverPlacement === 'top'
                                ? { bottom: 'calc(100% + 8px)' }
                                : { top: 'calc(100% + 8px)' }),
                            left: 0,
                            width: '340px',
                            maxWidth: '95vw',
                            maxHeight: '360px',
                            overflowY: 'auto',
                            zIndex: 1050,
                            background: '#0f172a',
                            border: '1px solid rgba(35,160,206,0.3)',
                            backdropFilter: 'blur(16px)',
                            boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
                            padding: '14px',
                        }}
                    >
                    {/* Step hint */}
                    {stepHint && (
                        <div style={{
                            background: 'rgba(35,160,206,0.12)',
                            border: '1px solid rgba(35,160,206,0.3)',
                            borderRadius: '8px',
                            padding: '7px 12px',
                            marginBottom: '12px',
                            fontSize: '0.78rem',
                            color: '#7dd3fc',
                            fontWeight: 600,
                            textAlign: 'center',
                        }}>
                            {stepHint}
                        </div>
                    )}

                    {/* Month/Year Navigator */}
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <span className="fw-bold text-light" style={{ fontSize: '0.9rem' }}>
                            {monthNames[viewMonth]} {viewYear}
                        </span>
                        <div className="d-flex gap-1">
                            {/* Prev month */}
                            <button type="button" className="btn btn-sm btn-outline-secondary py-0 px-2"
                                style={{ fontSize: '0.8rem', borderRadius: '6px', color: '#94a3b8', borderColor: '#334155' }}
                                onClick={() => {
                                    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
                                    else setViewMonth(m => m - 1);
                                }}>‹</button>
                            {/* Today */}
                            <button type="button" className="btn btn-sm btn-outline-secondary py-0 px-2"
                                style={{ fontSize: '0.8rem', borderRadius: '6px', color: '#94a3b8', borderColor: '#334155' }}
                                onClick={() => { const n = new Date(); setViewMonth(n.getMonth()); setViewYear(n.getFullYear()); }}>•</button>
                            {/* Next month */}
                            <button type="button" className="btn btn-sm btn-outline-secondary py-0 px-2"
                                style={{ fontSize: '0.8rem', borderRadius: '6px', color: '#94a3b8', borderColor: '#334155' }}
                                onClick={() => {
                                    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
                                    else setViewMonth(m => m + 1);
                                }}>›</button>
                        </div>
                    </div>

                    {/* Weekday headers */}
                    <div className="d-grid mb-2 text-center"
                        style={{ gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((w, i) => (
                            <span key={w} style={{
                                fontSize: '0.72rem', fontWeight: 700,
                                color: i === 0 || i === 6 ? '#23A0CE' : '#64748b',
                            }}>{w}</span>
                        ))}
                    </div>

                    {/* Day grid */}
                    <div className="d-grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
                        {days.map((item, idx) => {
                            const isPast = item.dateKey < minDate;
                            const isBooked = bookedDates.includes(item.dateKey);
                            const isStart = item.dateKey === startDate && !!startDate;
                            const isPendingStart = item.dateKey === pendingStart && selectionStep === 'end';
                            const isEnd = item.dateKey === endDate && !!endDate;
                            const isInRange = isInCommittedRange(item.dateKey);
                            const isHover = hoveredDate === item.dateKey;
                            const inHover = isInHoverRange(item.dateKey);
                            const isHEnd = isHoverEnd(item.dateKey);
                            const isToday = item.dateKey === todayStr;
                            const isAvailable = item.currentMonth && !isPast && !isBooked && !isStart && !isEnd && !isInRange && !isPendingStart;

                            // Conflict in hover range
                            const hoverConflict = isHEnd && pendingStart && hoveredDate
                                ? rangeHasConflict(pendingStart, hoveredDate)
                                : false;

                            // ── Compute cell styles ──
                            let bg = 'transparent';
                            let textColor = item.currentMonth ? '#f8fafc' : 'rgba(248,250,252,0.2)';
                            let border = '1px solid transparent';
                            let cursor = item.currentMonth ? 'pointer' : 'default';
                            let fontWeight = 500;
                            let boxShadow = 'none';
                            let transform = 'scale(1)';
                            let opacity = item.currentMonth ? 1 : 0.25;
                            let borderRadius = '6px';

                            if (!item.currentMonth) {
                                // faded out-of-month days — not interactive
                            } else if (isPast) {
                                textColor = '#334155'; cursor = 'not-allowed'; opacity = 0.4;
                            } else if (isBooked) {
                                bg = 'rgba(239,68,68,0.15)';
                                textColor = '#ef4444';
                                border = '1px solid rgba(239,68,68,0.35)';
                                cursor = 'not-allowed';
                                fontWeight = 700;
                            } else if (isStart || isPendingStart) {
                                bg = '#23A0CE';
                                textColor = '#fff';
                                border = '1px solid #23A0CE';
                                fontWeight = 800;
                                boxShadow = '0 2px 10px rgba(35,160,206,0.5)';
                                borderRadius = '6px 0 0 6px';
                            } else if (isEnd) {
                                bg = '#23A0CE';
                                textColor = '#fff';
                                border = '1px solid #23A0CE';
                                fontWeight = 800;
                                boxShadow = '0 2px 10px rgba(35,160,206,0.5)';
                                borderRadius = '0 6px 6px 0';
                            } else if (isInRange) {
                                bg = 'rgba(35,160,206,0.18)';
                                textColor = '#7dd3fc';
                                border = '1px solid transparent';
                                borderRadius = '0';
                            } else if (isHEnd) {
                                if (hoverConflict) {
                                    bg = 'rgba(239,68,68,0.2)';
                                    textColor = '#f87171';
                                    border = '1px solid rgba(239,68,68,0.5)';
                                } else {
                                    bg = 'rgba(35,160,206,0.5)';
                                    textColor = '#fff';
                                    border = '1px solid #23A0CE';
                                    boxShadow = '0 2px 10px rgba(35,160,206,0.4)';
                                    borderRadius = '0 6px 6px 0';
                                }
                            } else if (inHover) {
                                bg = 'rgba(35,160,206,0.1)';
                                textColor = '#7dd3fc';
                                border = '1px dashed rgba(35,160,206,0.4)';
                                borderRadius = '0';
                            } else if (isHover && isAvailable) {
                                bg = 'rgba(35,160,206,0.3)';
                                textColor = '#fff';
                                border = '1px solid #23A0CE';
                                transform = 'scale(1.1)';
                                boxShadow = '0 4px 12px rgba(35,160,206,0.35)';
                            } else if (isToday) {
                                border = '1px solid rgba(35,160,206,0.5)';
                                textColor = '#38bdf8';
                            }

                            return (
                                <button
                                    key={idx}
                                    type="button"
                                    disabled={!item.currentMonth || isPast || isBooked}
                                    onClick={() => handleDayClick(item)}
                                    onMouseEnter={() => item.currentMonth && !isPast && setHoveredDate(item.dateKey)}
                                    onMouseLeave={() => setHoveredDate(null)}
                                    title={
                                        isBooked ? 'Already booked'
                                            : isPast ? 'Past date'
                                                : selectionStep === 'end' && item.dateKey <= pendingStart ? 'Must be after pick-up date'
                                                    : `Select ${item.dateKey}`
                                    }
                                    className="d-flex flex-column align-items-center justify-content-center p-0 position-relative"
                                    style={{
                                        height: '32px',
                                        background: bg,
                                        color: textColor,
                                        border,
                                        cursor,
                                        fontWeight,
                                        boxShadow,
                                        transform,
                                        opacity,
                                        borderRadius,
                                        fontSize: '0.8rem',
                                        transition: 'all 0.15s cubic-bezier(0.4,0,0.2,1)',
                                        zIndex: (isStart || isEnd || isHover) ? 3 : 1,
                                    }}
                                >
                                    <span>{item.day}</span>
                                    {isBooked ? (
                                        <span style={{ fontSize: '0.5rem', color: '#ef4444', lineHeight: 1, marginTop: '-2px', fontWeight: 900 }}>✕</span>
                                    ) : isAvailable && !inHover ? (
                                        <span style={{
                                            width: '4px', height: '4px', borderRadius: '50%',
                                            background: '#22c55e', display: 'inline-block', marginTop: '1px',
                                            transform: isHover ? 'scale(1.4)' : 'scale(1)',
                                            transition: 'transform 0.15s ease'
                                        }} />
                                    ) : null}
                                </button>
                            );
                        })}
                    </div>

                    {/* ── Time Picker — AM row + PM row ── */}
                    <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>

                        {/* Section header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                                🕐 Pick-up Time
                            </span>
                            <span style={{
                                fontSize: '0.72rem', fontWeight: 700, color: '#38bdf8',
                                background: 'rgba(35,160,206,0.15)', border: '1px solid rgba(35,160,206,0.3)',
                                borderRadius: '99px', padding: '2px 10px',
                            }}>
                                {(() => { const [h] = pickupTime.split(':').map(Number); const ampm = h >= 12 ? 'PM' : 'AM'; return `${h % 12 || 12}:00 ${ampm}`; })()}
                            </span>
                        </div>

                        {/* Render AM and PM as separate drag-scroll rows */}
                        {[
                            { label: 'AM', slots: timeSlots.filter(s => parseInt(s.value) < 12),  scrollRef: amScrollRef, thumbRef: amThumbRef, dragging: amDragging, dragX: amDragX, dragScroll: amDragScroll, hasDragged: amHasDragged },
                            { label: 'PM', slots: timeSlots.filter(s => parseInt(s.value) >= 12), scrollRef: pmScrollRef, thumbRef: pmThumbRef, dragging: pmDragging, dragX: pmDragX, dragScroll: pmDragScroll, hasDragged: pmHasDragged },
                        ].map(group => {

                            const syncThumb = (el, thumbEl) => {
                                if (!el || !thumbEl) return;
                                const scrollable = el.scrollWidth - el.clientWidth;
                                if (scrollable <= 0) { thumbEl.style.width = '100%'; thumbEl.style.left = '0'; return; }
                                const ratio  = el.scrollLeft / scrollable;
                                const trackW = el.clientWidth;
                                const thumbW = Math.max(32, (el.clientWidth / el.scrollWidth) * trackW);
                                thumbEl.style.width = thumbW + 'px';
                                thumbEl.style.left  = ratio * (trackW - thumbW) + 'px';
                            };

                            return (
                                <div key={group.label} style={{ marginBottom: '10px' }}>

                                    {/* Row label */}
                                    <div style={{ fontSize: '0.65rem', color: '#475569', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '5px' }}>
                                        {group.label}
                                    </div>

                                    {/* Drag-scrollable chip strip */}
                                    <div
                                        ref={group.scrollRef}
                                        onMouseDown={(e) => {
                                            group.dragging.current  = true;
                                            group.hasDragged.current = false;
                                            group.dragX.current     = e.pageX;
                                            group.dragScroll.current = group.scrollRef.current.scrollLeft;
                                            group.scrollRef.current.style.cursor = 'grabbing';
                                        }}
                                        onMouseMove={(e) => {
                                            if (!group.dragging.current) return;
                                            const dx = e.pageX - group.dragX.current;
                                            if (Math.abs(dx) > 5) group.hasDragged.current = true; // threshold
                                            if (!group.hasDragged.current) return;
                                            group.scrollRef.current.scrollLeft = group.dragScroll.current - dx;
                                            syncThumb(group.scrollRef.current, group.thumbRef.current);
                                        }}
                                        onMouseUp={() => {
                                            group.dragging.current = false;
                                            if (group.scrollRef.current) group.scrollRef.current.style.cursor = 'grab';
                                        }}
                                        onMouseLeave={() => {
                                            group.dragging.current = false;
                                            if (group.scrollRef.current) group.scrollRef.current.style.cursor = 'grab';
                                        }}
                                        onScroll={() => syncThumb(group.scrollRef.current, group.thumbRef.current)}
                                        style={{
                                            display: 'flex',
                                            gap: '6px',
                                            overflowX: 'auto',
                                            overflowY: 'hidden',
                                            scrollbarWidth: 'none',
                                            msOverflowStyle: 'none',
                                            cursor: 'grab',
                                            paddingBottom: '4px',
                                            userSelect: 'none',
                                        }}
                                    >
                                        {group.slots.map(slot => {
                                            const isSelected = pickupTime === slot.value;
                                            return (
                                                <button
                                                    key={slot.value}
                                                    type="button"
                                                    onClick={() => {
                                                        // Suppress click if the user was dragging
                                                        if (group.hasDragged.current) {
                                                            group.hasDragged.current = false;
                                                            return;
                                                        }
                                                        onTimeChange?.(slot.value);
                                                    }}
                                                    style={{
                                                        flexShrink: 0,
                                                        padding: '5px 13px',
                                                        borderRadius: '8px',
                                                        border: isSelected ? '1px solid #23A0CE' : '1px solid rgba(255,255,255,0.08)',
                                                        background: isSelected ? 'rgba(35,160,206,0.22)' : 'rgba(255,255,255,0.04)',
                                                        color: isSelected ? '#38bdf8' : '#64748b',
                                                        fontSize: '0.73rem',
                                                        fontWeight: isSelected ? 700 : 400,
                                                        cursor: 'pointer',
                                                        transition: 'all 0.15s ease',
                                                        whiteSpace: 'nowrap',
                                                        pointerEvents: 'all',
                                                        boxShadow: isSelected ? '0 0 10px rgba(35,160,206,0.3)' : 'none',
                                                        transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                                                    }}
                                                >
                                                    {slot.label}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Custom scrollbar track */}
                                    <div
                                        style={{ position: 'relative', height: '5px', background: 'rgba(255,255,255,0.05)', borderRadius: '99px', marginTop: '5px', cursor: 'pointer' }}
                                        onClick={(e) => {
                                            const el = group.scrollRef.current;
                                            if (!el) return;
                                            const rect  = e.currentTarget.getBoundingClientRect();
                                            const ratio = (e.clientX - rect.left) / rect.width;
                                            el.scrollLeft = ratio * (el.scrollWidth - el.clientWidth);
                                        }}
                                    >
                                        <div
                                            ref={group.thumbRef}
                                            onMouseDown={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                const startX = e.clientX;
                                                const startScroll = group.scrollRef.current?.scrollLeft || 0;
                                                const onMove = (ev) => {
                                                    const el = group.scrollRef.current;
                                                    if (!el) return;
                                                    const dx        = ev.clientX - startX;
                                                    const trackW    = el.clientWidth;
                                                    const scrollRange = el.scrollWidth - el.clientWidth;
                                                    const thumbW    = Math.max(32, (el.clientWidth / el.scrollWidth) * trackW);
                                                    const ratio     = dx / (trackW - thumbW);
                                                    el.scrollLeft   = Math.min(scrollRange, Math.max(0, startScroll + ratio * scrollRange));
                                                    syncThumb(el, group.thumbRef.current);
                                                };
                                                const onUp = () => {
                                                    window.removeEventListener('mousemove', onMove);
                                                    window.removeEventListener('mouseup', onUp);
                                                };
                                                window.addEventListener('mousemove', onMove);
                                                window.addEventListener('mouseup', onUp);
                                            }}
                                            style={{
                                                position: 'absolute', top: 0, left: 0,
                                                height: '5px', width: '50%',
                                                background: 'rgba(35,160,206,0.45)',
                                                borderRadius: '99px',
                                                cursor: 'grab',
                                                transition: 'background 0.15s ease',
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(35,160,206,0.85)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(35,160,206,0.45)'}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* ── Legend ── */}
                    <div className="d-flex align-items-center justify-content-between flex-wrap mt-3"
                        style={{ fontSize: '0.7rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
                        <div className="d-flex align-items-center gap-1">
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                            <span style={{ color: '#ef4444' }}>Booked</span>
                        </div>
                        <div className="d-flex align-items-center gap-1">
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#23A0CE', display: 'inline-block' }} />
                            <span style={{ color: '#38bdf8' }}>Selected</span>
                        </div>
                        <div className="d-flex align-items-center gap-1">
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(35,160,206,0.3)', display: 'inline-block' }} />
                            <span style={{ color: '#7dd3fc' }}>Range</span>
                        </div>
                        <div className="d-flex align-items-center gap-1">
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                            <span style={{ color: '#94a3b8' }}>Available</span>
                        </div>
                    </div>
                </div>
            </>
            )}
        </div>
    );
};

export default RentalDatePicker;
