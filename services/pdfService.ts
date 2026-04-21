import { jsPDF } from 'jspdf';
import { Client, AdminProfile } from '../types';

/**
 * PDF Configuration Constants
 */
export const PDF_CONFIG = {
  margin: 20,
  primaryColor: [59, 130, 246] as [number, number, number], // Blue
  secondaryColor: [100, 100, 100] as [number, number, number], // Gray
  textColor: [50, 50, 50] as [number, number, number], // Dark Gray
};

/**
 * Standard Header for all application PDFs
 * Logo (Top Left), Title (Top Right, Underlined), Date & Client (Right underneath)
 */
export const applyStandardHeader = (
  doc: jsPDF,
  title: string,
  clientName: string,
  adminProfile: AdminProfile | null
) => {
  const now = new Date().toLocaleDateString('it-IT');
  const pageWidth = doc.internal.pageSize.getWidth();
  const { margin, primaryColor, secondaryColor } = PDF_CONFIG;

  // 1. Logo Area (Top Left)
  if (adminProfile?.logoUrl) {
    try {
      // Reduced size by 5% as per request: 38x19
      doc.addImage(adminProfile.logoUrl, 'PNG', margin, 15, 38, 19);
    } catch (e) {
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(adminProfile?.companyName || "LOGO", margin, 20);
    }
  } else {
    doc.setFontSize(10);
    doc.setTextColor(200);
    doc.text("Logo Aziendale", margin, 25);
  }

  // 2. Title - Right Aligned
  doc.setFont(doc.getFont().fontName, 'bold');
  doc.setFontSize(22);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  const titleText = title.toUpperCase();
  const titleWidth = doc.getTextWidth(titleText);
  const titleX = pageWidth - margin - titleWidth;
  doc.text(titleText, titleX, 28);

  // 3. Underline - Thin line below title
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(0.1);
  doc.line(titleX, 30, pageWidth - margin, 30);

  // 4. Date & Client - Right Aligned
  doc.setFont(doc.getFont().fontName, 'normal');
  doc.setFontSize(10);
  doc.setTextColor(secondaryColor[0]);
  const dateText = `Data: ${now}`;
  const clientText = `Cliente: ${clientName}`;

  doc.text(dateText, pageWidth - margin - doc.getTextWidth(dateText), 42);
  doc.text(clientText, pageWidth - margin - doc.getTextWidth(clientText), 47);

  // Reset colors
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  
  return 70; // Suggested Y position for content
};

/**
 * Standard Footer for all application PDFs
 * Typically used for signatures or company info
 */
export const applyStandardFooter = (
  doc: jsPDF,
  finalY: number,
  adminProfile: AdminProfile | null,
  label: string = "Firma Centrale Acquisti"
) => {
  const { margin, textColor, secondaryColor } = PDF_CONFIG;
  
  const pageHeight = doc.internal.pageSize.height;
  let y = finalY;

  // If too close to bottom, add page (though autoTable usually handles this, signature area is manual)
  if (y > pageHeight - 40) {
    doc.addPage();
    y = 20;
  }

  doc.setFontSize(12);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text(label, margin, y);

  doc.setFontSize(10);
  doc.setTextColor(secondaryColor[0]);
  doc.text(adminProfile?.companyName || "EB-pro Centrale Acquisti", margin, y + 10);
  if (adminProfile?.address) doc.text(adminProfile.address, margin, y + 15);
};
