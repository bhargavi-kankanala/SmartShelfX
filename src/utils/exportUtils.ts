import { Product, Transaction, Vendor, PurchaseOrder } from '@/types/inventory';

// CSV Export
export const exportToCSV = (data: any[], filename: string, headers?: string[]) => {
  if (data.length === 0) return;

  const keys = headers || Object.keys(data[0]);
  const csvContent = [
    keys.join(','),
    ...data.map(item =>
      keys.map(key => {
        const value = item[key];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        if (value instanceof Date) return value.toISOString();
        return String(value);
      }).join(',')
    )
  ].join('\n');

  downloadFile(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8;');
};

// Excel Export (using CSV with Excel-compatible encoding)
export const exportToExcel = (data: any[], filename: string, headers?: string[]) => {
  if (data.length === 0) return;

  const keys = headers || Object.keys(data[0]);
  const BOM = '\uFEFF';
  const csvContent = BOM + [
    keys.join('\t'),
    ...data.map(item =>
      keys.map(key => {
        const value = item[key];
        if (value === null || value === undefined) return '';
        if (value instanceof Date) return value.toLocaleDateString();
        return String(value).replace(/\t/g, ' ');
      }).join('\t')
    )
  ].join('\n');

  downloadFile(csvContent, `${filename}.xls`, 'application/vnd.ms-excel;charset=utf-8;');
};

// PDF Export
export const exportToPDF = async (title: string, data: any[], columns: { header: string; key: string }[]) => {
  // Dynamic import jspdf
  const { default: jsPDF } = await import('jspdf');
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = 30;

  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(title, pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Table headers
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  const colWidth = (pageWidth - margin * 2) / columns.length;
  
  columns.forEach((col, i) => {
    doc.text(col.header, margin + i * colWidth, yPos);
  });
  yPos += 8;

  // Draw header line
  doc.setDrawColor(200);
  doc.line(margin, yPos - 3, pageWidth - margin, yPos - 3);

  // Table data
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  data.forEach((item, rowIndex) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 30;
    }

    columns.forEach((col, i) => {
      let value = item[col.key];
      if (value === null || value === undefined) value = '-';
      if (value instanceof Date) value = value.toLocaleDateString();
      
      // Truncate long text
      const text = String(value).substring(0, 20);
      doc.text(text, margin + i * colWidth, yPos);
    });
    
    yPos += 7;

    // Add alternating row background
    if (rowIndex % 10 === 9) {
      doc.setDrawColor(230);
      doc.line(margin, yPos, pageWidth - margin, yPos);
    }
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, 290, { align: 'center' });
    doc.text('SmartShelfX Inventory Management', margin, 290);
  }

  doc.save(`${title.replace(/\s+/g, '_')}.pdf`);
};

// Helper function
const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};

// Specific export functions
export const exportInventory = (products: Product[], format: 'csv' | 'excel' | 'pdf') => {
  const data = products.map(p => ({
    SKU: p.sku,
    Name: p.name,
    Category: p.category,
    Vendor: p.vendorName,
    Price: `$${p.price.toFixed(2)}`,
    'Current Stock': p.currentStock,
    'Reorder Level': p.reorderLevel,
    Status: p.currentStock <= p.reorderLevel ? (p.currentStock === 0 ? 'Out of Stock' : 'Low Stock') : 'In Stock',
  }));

  if (format === 'csv') {
    exportToCSV(data, 'inventory_report');
  } else if (format === 'excel') {
    exportToExcel(data, 'inventory_report');
  } else {
    exportToPDF('Inventory Report', data, [
      { header: 'SKU', key: 'SKU' },
      { header: 'Name', key: 'Name' },
      { header: 'Category', key: 'Category' },
      { header: 'Stock', key: 'Current Stock' },
      { header: 'Status', key: 'Status' },
    ]);
  }
};

export const exportTransactions = (transactions: Transaction[], format: 'csv' | 'excel' | 'pdf') => {
  const data = transactions.map(t => ({
    ID: t.id,
    Type: t.type === 'stock_in' ? 'Stock In' : 'Stock Out',
    Product: t.productName,
    SKU: t.productSku,
    Quantity: t.quantity,
    Handler: t.handler,
    Reference: t.reference || '-',
    Date: new Date(t.timestamp).toLocaleString(),
  }));

  if (format === 'csv') {
    exportToCSV(data, 'transactions_report');
  } else if (format === 'excel') {
    exportToExcel(data, 'transactions_report');
  } else {
    exportToPDF('Transactions Report', data, [
      { header: 'Type', key: 'Type' },
      { header: 'Product', key: 'Product' },
      { header: 'SKU', key: 'SKU' },
      { header: 'Qty', key: 'Quantity' },
      { header: 'Handler', key: 'Handler' },
    ]);
  }
};

export const exportVendorReport = (vendors: Vendor[], format: 'csv' | 'excel' | 'pdf') => {
  const data = vendors.map(v => ({
    Name: v.name,
    Email: v.email,
    Phone: v.phone,
    Address: v.address,
    'Products Count': v.productsCount,
    'Performance %': v.performance,
    'Member Since': new Date(v.createdAt).toLocaleDateString(),
  }));

  if (format === 'csv') {
    exportToCSV(data, 'vendor_report');
  } else if (format === 'excel') {
    exportToExcel(data, 'vendor_report');
  } else {
    exportToPDF('Vendor Performance Report', data, [
      { header: 'Vendor', key: 'Name' },
      { header: 'Email', key: 'Email' },
      { header: 'Products', key: 'Products Count' },
      { header: 'Performance', key: 'Performance %' },
    ]);
  }
};

// CSV Import Parser
export const parseCSV = (content: string): Record<string, string>[] => {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  
  return lines.slice(1).map(line => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    return headers.reduce((obj, header, i) => {
      obj[header] = values[i] || '';
      return obj;
    }, {} as Record<string, string>);
  });
};
