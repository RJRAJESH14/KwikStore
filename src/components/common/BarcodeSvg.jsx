import React, { useMemo } from 'react';
import { encodeCode128 } from '../../utils/barcodeUtils';

/**
 * BarcodeSvg Component
 * Renders standard, highly-scannable Code 128 1D Barcode with sharp vector lines.
 * Compatible with all 1D/2D Barcode Guns, Laser Scanners, and Mobile Scanners.
 * 
 * @param {string} value - Value to encode (e.g. invoice number "INV-2026-0001" or SKU "890123456789")
 * @param {number} height - Barcode bar height in px (default 36)
 * @param {number} barWidth - Single module width in px (default 1.5)
 * @param {boolean} displayValue - Whether to render human-readable text below bars (default true)
 * @param {string} fontSize - CSS font size class/style for text (default text-[10px])
 * @param {string} className - Optional container styling
 */
export function BarcodeSvg({
  value,
  height = 36,
  barWidth = 1.5,
  displayValue = true,
  fontSize = 'text-[10px]',
  className = ''
}) {
  const barcodeData = useMemo(() => {
    if (!value) return null;
    return encodeCode128(String(value));
  }, [value]);

  if (!barcodeData || !barcodeData.binaryString) {
    return null;
  }

  const { binaryString, text } = barcodeData;
  const quietZone = 10; // 10 modules margin on left & right
  const totalModules = binaryString.length + (quietZone * 2);
  const svgWidth = totalModules * barWidth;
  const svgHeight = height;

  // Build SVG path rects or paths for each bar
  const rects = [];
  let currentBarStart = null;
  let currentBarWidth = 0;

  for (let i = 0; i < binaryString.length; i++) {
    if (binaryString[i] === '1') {
      if (currentBarStart === null) {
        currentBarStart = (quietZone + i) * barWidth;
        currentBarWidth = barWidth;
      } else {
        currentBarWidth += barWidth;
      }
    } else {
      if (currentBarStart !== null) {
        rects.push({
          x: currentBarStart,
          width: currentBarWidth
        });
        currentBarStart = null;
        currentBarWidth = 0;
      }
    }
  }

  if (currentBarStart !== null) {
    rects.push({
      x: currentBarStart,
      width: currentBarWidth
    });
  }

  return (
    <div className={`inline-flex flex-col items-center select-none bg-white p-1 rounded ${className}`}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="overflow-visible block"
        shapeRendering="crispEdges"
        style={{ width: `${svgWidth}px`, height: `${svgHeight}px`, display: 'block' }}
      >
        <rect width={svgWidth} height={svgHeight} fill="#ffffff" style={{ fill: '#ffffff' }} />
        {rects.map((rect, idx) => (
          <rect
            key={idx}
            x={rect.x}
            y={0}
            width={rect.width}
            height={svgHeight}
            fill="#000000"
            style={{ fill: '#000000' }}
          />
        ))}
      </svg>
      {displayValue && (
        <span className={`font-mono font-bold tracking-widest text-black mt-0.5 ${fontSize}`}>
          *{text}*
        </span>
      )}
    </div>
  );
}

export default BarcodeSvg;
