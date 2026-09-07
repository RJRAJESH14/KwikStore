import React, { createContext, useContext, useState, useEffect } from 'react';

const ShopContext = createContext(null);

export function ShopProvider({ children }) {
  const [shops, setShops] = useState([]);
  const [activeShop, setActiveShop] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchShops = async () => {
    try {
      const res = await fetch('/api/shops');
      if (res.ok) {
        const data = await res.json();
        setShops(data);
        
        // Restore saved branch or default to first
        const savedShopId = localStorage.getItem('kwikstore_active_shop_id');
        let selected = null;
        if (savedShopId) {
          selected = data.find(s => s.id === parseInt(savedShopId, 10));
        }
        if (!selected && data.length > 0) {
          selected = data[0];
        }
        if (selected) {
          setActiveShop(selected);
          localStorage.setItem('kwikstore_active_shop_id', selected.id.toString());
        }
      }
    } catch (err) {
      console.error('Error fetching shops:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShops();
  }, []);

  const switchShop = (shopId) => {
    const found = shops.find(s => s.id === parseInt(shopId, 10));
    if (found) {
      setActiveShop(found);
      localStorage.setItem('kwikstore_active_shop_id', found.id.toString());
    }
  };

  return (
    <ShopContext.Provider value={{ shops, activeShop, switchShop, fetchShops, loading }}>
      {children}
    </ShopContext.Provider>
  );
}

export const useShop = () => useContext(ShopContext);
