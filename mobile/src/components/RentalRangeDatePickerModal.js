import React, { useState, useMemo } from 'react';
import {
    View, Text, StyleSheet, Modal, TouchableOpacity,
    ScrollView, Dimensions
} from 'react-native';

const { width } = Dimensions.get('window');

const TIME_SLOTS = [
    '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
    '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM',
    '06:00 PM', '07:00 PM', '08:00 PM'
];

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

function formatDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export default function RentalRangeDatePickerModal({
    visible,
    onClose,
    startDate,
    endDate,
    pickupTime = '08:00 AM',
    bookedDates = [],
    onConfirm,
    COLORS
}) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = formatDateKey(today);

    // Month navigator state
    const [viewYear, setViewYear] = useState(() => {
        if (startDate) return new Date(startDate).getFullYear();
        return today.getFullYear();
    });
    const [viewMonth, setViewMonth] = useState(() => {
        if (startDate) return new Date(startDate).getMonth();
        return today.getMonth();
    });

    // Temporary selection inside modal
    const [tempStart, setTempStart] = useState(startDate || null);
    const [tempEnd, setTempEnd] = useState(endDate || null);
    const [tempTime, setTempTime] = useState(pickupTime || '08:00 AM');
    const [errorMessage, setErrorMessage] = useState('');

    // Generate days in month
    const calendarDays = useMemo(() => {
        const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
        const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

        const cells = [];
        // Empty offset cells for starting day
        for (let i = 0; i < firstDayOfMonth; i++) {
            cells.push({ empty: true, key: `empty-${i}` });
        }
        // Actual days
        for (let d = 1; d <= daysInMonth; d++) {
            const dateObj = new Date(viewYear, viewMonth, d);
            const dateKey = formatDateKey(dateObj);
            cells.push({
                empty: false,
                dayNumber: d,
                dateKey,
                dateObj
            });
        }
        return cells;
    }, [viewYear, viewMonth]);

    const isPrevMonthDisabled = useMemo(() => {
        return viewYear === today.getFullYear() && viewMonth <= today.getMonth();
    }, [viewYear, viewMonth, today]);

    const handlePrevMonth = () => {
        if (isPrevMonthDisabled) return;
        if (viewMonth === 0) {
            setViewMonth(11);
            setViewYear(v => v - 1);
        } else {
            setViewMonth(v => v - 1);
        }
    };

    const handleNextMonth = () => {
        if (viewMonth === 11) {
            setViewMonth(0);
            setViewYear(v => v + 1);
        } else {
            setViewMonth(v => v + 1);
        }
    };

    const hasBookedConflict = (startStr, endStr) => {
        const s = new Date(startStr);
        const e = new Date(endStr);
        const cur = new Date(s);
        while (cur <= e) {
            const key = formatDateKey(cur);
            if (bookedDates.includes(key)) return true;
            cur.setDate(cur.getDate() + 1);
        }
        return false;
    };

    const handleDayPress = (item) => {
        setErrorMessage('');
        const { dateKey } = item;

        // If clicking a booked date
        if (bookedDates.includes(dateKey)) {
            setErrorMessage('This date is already reserved for this vehicle.');
            return;
        }

        // If clicking in the past
        if (dateKey < todayStr) return;

        // Scenario 1: No start date chosen yet OR both start and end were already chosen (start over)
        if (!tempStart || (tempStart && tempEnd)) {
            setTempStart(dateKey);
            setTempEnd(null);
            return;
        }

        // Scenario 2: Start date chosen, picking end date
        if (tempStart && !tempEnd) {
            if (dateKey < tempStart) {
                // Tapped before start -> reset start date to this tapped date
                setTempStart(dateKey);
                return;
            }

            if (dateKey === tempStart) {
                // Same day rental (1 day)
                setTempEnd(dateKey);
                return;
            }

            // Check if there are booked dates in between
            if (hasBookedConflict(tempStart, dateKey)) {
                setErrorMessage('Selected range overlaps with already booked dates. Pick an earlier return date.');
                return;
            }

            setTempEnd(dateKey);
        }
    };

    // Calculate duration in days
    const durationDays = useMemo(() => {
        if (!tempStart || !tempEnd) return 0;
        const diff = new Date(tempEnd) - new Date(tempStart);
        return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }, [tempStart, tempEnd]);

    const handleSave = () => {
        if (!tempStart || !tempEnd) {
            setErrorMessage('Please select both pick-up and return dates.');
            return;
        }
        onConfirm({
            startDate: tempStart,
            endDate: tempEnd,
            pickupTime: tempTime,
            durationDays
        });
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={[styles.modalCard, { backgroundColor: COLORS.cardBackground || '#0f172a' }]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View>
                            <Text style={[styles.title, { color: COLORS.text }]}>Select Rental Period</Text>
                            <Text style={styles.subtitle}>Tap 1: Pick-up date · Tap 2: Return date</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Text style={styles.closeText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Step Hint / Error Bar */}
                    {errorMessage ? (
                        <View style={styles.errorBanner}>
                            <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
                        </View>
                    ) : (
                        <View style={styles.hintBanner}>
                            <Text style={styles.hintText}>
                                {!tempStart
                                    ? '👉 1. Choose your Pick-up date'
                                    : !tempEnd
                                        ? '👉 2. Choose your Return date'
                                        : `✓ Range: ${tempStart} to ${tempEnd} (${durationDays} Day${durationDays > 1 ? 's' : ''})`}
                            </Text>
                        </View>
                    )}

                    {/* Month Navigator */}
                    <View style={styles.monthNav}>
                        <TouchableOpacity
                            onPress={handlePrevMonth}
                            disabled={isPrevMonthDisabled}
                            style={[styles.navBtn, isPrevMonthDisabled && { opacity: 0.3 }]}
                        >
                            <Text style={[styles.navBtnText, { color: COLORS.text }]}>‹</Text>
                        </TouchableOpacity>
                        <Text style={[styles.monthTitle, { color: COLORS.text }]}>
                            {MONTH_NAMES[viewMonth]} {viewYear}
                        </Text>
                        <TouchableOpacity onPress={handleNextMonth} style={styles.navBtn}>
                            <Text style={[styles.navBtnText, { color: COLORS.text }]}>›</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Day of Week Labels */}
                    <View style={styles.weekdayRow}>
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d, i) => (
                            <Text
                                key={d}
                                style={[
                                    styles.weekdayText,
                                    i === 0 || i === 6 ? { color: '#23A0CE' } : { color: COLORS.textMuted || '#94a3b8' }
                                ]}
                            >
                                {d}
                            </Text>
                        ))}
                    </View>

                    {/* Calendar Grid */}
                    <View style={styles.grid}>
                        {calendarDays.map((item, idx) => {
                            if (item.empty) {
                                return <View key={item.key} style={styles.dayCell} />;
                            }

                            const isPast = item.dateKey < todayStr;
                            const isBooked = bookedDates.includes(item.dateKey);
                            const isStart = item.dateKey === tempStart;
                            const isEnd = item.dateKey === tempEnd;
                            const isInRange = tempStart && tempEnd && item.dateKey > tempStart && item.dateKey < tempEnd;

                            let cellStyle = styles.dayCell;
                            let bgStyle = null;
                            let textStyle = { color: COLORS.text, fontWeight: '600' };

                            if (isPast) {
                                textStyle = { color: '#475569', fontWeight: '400' };
                            } else if (isBooked) {
                                bgStyle = styles.cellBooked;
                                textStyle = { color: '#ef4444', fontWeight: '800' };
                            } else if (isStart || isEnd) {
                                bgStyle = styles.cellSelected;
                                textStyle = { color: '#ffffff', fontWeight: '800' };
                            } else if (isInRange) {
                                bgStyle = styles.cellInRange;
                                textStyle = { color: '#23A0CE', fontWeight: '700' };
                            }

                            return (
                                <TouchableOpacity
                                    key={item.dateKey}
                                    style={[cellStyle, bgStyle]}
                                    disabled={isPast || isBooked}
                                    onPress={() => handleDayPress(item)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.dayText, textStyle]}>
                                        {item.dayNumber}
                                    </Text>
                                    {isBooked && (
                                        <Text style={styles.bookedTiny}>Booked</Text>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Legend */}
                    <View style={styles.legendRow}>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: '#23A0CE' }]} />
                            <Text style={styles.legendLabel}>Selected</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: 'rgba(239,68,68,0.2)', borderColor: '#ef4444', borderWidth: 1 }]} />
                            <Text style={styles.legendLabel}>Reserved</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: 'transparent', borderColor: '#475569', borderWidth: 1 }]} />
                            <Text style={styles.legendLabel}>Available</Text>
                        </View>
                    </View>

                    {/* Pick-up Time Selector */}
                    <View style={styles.timeSection}>
                        <Text style={[styles.timeLabel, { color: COLORS.text }]}>Pick-up Time</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timeScroll}>
                            {TIME_SLOTS.map(t => (
                                <TouchableOpacity
                                    key={t}
                                    style={[
                                        styles.timeChip,
                                        tempTime === t && styles.timeChipActive
                                    ]}
                                    onPress={() => setTempTime(t)}
                                >
                                    <Text style={[styles.timeChipText, tempTime === t && styles.timeChipTextActive]}>
                                        {t}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.confirmBtn,
                                (!tempStart || !tempEnd) && { opacity: 0.4 }
                            ]}
                            disabled={!tempStart || !tempEnd}
                            onPress={handleSave}
                        >
                            <Text style={styles.confirmBtnText}>
                                {durationDays > 0 ? `Apply ${durationDays} Day${durationDays > 1 ? 's' : ''}` : 'Confirm Dates'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end'
    },
    modalCard: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        paddingBottom: 34,
        maxHeight: '92%'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12
    },
    title: {
        fontSize: 18,
        fontWeight: '800'
    },
    subtitle: {
        fontSize: 12,
        color: '#94a3b8',
        marginTop: 2
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.08)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    closeText: {
        color: '#94a3b8',
        fontSize: 16,
        fontWeight: 'bold'
    },
    hintBanner: {
        backgroundColor: 'rgba(35,160,206,0.12)',
        borderRadius: 10,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: 'rgba(35,160,206,0.3)',
        marginBottom: 14
    },
    hintText: {
        color: '#38bdf8',
        fontSize: 12,
        fontWeight: '700',
        textAlign: 'center'
    },
    errorBanner: {
        backgroundColor: 'rgba(239,68,68,0.12)',
        borderRadius: 10,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: 'rgba(239,68,68,0.3)',
        marginBottom: 14
    },
    errorText: {
        color: '#f87171',
        fontSize: 12,
        fontWeight: '700',
        textAlign: 'center'
    },
    monthNav: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingHorizontal: 6
    },
    navBtn: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.06)'
    },
    navBtnText: {
        fontSize: 18,
        fontWeight: '800'
    },
    monthTitle: {
        fontSize: 15,
        fontWeight: '800'
    },
    weekdayRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 8
    },
    weekdayText: {
        fontSize: 12,
        fontWeight: '700',
        width: (width - 40) / 7,
        textAlign: 'center'
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap'
    },
    dayCell: {
        width: (width - 40) / 7,
        height: 42,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
        marginVertical: 2
    },
    cellBooked: {
        backgroundColor: 'rgba(239,68,68,0.18)',
        borderWidth: 1,
        borderColor: 'rgba(239,68,68,0.4)',
        borderRadius: 8
    },
    cellSelected: {
        backgroundColor: '#23A0CE',
        borderRadius: 8
    },
    cellInRange: {
        backgroundColor: 'rgba(35,160,206,0.2)',
        borderRadius: 0
    },
    dayText: {
        fontSize: 14
    },
    bookedTiny: {
        fontSize: 8,
        color: '#ef4444',
        fontWeight: '700',
        marginTop: -2
    },
    legendRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 16,
        marginTop: 10,
        marginBottom: 14
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 5
    },
    legendLabel: {
        fontSize: 11,
        color: '#94a3b8'
    },
    timeSection: {
        marginTop: 6,
        marginBottom: 16
    },
    timeLabel: {
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 8
    },
    timeScroll: {
        gap: 8,
        paddingVertical: 2
    },
    timeChip: {
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)'
    },
    timeChipActive: {
        backgroundColor: 'rgba(35,160,206,0.2)',
        borderColor: '#23A0CE'
    },
    timeChipText: {
        fontSize: 12,
        color: '#94a3b8',
        fontWeight: '600'
    },
    timeChipTextActive: {
        color: '#23A0CE',
        fontWeight: '800'
    },
    footer: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 6
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: 13,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.06)',
        alignItems: 'center'
    },
    cancelBtnText: {
        color: '#94a3b8',
        fontWeight: '700',
        fontSize: 14
    },
    confirmBtn: {
        flex: 2,
        paddingVertical: 13,
        borderRadius: 12,
        backgroundColor: '#23A0CE',
        alignItems: 'center'
    },
    confirmBtnText: {
        color: '#ffffff',
        fontWeight: '800',
        fontSize: 14
    }
});
