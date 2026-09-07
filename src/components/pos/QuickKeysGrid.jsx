import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Sparkles, Plus, Layers, Search } from 'lucide-react';

export function QuickKeysGrid({ products = [], onAddToCart }) {
  const { isDark } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [search, setSearch] = useState('');

  // Extract unique categories
  const categories = ['ALL', ...new Set(products.map(p => p.category_name).filter(Boolean))];

  const filteredProducts = products.filter(p => {
    const matchesCat = selectedCategory === 'ALL' || p.category_name === selectedCategory;
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.barcode && p.barcode.includes(search));
    return matchesCat && matchesSearch;
  });

  return (
    <div className={`flex flex-col h-full rounded-2xl border overflow-hidden ${
      isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
    }`}>
      {/* Top Category & Search Bar */}
      <div className={`p-2.5 border-b flex items-center justify-between gap-2 ${
        isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-0.5">
          {categories.slice(0, 8).map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-brand-600 text-white shadow-sm'
                  : isDark
                    ? 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
                    : 'bg-slate-200/70 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-36 shrink-0">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
          <input
            type="text"
            placeholder="Quick search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full pl-7 pr-2 py-1 rounded-lg border text-[11px] outline-none ${
              isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
            }`}
          />
        </div>
      </div>

      {/* Touch Tiles Grid */}
      <div className="flex-1 p-2.5 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 content-start">
        {filteredProducts.slice(0, 30).map(product => (
          <button
            key={product.id}
            onClick={() => onAddToCart(product)}
            className={`group relative p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all hover:scale-[1.02] active:scale-[0.98] ${
              isDark 
                ? 'bg-slate-950/60 border-slate-800 hover:border-brand-500/50 hover:bg-brand-500/5' 
                : 'bg-slate-50 border-slate-200 hover:border-brand-500/50 hover:bg-brand-50'
            }`}
          >
            <div>
              <div className="flex justify-between items-start mb-1">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-400 font-mono">
                  {product.unit || 'PCS'}
                </span>
                <span className={`text-[10px] font-mono ${
                  product.current_stock > 5 ? 'text-slate-400' : 'text-rose-400 font-bold'
                }`}>
                  {product.current_stock} left
                </span>
              </div>
              <h4 className={`text-xs font-bold line-clamp-2 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                {product.name}
              </h4>
            </div>

            <div className="mt-2 pt-1.5 border-t border-slate-800/40 flex justify-between items-center">
              <span className="text-xs font-mono font-black text-brand-500">
                ₹{product.retail_rate || product.mrp}
              </span>
              <div className="w-5 h-5 rounded-full bg-brand-600/20 text-brand-400 group-hover:bg-brand-600 group-hover:text-white flex items-center justify-center transition-all">
                <Plus className="w-3 h-3" />
              </div>
            </div>
          </button>
        ))}

        {filteredProducts.length === 0 && (
          <div className="col-span-full py-8 text-center text-slate-500 text-xs">
            No quick items found matching criteria.
          </div>
        )}
      </div>
    </div>
  );
}
