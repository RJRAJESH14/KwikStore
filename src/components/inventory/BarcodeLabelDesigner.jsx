import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useShop } from '../../context/ShopContext';
import { BarcodeSvg } from '../common/BarcodeSvg';
import { encodeCode128 } from '../../utils/barcodeUtils';
import { 
  Barcode, Printer, Settings2, Sparkles, 
  CheckSquare, Square, Download, Eye, Layers,
  Plus, Minus, RefreshCw, X, Save, BookmarkCheck, CheckCircle2, Search
} from 'lucide-react';

export function BarcodeLabelDesigner({ products = [] }) {
  const { isDark } = useTheme();
  const { activeShop } = useShop();

  // Load saved default design preferences from localStorage
  const loadSavedPreferences = () => {
    try {
      const saved = localStorage.getItem('kwikstore_barcode_design_defaults');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  };

  const savedPrefs = loadSavedPreferences();

  // Default: All products are UNCHECKED
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [labelQuantities, setLabelQuantities] = useState(() => {
    const q = {};
    products.forEach(p => { q[p.id] = 1; });
    return q;
  });

  const [labelSize, setLabelSize] = useState(savedPrefs?.labelSize || '50x25'); // 50x25, 38x25, A4_24, A4_30
  const [showShopName, setShowShopName] = useState(savedPrefs?.showShopName !== undefined ? savedPrefs.showShopName : true);
  const [showMrp, setShowMrp] = useState(savedPrefs?.showMrp !== undefined ? savedPrefs.showMrp : true);
  const [showOurPrice, setShowOurPrice] = useState(savedPrefs?.showOurPrice !== undefined ? savedPrefs.showOurPrice : true);
  const [showBatch, setShowBatch] = useState(savedPrefs?.showBatch !== undefined ? savedPrefs.showBatch : true);
  const [showSubtitle, setShowSubtitle] = useState(savedPrefs?.showSubtitle !== undefined ? savedPrefs.showSubtitle : false);
  const [customSubtitle, setCustomSubtitle] = useState(savedPrefs?.customSubtitle || 'Best Quality Product');
  const [previewMode, setPreviewMode] = useState(false);
  const [savedNotification, setSavedNotification] = useState(null);

  // Filter products by search query (name, barcode, item_code, category, batch)
  const filteredProducts = products.filter(p => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const nameMatch = p.name?.toLowerCase().includes(q);
    const barcodeMatch = p.barcode?.toLowerCase().includes(q);
    const itemCodeMatch = p.item_code?.toLowerCase().includes(q);
    const catMatch = p.category_name?.toLowerCase().includes(q);
    const batchMatch = p.default_batch_no?.toLowerCase().includes(q);
    return Boolean(nameMatch || barcodeMatch || itemCodeMatch || catMatch || batchMatch);
  });

  // Save current design as default in localStorage
  const handleSaveAsDefault = () => {
    const prefs = {
      labelSize,
      showShopName,
      showMrp,
      showOurPrice,
      showBatch,
      showSubtitle,
      customSubtitle
    };
    try {
      localStorage.setItem('kwikstore_barcode_design_defaults', JSON.stringify(prefs));
      setSavedNotification('Default design template saved! This layout will automatically load next time.');
      setTimeout(() => setSavedNotification(null), 3500);
    } catch (e) {
      alert('Could not save default design.');
    }
  };

  const areAllFilteredSelected = filteredProducts.length > 0 && filteredProducts.every(p => selectedProductIds.includes(p.id));

  const toggleSelectFiltered = () => {
    if (areAllFilteredSelected) {
      const filteredIds = new Set(filteredProducts.map(p => p.id));
      setSelectedProductIds(prev => prev.filter(id => !filteredIds.has(id)));
    } else {
      const newIds = new Set([...selectedProductIds, ...filteredProducts.map(p => p.id)]);
      setSelectedProductIds(Array.from(newIds));
      const initQ = { ...labelQuantities };
      filteredProducts.forEach(p => { if (!initQ[p.id]) initQ[p.id] = 1; });
      setLabelQuantities(initQ);
    }
  };

  const toggleSelect = (id) => {
    setSelectedProductIds(prev => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter(x => x !== id) : [...prev, id];
      if (!exists && !labelQuantities[id]) {
        setLabelQuantities(q => ({ ...q, [id]: 1 }));
      }
      return next;
    });
  };

  const handleQtyChange = (id, val) => {
    const qty = Math.max(1, parseInt(val, 10) || 1);
    setLabelQuantities(prev => ({ ...prev, [id]: qty }));
  };

  const incrementQty = (id) => {
    setLabelQuantities(prev => ({ ...prev, [id]: (prev[id] || 1) + 1 }));
  };

  const decrementQty = (id) => {
    setLabelQuantities(prev => ({ ...prev, [id]: Math.max(1, (prev[id] || 1) - 1) }));
  };

  // Generate printable label items based on counts
  const generateLabelList = () => {
    const list = [];
    selectedProductIds.forEach(id => {
      const prod = products.find(p => p.id === id);
      if (prod) {
        const count = labelQuantities[id] || 1;
        for (let i = 0; i < count; i++) {
          list.push(prod);
        }
      }
    });
    return list;
  };

  const labelsToPrint = generateLabelList();

  // Generate standalone SVG HTML string for clean printing
  const generateBarcodeSvgString = (code) => {
    const val = String(code || '890123456789');
    const barcodeData = encodeCode128(val);
    if (!barcodeData || !barcodeData.binaryString) return '';

    const { binaryString } = barcodeData;
    const quietZone = 8;
    const barWidth = 1.2;
    const totalModules = binaryString.length + (quietZone * 2);
    const svgWidth = totalModules * barWidth;
    const height = 28;

    let rectsHtml = '';
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
          rectsHtml += `<rect x="${currentBarStart}" y="0" width="${currentBarWidth}" height="${height}" fill="#000" />`;
          currentBarStart = null;
          currentBarWidth = 0;
        }
      }
    }
    if (currentBarStart !== null) {
      rectsHtml += `<rect x="${currentBarStart}" y="0" width="${currentBarWidth}" height="${height}" fill="#000" />`;
    }

    return `
      <svg viewBox="0 0 ${svgWidth} ${height}" style="width: 100%; max-width: 140px; height: 24px; display: block; margin: 0 auto;" xmlns="http://www.w3.org/2000/svg">
        ${rectsHtml}
      </svg>
    `;
  };

  // Generate complete HTML document for isolated printing without blank pages
  const buildPrintHtml = () => {
    const shopName = activeShop?.name || 'KwikStore Pro';
    
    let pageCss = '';
    let containerCss = '';
    let labelCss = '';

    if (labelSize === '50x25') {
      pageCss = `@page { size: 50mm 25mm; margin: 0; }`;
      containerCss = `display: block; width: 100%; margin: 0; padding: 0;`;
      labelCss = `
        width: 48mm;
        height: 24mm;
        margin: 0.5mm auto;
        padding: 1mm 1.5mm;
        box-sizing: border-box;
        page-break-after: always;
        break-after: page;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        text-align: center;
        overflow: hidden;
        font-family: system-ui, -apple-system, sans-serif;
      `;
    } else if (labelSize === '38x25') {
      pageCss = `@page { size: 38mm 25mm; margin: 0; }`;
      containerCss = `display: block; width: 100%; margin: 0; padding: 0;`;
      labelCss = `
        width: 36mm;
        height: 24mm;
        margin: 0.5mm auto;
        padding: 0.8mm 1mm;
        box-sizing: border-box;
        page-break-after: always;
        break-after: page;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        text-align: center;
        overflow: hidden;
        font-family: system-ui, -apple-system, sans-serif;
      `;
    } else if (labelSize === 'A4_24') {
      // 3 columns x 8 rows on A4
      pageCss = `@page { size: A4 portrait; margin: 8mm 6mm; }`;
      containerCss = `
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        grid-auto-rows: 35mm;
        gap: 2mm 3mm;
        width: 100%;
        box-sizing: border-box;
      `;
      labelCss = `
        width: 100%;
        height: 34mm;
        padding: 1.5mm 2mm;
        box-sizing: border-box;
        border: 1px dashed #ccc;
        border-radius: 3px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        text-align: center;
        overflow: hidden;
        page-break-inside: avoid;
        break-inside: avoid;
        font-family: system-ui, -apple-system, sans-serif;
      `;
    } else {
      // A4_30: 3 columns x 10 rows on A4
      pageCss = `@page { size: A4 portrait; margin: 6mm 5mm; }`;
      containerCss = `
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        grid-auto-rows: 28mm;
        gap: 1.5mm 2.5mm;
        width: 100%;
        box-sizing: border-box;
      `;
      labelCss = `
        width: 100%;
        height: 27.5mm;
        padding: 1mm 1.5mm;
        box-sizing: border-box;
        border: 1px dashed #ccc;
        border-radius: 3px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        text-align: center;
        overflow: hidden;
        page-break-inside: avoid;
        break-inside: avoid;
        font-family: system-ui, -apple-system, sans-serif;
      `;
    }

    const labelsHtml = labelsToPrint.map((prod) => {
      const code = prod.barcode || `890${String(prod.id).padStart(8, '0')}`;
      const svg = generateBarcodeSvgString(code);
      const mrpVal = Number(prod.mrp || 0).toFixed(0);
      const priceVal = Number(prod.retail_rate || prod.mrp || 0).toFixed(0);

      return `
        <div class="label-item" style="${labelCss}">
          ${showShopName ? `<div style="font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #111; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${shopName}</div>` : ''}
          <div style="font-size: 9.5px; font-weight: 700; color: #000; line-height: 1.1; max-height: 22px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${prod.name}</div>
          
          <div style="margin: 1px 0;">
            ${svg}
            <div style="font-family: monospace; font-size: 8px; font-weight: 700; color: #222; letter-spacing: 1px; margin-top: 1px;">${code}</div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #ddd; padding-top: 1px; font-size: 8.5px;">
            ${showMrp ? `<span style="color: #666; text-decoration: line-through;">MRP: ₹${mrpVal}</span>` : '<span></span>'}
            ${showOurPrice ? `<span style="font-weight: 900; font-size: 10px; color: #000;">OUR: ₹${priceVal}</span>` : '<span></span>'}
          </div>

          ${showBatch && (prod.default_batch_no || prod.expiry_date) ? `
            <div style="font-size: 7px; color: #555; text-align: left; line-height: 1;">
              ${prod.default_batch_no ? `B:${prod.default_batch_no}` : ''} ${prod.expiry_date ? `Exp:${prod.expiry_date}` : ''}
            </div>
          ` : ''}

          ${showSubtitle && customSubtitle ? `
            <div style="font-size: 7px; color: #666; font-style: italic;">${customSubtitle}</div>
          ` : ''}
        </div>
      `;
    }).join('\n');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Barcode Labels - ${labelsToPrint.length} items</title>
  <style>
    ${pageCss}
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #000;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .labels-container {
      ${containerCss}
    }
    @media screen {
      body {
        padding: 20px;
        background: #f1f5f9;
        display: flex;
        justify-content: center;
      }
      .labels-container {
        background: #fff;
        padding: 15px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        border-radius: 8px;
        max-width: 900px;
      }
    }
  </style>
</head>
<body>
  <div class="labels-container">
    ${labelsHtml}
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 300);
    };
  </script>
</body>
</html>
    `;
  };

  // Print via isolated iframe to prevent blank pages
  const handlePrint = () => {
    if (labelsToPrint.length === 0) {
      alert('Please select at least one product with quantity > 0 to print barcodes.');
      return;
    }

    const htmlContent = buildPrintHtml();
    
    // Create an invisible iframe for isolated printing
    let iframe = document.getElementById('barcode-print-iframe');
    if (iframe) {
      document.body.removeChild(iframe);
    }
    iframe = document.createElement('iframe');
    iframe.id = 'barcode-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(htmlContent);
    doc.close();
  };

  const handleDownloadHtml = () => {
    const htmlContent = buildPrintHtml();
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Barcode_Labels_${labelsToPrint.length}_items.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Top Controls Grid */}
      <div className={`p-4 rounded-2xl border grid grid-cols-1 md:grid-cols-4 gap-4 ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800 shadow-sm'
      }`}>
        <div>
          <label className={`text-xs font-bold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            Label Paper Format:
          </label>
          <select
            value={labelSize}
            onChange={(e) => setLabelSize(e.target.value)}
            className={`w-full p-2 rounded-xl border text-xs font-bold outline-none cursor-pointer ${
              isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
            }`}
          >
            <option value="50x25">Thermal Roll (50mm x 25mm / 2x1 Inch)</option>
            <option value="38x25">Thermal Roll (38mm x 25mm / 1.5x1 Inch)</option>
            <option value="A4_24">A4 Sticker Sheet (24 Labels / 3x8 Grid)</option>
            <option value="A4_30">A4 Sticker Sheet (30 Labels / 3x10 Grid)</option>
          </select>
        </div>

        <div>
          <label className={`text-xs font-bold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            Label Elements:
          </label>
          <div className="flex flex-wrap gap-2.5 text-xs">
            <label className="flex items-center space-x-1 cursor-pointer">
              <input type="checkbox" checked={showShopName} onChange={(e) => setShowShopName(e.target.checked)} className="rounded" />
              <span>Shop Name</span>
            </label>
            <label className="flex items-center space-x-1 cursor-pointer">
              <input type="checkbox" checked={showMrp} onChange={(e) => setShowMrp(e.target.checked)} className="rounded" />
              <span>MRP</span>
            </label>
            <label className="flex items-center space-x-1 cursor-pointer">
              <input type="checkbox" checked={showOurPrice} onChange={(e) => setShowOurPrice(e.target.checked)} className="rounded" />
              <span>Our Price</span>
            </label>
            <label className="flex items-center space-x-1 cursor-pointer">
              <input type="checkbox" checked={showBatch} onChange={(e) => setShowBatch(e.target.checked)} className="rounded" />
              <span>Batch #</span>
            </label>
          </div>
        </div>

        <div>
          <label className={`text-xs font-bold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            Custom Subtitle / Tagline:
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showSubtitle}
              onChange={(e) => setShowSubtitle(e.target.checked)}
              className="rounded shrink-0"
              title="Toggle subtitle display"
            />
            <input
              type="text"
              value={customSubtitle}
              disabled={!showSubtitle}
              onChange={(e) => setCustomSubtitle(e.target.value)}
              placeholder="e.g. Best Quality Product"
              className={`w-full p-2 rounded-xl border text-xs outline-none disabled:opacity-40 ${
                isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            />
          </div>
        </div>

        <div className="flex flex-col justify-end space-y-2">
          {/* Default Template Save Button */}
          <button
            onClick={handleSaveAsDefault}
            className={`w-full py-1.5 px-2.5 rounded-xl border text-[11px] font-bold flex items-center justify-center space-x-1.5 transition-all ${
              isDark 
                ? 'bg-purple-500/15 border-purple-500/40 text-purple-300 hover:bg-purple-500/25 ring-1 ring-purple-500/30' 
                : 'bg-purple-50 border-purple-300 text-purple-800 hover:bg-purple-100'
            }`}
            title="Save current paper format and selected elements as your default design template"
          >
            <BookmarkCheck className="w-3.5 h-3.5 text-purple-500 shrink-0" />
            <span>Set as Default Design</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className={`flex-1 py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center space-x-1 transition-all ${
                previewMode 
                  ? 'bg-sky-500/20 border-sky-500 text-sky-400' 
                  : isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
              }`}
            >
              <Eye className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>{previewMode ? 'Edit Items' : 'Visual Preview'}</span>
            </button>

            <button
              onClick={handleDownloadHtml}
              disabled={labelsToPrint.length === 0}
              className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center transition-all disabled:opacity-40 ${
                isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
              }`}
              title="Download Standalone Printable HTML File"
            >
              <Download className="w-4 h-4 text-emerald-400" />
            </button>

            <button
              onClick={handlePrint}
              disabled={labelsToPrint.length === 0}
              className="flex-1 py-2 px-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-40 text-white text-xs font-bold flex items-center justify-center space-x-1 shadow-lg shadow-emerald-500/20 transition-all"
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span>Print ({labelsToPrint.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mode 1: Product Selector & Quantity Matrix */}
      {!previewMode ? (
        <div className={`rounded-2xl border overflow-hidden ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          {/* Controls Bar: Search + Selection + Stats */}
          <div className={`p-3.5 border-b flex flex-col md:flex-row md:items-center justify-between gap-3 ${
            isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products by name, barcode, SKU, batch..."
                className={`w-full pl-9 pr-8 py-2 rounded-xl text-xs font-medium outline-none transition-all border ${
                  isDark 
                    ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-brand-500 focus:ring-1 focus:ring-brand-500' 
                    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500'
                }`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Select & Counter Controls */}
            <div className="flex flex-wrap items-center justify-between md:justify-end gap-3">
              <button 
                type="button"
                onClick={toggleSelectFiltered} 
                className="flex items-center space-x-2 text-xs font-bold text-slate-300 hover:text-white transition-colors"
              >
                {areAllFilteredSelected ? (
                  <CheckSquare className="w-4 h-4 text-brand-500" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
                <span className={isDark ? 'text-slate-200' : 'text-slate-800'}>
                  {searchQuery ? `Select Visible (${filteredProducts.filter(p => selectedProductIds.includes(p.id)).length}/${filteredProducts.length})` : `Select All (${selectedProductIds.length}/${products.length})`}
                </span>
              </button>

              <div className="flex items-center space-x-2">
                <span className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Showing <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>{filteredProducts.length}</strong> of {products.length}
                </span>
                <span className="text-xs font-mono font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                  {labelsToPrint.length} stickers
                </span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs">
              <thead className={`border-b text-[10px] font-bold uppercase tracking-wider sticky top-0 z-10 ${
                isDark ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}>
                <tr>
                  <th className="p-3 w-10 text-center">Select</th>
                  <th className="p-3">Product Name</th>
                  <th className="p-3">Barcode (Code 128)</th>
                  <th className="p-3 font-mono">MRP</th>
                  <th className="p-3 font-mono">Our Price</th>
                  <th className="p-3 text-center w-40">Copies to Print</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Search className="w-6 h-6 text-slate-600" />
                        <span className="font-semibold text-xs">No products matching "{searchQuery}"</span>
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="text-xs text-brand-400 hover:underline font-bold mt-1"
                        >
                          Clear search filter
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map(prod => {
                    const isSelected = selectedProductIds.includes(prod.id);
                    const qty = labelQuantities[prod.id] || 1;
                    const code = prod.barcode || `890${String(prod.id).padStart(8, '0')}`;

                    return (
                      <tr key={prod.id} className={`transition-colors ${
                        isSelected 
                          ? isDark ? 'bg-brand-500/10' : 'bg-brand-50' 
                          : isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'
                      }`}>
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(prod.id)}
                            className="rounded cursor-pointer w-4 h-4 text-brand-600"
                          />
                        </td>
                        <td className="p-3">
                          <div className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{prod.name}</div>
                          <div className="text-[10px] text-slate-400 flex items-center space-x-2 mt-0.5">
                            <span>Unit: {prod.unit || 'PCS'}</span>
                            {prod.default_batch_no && <span>• Batch: {prod.default_batch_no}</span>}
                            {prod.expiry_date && <span>• Exp: {prod.expiry_date}</span>}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-mono font-bold text-xs text-sky-400">{code}</div>
                        </td>
                        <td className="p-3 font-mono text-slate-400">₹{prod.mrp}</td>
                        <td className="p-3 font-mono font-bold text-emerald-500">₹{prod.retail_rate || prod.mrp}</td>
                        <td className="p-3 text-center">
                          <div className="inline-flex items-center space-x-1">
                            <button
                              type="button"
                              onClick={() => decrementQty(prod.id)}
                              className={`p-1 rounded border hover:bg-slate-700 transition-colors ${
                                isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-300 text-slate-600'
                              }`}
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="number"
                              min="1"
                              max="500"
                              value={qty}
                              onChange={(e) => handleQtyChange(prod.id, e.target.value)}
                              className={`w-14 p-1 rounded border text-center font-mono font-bold text-xs outline-none ${
                                isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => incrementQty(prod.id)}
                              className={`p-1 rounded border hover:bg-slate-700 transition-colors ${
                                isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-300 text-slate-600'
                              }`}
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Mode 2: Live Printable Label Sheet Preview */
        <div className={`p-6 rounded-2xl border space-y-4 ${
          isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-300'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-400">
              <Eye className="w-4 h-4 text-brand-500" />
              <span>Real-Time Sticker Layout Preview ({labelsToPrint.length} total stickers)</span>
            </div>
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 flex items-center space-x-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Now</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-4 justify-center p-4 bg-slate-900/60 rounded-xl border border-slate-800 max-h-[600px] overflow-y-auto">
            {labelsToPrint.map((prod, idx) => {
              const code = prod.barcode || `890${String(prod.id).padStart(8, '0')}`;
              return (
                <div
                  key={idx}
                  className="w-52 h-32 bg-white text-black p-2.5 rounded-lg border border-slate-300 shadow-md flex flex-col justify-between text-center select-none shrink-0"
                >
                  {/* Shop Name */}
                  {showShopName && (
                    <div className="text-[9px] font-black uppercase tracking-wider text-slate-900 truncate">
                      {activeShop?.name || 'KwikStore Pro'}
                    </div>
                  )}

                  {/* Product Name */}
                  <div className="text-[11px] font-bold text-slate-900 line-clamp-1 leading-tight">
                    {prod.name}
                  </div>

                  {/* Real Code128 Vector Barcode */}
                  <div className="my-0.5 flex flex-col items-center">
                    <BarcodeSvg value={code} height={24} barWidth={1.1} displayValue={false} />
                    <div className="text-[9px] font-mono font-bold text-slate-800 tracking-wider mt-0.5">
                      {code}
                    </div>
                  </div>

                  {/* Price Display */}
                  <div className="flex justify-between items-center text-[10px] border-t border-slate-300 pt-1">
                    {showMrp ? (
                      <span className="text-slate-500 line-through">MRP: ₹{prod.mrp}</span>
                    ) : <span></span>}
                    {showOurPrice ? (
                      <span className="font-black text-xs text-black">OUR: ₹{prod.retail_rate || prod.mrp}</span>
                    ) : <span></span>}
                  </div>

                  {/* Batch & Expiry */}
                  {showBatch && (prod.default_batch_no || prod.expiry_date) && (
                    <div className="text-[8px] text-slate-500 text-left truncate">
                      {prod.default_batch_no ? `B:${prod.default_batch_no}` : ''} {prod.expiry_date ? `Exp:${prod.expiry_date}` : ''}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Save Notification Toast */}
      {savedNotification && (
        <div className="fixed bottom-6 right-6 z-50 p-3.5 rounded-xl bg-purple-600 text-white text-xs font-bold shadow-2xl flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{savedNotification}</span>
        </div>
      )}
    </div>
  );
}
