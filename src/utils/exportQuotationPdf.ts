import jsPDF from 'jspdf';
import type { QuotationRequest } from '../types/marketplace';

/**
 * Generates and downloads an official HealthGrid IQ Equipment Procurement Quotation PDF
 * formatted according to Malaysian healthcare institutional procurement standards.
 */
export function exportQuotationPdf(quotation: QuotationRequest): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Colors
  const primaryTeal: [number, number, number] = [15, 76, 66]; // #0F4C42
  const darkNavy: [number, number, number] = [17, 42, 40];   // #112A28
  const textMuted: [number, number, number] = [100, 116, 139]; // #64748B
  const borderGrey: [number, number, number] = [226, 232, 240]; // #E2E8F0
  const bgLight: [number, number, number] = [248, 250, 252];  // #F8FAFC

  // 1. TOP HEADER BANNER
  doc.setFillColor(...primaryTeal);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('HEALTHGRID IQ — CLINICAL EQUIPMENT MARKETPLACE', 14, 12);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text('OFFICIAL EQUIPMENT PROCUREMENT & LEASING QUOTATION', 14, 19);
  doc.text('Ministry of Health Malaysia & Authorized HealthGrid Healthcare Partners', 14, 24);

  const quoRef = quotation.quotationNumber || `RFQ-REV-${quotation.id.slice(-4)}`;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`QUOTATION NO: ${quoRef}`, pageWidth - 14, 12, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const dateStr = quotation.updatedAt
    ? new Date(quotation.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  doc.text(`Date Issued: ${dateStr}`, pageWidth - 14, 18, { align: 'right' });

  const validityDate = quotation.validUntil
    ? new Date(quotation.validUntil).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '30 Days from Issue';
  doc.text(`Valid Until: ${validityDate}`, pageWidth - 14, 24, { align: 'right' });

  let y = 35;

  // 2. RECIPIENT & FACILITY INFORMATION BOX
  doc.setFillColor(...bgLight);
  doc.rect(14, y, pageWidth - 28, 28, 'F');
  doc.setDrawColor(...borderGrey);
  doc.rect(14, y, pageWidth - 28, 28, 'S');

  // Left column: Facility & Recipient
  doc.setTextColor(...darkNavy);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('BILL TO & DELIVERY DESTINATION:', 18, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(quotation.facilityName, 18, y + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...textMuted);
  const addressLines = doc.splitTextToSize(quotation.deliveryAddress || 'Standard Delivery Facility Address', (pageWidth - 28) / 2 - 10);
  doc.text(addressLines, 18, y + 17);

  // Right column: Procurement Contact & Reference
  const rightColX = pageWidth / 2 + 5;
  doc.setTextColor(...darkNavy);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('REQUEST DETAILS & CONTACT:', rightColX, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...textMuted);
  doc.text(`Requested By: ${quotation.userName} (${quotation.userRole})`, rightColX, y + 11);
  doc.text(`Email: ${quotation.userEmail} | Tel: ${quotation.userPhone}`, rightColX, y + 16);
  doc.text(`Original RFQ Ref: ${quotation.id}`, rightColX, y + 21);
  doc.text(`Required By Date: ${quotation.requiredByDate} (Urgency: ${quotation.urgency})`, rightColX, y + 26);

  y += 34;

  // 3. EQUIPMENT ITEMS TABLE HEADER
  doc.setFillColor(...primaryTeal);
  doc.rect(14, y, pageWidth - 28, 8, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);

  doc.text('NO', 16, y + 5.5);
  doc.text('ITEM DESCRIPTION & SPECIFICATIONS', 24, y + 5.5);
  doc.text('MODE', 105, y + 5.5);
  doc.text('QTY', 123, y + 5.5, { align: 'center' });
  doc.text('UNIT PRICE (MYR)', 148, y + 5.5, { align: 'right' });
  doc.text('DISC %', 164, y + 5.5, { align: 'right' });
  doc.text('SUBTOTAL (MYR)', pageWidth - 16, y + 5.5, { align: 'right' });

  y += 8;

  // 4. EQUIPMENT ITEMS ROWS
  let itemIndex = 1;
  const items = quotation.items || [];

  items.forEach((item) => {
    // Alternate row bg
    if (itemIndex % 2 === 0) {
      doc.setFillColor(...bgLight);
      doc.rect(14, y, pageWidth - 28, 14, 'F');
    }

    doc.setDrawColor(...borderGrey);
    doc.line(14, y + 14, pageWidth - 14, y + 14);

    doc.setTextColor(...darkNavy);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);

    // Number
    doc.text(`${itemIndex}.`, 16, y + 5);

    // Title
    const titleText = item.isCustom ? `[CUSTOM REQUEST] ${item.itemName}` : item.itemName;
    const splitTitle = doc.splitTextToSize(titleText, 76);
    doc.text(splitTitle[0], 24, y + 5);

    // Subtitle / specs
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...textMuted);
    const detailText = item.isCustom
      ? (item.customSpecifications?.slice(0, 80) || 'Custom clinical specification as requested')
      : `Model: ${item.modelNumber || 'N/A'} | Category: ${item.category === 'MEDICAL' ? 'Medical Equipment' : 'Non-Medical Facility'}`;
    doc.text(detailText, 24, y + 10);

    // Procurement Mode
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...darkNavy);
    const modeLabel = item.procurementIntent === 'PURCHASE'
      ? 'Outright Purchase'
      : item.procurementIntent === 'RENTAL'
        ? `Rental (${item.rentalDurationMonths || 12} Mos)`
        : 'Lease to Own';
    doc.text(modeLabel, 105, y + 6);

    // Quantity
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`${item.quantity}`, 123, y + 6, { align: 'center' });

    // Unit Price / Rental Rate
    const unitPriceDisplay = item.procurementIntent === 'RENTAL'
      ? `RM ${(item.monthlyRentalRate || 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}/mo`
      : `RM ${(item.unitPrice || 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}`;
    doc.text(unitPriceDisplay, 148, y + 6, { align: 'right' });

    // Discount
    const disc = item.discountPercent ? `${item.discountPercent}%` : '0%';
    doc.text(disc, 164, y + 6, { align: 'right' });

    // Subtotal
    doc.setFont('helvetica', 'bold');
    const subtotalDisplay = `RM ${(item.subtotal || 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}`;
    doc.text(subtotalDisplay, pageWidth - 16, y + 6, { align: 'right' });

    y += 14;
    itemIndex++;
  });

  y += 4;

  // 5. TOTALS & SUMMARY SECTION
  const summaryBoxWidth = 85;
  const summaryBoxX = pageWidth - 14 - summaryBoxWidth;
  const summaryStartY = y;

  doc.setFillColor(...bgLight);
  doc.rect(summaryBoxX, summaryStartY, summaryBoxWidth, 32, 'F');
  doc.setDrawColor(...borderGrey);
  doc.rect(summaryBoxX, summaryStartY, summaryBoxWidth, 32, 'S');

  // Subtotal
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...textMuted);
  doc.text('Subtotal (Gross):', summaryBoxX + 4, summaryStartY + 6);
  doc.text(`RM ${(quotation.subtotalAmount || 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}`, pageWidth - 18, summaryStartY + 6, { align: 'right' });

  // Discount
  doc.text('Institutional Discount Savings:', summaryBoxX + 4, summaryStartY + 12);
  doc.setTextColor(15, 76, 66);
  doc.text(`- RM ${(quotation.discountAmount || 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}`, pageWidth - 18, summaryStartY + 12, { align: 'right' });

  // SST 6%
  doc.setTextColor(...textMuted);
  doc.text('SST Tax (6%):', summaryBoxX + 4, summaryStartY + 18);
  doc.text(`RM ${(quotation.sstTaxAmount || 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}`, pageWidth - 18, summaryStartY + 18, { align: 'right' });

  // Divider
  doc.setDrawColor(...borderGrey);
  doc.line(summaryBoxX + 4, summaryStartY + 21, pageWidth - 18, summaryStartY + 21);

  // Grand Total
  doc.setFillColor(...primaryTeal);
  doc.rect(summaryBoxX, summaryStartY + 22, summaryBoxWidth, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('TOTAL AMOUNT PAYABLE:', summaryBoxX + 4, summaryStartY + 28.5);
  doc.text(`RM ${(quotation.totalAmount || 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}`, pageWidth - 18, summaryStartY + 28.5, { align: 'right' });

  // Left Side: Terms & Conditions notes
  doc.setTextColor(...darkNavy);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('COMMERCIAL & CLINICAL TERMS:', 14, summaryStartY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...textMuted);
  doc.text(`• Payment Terms: ${quotation.paymentTerms || '30 Days Net upon commissioning'}`, 14, summaryStartY + 11);
  doc.text(`• Warranty: ${quotation.warrantyTerms || '2 Years Comprehensive Parts & Labour'}`, 14, summaryStartY + 16);
  doc.text(`• Estimated Lead Time: ${quotation.deliveryLeadTimeWeeks || 2} to ${(quotation.deliveryLeadTimeWeeks || 2) + 2} business weeks from confirmed L.O.A`, 14, summaryStartY + 21);
  doc.text(`• Calibration & Safety: Pre-delivery MDA / IEC 60601 electrical & radiation safety certification included.`, 14, summaryStartY + 26);

  y = summaryStartY + 38;

  // 6. ADMINISTRATIVE REMARKS BOX
  if (quotation.adminRemarks) {
    doc.setFillColor(241, 248, 246);
    doc.rect(14, y, pageWidth - 28, 14, 'F');
    doc.setDrawColor(191, 216, 209);
    doc.rect(14, y, pageWidth - 28, 14, 'S');

    doc.setTextColor(...primaryTeal);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('SUPER ADMIN REMARKS / PROVISIONING NOTES:', 18, y + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...darkNavy);
    const remarkLines = doc.splitTextToSize(quotation.adminRemarks, pageWidth - 36);
    doc.text(remarkLines, 18, y + 9.5);

    y += 18;
  }

  // 7. AUTHORIZATION SIGNATURE & STAMP BLOCK
  const sigY = Math.max(y + 4, pageHeight - 48);

  doc.setDrawColor(...borderGrey);
  doc.line(14, sigY, pageWidth - 14, sigY);

  // Super Admin Signatory
  doc.setTextColor(...darkNavy);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('ISSUED & AUTHORIZED BY:', 18, sigY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...textMuted);
  doc.text(quotation.reviewedByAdminName || 'Super Admin Office — Procurement Division', 18, sigY + 12);
  doc.text('HealthGrid IQ Clinical Engineering & Procurement Directorate', 18, sigY + 17);
  doc.text('Ministry of Health Malaysia Institutional Gateway', 18, sigY + 22);

  // Official Stamp Seal Simulation
  doc.setDrawColor(...primaryTeal);
  doc.setLineWidth(0.6);
  doc.roundedRect(pageWidth / 2 - 20, sigY + 4, 40, 22, 2, 2, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...primaryTeal);
  doc.text('HEALTHGRID IQ', pageWidth / 2, sigY + 10, { align: 'center' });
  doc.setFontSize(6);
  doc.text('OFFICIALLY VERIFIED', pageWidth / 2, sigY + 14, { align: 'center' });
  doc.text('MALAYSIA HEALTHCARE', pageWidth / 2, sigY + 18, { align: 'center' });
  doc.text(`REF: ${quoRef}`, pageWidth / 2, sigY + 22, { align: 'center' });

  // Client Acceptance Section
  const clientSigX = pageWidth - 70;
  doc.setTextColor(...darkNavy);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('CLIENT ACCEPTANCE CONFIRMATION:', clientSigX, sigY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...textMuted);
  doc.text(`Status: ${quotation.status.replace('_', ' ')}`, clientSigX, sigY + 12);
  if (quotation.decidedAt) {
    const decidedStr = new Date(quotation.decidedAt).toLocaleDateString('en-GB');
    doc.text(`Action Date: ${decidedStr}`, clientSigX, sigY + 17);
  } else {
    doc.text('Signature / E-Acceptance on file in portal', clientSigX, sigY + 17);
  }
  doc.text('HealthGrid IQ Electronic Audit Log Recorded', clientSigX, sigY + 22);

  // Footer text
  doc.setFontSize(6.5);
  doc.setTextColor(...textMuted);
  doc.text(
    'This is a computer-generated quotation issued through the HealthGrid IQ Clinical Gateway. All prices quoted are in Ringgit Malaysia (MYR).',
    pageWidth / 2,
    pageHeight - 6,
    { align: 'center' }
  );

  // Trigger browser download
  const cleanId = (quotation.quotationNumber || quotation.id).replace(/[^a-zA-Z0-9-_]/g, '_');
  doc.save(`Quotation_${cleanId}.pdf`);
}
