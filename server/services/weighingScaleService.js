// Weighing Scale Service for RS-232 / USB Serial & Network Scales
// Supports standard Indian & Global POS Scale Protocols (Essae, CAS, Phoenix, Citizen, Sansui, Toledo)

let currentScaleState = {
  isConnected: false,
  port: 'COM1 / Serial',
  baudRate: 9600,
  weight: 0.000,
  unit: 'kg',
  isStable: true,
  tareWeight: 0.000,
  protocol: 'CONTINUOUS_ASCII',
  lastUpdated: Date.now()
};

// Parse standard weighing scale serial byte stream
// Format: ST,GS,+  1.250kg or W: 01.250kg or ASCII numbers
export function parseScaleData(rawString) {
  if (!rawString) return currentScaleState;

  const clean = rawString.trim();
  // Check stability indicator: ST (Stable), US (Unstable), GS (Gross), NT (Net)
  const isStable = clean.includes('ST') || !clean.includes('US');
  
  // Extract numerical weight using regex
  const match = clean.match(/[-+]?\s*([0-9]+\.?[0-9]*)/);
  if (match) {
    const rawVal = parseFloat(match[1]);
    if (!isNaN(rawVal)) {
      currentScaleState.weight = Math.max(0, parseFloat((rawVal - currentScaleState.tareWeight).toFixed(3)));
      currentScaleState.isStable = isStable;
      currentScaleState.isConnected = true;
      currentScaleState.lastUpdated = Date.now();
    }
  }

  return currentScaleState;
}

// Get current live scale status
export function getScaleStatus() {
  return {
    ...currentScaleState,
    effectiveWeight: Math.max(0, parseFloat((currentScaleState.weight).toFixed(3)))
  };
}

// Tare scale (set current weight as zero reference)
export function tareScale() {
  currentScaleState.tareWeight = currentScaleState.weight;
  currentScaleState.weight = 0.000;
  return getScaleStatus();
}

// Zero scale
export function zeroScale() {
  currentScaleState.tareWeight = 0.000;
  currentScaleState.weight = 0.000;
  return getScaleStatus();
}

// Update scale state manually or via simulation
export function setScaleWeight(weightInKg, isStable = true) {
  const val = parseFloat(weightInKg);
  if (!isNaN(val)) {
    currentScaleState.weight = Math.max(0, parseFloat((val - currentScaleState.tareWeight).toFixed(3)));
    currentScaleState.isStable = isStable;
    currentScaleState.isConnected = true;
    currentScaleState.lastUpdated = Date.now();
  }
  return getScaleStatus();
}

// Configure scale port & baud rate
export function configureScale(config) {
  if (config.port) currentScaleState.port = config.port;
  if (config.baudRate) currentScaleState.baudRate = Number(config.baudRate);
  if (config.protocol) currentScaleState.protocol = config.protocol;
  currentScaleState.isConnected = true;
  return getScaleStatus();
}
