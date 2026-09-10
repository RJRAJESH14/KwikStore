import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Exports a DOM element or container to a high-resolution PDF file.
 * @param {string|HTMLElement} elementIdOrNode - Element ID or direct DOM element
 * @param {string} filename - Desired output filename (e.g. 'Invoice_KS-001.pdf')
 * @param {object} options - Optional configuration (scale, margin, orientation, format)
 */
export async function exportElementToPdf(elementIdOrNode, filename = 'document.pdf', options = {}) {
  const element = typeof elementIdOrNode === 'string' 
    ? document.getElementById(elementIdOrNode) 
    : elementIdOrNode;

  if (!element) {
    console.error('PDF Export: Element not found', elementIdOrNode);
    return false;
  }

  try {
    // Generate high-resolution canvas with white background
    const canvas = await html2canvas(element, {
      scale: options.scale || 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 1200,
      onclone: (clonedDoc) => {
        const id = typeof elementIdOrNode === 'string' ? elementIdOrNode : element?.id;
        if (id) {
          const clonedEl = clonedDoc.getElementById(id);
          if (clonedEl) {
            clonedEl.style.backgroundColor = '#ffffff';
            clonedEl.style.color = '#0f172a';
          }
        }
      },
      ...options.canvasOptions
    });

    const imgData = canvas.toDataURL('image/png');
    
    // Create jsPDF instance (A4 standard: 210 x 297 mm)
    const pdf = new jsPDF({
      orientation: options.orientation || 'portrait',
      unit: 'mm',
      format: options.format || 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    const margin = options.margin !== undefined ? options.margin : 5; // 5mm margin
    const printableWidth = pageWidth - (margin * 2);
    const printableHeight = (canvas.height * printableWidth) / canvas.width;

    // Check if content fits in one page or needs multi-page pagination
    if (printableHeight <= pageHeight - (margin * 2)) {
      pdf.addImage(imgData, 'PNG', margin, margin, printableWidth, printableHeight);
    } else {
      let currentHeightLeft = printableHeight;
      let position = margin;

      // First page
      pdf.addImage(imgData, 'PNG', margin, position, printableWidth, printableHeight);
      currentHeightLeft -= (pageHeight - (margin * 2));

      // Subsequent pages if long invoice
      while (currentHeightLeft > 0) {
        position -= (pageHeight - (margin * 2));
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', margin, position, printableWidth, printableHeight);
        currentHeightLeft -= (pageHeight - (margin * 2));
      }
    }

    const cleanFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    pdf.save(cleanFilename);
    return true;
  } catch (error) {
    console.error('Failed to generate PDF:', error);
    throw error;
  }
}

export const exportToPdf = exportElementToPdf;

