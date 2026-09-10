import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useShop } from '../../context/ShopContext';
import { useTheme } from '../../context/ThemeContext';
import { ExpiryTracker } from './ExpiryTracker';
import { BarcodeLabelDesigner } from './BarcodeLabelDesigner';
import { StockAlertsModal } from './StockAlertsModal';
import { DataTablePagination } from '../common/DataTablePagination';
import { 
  Package, 
  Search, 
  Plus, 
  Tag, 
  Boxes, 
  Layers, 
  AlertTriangle, 
  Sparkles, 
  Filter, 
  Truck, 
  Pill, 
  Smartphone, 
  Shirt, 
  ShoppingBag, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  X, 
  Save, 
  ShieldAlert, 
  Eye, 
  Info, 
  TrendingUp, 
  Percent, 
  QrCode, 
  DollarSign,
  Image as ImageIcon,
  Upload,
  Clock,
  Barcode
} from 'lucide-react';

export function InventoryManager() {
  const { user, hasPermission } = useAuth();
  const { activeShop } = useShop();
  const { isDark } = useTheme();

  const isOwner = Boolean(user && (user.roleKey === 'SUPER_ADMIN' || user.roleKey === 'owner' || user.roleId === 1));
  const canEdit = isOwner || hasPermission('inventory:edit');
  const canDelete = isOwner;
  const canSeeCosts = isOwner || hasPermission('inventory:costs');

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingProduct, setViewingProduct] = useState(null);
  const [editingProductId, setEditingProductId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [isQuickSupplierModalOpen, setIsQuickSupplierModalOpen] = useState(false);
  const [quickSupplierForm, setQuickSupplierForm] = useState({ name: '', phone: '', contact_person: '', gstin: '' });
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);
  const [alertsSummary, setAlertsSummary] = useState(null);
  const [activeInventoryTab, setActiveInventoryTab] = useState('catalog'); // catalog, expiry, barcode
  const [industryMode, setIndustryMode] = useState('auto'); // auto, garments, pharmacy, hardware, grocery, electronics, general, all
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const initialFormState = {
    shop_id: activeShop ? activeShop.id : 1,
    name: '',
    regional_name: '',
    barcode: '',
    item_code: '',
    category_id: 1,
    supplier_id: '',
    brand: '',
    image_url: null,
    hsn_code: '1905',
    tax_rate: 18,
    unit: 'PCS',
    secondary_unit: '',
    unit_conversion_factor: '',
    purchase_rate: '',
    mrp: '',
    retail_rate: '',
    wholesale_rate: '',
    dealer_rate: '',
    current_stock: '',
    min_stock_alert: '10',
    has_batch: false,
    has_serial_imei: false,
    has_variants: false,
    default_batch_no: '',
    default_expiry_date: '',
    default_size: '',
    default_color: '',
    trade_scheme: ''
  };

  const [form, setForm] = useState(initialFormState);

  // Auto-detect business industry profile based on category or shop type
  const detectIndustryFromCategory = (catId) => {
    const cat = categories.find(c => c.id === parseInt(catId, 10));
    const shopType = (activeShop?.shop_type || '').toLowerCase();

    if (cat) {
      const name = (cat.name || '').toLowerCase();
      const code = (cat.code || '').toLowerCase();
      if (name.includes('garment') || name.includes('cloth') || name.includes('apparel') || name.includes('fashion') || code === 'cloth') return 'garments';
      if (name.includes('pharm') || name.includes('medic') || name.includes('health') || name.includes('drug') || code === 'pharm') return 'pharmacy';
      if (name.includes('hardware') || name.includes('sanitary') || name.includes('tool') || name.includes('plywood') || name.includes('paint') || code === 'hard') return 'hardware';
      if (name.includes('grocery') || name.includes('fmcg') || name.includes('spice') || name.includes('food') || name.includes('bakery') || name.includes('sweet') || code === 'groc' || code === 'fmcg' || code === 'choc') return 'grocery';
      if (name.includes('elec') || name.includes('mobile') || name.includes('phone') || code === 'elec') return 'electronics';
    }

    if (shopType.includes('garment') || shopType.includes('cloth') || shopType.includes('fashion')) return 'garments';
    if (shopType.includes('pharm') || shopType.includes('medic')) return 'pharmacy';
    if (shopType.includes('hardware') || shopType.includes('sanitary')) return 'hardware';
    if (shopType.includes('grocery') || shopType.includes('fmcg') || shopType.includes('supermarket') || shopType.includes('distributor')) return 'grocery';

    return 'general';
  };

  const effectiveIndustry = industryMode === 'auto' 
    ? detectIndustryFromCategory(form.category_id) 
    : industryMode;

  useEffect(() => {
    if (activeShop) {
      loadProducts();
      loadCategories();
      loadSuppliers();
      loadAlertsSummary();
    }
  }, [activeShop, search]);

  const loadAlertsSummary = async () => {
    try {
      const res = await fetch(`/api/inventory/alerts?shopId=${activeShop?.id || 1}`);
      if (res.ok) {
        const data = await res.json();
        setAlertsSummary(data);
      }
    } catch (e) {
      console.error('Failed to load alert summary', e);
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/products?shopId=${activeShop.id}&search=${encodeURIComponent(search)}`);
      if (res.ok) setProducts(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await fetch(`/api/categories?shopId=${activeShop.id}`);
      if (res.ok) {
        const catList = await res.json();
        setCategories(catList);
        if (catList.length > 0 && !form.category_id) {
          setForm(prev => ({ ...prev, category_id: catList[0].id }));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadSuppliers = async () => {
    try {
      const res = await fetch(`/api/suppliers?shopId=${activeShop.id}`);
      if (res.ok) {
        const supList = await res.json();
        setSuppliers(supList);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleQuickAddSupplier = async (e) => {
    e.preventDefault();
    if (!quickSupplierForm.name.trim() || !quickSupplierForm.phone.trim()) {
      alert('Please provide supplier company name and phone number.');
      return;
    }
    setSavingQuickSupplier(true);
    try {
      const payload = {
        ...quickSupplierForm,
        shop_id: activeShop.id,
        state: activeShop.state || 'Delhi',
        state_code: activeShop.state_code || '07'
      };
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        await loadSuppliers();
        setForm(prev => ({ ...prev, supplier_id: data.id }));
        setIsQuickSupplierModalOpen(false);
        setQuickSupplierForm({ name: '', phone: '', contact_person: '', gstin: '' });
        setNotification({ type: 'success', message: `Supplier "${quickSupplierForm.name}" created and selected!` });
      } else {
        alert(data.message || 'Error creating supplier');
      }
    } catch (err) {
      alert('Network error saving supplier');
    } finally {
      setSavingQuickSupplier(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Strict Size Limit: 250 KB (250 * 1024 = 256,000 bytes)
    const MAX_SIZE_BYTES = 250 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      const actualKb = (file.size / 1024).toFixed(1);
      setImageError(`Image size is ${actualKb} KB, which exceeds the 250 KB limit. Please upload a compressed image under 250 KB.`);
      e.target.value = '';
      return;
    }

    if (!file.type.startsWith('image/')) {
      setImageError('Please upload a valid image file (PNG, JPG, JPEG, WEBP, SVG).');
      e.target.value = '';
      return;
    }

    setImageError(null);
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      setForm(prev => ({ ...prev, image_url: uploadEvent.target.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setForm(prev => ({ ...prev, image_url: null }));
    setImageError(null);
  };

  const openAddModal = () => {
    setEditingProductId(null);
    setImageError(null);
    setIndustryMode('auto');
    const firstCatId = categories[0]?.id || 1;
    setForm({
      ...initialFormState,
      shop_id: activeShop?.id || 1,
      category_id: firstCatId,
      supplier_id: suppliers[0]?.id || '',
      image_url: null
    });
    setIsModalOpen(true);
  };

  const openEditModal = (prod) => {
    if (!canEdit) {
      alert('Access Denied: Only shop owners and authorized managers can edit inventory products.');
      return;
    }
    setEditingProductId(prod.id);
    setImageError(null);

    // Smart industry mode detection on edit
    if (prod.default_size || prod.default_color || prod.has_variants) {
      setIndustryMode('garments');
    } else if (prod.default_batch_no || prod.default_expiry_date || prod.has_batch) {
      setIndustryMode('pharmacy');
    } else if (prod.has_serial_imei) {
      setIndustryMode('electronics');
    } else if (prod.secondary_unit && prod.secondary_unit.trim() !== '') {
      setIndustryMode('hardware');
    } else {
      setIndustryMode('auto');
    }

    setForm({
      id: prod.id,
      shop_id: prod.shop_id || activeShop.id,
      name: prod.name || '',
      regional_name: prod.regional_name || '',
      barcode: prod.barcode || '',
      item_code: prod.item_code || '',
      category_id: prod.category_id || categories[0]?.id || 1,
      supplier_id: prod.supplier_id || '',
      brand: prod.brand || '',
      image_url: prod.image_url || null,
      hsn_code: prod.hsn_code || '1905',
      tax_rate: prod.tax_rate !== undefined ? prod.tax_rate : 18,
      unit: prod.unit || 'PCS',
      secondary_unit: prod.secondary_unit || '',
      unit_conversion_factor: (prod.unit_conversion_factor !== undefined && prod.unit_conversion_factor !== null) ? prod.unit_conversion_factor : '',
      purchase_rate: (prod.purchase_rate !== undefined && prod.purchase_rate !== null) ? prod.purchase_rate : '',
      mrp: (prod.mrp !== undefined && prod.mrp !== null) ? prod.mrp : '',
      retail_rate: (prod.retail_rate !== undefined && prod.retail_rate !== null) ? prod.retail_rate : '',
      wholesale_rate: (prod.wholesale_rate !== undefined && prod.wholesale_rate !== null) ? prod.wholesale_rate : '',
      dealer_rate: (prod.dealer_rate !== undefined && prod.dealer_rate !== null) ? prod.dealer_rate : '',
      current_stock: (prod.current_stock !== undefined && prod.current_stock !== null) ? prod.current_stock : '',
      min_stock_alert: (prod.min_stock_alert !== undefined && prod.min_stock_alert !== null) ? prod.min_stock_alert : '10',
      has_batch: Boolean(prod.has_batch),
      has_serial_imei: Boolean(prod.has_serial_imei),
      has_variants: Boolean(prod.has_variants),
      default_batch_no: prod.default_batch_no || (prod.batches?.[0]?.batch_no || ''),
      default_expiry_date: prod.default_expiry_date || (prod.batches?.[0]?.expiry_date || ''),
      default_size: prod.default_size || (prod.variants?.[0]?.size || ''),
      default_color: prod.default_color || (prod.variants?.[0]?.color || ''),
      trade_scheme: prod.trade_scheme || ''
    });
    setIsModalOpen(true);
  };

  const handleDeleteProduct = async (prod) => {
    if (!canDelete) {
      alert('Access Denied: Only the Shop Owner has the right to delete items from inventory.');
      return;
    }

    if (!confirm(`Are you sure you want to delete "${prod.name}" from inventory?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/products/${prod.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setNotification({ type: 'success', message: data.message || `Product "${prod.name}" deleted successfully!` });
        loadProducts();
      } else {
        alert(data.message || 'Error deleting product');
      }
    } catch (err) {
      alert('Error connecting to server to delete product.');
    }
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        shop_id: activeShop.id,
        id: editingProductId || undefined,
        purchase_rate: form.purchase_rate === '' ? 0 : (parseFloat(form.purchase_rate) || 0),
        mrp: form.mrp === '' ? 0 : (parseFloat(form.mrp) || 0),
        retail_rate: form.retail_rate === '' ? 0 : (parseFloat(form.retail_rate) || 0),
        wholesale_rate: form.wholesale_rate === '' ? 0 : (parseFloat(form.wholesale_rate) || 0),
        dealer_rate: form.dealer_rate === '' ? 0 : (parseFloat(form.dealer_rate) || 0),
        current_stock: form.current_stock === '' ? 0 : (parseFloat(form.current_stock) || 0),
        min_stock_alert: form.min_stock_alert === '' ? 0 : (parseFloat(form.min_stock_alert) || 0),
        unit_conversion_factor: form.unit_conversion_factor === '' ? 1 : (parseFloat(form.unit_conversion_factor) || 1),
        tax_rate: parseFloat(form.tax_rate) || 0
      };
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        setNotification({ 
          type: 'success', 
          message: editingProductId ? `Product "${form.name}" updated successfully!` : `New product "${form.name}" added to inventory!` 
        });
        loadProducts();
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('Error saving product.');
    }
  };

  const filteredProducts = selectedCat === 'ALL' 
    ? products 
    : products.filter(p => p.category_id === parseInt(selectedCat, 10));

  const totalProductRecords = filteredProducts.length;
  const numericProductPageSize = pageSize === 'ALL' ? totalProductRecords : Number(pageSize);
  const productStartIndex = (currentPage - 1) * numericProductPageSize;
  const paginatedProducts = pageSize === 'ALL'
    ? filteredProducts
    : filteredProducts.slice(productStartIndex, productStartIndex + numericProductPageSize);

  return (
    <div className={`h-full flex flex-col overflow-hidden transition-colors duration-200 ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-800'
    }`}>
      {/* Top Inventory Toolbar */}
      <div className={`border-b px-6 py-4 flex items-center justify-between shrink-0 ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className={`text-lg font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Universal Product & Stock Master
            </h1>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
              {activeShop?.name}
            </span>
          </div>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {isOwner ? (
              <span className="text-emerald-500 font-semibold">
                Shop Owner Mode: Full rights to Add, Edit pricing & barcode, and Delete items.
              </span>
            ) : (
              <span>Catalog View: Barcodes, Dual Units (Carton/Box/Pcs), 10+1 Trade Schemes, Pharma Expiry, and IMEI Serials.</span>
            )}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Sub-tab Switcher */}
          <div className={`p-1 rounded-xl border flex items-center space-x-1 ${
            isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}>
            {[
              { id: 'catalog', label: 'Products Master', icon: Package },
              { id: 'expiry', label: 'Expiry Tracker', icon: Clock },
              { id: 'barcode', label: 'Barcode Designer', icon: Barcode }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveInventoryTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all ${
                    activeInventoryTab === tab.id
                      ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                      : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Stock & Expiry Alerts Modal Trigger */}
          <button
            onClick={() => setIsAlertsModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-bold shadow-sm flex items-center space-x-1.5 transition-all"
            title="View 0-Stock, Threshold Triggers & Expiry Batches"
          >
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <span>Stock Alerts</span>
            {alertsSummary?.totalAlerts > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-black">
                {alertsSummary.totalAlerts}
              </span>
            )}
          </button>

          {/* Add Product Button (Owner & Authorized Staff only) */}
          {canEdit && (
            <button
              onClick={openAddModal}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white text-xs font-bold shadow-lg shadow-amber-500/25 flex items-center space-x-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Product</span>
            </button>
          )}
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div className="mx-6 mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-xs flex items-center justify-between animate-in fade-in shrink-0">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold ml-2">✕</button>
        </div>
      )}

      {/* Sub-tab 2: Expiry Tracker */}
      {activeInventoryTab === 'expiry' && (
        <div className="flex-1 overflow-y-auto p-4">
          <ExpiryTracker onOpenProductEdit={openEditModal} />
        </div>
      )}

      {/* Sub-tab 3: Barcode Label Designer */}
      {activeInventoryTab === 'barcode' && (
        <div className="flex-1 overflow-y-auto p-4">
          <BarcodeLabelDesigner products={products} />
        </div>
      )}

      {/* Sub-tab 1: Products Catalog */}
      {activeInventoryTab === 'catalog' && (
        <>
          {/* Filter and Search Bar */}
          <div className={`p-4 border-b flex items-center justify-between space-x-4 shrink-0 ${
            isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search items by name, barcode, brand, SKU..."
                className={`w-full border rounded-xl pl-9 pr-4 py-2 text-xs outline-none focus:border-amber-500 ${
                  isDark ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
              />
            </div>

            {/* Category Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={selectedCat}
                onChange={(e) => setSelectedCat(e.target.value)}
                className={`border rounded-xl px-3 py-2 text-xs outline-none cursor-pointer font-medium ${
                  isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-800'
                }`}
              >
                <option value="ALL">All Categories ({products.length})</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

      {/* Products Table */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className={`border rounded-xl overflow-hidden shadow-lg ${
          isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-white'
        }`}>
          <table className="w-full text-left text-xs">
            <thead className={`font-bold uppercase tracking-wider text-[10px] border-b ${
              isDark ? 'bg-slate-900 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}>
              <tr>
                <th className="py-3 px-3">Item Details</th>
                <th className="py-3 px-3">Category / Sector</th>
                <th className="py-3 px-3 text-center">Unit / Dual Conversion</th>
                {canSeeCosts && <th className="py-3 px-3 text-right">Purchase Cost</th>}
                <th className="py-3 px-3 text-right">Retail (₹)</th>
                <th className="py-3 px-3 text-right">Wholesale / Dealer</th>
                <th className="py-3 px-3 text-center">Current Stock</th>
                <th className="py-3 px-3">Special Attributes</th>
                <th className="py-3 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y font-sans ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={canSeeCosts ? 9 : 8} className="py-8 text-center text-slate-400 font-sans text-xs">
                    No products found matching your search.
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((p) => {
                  const isLow = p.current_stock <= p.min_stock_alert;
                  return (
                    <tr key={p.id} className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                      <td className="py-3 px-3">
                        <div className="flex items-center space-x-3">
                          {p.image_url ? (
                            <img
                              src={p.image_url}
                              alt={p.name}
                              className="w-10 h-10 rounded-xl object-cover border border-slate-700/50 shrink-0 bg-slate-900 shadow-sm"
                            />
                          ) : (
                            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                              isDark ? 'bg-slate-800/80 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'
                            }`}>
                              <Package className="w-5 h-5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{p.name}</div>
                            {p.regional_name && <div className="text-[11px] text-slate-500">{p.regional_name}</div>}
                            <div className="text-[10px] text-slate-400 font-mono flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                              <span>Barcode: <strong className={isDark ? 'text-slate-300' : 'text-slate-700'}>{p.barcode || 'N/A'}</strong></span>
                              <span>•</span>
                              <span>HSN: {p.hsn_code} (GST {p.tax_rate}%)</span>
                              {p.supplier_name && (
                                <>
                                  <span>•</span>
                                  <span className="text-indigo-600 dark:text-indigo-400 font-sans font-semibold flex items-center gap-0.5">
                                    <Truck className="w-3 h-3 shrink-0" />
                                    <span>{p.supplier_name}</span>
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-300">
                          {p.category_name || 'General'}
                        </span>
                        {p.brand && <div className="text-[10px] text-slate-400">{p.brand}</div>}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{p.unit}</div>
                        {p.secondary_unit && (
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                            1 {p.unit} = {p.unit_conversion_factor} {p.secondary_unit}
                          </div>
                        )}
                      </td>

                      {canSeeCosts && (
                        <td className="py-3 px-3 text-right font-mono text-slate-500">
                          ₹{p.purchase_rate?.toFixed(2)}
                        </td>
                      )}

                      <td className="py-3 px-3 text-right font-mono">
                        <div className="font-bold text-brand-600 dark:text-brand-400 text-sm">₹{p.retail_rate?.toFixed(2)}</div>
                        <div className="text-[10px] text-slate-400 line-through">MRP: ₹{p.mrp?.toFixed(2)}</div>
                      </td>

                      <td className="py-3 px-3 text-right font-mono">
                        <div className="font-semibold text-sky-600 dark:text-sky-300">W: ₹{p.wholesale_rate?.toFixed(2)}</div>
                        <div className="text-[10px] text-slate-500">D: ₹{p.dealer_rate?.toFixed(2)}</div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className={`font-black font-mono text-sm ${isLow ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {p.current_stock} {p.unit}
                        </div>
                        {isLow && (
                          <span className="inline-flex items-center text-[9px] font-bold text-rose-500 gap-0.5">
                            <AlertTriangle className="w-2.5 h-2.5" /> Low Stock
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1">
                          {p.trade_scheme && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30">
                              {p.trade_scheme}
                            </span>
                          )}
                          {p.has_batch && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/30">
                              Batch {p.default_batch_no ? `#${p.default_batch_no}` : ''}
                            </span>
                          )}
                          {p.has_serial_imei && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-600 dark:text-sky-300 border border-sky-500/30">
                              Serial/IMEI
                            </span>
                          )}
                          {p.has_variants && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-600 dark:text-pink-300 border border-pink-500/30">
                              Variants
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          {/* View Product Details Button */}
                          <button
                            onClick={() => setViewingProduct(p)}
                            className={`p-1.5 rounded-lg border transition-all ${
                              isDark 
                                ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-amber-400 hover:text-amber-300 hover:border-amber-500/50' 
                                : 'bg-slate-100 hover:bg-amber-50 border-slate-300 text-amber-600 hover:text-amber-700 hover:border-amber-400'
                            }`}
                            title="View Full Product Specification & Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Product Button */}
                          {canEdit && (
                            <button
                              onClick={() => openEditModal(p)}
                              className={`p-1.5 rounded-lg border transition-all ${
                                isDark 
                                  ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-sky-400 hover:text-sky-300 hover:border-sky-500/50' 
                                  : 'bg-slate-100 hover:bg-sky-50 border-slate-300 text-sky-600 hover:text-sky-700 hover:border-sky-400'
                              }`}
                              title="Edit Product Details & Rates"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete Product Button */}
                          {canDelete && (
                            <button
                              onClick={() => handleDeleteProduct(p)}
                              className="p-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition-all"
                              title="Delete / Remove Product (Owner Only)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Page Navigation Footer */}
        <DataTablePagination
          totalRecords={totalProductRecords}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          pageSize={pageSize}
          setPageSize={setPageSize}
          recordLabel="Products"
        />
      </div>
      </>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className={`p-4 border-b flex justify-between items-center ${
              isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'
            }`}>
              <div className="flex items-center space-x-2">
                {editingProductId ? <Edit3 className="w-4 h-4 text-sky-500" /> : <Plus className="w-4 h-4 text-amber-500" />}
                <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {editingProductId ? `Edit Product: ${form.name}` : 'Create Universal Product'}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Product Image Upload Section (Strict Limit < 250 KB) */}
              <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <label className={`font-semibold flex items-center space-x-1.5 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    <ImageIcon className="w-4 h-4 text-brand-500" />
                    <span>Product Image (Max Size: 250 KB)</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">PNG, JPG, WEBP, SVG</span>
                </div>

                {imageError && (
                  <div className="mb-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center space-x-1.5 animate-in fade-in">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{imageError}</span>
                  </div>
                )}

                <div className="flex items-center space-x-4">
                  {form.image_url ? (
                    <div className="relative group">
                      <img
                        src={form.image_url}
                        alt="Product Preview"
                        className="w-20 h-20 rounded-xl object-cover border-2 border-brand-500 shadow-md bg-slate-900"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute -top-2 -right-2 bg-rose-600 text-white rounded-full p-1 shadow-md hover:bg-rose-500 transition-colors"
                        title="Remove Image"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className={`w-20 h-20 rounded-xl border-2 border-dashed flex flex-col items-center justify-center text-center p-2 ${
                      isDark ? 'border-slate-700 bg-slate-900 text-slate-500' : 'border-slate-300 bg-white text-slate-400'
                    }`}>
                      <ImageIcon className="w-6 h-6 stroke-1 mb-1" />
                      <span className="text-[9px]">No Image</span>
                    </div>
                  )}

                  <div className="flex-1 space-y-1.5">
                    <label className="inline-block cursor-pointer">
                      <span className="px-3.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-md inline-flex items-center space-x-1.5 transition-all">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{form.image_url ? 'Change Image (<250KB)' : 'Upload Product Image (<250KB)'}</span>
                      </span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      This photo will appear in the Inventory catalog, POS billing counter, and quick item lookups. File size must be under 250 KB.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Product Name *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className={`w-full border rounded-lg p-2 outline-none font-semibold ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    placeholder="e.g. Parle-G Biscuit Box"
                  />
                </div>
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Regional / Hindi Name</label>
                  <input
                    type="text"
                    value={form.regional_name}
                    onChange={(e) => setForm({ ...form, regional_name: e.target.value })}
                    className={`w-full border rounded-lg p-2 outline-none ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    placeholder="e.g. पारले-जी बिस्कुट"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Barcode / SKU</label>
                  <input
                    type="text"
                    value={form.barcode}
                    onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                    className={`w-full border rounded-lg p-2 font-mono outline-none ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    placeholder="e.g. 8901719101010"
                  />
                </div>
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Category</label>
                  <select
                    value={form.category_id}
                    onChange={(e) => setForm({ ...form, category_id: parseInt(e.target.value, 10) })}
                    className={`w-full border rounded-lg p-2 outline-none ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>GST Tax Rate (%)</label>
                  <select
                    value={form.tax_rate}
                    onChange={(e) => setForm({ ...form, tax_rate: parseFloat(e.target.value) })}
                    className={`w-full border rounded-lg p-2 font-mono outline-none ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    {[0, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r}% GST</option>)}
                  </select>
                </div>
              </div>

              {/* Supplier / Vendor and Brand */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={`font-semibold flex items-center space-x-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      <Truck className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Supplier / Vendor Name</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsQuickSupplierModalOpen(true)}
                      className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center space-x-0.5"
                    >
                      <Plus className="w-3 h-3" />
                      <span>New Supplier</span>
                    </button>
                  </div>
                  <select
                    value={form.supplier_id || ''}
                    onChange={(e) => setForm({ ...form, supplier_id: e.target.value ? parseInt(e.target.value, 10) : '' })}
                    className={`w-full border rounded-lg p-2 outline-none text-xs font-semibold ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="">-- No Supplier Assigned (Self / Direct) --</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.contact_person ? `(${s.contact_person} • ${s.phone})` : `(${s.phone})`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Brand / Manufacturer
                  </label>
                  <input
                    type="text"
                    value={form.brand}
                    onChange={(e) => setForm({ ...form, brand: e.target.value })}
                    placeholder="e.g. Parle, Nestle, Britannia, Amul"
                    className={`w-full border rounded-lg p-2 outline-none ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>
              <div className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                isDark ? 'bg-slate-950/90 border-slate-800' : 'bg-slate-100/90 border-slate-200'
              }`}>
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                  <div>
                    <div className={`font-bold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Industry Profile: <span className="text-amber-500 capitalize">{effectiveIndustry}</span>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      {industryMode === 'auto' ? 'Auto-detected from Category • Showing only relevant options' : 'Custom sector view active'}
                    </p>
                  </div>
                </div>

                {/* Industry Selector Pills */}
                <div className="flex flex-wrap items-center gap-1">
                  {[
                    { id: 'auto', label: 'Auto' },
                    { id: 'garments', label: '👗 Garments' },
                    { id: 'pharmacy', label: '💊 Pharmacy' },
                    { id: 'hardware', label: '🔧 Hardware' },
                    { id: 'grocery', label: '🛒 Grocery' },
                    { id: 'general', label: '📦 General' },
                    { id: 'all', label: '⚙️ All' },
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setIndustryMode(m.id)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                        industryMode === m.id
                          ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm font-black'
                          : isDark 
                            ? 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white' 
                            : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Garments & Apparel Size/Color Section (Shown only for Garments or All) */}
              {(effectiveIndustry === 'garments' || effectiveIndustry === 'all') && (
                <div className={`p-3.5 border rounded-xl space-y-3 ${
                  isDark ? 'bg-pink-950/20 border-pink-800/40' : 'bg-pink-50/70 border-pink-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="text-pink-600 dark:text-pink-400 font-bold flex items-center space-x-1.5 text-xs">
                      <Shirt className="w-4 h-4" />
                      <span>Garments & Apparel Attributes (Size & Color)</span>
                    </div>
                    <label className="flex items-center space-x-1.5 cursor-pointer text-[11px] text-pink-600 dark:text-pink-400 font-semibold">
                      <input
                        type="checkbox"
                        checked={form.has_variants}
                        onChange={(e) => setForm({ ...form, has_variants: e.target.checked })}
                        className="rounded accent-pink-600"
                      />
                      <span>Enable Garment Variant</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-500 mb-1 font-semibold">Garment Size</label>
                      <input
                        type="text"
                        value={form.default_size}
                        onChange={(e) => setForm({ ...form, default_size: e.target.value.toUpperCase(), has_variants: true })}
                        placeholder="e.g. M, L, XL, 32, 34, Free Size"
                        className={`w-full border rounded-lg p-2 font-mono uppercase font-bold outline-none ${
                          isDark ? 'bg-slate-900 border-slate-700 text-pink-300' : 'bg-white border-slate-300 text-pink-700'
                        }`}
                      />
                      {/* Size Quick Chips */}
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {['S', 'M', 'L', 'XL', 'XXL', '28', '30', '32', '34', '36', 'Free Size'].map(sz => (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => setForm(prev => ({ ...prev, default_size: sz, has_variants: true }))}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors ${
                              form.default_size === sz 
                                ? 'bg-pink-600 text-white border-pink-600' 
                                : isDark ? 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {sz}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-500 mb-1 font-semibold">Color / Shade</label>
                      <input
                        type="text"
                        value={form.default_color}
                        onChange={(e) => setForm({ ...form, default_color: e.target.value, has_variants: true })}
                        placeholder="e.g. Navy Blue, Black, White"
                        className={`w-full border rounded-lg p-2 font-semibold outline-none ${
                          isDark ? 'bg-slate-900 border-slate-700 text-pink-300' : 'bg-white border-slate-300 text-pink-700'
                        }`}
                      />
                      {/* Color Quick Chips */}
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {['Black', 'White', 'Navy Blue', 'Royal Blue', 'Red', 'Maroon', 'Grey', 'Green', 'Yellow', 'Beige'].map(cl => (
                          <button
                            key={cl}
                            type="button"
                            onClick={() => setForm(prev => ({ ...prev, default_color: cl, has_variants: true }))}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium border transition-colors ${
                              form.default_color === cl 
                                ? 'bg-pink-600 text-white border-pink-600 font-bold' 
                                : isDark ? 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {cl}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Pharmacy & Medicine Section (Shown only for Pharmacy or All) */}
              {(effectiveIndustry === 'pharmacy' || effectiveIndustry === 'all') && (
                <div className={`p-3.5 border rounded-xl space-y-3 ${
                  isDark ? 'bg-purple-950/20 border-purple-800/40' : 'bg-purple-50/70 border-purple-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="text-purple-600 dark:text-purple-400 font-bold flex items-center space-x-1.5 text-xs">
                      <Pill className="w-4 h-4" />
                      <span>Pharmacy / Medicine Compliance (Batch No & Expiry)</span>
                    </div>
                    <label className="flex items-center space-x-1.5 cursor-pointer text-[11px] text-purple-600 dark:text-purple-400 font-semibold">
                      <input
                        type="checkbox"
                        checked={form.has_batch}
                        onChange={(e) => setForm({ ...form, has_batch: e.target.checked })}
                        className="rounded accent-purple-600"
                      />
                      <span>Track Batch & Expiry</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-500 mb-1 font-semibold">Batch Number (Lot No)</label>
                      <input
                        type="text"
                        value={form.default_batch_no}
                        onChange={(e) => setForm({ ...form, default_batch_no: e.target.value.toUpperCase(), has_batch: true })}
                        placeholder="e.g. BT-2024A9 or L904"
                        className={`w-full border rounded-lg p-2 font-mono uppercase font-bold outline-none ${
                          isDark ? 'bg-slate-900 border-slate-700 text-purple-300' : 'bg-white border-slate-300 text-purple-700'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-slate-500 mb-1 font-semibold">Expiry Date (MM/YY or YYYY-MM)</label>
                      <input
                        type="text"
                        value={form.default_expiry_date}
                        onChange={(e) => setForm({ ...form, default_expiry_date: e.target.value, has_batch: true })}
                        placeholder="e.g. 12/2027 or 2027-12"
                        className={`w-full border rounded-lg p-2 font-mono font-bold outline-none ${
                          isDark ? 'bg-slate-900 border-slate-700 text-purple-300' : 'bg-white border-slate-300 text-purple-700'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Hardware & Wholesale Dual Units Section (Shown only for Hardware or All) */}
              {(effectiveIndustry === 'hardware' || effectiveIndustry === 'all') && (
                <div className={`p-3.5 border rounded-xl space-y-3 ${
                  isDark ? 'bg-amber-950/20 border-amber-800/40' : 'bg-amber-50/70 border-amber-200'
                }`}>
                  <div className="text-amber-600 dark:text-amber-400 font-bold flex items-center space-x-1.5 text-xs">
                    <Boxes className="w-4 h-4" />
                    <span>Hardware & Wholesale Units (Presets & Dual Conversion)</span>
                  </div>

                  {/* Common Unit Quick Presets */}
                  <div>
                    <label className="block text-slate-500 text-[10px] mb-1 font-semibold">Primary Unit Quick Presets:</label>
                    <div className="flex flex-wrap gap-1">
                      {['PCS', 'KG', 'GM', 'LTR', 'ML', 'MTR', 'FEET', 'SQFT', 'BOX', 'ROLL', 'SET', 'PKT', 'DOZEN', 'BUNDLE'].map(u => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, unit: u }))}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors ${
                            form.unit === u 
                              ? 'bg-amber-600 text-white border-amber-600' 
                              : isDark ? 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-1">
                    <div>
                      <label className="block text-slate-500 mb-1 font-semibold">Primary Unit</label>
                      <input
                        type="text"
                        value={form.unit}
                        onChange={(e) => setForm({ ...form, unit: e.target.value.toUpperCase() })}
                        className={`w-full border rounded-lg p-2 font-mono uppercase font-bold outline-none ${
                          isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                        placeholder="e.g. BOX / MTR"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1 font-semibold">Secondary Unit</label>
                      <input
                        type="text"
                        value={form.secondary_unit}
                        onChange={(e) => setForm({ ...form, secondary_unit: e.target.value.toUpperCase() })}
                        className={`w-full border rounded-lg p-2 font-mono uppercase font-bold outline-none ${
                          isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                        placeholder="e.g. PCS / FEET"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1 font-semibold">Conversion Factor</label>
                      <input
                        type="number"
                        step="any"
                        value={form.unit_conversion_factor}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setForm({ ...form, unit_conversion_factor: e.target.value })}
                        className={`w-full border rounded-lg p-2 font-mono font-bold outline-none ${
                          isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                        placeholder="e.g. 50 (1 Box = 50 Pcs)"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Grocery / FMCG Section (Shown only for Grocery or All) */}
              {(effectiveIndustry === 'grocery') && (
                <div className={`p-3.5 border rounded-xl space-y-3 ${
                  isDark ? 'bg-emerald-950/20 border-emerald-800/40' : 'bg-emerald-50/70 border-emerald-200'
                }`}>
                  <div className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center space-x-1.5 text-xs">
                    <ShoppingBag className="w-4 h-4" />
                    <span>FMCG & Grocery Packaged Units (Box / Carton to Pkts)</span>
                  </div>

                  {/* Common Unit Quick Presets */}
                  <div>
                    <label className="block text-slate-500 text-[10px] mb-1 font-semibold">Standard Grocery Unit Presets:</label>
                    <div className="flex flex-wrap gap-1">
                      {['PKT', 'BOX', 'KG', 'GM', 'LTR', 'ML', 'PCS', 'CARTON', 'BAG', 'DOZEN'].map(u => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, unit: u }))}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors ${
                            form.unit === u 
                              ? 'bg-emerald-600 text-white border-emerald-600' 
                              : isDark ? 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-1">
                    <div>
                      <label className="block text-slate-500 mb-1 font-semibold">Primary Unit</label>
                      <input
                        type="text"
                        value={form.unit}
                        onChange={(e) => setForm({ ...form, unit: e.target.value.toUpperCase() })}
                        className={`w-full border rounded-lg p-2 font-mono uppercase font-bold outline-none ${
                          isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                        placeholder="e.g. BOX / CARTON"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1 font-semibold">Secondary Sub-Unit</label>
                      <input
                        type="text"
                        value={form.secondary_unit}
                        onChange={(e) => setForm({ ...form, secondary_unit: e.target.value.toUpperCase() })}
                        className={`w-full border rounded-lg p-2 font-mono uppercase font-bold outline-none ${
                          isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                        placeholder="e.g. PACKET / BOTTLE"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1 font-semibold">Pack Size (Qty)</label>
                      <input
                        type="number"
                        step="any"
                        value={form.unit_conversion_factor}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setForm({ ...form, unit_conversion_factor: e.target.value })}
                        className={`w-full border rounded-lg p-2 font-mono font-bold outline-none ${
                          isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                        placeholder="e.g. 24 (1 Box = 24 Pkts)"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Standard General Unit Presets (For Garments / Pharmacy / General when dual conversion not active) */}
              {effectiveIndustry !== 'hardware' && effectiveIndustry !== 'grocery' && effectiveIndustry !== 'all' && (
                <div className={`p-3 border rounded-xl space-y-2 ${
                  isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <label className={`block font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Primary Unit: <strong className="text-amber-500">{form.unit}</strong>
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {(effectiveIndustry === 'garments' 
                      ? ['PCS', 'SET', 'PAIR', 'MTR', 'DOZEN', 'BOX']
                      : effectiveIndustry === 'pharmacy'
                      ? ['STRIP', 'TAB', 'BOTTLE', 'BOX', 'PCS', 'VIAL', 'TUBE', 'SYRUP']
                      : ['PCS', 'PKT', 'KG', 'GM', 'LTR', 'ML', 'BOX', 'SET', 'DOZEN', 'MTR']
                    ).map(u => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, unit: u }))}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-colors ${
                          form.unit === u 
                            ? 'bg-amber-600 text-white border-amber-600' 
                            : isDark ? 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Multi-tier Pricing */}
              <div className={`p-3.5 border rounded-xl space-y-2 ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="text-brand-600 dark:text-brand-400 font-bold">Multi-Tier Pricing (INR)</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-slate-500 mb-1 font-semibold">Purchase Rate (₹)</label>
                    <input
                      type="number"
                      step="any"
                      value={form.purchase_rate}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setForm({ ...form, purchase_rate: e.target.value })}
                      placeholder="0.00"
                      className={`w-full border rounded-lg p-2 font-mono outline-none ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1 font-semibold">Printed MRP (₹)</label>
                    <input
                      type="number"
                      step="any"
                      value={form.mrp}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setForm({ ...form, mrp: e.target.value })}
                      placeholder="0.00"
                      className={`w-full border rounded-lg p-2 font-mono outline-none ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1 font-semibold">Retail Rate (₹) *</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={form.retail_rate}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setForm({ ...form, retail_rate: e.target.value })}
                      placeholder="0.00"
                      className={`w-full border rounded-lg p-2 font-mono font-bold text-brand-600 dark:text-brand-400 outline-none ${
                        isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1 font-semibold">Wholesale Rate (₹)</label>
                    <input
                      type="number"
                      step="any"
                      value={form.wholesale_rate}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setForm({ ...form, wholesale_rate: e.target.value })}
                      placeholder="0.00"
                      className={`w-full border rounded-lg p-2 font-mono outline-none ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Stock Quantity & Alert */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Current Stock Quantity</label>
                  <input
                    type="number"
                    step="any"
                    value={form.current_stock}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setForm({ ...form, current_stock: e.target.value })}
                    placeholder="0"
                    className={`w-full border rounded-lg p-2 font-mono font-bold text-emerald-600 dark:text-emerald-400 outline-none ${
                      isDark ? 'bg-slate-950 border-slate-700' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Low Stock Alert Threshold</label>
                  <input
                    type="number"
                    step="any"
                    value={form.min_stock_alert}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setForm({ ...form, min_stock_alert: e.target.value })}
                    placeholder="10"
                    className={`w-full border rounded-lg p-2 font-mono outline-none ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* Trade Scheme (Shown for Grocery, Hardware, or All) */}
              {(effectiveIndustry === 'grocery' || effectiveIndustry === 'hardware' || effectiveIndustry === 'all') && (
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Trade Scheme / Free Offer (Optional)</label>
                  <input
                    type="text"
                    value={form.trade_scheme}
                    onChange={(e) => setForm({ ...form, trade_scheme: e.target.value })}
                    className={`w-full border rounded-lg p-2 outline-none ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    placeholder="e.g. 10+1 Free Scheme or Buy 5 Get 5% Off"
                  />
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-700/50">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold ${
                    isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold text-xs shadow-lg shadow-amber-500/20 flex items-center space-x-1.5 transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingProductId ? 'Update Product Changes' : 'Save Product to Database'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Product Specification Sheet Modal */}
      {viewingProduct && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            {/* Modal Header */}
            <div className={`p-4 border-b flex justify-between items-center ${
              isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center space-x-3">
                {viewingProduct.image_url ? (
                  <img
                    src={viewingProduct.image_url}
                    alt={viewingProduct.name}
                    className="w-12 h-12 rounded-xl object-cover border border-slate-700 shadow-md bg-slate-900 shrink-0"
                  />
                ) : (
                  <div className={`p-2.5 rounded-xl border ${
                    isDark ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-amber-100 text-amber-700 border-amber-200'
                  }`}>
                    <Package className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {viewingProduct.name}
                    </h3>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                      isDark ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {viewingProduct.category_name || 'General'}
                    </span>
                  </div>
                  {viewingProduct.regional_name && (
                    <p className={`text-xs font-sans ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {viewingProduct.regional_name}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setViewingProduct(null)}
                className={`p-1.5 rounded-lg transition-all ${
                  isDark 
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* Stock Status Bar */}
              <div className={`p-4 rounded-xl border flex items-center justify-between ${
                viewingProduct.current_stock <= viewingProduct.min_stock_alert
                  ? isDark ? 'bg-rose-950/30 border-rose-800/50' : 'bg-rose-50 border-rose-200'
                  : isDark ? 'bg-emerald-950/30 border-emerald-800/50' : 'bg-emerald-50/70 border-emerald-200'
              }`}>
                <div className="flex items-center space-x-3">
                  <Boxes className={`w-6 h-6 ${
                    viewingProduct.current_stock <= viewingProduct.min_stock_alert ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'
                  }`} />
                  <div>
                    <div className={`text-[11px] uppercase font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      Available Stock
                    </div>
                    <div className={`text-lg font-black font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {viewingProduct.current_stock} {viewingProduct.unit}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4 text-right">
                  <div>
                    <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Reorder Threshold</div>
                    <div className={`font-mono font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                      {viewingProduct.min_stock_alert} {viewingProduct.unit}
                    </div>
                  </div>
                  <div className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                    viewingProduct.current_stock <= viewingProduct.min_stock_alert
                      ? isDark ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-rose-100 text-rose-800 border border-rose-300'
                      : isDark ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}>
                    {viewingProduct.current_stock <= viewingProduct.min_stock_alert ? '⚠️ Low Stock Alert' : '✅ In Stock'}
                  </div>
                </div>
              </div>

              {/* Grid 1: Barcode, Tax & Brand Identification */}
              <div className={`p-4 rounded-xl border space-y-3 ${
                isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50/80 border-slate-200'
              }`}>
                <div className={`font-bold flex items-center space-x-1.5 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  <Tag className="w-4 h-4 text-amber-500" />
                  <span>Product Identification & GST Tax</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className={`p-2.5 rounded-lg border ${
                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                  }`}>
                    <span className={`text-[10px] block mb-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Barcode / SKU</span>
                    <span className={`font-mono font-bold text-xs ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                      {viewingProduct.barcode || 'N/A (Unassigned)'}
                    </span>
                  </div>
                  <div className={`p-2.5 rounded-lg border ${
                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                  }`}>
                    <span className={`text-[10px] block mb-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Brand / Manufacturer</span>
                    <span className={`font-semibold text-xs ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                      {viewingProduct.brand || 'Generic / In-house'}
                    </span>
                  </div>
                  <div className={`p-2.5 rounded-lg border ${
                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                  }`}>
                    <span className={`text-[10px] block mb-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>HSN Code</span>
                    <span className={`font-mono font-bold text-xs ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                      {viewingProduct.hsn_code || 'N/A'}
                    </span>
                  </div>
                  <div className={`p-2.5 rounded-lg border ${
                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                  }`}>
                    <span className={`text-[10px] block mb-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>GST Rate</span>
                    <span className={`font-mono font-bold text-xs ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                      {viewingProduct.tax_rate}% ({(viewingProduct.tax_rate / 2)}% CGST + {(viewingProduct.tax_rate / 2)}% SGST)
                    </span>
                  </div>
                </div>

                {/* Sourced Supplier Details */}
                <div className={`mt-2 p-2.5 rounded-lg border flex items-center justify-between ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                }`}>
                  <div className="flex items-center space-x-2">
                    <Truck className="w-4 h-4 text-indigo-500" />
                    <div>
                      <span className={`text-[10px] block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Procurement Vendor / Supplier</span>
                      <span className="font-bold text-xs text-indigo-600 dark:text-indigo-400">
                        {viewingProduct.supplier_name || 'Direct / In-House / Self Procured'}
                      </span>
                    </div>
                  </div>
                  {viewingProduct.supplier_phone && (
                    <div className="text-right">
                      <span className={`text-[10px] block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Vendor Contact</span>
                      <a href={`tel:${viewingProduct.supplier_phone}`} className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200 hover:underline">
                        {viewingProduct.supplier_phone} {viewingProduct.supplier_contact ? `(${viewingProduct.supplier_contact})` : ''}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Grid 2: Multi-Tier Pricing & Margins */}
              <div className={`p-4 rounded-xl border space-y-3 ${
                isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50/80 border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className={`font-bold flex items-center space-x-1.5 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    <DollarSign className="w-4 h-4 text-emerald-500" />
                    <span>Multi-Tier Pricing & Margins</span>
                  </div>
                  {canSeeCosts && viewingProduct.purchase_rate > 0 && viewingProduct.retail_rate > 0 && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      isDark 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                        : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    }`}>
                      Profit Margin: ₹{(viewingProduct.retail_rate - viewingProduct.purchase_rate).toFixed(2)} ({(((viewingProduct.retail_rate - viewingProduct.purchase_rate) / viewingProduct.purchase_rate) * 100).toFixed(1)}%)
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {canSeeCosts && (
                    <div className={`p-2.5 rounded-lg border ${
                      isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                    }`}>
                      <span className={`text-[10px] block mb-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Purchase Cost</span>
                      <span className={`font-mono font-bold text-sm ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                        ₹{viewingProduct.purchase_rate?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                  )}
                  <div className={`p-2.5 rounded-lg border ${
                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                  }`}>
                    <span className={`text-[10px] block mb-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>MRP (Printed)</span>
                    <span className={`font-mono font-bold text-sm ${isDark ? 'text-slate-400 line-through' : 'text-slate-400 line-through'}`}>
                      ₹{viewingProduct.mrp?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                  <div className={`p-2.5 rounded-lg border ${
                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                  }`}>
                    <span className={`text-[10px] block mb-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Retail Selling Rate</span>
                    <span className={`font-mono font-black text-sm ${isDark ? 'text-brand-400' : 'text-brand-600'}`}>
                      ₹{viewingProduct.retail_rate?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                  <div className={`p-2.5 rounded-lg border ${
                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                  }`}>
                    <span className={`text-[10px] block mb-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Wholesale Rate</span>
                    <span className={`font-mono font-bold text-sm ${isDark ? 'text-sky-400' : 'text-sky-700'}`}>
                      ₹{viewingProduct.wholesale_rate?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                  <div className={`p-2.5 rounded-lg border ${
                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                  }`}>
                    <span className={`text-[10px] block mb-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Dealer / B2B Rate</span>
                    <span className={`font-mono font-bold text-sm ${isDark ? 'text-indigo-400' : 'text-indigo-700'}`}>
                      ₹{viewingProduct.dealer_rate?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Grid 3: Packaging, Dual Units & Total Stock Valuation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Packaging / Dual Units */}
                <div className={`p-4 rounded-xl border space-y-2 ${
                  isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50/80 border-slate-200'
                }`}>
                  <div className={`font-bold flex items-center space-x-1.5 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    <Boxes className="w-4 h-4 text-amber-500" />
                    <span>Packaging & Dual Units</span>
                  </div>
                  <div className="text-xs space-y-1.5 pt-1">
                    <div className="flex justify-between">
                      <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Primary Unit:</span>
                      <span className={`font-mono font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                        {viewingProduct.unit}
                      </span>
                    </div>
                    {viewingProduct.secondary_unit ? (
                      <>
                        <div className="flex justify-between">
                          <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Secondary Unit:</span>
                          <span className={`font-mono font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                            {viewingProduct.secondary_unit}
                          </span>
                        </div>
                        <div className={`flex justify-between border-t pt-1 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                          <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Conversion Ratio:</span>
                          <span className={`font-mono font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                            1 {viewingProduct.unit} = {viewingProduct.unit_conversion_factor} {viewingProduct.secondary_unit}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className={`italic text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        No secondary packaging unit defined.
                      </div>
                    )}
                  </div>
                </div>

                {/* Stock Valuation */}
                <div className={`p-4 rounded-xl border space-y-2 ${
                  isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50/80 border-slate-200'
                }`}>
                  <div className={`font-bold flex items-center space-x-1.5 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    <span>Inventory Stock Valuation</span>
                  </div>
                  <div className="text-xs space-y-1.5 pt-1">
                    {canSeeCosts && (
                      <div className="flex justify-between">
                        <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Valuation at Cost:</span>
                        <span className={`font-mono font-bold ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                          ₹{(viewingProduct.current_stock * (viewingProduct.purchase_rate || 0)).toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Valuation at Retail:</span>
                      <span className={`font-mono font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                        ₹{(viewingProduct.current_stock * (viewingProduct.retail_rate || 0)).toFixed(2)}
                      </span>
                    </div>
                    <div className={`flex justify-between border-t pt-1 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                      <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Valuation at MRP:</span>
                      <span className={`font-mono font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        ₹{(viewingProduct.current_stock * (viewingProduct.mrp || 0)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Special Industry Features (Pharma, Electronics, Apparel, Schemes) */}
              <div className={`p-4 rounded-xl border space-y-2 ${
                isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50/80 border-slate-200'
              }`}>
                <div className={`font-bold flex items-center space-x-1.5 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  <span>Special Sector Attributes & Schemes</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {viewingProduct.trade_scheme ? (
                    <span className={`px-2.5 py-1 rounded-lg border font-bold text-xs flex items-center space-x-1 ${
                      isDark ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-amber-100 text-amber-800 border-amber-300'
                    }`}>
                      <span>🏷️ Trade Scheme:</span>
                      <span>{viewingProduct.trade_scheme}</span>
                    </span>
                  ) : (
                    <span className={`text-xs italic ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>No trade scheme active.</span>
                  )}
                  {viewingProduct.has_batch === 1 && (
                    <span className={`px-2.5 py-1 rounded-lg border text-xs font-semibold ${
                      isDark ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' : 'bg-purple-100 text-purple-800 border-purple-300'
                    }`}>
                      💊 Pharma Batch & Expiry Tracking Enabled
                    </span>
                  )}
                  {viewingProduct.has_serial_imei === 1 && (
                    <span className={`px-2.5 py-1 rounded-lg border text-xs font-semibold ${
                      isDark ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' : 'bg-blue-100 text-blue-800 border-blue-300'
                    }`}>
                      📱 IMEI / Serial Number Tracking Enabled
                    </span>
                  )}
                  {viewingProduct.has_variants === 1 && (
                    <span className={`px-2.5 py-1 rounded-lg border text-xs font-semibold ${
                      isDark ? 'bg-pink-500/20 text-pink-300 border-pink-500/40' : 'bg-pink-100 text-pink-800 border-pink-300'
                    }`}>
                      👕 Matrix Variants (Size / Color) Enabled
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className={`p-4 border-t flex justify-end space-x-3 ${
              isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <button
                type="button"
                onClick={() => setViewingProduct(null)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  isDark 
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-700' 
                    : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300 shadow-sm'
                }`}
              >
                Close
              </button>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => {
                    const prod = viewingProduct;
                    setViewingProduct(null);
                    openEditModal(prod);
                  }}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 text-white font-bold text-xs shadow-lg shadow-sky-500/20 flex items-center space-x-1.5 transition-all"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Edit This Product</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Supplier Modal (On the fly from Product Creation) */}
      {isQuickSupplierModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className={`p-4 border-b flex justify-between items-center ${
              isDark ? 'bg-slate-800/90 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center space-x-2">
                <Truck className="w-4 h-4 text-indigo-500" />
                <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Quick Add Product Supplier</h3>
              </div>
              <button onClick={() => setIsQuickSupplierModalOpen(false)} className="p-1 text-slate-400 hover:text-white rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickAddSupplier} className="p-5 space-y-3 text-xs">
              <div>
                <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Supplier / Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={quickSupplierForm.name}
                  onChange={(e) => setQuickSupplierForm({ ...quickSupplierForm, name: e.target.value })}
                  placeholder="e.g. Parle Agro Distributors"
                  className={`w-full border rounded-xl p-2.5 outline-none font-semibold ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-500'
                  }`}
                  autoFocus
                />
              </div>

              <div>
                <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Primary Contact Phone *
                </label>
                <input
                  type="text"
                  required
                  value={quickSupplierForm.phone}
                  onChange={(e) => setQuickSupplierForm({ ...quickSupplierForm, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className={`w-full border rounded-xl p-2.5 outline-none font-mono ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-500'
                  }`}
                />
              </div>

              <div>
                <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Contact Person (Optional)
                </label>
                <input
                  type="text"
                  value={quickSupplierForm.contact_person}
                  onChange={(e) => setQuickSupplierForm({ ...quickSupplierForm, contact_person: e.target.value })}
                  placeholder="e.g. Ramesh Kumar"
                  className={`w-full border rounded-xl p-2.5 outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  GSTIN (Optional)
                </label>
                <input
                  type="text"
                  value={quickSupplierForm.gstin}
                  onChange={(e) => setQuickSupplierForm({ ...quickSupplierForm, gstin: e.target.value.toUpperCase() })}
                  placeholder="07AAAAA0000A1Z5"
                  className={`w-full border rounded-xl p-2.5 outline-none font-mono uppercase ${
                    isDark ? 'bg-slate-950 border-slate-800 text-emerald-400' : 'bg-slate-50 border-slate-300 text-emerald-700'
                  }`}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-700/50">
                <button
                  type="button"
                  onClick={() => setIsQuickSupplierModalOpen(false)}
                  className={`px-3 py-2 rounded-xl font-semibold ${
                    isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingQuickSupplier}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md flex items-center space-x-1"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingQuickSupplier ? 'Saving...' : 'Save & Select'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Low Stock & Expiry Alert Center Modal */}
      <StockAlertsModal
        isOpen={isAlertsModalOpen}
        onClose={() => {
          setIsAlertsModalOpen(false);
          loadAlertsSummary();
        }}
      />
    </div>
  );
}

