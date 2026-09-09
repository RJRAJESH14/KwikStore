/**
 * KwikStore Pro - Android POS & Handheld Terminal Companion Configuration
 * 
 * Target Devices: 
 * - Sunmi V2 / V2 Pro / T2 Handheld POS
 * - IMIN Swift 1 / IMIN Swan POS
 * - Pax A920 / A930 Mobile Terminals
 * - Standard Android Tablets & Smartphones
 */

export const androidConfig = {
  appId: 'in.fleetbillpro.kwikstore',
  appName: 'KwikStore Pro POS',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    // When connected to shop LAN, point to Master PC IP (e.g. http://192.168.1.50:4848)
    // When running standalone offline, points to local bundled assets
    androidScheme: 'http',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#020617',
      showSpinner: false
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#020617'
    }
  },
  hardwareFeatures: {
    cameraBarcodeScan: true,
    integratedThermalPrinter: true, // Auto-detects Sunmi/IMIN 58mm internal thermal printer via window.print
    bluetoothScale: true,
    nfcPayment: true
  }
};

export default androidConfig;
