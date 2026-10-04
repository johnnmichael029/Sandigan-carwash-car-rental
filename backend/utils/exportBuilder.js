const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

/**
 * Formats a value according to column type
 */
function formatCell(val, type) {
    if (val === null || val === undefined) return '';
    if (type === 'money') {
        const num = Number(val) || 0;
        return `₱${num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (type === 'date') {
        const d = new Date(val);
        return isNaN(d.getTime()) ? String(val) : d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
    }
    if (type === 'datetime') {
        const d = new Date(val);
        return isNaN(d.getTime()) ? String(val) : d.toLocaleString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
    if (type === 'bool') {
        return val ? 'Yes' : 'No';
    }
    return String(val);
}

/**
 * Builds a CSV string from rows & column definitions
 */
function buildCSV(columns, rows) {
    const safeRows = Array.isArray(rows) ? rows : [];
    const headers = columns.map(c => `"${String(c.header || '').replace(/"/g, '""')}"`).join(',');
    const bodyLines = safeRows.map(row => {
        if (!row || typeof row !== 'object') return '';
        return columns.map(col => {
            const rawVal = row[col.key];
            const formatted = formatCell(rawVal, col.type);
            return `"${String(formatted).replace(/"/g, '""')}"`;
        }).join(',');
    });
    return '\uFEFF' + [headers, ...bodyLines].join('\r\n');
}

/**
 * Builds an Excel buffer (.xlsx) with styled header row & auto-column widths
 */
async function buildExcel(columns, rows, title = 'Export Report') {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sandigan Carwash & Car Rental System';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(title.slice(0, 31));

    // Define columns
    sheet.columns = columns.map(col => ({
        header: col.header,
        key: col.key,
        width: col.width || 20
    }));

    // Style Header Row
    const headerRow = sheet.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
        cell.font = { name: 'Poppins', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF1E293B' } // Dark Slate 800
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
            bottom: { style: 'medium', color: { argb: 'FF23A0CE' } }
        };
    });

    // Add Data Rows
    rows.forEach(row => {
        const rowData = {};
        columns.forEach(col => {
            const rawVal = row[col.key];
            if (col.type === 'money' || col.type === 'number') {
                rowData[col.key] = Number(rawVal) || 0;
            } else {
                rowData[col.key] = formatCell(rawVal, col.type);
            }
        });
        const addedRow = sheet.addRow(rowData);
        addedRow.height = 20;

        // Apply number formatting for currency columns
        columns.forEach((col, colIdx) => {
            if (col.type === 'money') {
                const cell = addedRow.getCell(colIdx + 1);
                cell.numFmt = '"₱"#,##0.00';
            }
        });
    });

    // Gridlines enabled
    sheet.views = [{ showGridLines: true }];

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
}

/**
 * Builds a clean PDF document buffer
 */
function buildPDF(columns, rows, title = 'Export Report') {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 30, size: 'A4', layout: columns.length > 6 ? 'landscape' : 'portrait' });
            const buffers = [];

            doc.on('data', b => buffers.push(b));
            doc.on('end', () => resolve(Buffer.concat(buffers)));

            // Header Banner
            doc.rect(0, 0, doc.page.width, 50).fill('#1E293B');
            doc.fillColor('#FFFFFF').fontSize(16).font('Helvetica-Bold').text(`SANDIGAN — ${title.toUpperCase()}`, 30, 16);
            doc.fontSize(9).font('Helvetica').text(`Generated on ${new Date().toLocaleString('en-PH')}`, 30, 34);

            doc.moveDown(3);
            doc.fillColor('#000000');

            // Table Drawing
            const startY = 70;
            let currentY = startY;
            const pageWidth = doc.page.width - 60;
            const colWidth = pageWidth / columns.length;

            // Draw Header
            doc.rect(30, currentY, pageWidth, 20).fill('#23A0CE');
            doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold');
            columns.forEach((col, i) => {
                doc.text(col.header, 35 + (i * colWidth), currentY + 5, { width: colWidth - 10, truncate: true });
            });

            currentY += 22;
            doc.fillColor('#334155').font('Helvetica').fontSize(8);

            rows.slice(0, 2000).forEach((row, rowIndex) => {
                if (currentY > doc.page.height - 40) {
                    doc.addPage();
                    currentY = 30;
                }

                if (rowIndex % 2 === 1) {
                    doc.rect(30, currentY - 2, pageWidth, 18).fill('#F8FAFC');
                    doc.fillColor('#334155');
                }

                columns.forEach((col, i) => {
                    const text = formatCell(row[col.key], col.type);
                    doc.text(String(text), 35 + (i * colWidth), currentY, { width: colWidth - 10, truncate: true });
                });

                currentY += 18;
            });

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

module.exports = {
    buildCSV,
    buildExcel,
    buildPDF,
    formatCell
};
