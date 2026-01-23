
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Generic export to Excel
export const exportToExcel = (data: any[], fileName: string) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan');
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

// Generic export to PDF
export const exportToPDF = (
  title: string,
  columns: string[],
  rows: any[][],
  fileName: string
) => {
  const doc = new jsPDF();
  
  doc.setFontSize(16);
  doc.text(title, 14, 15);
  doc.setFontSize(10);
  doc.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID')}`, 14, 22);

  autoTable(doc, {
    head: [columns],
    body: rows,
    startY: 28,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' }, // Blue secondary color
    alternateRowStyles: { fillColor: [248, 250, 252] }, // Light slate
    theme: 'grid'
  });

  doc.save(`${fileName}.pdf`);
};

export const parseCSV = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const bstr = event.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
                
                if (!data || data.length === 0) {
                    resolve([]);
                    return;
                }

                // Clean headers: trim whitespace and lowercase for consistent matching
                const headers = (data[0] as string[]).map(h => h?.toString().trim().toLowerCase() || '');
                
                const jsonData = data.slice(1).map((row: any) => {
                    const rowData: {[key: string]: any} = {};
                    // Only map if row has content
                    if (row && row.length > 0) {
                        headers.forEach((header, index) => {
                            if(header) {
                                rowData[header] = row[index];
                            }
                        });
                        return rowData;
                    }
                    return null;
                }).filter(r => r !== null); // Remove empty rows

                resolve(jsonData);
            } catch (e) {
                reject(e);
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsBinaryString(file);
    });
};
