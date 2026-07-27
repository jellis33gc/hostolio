import { jsPDF } from 'jspdf';

/**
 * Builds a simple invoice PDF and returns a Blob.
 */
export function buildInvoicePdf({ company, customer, lineItems, issuedAt, dueDate, invoiceNumber }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = margin;

  const brandColor = company?.brand_primary_color || '#111827';

  doc.setFontSize(20);
  doc.setTextColor(brandColor);
  doc.text(company?.name || 'Invoice', margin, y);
  doc.setFontSize(11);
  doc.setTextColor('#6b7280');
  doc.text(`Invoice ${invoiceNumber}`, pageWidth - margin - 100, y - 4);
  y += 30;

  doc.setDrawColor('#e5e7eb');
  doc.line(margin, y, pageWidth - margin, y);
  y += 20;

  doc.setFontSize(10);
  doc.setTextColor('#6b7280');
  doc.text('Bill to', margin, y);
  doc.text('Issued', margin + 220, y);
  doc.text('Due', margin + 340, y);
  y += 14;
  doc.setTextColor('#111827');
  doc.setFontSize(11);
  doc.text(customer?.name || '—', margin, y);
  doc.setFontSize(10);
  doc.text(issuedAt ? new Date(issuedAt).toLocaleDateString() : '—', margin + 220, y);
  doc.text(dueDate ? new Date(dueDate).toLocaleDateString() : '—', margin + 340, y);
  y += 30;

  doc.setFontSize(10);
  doc.setTextColor('#6b7280');
  doc.text('Description', margin, y);
  doc.text('Amount', pageWidth - margin - 60, y);
  y += 8;
  doc.setDrawColor('#e5e7eb');
  doc.line(margin, y, pageWidth - margin, y);
  y += 16;

  doc.setTextColor('#111827');
  let total = 0;
  for (const item of lineItems) {
    if (y > 720) { doc.addPage(); y = margin; }
    const lines = doc.splitTextToSize(item.description || '', pageWidth - margin * 2 - 100);
    doc.text(lines, margin, y);
    doc.text(`£${Number(item.amount || 0).toFixed(2)}`, pageWidth - margin - 60, y);
    total += Number(item.amount || 0);
    y += lines.length * 13 + 8;
  }

  y += 8;
  doc.setDrawColor('#e5e7eb');
  doc.line(margin, y, pageWidth - margin, y);
  y += 20;
  doc.setFontSize(13);
  doc.setTextColor(brandColor);
  doc.text('Total', margin, y);
  doc.text(`£${total.toFixed(2)}`, pageWidth - margin - 60, y);

  return doc.output('blob');
}
