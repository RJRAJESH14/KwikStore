import React, { createContext, useContext, useState, useEffect } from 'react';

const NetworkContext = createContext(null);

export function NetworkProvider({ children }) {
  const [lanMode, setLanMode] = useState(() => localStorage.getItem('kwikstore_lan_mode') || 'SERVER'); // 'SERVER' or 'CLIENT'
  const [serverHost, setServerHost] = useState(() => localStorage.getItem('kwikstore_server_host') || '127.0.0.1:4848');
  const [isOnline, setIsOnline] = useState(true);
  const [activeShift, setActiveShift] = useState({ id: 1, name: 'Morning Counter Shift' });

  const updateNetworkSettings = (mode, host) => {
    setLanMode(mode);
    setServerHost(host);
    localStorage.setItem('kwikstore_lan_mode', mode);
    localStorage.setItem('kwikstore_server_host', host);
  };

  return (
    <NetworkContext.Provider value={{ lanMode, serverHost, isOnline, updateNetworkSettings, activeShift, setActiveShift }}>
      {children}
    </NetworkContext.Provider>
  );
}

export const useNetwork = () => useContext(NetworkContext);
