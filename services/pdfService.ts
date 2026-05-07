import { jsPDF } from 'jspdf';
import { Client, AdminProfile } from '../types';

/**
 * PDF Configuration Constants
 */
export const PDF_CONFIG = {
  margin: 20,
  primaryColor: [0, 46, 93] as [number, number, number], // Pantone 648 C (#002E5D)
  secondaryColor: [100, 100, 100] as [number, number, number], // Gray
  accentColorRed: [214, 0, 28] as [number, number, number], // Pantone 2035 C (#D6001C)
  textColor: [50, 50, 50] as [number, number, number], // Dark Gray
};

/**
 * Basic Header: Logo, Company Details, Separation Line
 * Repeats on every page.
 */
export const applyMinimalHeader = (
  doc: jsPDF,
  adminProfile: AdminProfile | null
) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const { margin, secondaryColor } = PDF_CONFIG;

  // 1. Logo Area (Top Left)
  const logoY = 15;
  const logoMaxWidth = 42;
  const logoMaxHeight = 20;
  let finalLogoHeight = logoMaxHeight;

  if (adminProfile?.logoUrl) {
    try {
      const imgProps = (doc as any).getImageProperties(adminProfile.logoUrl);
      const ratio = imgProps.width / imgProps.height;
      
      let finalWidth = logoMaxWidth;
      let finalHeight = logoMaxWidth / ratio;
      
      if (finalHeight > logoMaxHeight) {
        finalHeight = logoMaxHeight;
        finalWidth = logoMaxHeight * ratio;
      }
      
      finalLogoHeight = finalHeight;
      doc.addImage(adminProfile.logoUrl, 'PNG', margin, logoY, finalWidth, finalHeight);
    } catch (e) {
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(adminProfile?.companyName || "EB-PRO", margin, logoY + 5);
      finalLogoHeight = 5;
    }
  } else {
    doc.setFontSize(10);
    doc.setTextColor(200);
    doc.text("EB-PRO", margin, logoY + 10);
    finalLogoHeight = 10;
  }

  // 1b. Company Details (Right aligned)
  doc.setFontSize(7.5);
  doc.setTextColor(secondaryColor[0]);
  doc.setFont(doc.getFont().fontName, 'normal');
  
  const textOptions = { align: 'right' as const };
  const detailsX = pageWidth - margin;
  
  doc.text([
      "EasyBuy",
      `P.IVA: ${adminProfile?.vatNumber || "N.D."} - C.F.: ${adminProfile?.taxId || "N.D."}`,
      `${adminProfile?.address || ""}, ${adminProfile?.zipCode || ""} ${adminProfile?.city || ""} (${adminProfile?.province || ""})`,
      `Email: ${adminProfile?.email || ""} - Website: ${adminProfile?.website || ""}`
  ], detailsX, logoY + 3, textOptions);

  // 1c. Separation Line under Logo/Details
  doc.setDrawColor(220, 220, 220); // Light gray
  doc.setLineWidth(0.1);
  const lineY = logoY + 22;
  doc.line(margin, lineY, pageWidth - margin, lineY);

  return lineY;
};

/**
 * Applies Document Metadata: Title, Underline, and Info Block (Doc Num, Date, Client)
 * Usually only on the first page.
 */
export const applyDocumentMetadata = (
  doc: jsPDF,
  title: string,
  recipientName: string,
  docNumber: string,
  startY: number,
  docDate?: string
) => {
  const dateFormatted = docDate || new Date().toLocaleDateString('it-IT');
  const pageWidth = doc.internal.pageSize.getWidth();
  const { margin, primaryColor, secondaryColor } = PDF_CONFIG;

  // 2. Title - Centered
  const gap = 8;
  const titleY = startY + gap; 
  doc.setFont(doc.getFont().fontName, 'bold');
  doc.setFontSize(16);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]); // Pantone 648 C
  const titleText = title.toUpperCase();
  const titleWidth = doc.getTextWidth(titleText);
  const titleX = (pageWidth - titleWidth) / 2;
  doc.text(titleText, titleX, titleY);

  // 3. Underline - Blue line
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(0.3);
  doc.line(titleX, titleY + 1.5, titleX + titleWidth, titleY + 1.5);

  // 4. Info Block - Right Aligned
  const infoY = titleY + 12; // Spacing after title
  doc.setFont(doc.getFont().fontName, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(secondaryColor[0]);
  
  const docNumText = `Documento N.: ${docNumber}`;
  const dateText = `Data: ${dateFormatted}`;
  const recipientText = `Cliente: ${recipientName}`;

  doc.text(docNumText, pageWidth - margin - doc.getTextWidth(docNumText), infoY);
  doc.text(dateText, pageWidth - margin - doc.getTextWidth(dateText), infoY + 5);
  doc.text(recipientText, pageWidth - margin - doc.getTextWidth(recipientText), infoY + 10);

  // Reset colors
  doc.setTextColor(50, 50, 50);
  
  return infoY + 12; 
};

/**
 * Standard Header (Minimal + Metadata)
 */
export const applyStandardHeader = (
  doc: jsPDF,
  title: string,
  recipientName: string,
  docNumber: string,
  adminProfile: AdminProfile | null,
  docDate?: string
) => {
  const lineY = applyMinimalHeader(doc, adminProfile);
  return applyDocumentMetadata(doc, title, recipientName, docNumber, lineY, docDate);
};

/**
 * Standard Signature Block
 * Typically used at the end of the content
 */
export const applyStandardSignature = (
  doc: jsPDF,
  finalY: number,
  adminProfile: AdminProfile | null,
  label: string = "Firma Centrale Acquisti"
) => {
  const { margin, textColor, secondaryColor } = PDF_CONFIG;
  
  const pageHeight = doc.internal.pageSize.height;
  let y = finalY;

  // If too close to bottom, add page
  if (y > pageHeight - 40) {
    doc.addPage();
    y = 20;
  }

  doc.setFontSize(12);
  doc.setFont(doc.getFont().fontName, 'bold');
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text(label, margin, y);

  doc.setFontSize(10);
  doc.setFont(doc.getFont().fontName, 'normal');
  doc.setTextColor(secondaryColor[0]);
  doc.text(adminProfile?.companyName || "EB-pro Centrale Acquisti", margin, y + 10);
  if (adminProfile?.address) doc.text(adminProfile.address, margin, y + 15);

  return y + 25;
};

/**
 * Standard Page Footer (ISO Citation + Pagination)
 * MUST be called AFTER all content is generated to handle total page count correctly.
 * @param doc The jsPDF instance
 * @param isoRevision The revision index (e.g., 'DOC-QR-01')
 * @param adminProfile The admin profile to check for settings
 */
export const applyPageFooter = (
  doc: jsPDF,
  isoRevision: string = "SGQ REV. 00",
  adminProfile: AdminProfile | null = null
) => {
  const { margin, accentColorRed } = PDF_CONFIG;
  const pageCount = (doc as any).internal.getNumberOfPages();
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // 1. Separation Line (0.05 mm) - RED Pantone 2035 C
    doc.setDrawColor(accentColorRed[0], accentColorRed[1], accentColorRed[2]);
    doc.setLineWidth(0.05);
    doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18);

    // 2. Footer Text - RED Pantone 2035 C
    doc.setTextColor(accentColorRed[0], accentColorRed[1], accentColorRed[2]);
    
    // Left: UNI-ISO SGQ Citation (Only if enabled in settings, default true)
    if (adminProfile?.printIsoCitation !== false) {
      doc.setFontSize(5); 
      doc.setFont(doc.getFont().fontName, 'normal'); // Non grassetto per ISO
      doc.text(`Sistema Gestione Qualità UNI-ISO 9001 | ${isoRevision}`, margin, pageHeight - 13);
    }

    // Right: Page X / Y (Always visible, bold per user mockups)
    doc.setFontSize(7);
    doc.setFont(doc.getFont().fontName, 'bold');
    const pageText = `Pagina ${i} di ${pageCount}`; // lowercase "di"
    doc.text(pageText, pageWidth - margin - doc.getTextWidth(pageText), pageHeight - 13);

    // RESET COLORS to avoid bleeding into next elements or future pages
    doc.setTextColor(50, 50, 50);
    doc.setDrawColor(0, 0, 0);
  }
};
