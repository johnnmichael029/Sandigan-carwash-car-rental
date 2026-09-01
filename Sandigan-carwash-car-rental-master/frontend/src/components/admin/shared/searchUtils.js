/**
 * Global functional utility to robustly filter lists by search terms.
 * Handles Name, ID, Tags checking and robust Date matching (e.g. 4/3, April, Apr)
 */

const getNestedProperty = (obj, path) => {
    if (!path || !obj) return null;
    return path.split('.').reduce((o, i) => o ? o[i] : null, obj);
};

export const filterDataBySearch = (dataList, searchTerm, textFields = [], dateFields = []) => {
    if (!searchTerm || !searchTerm.trim()) return dataList;

    const lowSearch = searchTerm.toLowerCase().trim();

    // 1. Pre-process numeric date matching (e.g. "4/3", "4/3/2026")
    let numMatchData = null;
    if (lowSearch.includes('/')) {
        const parts = lowSearch.split('/');
        const m = parseInt(parts[0]);
        const d = parseInt(parts[1]);
        const y = parts[2] ? parseInt(parts[2]) : null;

        if (!isNaN(m) && !isNaN(d)) {
            numMatchData = { m, d, y };
        }
    }

    return dataList.filter(item => {
        // --- TEXT FIELDS CHECK ---
        const textMatch = textFields.some(field => {
            const val = getNestedProperty(item, field);
            return val && String(val).toLowerCase().includes(lowSearch);
        });

        if (textMatch) return true;

        // --- DATE FIELDS CHECK ---
        if (dateFields && dateFields.length > 0) {
            const dateMatch = dateFields.some(field => {
                const dateVal = getNestedProperty(item, field);
                if (!dateVal) return false;

                const dateObj = new Date(dateVal);
                if (isNaN(dateObj.getTime())) return false; // Not a valid date

                // Standard string matching for months ("april", "apr")
                const dateStr = dateObj.toLocaleDateString('en-PH').toLowerCase();
                const monthName = dateObj.toLocaleString('default', { month: 'long' }).toLowerCase();
                const monthShort = dateObj.toLocaleString('default', { month: 'short' }).toLowerCase();

                if (dateStr.includes(lowSearch) || monthName.includes(lowSearch) || monthShort.includes(lowSearch)) {
                    return true;
                }

                // Numeric shorthand matching ("4/3" -> April 3)
                if (numMatchData) {
                    // getMonth() is 0-indexed where Jan is 0, Dec is 11
                    const isMonthDayMatch = (dateObj.getMonth() + 1 === numMatchData.m && dateObj.getDate() === numMatchData.d);
                    
                    if (numMatchData.y && isMonthDayMatch) {
                        const fullYear = dateObj.getFullYear();
                        if (numMatchData.y < 100) {
                            return (fullYear % 100 === numMatchData.y); // e.g. "26" matched against 2026
                        } else {
                            return fullYear === numMatchData.y;
                        }
                    }
                    return isMonthDayMatch;
                }

                return false;
            });

            if (dateMatch) return true;
        }

        return false;
    });
};
