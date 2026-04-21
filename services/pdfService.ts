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
 * Standard Header for all application PDFs
 * Logo (Top Left), Spacing, Title (Top Right, Underlined), Info Block (Right underneath)
 */
export const applyStandardHeader = (
  doc: jsPDF,
  title: string,
  recipientName: string,
  docNumber: string,
  adminProfile: AdminProfile | null,
  docDate?: string
) => {
  const dateFormatted = docDate || new Date().toLocaleDateString('it-IT');
  const pageWidth = doc.internal.pageSize.getWidth();
  const { margin, primaryColor, secondaryColor } = PDF_CONFIG;

  // 1. Logo Area (Top Left)
  const logoY = 15;
  const logoMaxWidth = 42;
  const logoMaxHeight = 20;
  let finalLogoHeight = logoMaxHeight;

  if (adminProfile?.logoUrl) {
    try {
      // Get image properties to maintain aspect ratio within 42x20 box
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
      doc.text(adminProfile?.companyName || "LOGO", margin, logoY + 5);
      finalLogoHeight = 5;
    }
  } else {
    doc.setFontSize(10);
    doc.setTextColor(200);
    doc.text("Logo Aziendale", margin, logoY + 10);
    finalLogoHeight = 10;
  }

  // 2. Title - Right Aligned (Positioned BELOW logo with spacing)
  // Gap between bottom of logo and title increased by 3% (from 12 to 12.36)
  const gap = 12.36;
  const titleY = logoY + finalLogoHeight + gap; 
  doc.setFont(doc.getFont().fontName, 'bold');
  doc.setFontSize(22);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]); // Pantone 648 C
  const titleText = title.toUpperCase();
  const titleWidth = doc.getTextWidth(titleText);
  const titleX = pageWidth - margin - titleWidth;
  doc.text(titleText, titleX, titleY);

  // 3. Underline - Thin line below title (0.1 mm as requested)
  // Use Blue for the underline too to match title
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(0.1);
  doc.line(titleX, titleY + 2, pageWidth - margin, titleY + 2);

  // 4. Info Block (Data + Document Number + Recipient) - Right Aligned
  const infoY = titleY + 15; // Spacing after title
  doc.setFont(doc.getFont().fontName, 'normal');
  doc.setFontSize(10);
  doc.setTextColor(secondaryColor[0]);
  
  const docNumText = `Documento N.: ${docNumber}`;
  const dateText = `Data: ${dateFormatted}`;
  const recipientText = `Destinatario: ${recipientName}`;

  doc.text(docNumText, pageWidth - margin - doc.getTextWidth(docNumText), infoY);
  doc.text(dateText, pageWidth - margin - doc.getTextWidth(dateText), infoY + 6);
  doc.text(recipientText, pageWidth - margin - doc.getTextWidth(recipientText), infoY + 12);

  // Reset colors
  doc.setTextColor(50, 50, 50);
  
  return infoY + 30; // Suggested Y position for content (Body starts here)
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
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

    // 2. Footer Text - RED Pantone 2035 C
    doc.setFontSize(8);
    doc.setTextColor(accentColorRed[0], accentColorRed[1], accentColorRed[2]);
    doc.setFont(doc.getFont().fontName, 'normal');

    // Left: UNI-ISO SGQ Citation (Only if enabled in settings, default true)
    if (adminProfile?.printIsoCitation !== false) {
      doc.text(`Sistema Gestione Qualità UNI-ISO 9001 | ${isoRevision}`, margin, pageHeight - 10);
    }

    // Right: Page X / Y (Always visible)
    const pageText = `${i} / ${pageCount}`;
    doc.text(pageText, pageWidth - margin - doc.getTextWidth(pageText), pageHeight - 10);
  }
};
