/**
 * Payroll Calculation Utility (Philippines Standards 2024/2025)
 */

/**
 * Calculates PhilHealth Contribution (5% of Basic Salary, 50/50 split)
 * @param {number} basicSalary 
 * @returns {object} { employee: number, employer: number, total: number }
 */
const calculatePhilHealth = (basicSalary) => {
    // Current PhilHealth rate is 5.0% for 2024/2025
    // Monthly Basic Salary ceiling of 100k, floor of 10k
    const cappedSalary = Math.min(Math.max(basicSalary, 10000), 100000);
    const total = cappedSalary * 0.05;
    const share = total / 2;
    return {
        employee: Math.round(share * 100) / 100,
        employer: Math.round(share * 100) / 100,
        total: Math.round(total * 100) / 100
    };
};

/**
 * Calculates Pag-IBIG (HDMF) Contribution
 * @param {number} basicSalary 
 * @returns {object} { employee: number, employer: number, total: number }
 */
const calculateHDMF = (basicSalary) => {
    // Standard Pag-IBIG contribution is ₱200 EE / ₱200 ER for salary above 1500
    // Recent 2024 update increased to ₱200 base for most
    if (basicSalary <= 0) return { employee: 0, employer: 0, total: 0 };

    return {
        employee: 200,
        employer: 200,
        total: 400
    };
};

/**
 * Calculates Simplified SSS Contribution (2025 Estimates)
 * @param {number} basicSalary 
 * @returns {object} { employee: number, employer: number, total: number }
 */
const calculateSSS = (basicSalary) => {
    if (basicSalary <= 0) return { employee: 0, employer: 0, total: 0 };

    // SSS uses a bracket table. For simplicity in this app, we use 
    // the 14% total rate (4.5% EE, 9.5% ER) with a cap at 30k MSC.
    const msc = Math.min(Math.max(Math.ceil(basicSalary / 500) * 500, 4000), 30000);

    return {
        employee: Math.round(msc * 0.045 * 100) / 100,
        employer: Math.round(msc * 0.095 * 100) / 100,
        total: Math.round(msc * 0.14 * 100) / 100
    };
};

/**
 * Calculates BIR Withholding Tax (WHT) based on TRAIN Law Monthly Table
 * @param {number} taxableIncome (Gross - Mandatory EE share)
 * @returns {number}
 */
const calculateWithholdingTax = (taxableIncome) => {
    if (taxableIncome <= 20833) return 0;

    if (taxableIncome <= 33332) {
        return (taxableIncome - 20833) * 0.15;
    }

    if (taxableIncome <= 66666) {
        return 1875 + (taxableIncome - 33333) * 0.20;
    }

    if (taxableIncome <= 166666) {
        return 8541.67 + (taxableIncome - 66667) * 0.25;
    }

    if (taxableIncome <= 666666) {
        return 33541.67 + (taxableIncome - 166667) * 0.30;
    }

    return 183541.67 + (taxableIncome - 666667) * 0.35;
};

/**
 * Calculates overlap minutes between two time ranges [start1, end1] and [start2, end2]
 */
const getOverlapMinutes = (s1, e1, s2, e2) => {
    const start = s1 > s2 ? s1 : s2;
    const end = e1 < e2 ? e1 : e2;
    const diff = Math.floor((end - start) / 60000);
    return diff > 0 ? diff : 0;
};

/**
 * Calculates total minutes worked within the Night Differential window (10 PM to 6 AM)
 * @param {Date} clockIn 
 * @param {Date} clockOut 
 * @returns {number} minutes
 */
const calculateNightDiffMinutes = (clockIn, clockOut) => {
    if (!clockIn || !clockOut || clockIn >= clockOut) return 0;

    let totalNDMinutes = 0;
    let current = new Date(clockIn);
    current.setHours(0, 0, 0, 0); // Start of the clock-in day

    // We check the day of clock-in and the next day (in case they worked > 24h or across midnight)
    // Most shifts are < 14h, so checking Day 0 and Day 1 is enough.
    for (let i = 0; i < 2; i++) {
        const date = new Date(current);
        date.setDate(date.getDate() + i);

        // Window A: 10 PM (Day N) to Midnight (Day N+1)
        const windowA_Start = new Date(date); windowA_Start.setHours(22, 0, 0, 0);
        const windowA_End = new Date(date); windowA_End.setHours(24, 0, 0, 0);
        totalNDMinutes += getOverlapMinutes(clockIn, clockOut, windowA_Start, windowA_End);

        // Window B: Midnight (Day N) to 6 AM (Day N)
        const windowB_Start = new Date(date); windowB_Start.setHours(0, 0, 0, 0);
        const windowB_End = new Date(date); windowB_End.setHours(6, 0, 0, 0);
        totalNDMinutes += getOverlapMinutes(clockIn, clockOut, windowB_Start, windowB_End);
    }

    return totalNDMinutes;
};

module.exports = {
    calculatePhilHealth,
    calculateHDMF,
    calculateSSS,
    calculateWithholdingTax,
    calculateNightDiffMinutes
};
