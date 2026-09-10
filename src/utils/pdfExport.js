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
    // Ensure full dimensions are measured accurately with generous bottom buffer
    const fullWidth = element.scrollWidth || element.offsetWidth || 794;
    const fullHeight = (element.scrollHeight || element.offsetHeight) + 40;

    // Generate high-resolution canvas with white background
    const canvas = await html2canvas(element, {
      scale: options.scale || 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: fullWidth,
      height: fullHeight,
      windowWidth: fullWidth + 100,
      windowHeight: fullHeight + 100,
      scrollX: 0,
      scrollY: 0,
      x: 0,
      y: 0,
      onclone: (clonedDoc) => {
        const id = typeof elementIdOrNode === 'string' ? elementIdOrNode : element?.id;
        const clonedEl = id ? clonedDoc.getElementById(id) : clonedDoc.body.querySelector(`#${element?.id || 'printable-a4-invoice'}`);
        if (clonedEl) {
          clonedEl.style.backgroundColor = '#ffffff';
          clonedEl.style.color = '#0f172a';
          clonedEl.style.height = 'auto';
          clonedEl.style.maxHeight = 'none';
          clonedEl.style.overflow = 'visible';
          clonedEl.style.transform = 'none';
          clonedEl.style.margin = '0';
          clonedEl.style.paddingBottom = '36px';
        }
        
        // Remove overflow and height restrictions from all parents in the cloned DOM tree
        let parent = clonedEl?.parentElement;
        while (parent && parent !== clonedDoc.body && parent !== clonedDoc.documentElement) {
          parent.style.overflow = 'visible';
          parent.style.maxHeight = 'none';
          parent.style.height = 'auto';
          parent.style.transform = 'none';
          parent = parent.parentElement;
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
    const availableHeight = pageHeight - (margin * 2);

    // Provide a 6mm safety margin so bottom footers/signatures never get sliced
    const safeAvailableHeight = availableHeight - 6;

    // If fitToSinglePage is requested or content is within reasonable range (~1.3x), scale proportionally to fit 1 page
    const shouldFitSinglePage = options.fitToSinglePage !== undefined 
      ? options.fitToSinglePage 
      : (printableHeight <= availableHeight * 1.3);

    if (shouldFitSinglePage || printableHeight <= availableHeight) {
      // Proportional scale factor to fit all content (including bottom totals and signature) completely
      const scaleFactor = Math.min(1, safeAvailableHeight / printableHeight, printableWidth / printableWidth);
      const finalWidth = printableWidth * scaleFactor;
      const finalHeight = printableHeight * scaleFactor;
      const xOffset = margin + (printableWidth - finalWidth) / 2;
      const yOffset = margin;

      pdf.addImage(imgData, 'PNG', xOffset, yOffset, finalWidth, finalHeight);
    } else {
      // Sliced multi-page pagination for genuinely long multi-item invoices
      const pageCanvasHeight = (availableHeight * canvas.width) / printableWidth;
      let renderedHeight = 0;
      let pageIndex = 0;

      while (renderedHeight < canvas.height) {
        if (pageIndex > 0) pdf.addPage();

        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        const currentSliceHeight = Math.min(pageCanvasHeight, canvas.height - renderedHeight);
        sliceCanvas.height = currentSliceHeight;

        const sliceCtx = sliceCanvas.getContext('2d');
        sliceCtx.fillStyle = '#ffffff';
        sliceCtx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
        sliceCtx.drawImage(
          canvas,
          0, renderedHeight, canvas.width, currentSliceHeight,
          0, 0, sliceCanvas.width, currentSliceHeight
        );

        const sliceData = sliceCanvas.toDataURL('image/png');
        const slicePrintHeight = (currentSliceHeight * printableWidth) / canvas.width;

        pdf.addImage(sliceData, 'PNG', margin, margin, printableWidth, slicePrintHeight);
        renderedHeight += currentSliceHeight;
        pageIndex++;
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

