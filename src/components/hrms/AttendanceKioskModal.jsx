import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useShop } from '../../context/ShopContext';
import { 
  QrCode, 
  Hash, 
  Camera, 
  CameraOff, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  User, 
  ShieldCheck, 
  Volume2, 
  VolumeX, 
  X, 
  Sparkles,
  ArrowRight,
  LogOut,
  LogIn
} from 'lucide-react';

// Web Audio API Synthesizer (No external mp3 files required)
function playSoundChime(type = 'IN') {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (type === 'IN') {
      // Ascending pleasant major chord (D5 -> A5)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc1.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(880, ctx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.2); // D6

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.4);
      osc2.stop(ctx.currentTime + 0.4);
    } else if (type === 'OUT') {
      // Warm departure chime (A5 -> F#5 -> D5)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(587.33, ctx.currentTime + 0.3);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } else {
      // Error buzz
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch (e) {
    console.warn('Web Audio playback error:', e);
  }
}

export function AttendanceKioskModal({ isOpen, onClose, onAttendanceRecorded }) {
  const { isDark } = useTheme();
  const { activeShop } = useShop();

  const [mode, setMode] = useState('NUMPAD'); // 'NUMPAD' or 'QR'
  const [pinInput, setPinInput] = useState('');
  const [liveTime, setLiveTime] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [punchResult, setPunchResult] = useState(null);
  const [error, setError] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const barcodeBufferRef = useRef('');
  const resetTimerRef = useRef(null);

  // Live Digital Clock
  useEffect(() => {
    const timer = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Keyboard / USB Barcode Gun Listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      // If punch result is currently showing, clear it on new keypress
      if (punchResult && resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
        setPunchResult(null);
      }

      if (e.key === 'Enter') {
        if (barcodeBufferRef.current.trim().length > 0) {
          executePunch(barcodeBufferRef.current.trim());
          barcodeBufferRef.current = '';
        }
      } else if (e.key.length === 1) {
        barcodeBufferRef.current += e.key;
        // Auto clear buffer if no enter received within 500ms
        setTimeout(() => {
          barcodeBufferRef.current = '';
        }, 500);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, punchResult]);

  // Webcam QR Stream Management
  useEffect(() => {
    if (!isOpen || mode !== 'QR') {
      stopCamera();
      return;
    }

    startCamera();
    return () => stopCamera();
  }, [isOpen, mode]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (e) {
      console.warn('Webcam permission denied or camera not available:', e);
      setError('Webcam not detected or access denied. Please use the Touch PIN Numpad.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const executePunch = async (inputCode) => {
    if (!inputCode) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/hrms/attendance/kiosk-punch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: inputCode,
          shopId: activeShop?.id || 1
        })
      });

      const data = await res.json();
      if (data.success) {
        setPunchResult(data);
        setPinInput('');
        if (soundEnabled) {
          playSoundChime(data.action === 'CHECK_IN' ? 'IN' : 'OUT');
        }
        if (onAttendanceRecorded) {
          onAttendanceRecorded();
        }

        // Auto reset confirmation screen after 4 seconds
        if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
        resetTimerRef.current = setTimeout(() => {
          setPunchResult(null);
        }, 4000);
      } else {
        setError(data.message || 'Staff code or PIN not recognized.');
        if (soundEnabled) playSoundChime('ERROR');
      }
    } catch (e) {
      setError('Network error processing kiosk attendance.');
      if (soundEnabled) playSoundChime('ERROR');
    } finally {
      setLoading(false);
    }
  };

  const handleNumpadPress = (val) => {
    if (punchResult) setPunchResult(null);
    if (pinInput.length < 12) {
      setPinInput(prev => prev + val);
    }
  };

  const handleNumpadClear = () => {
    setPinInput('');
    setError(null);
  };

  const handleNumpadBackspace = () => {
    setPinInput(prev => prev.slice(0, -1));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="border border-slate-800 rounded-3xl w-full max-w-2xl bg-slate-900 text-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Top Kiosk Header */}
        <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight text-white">Store Attendance Kiosk Terminal</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Live Touch Punch
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {activeShop?.name || 'Main Retail Branch'} • Instant Check-In & Check-Out
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title={soundEnabled ? 'Mute Chimes' : 'Enable Chimes'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Digital Clock & Date Bar */}
        <div className="px-6 py-3 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-sky-950/40 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-mono font-black text-emerald-400 text-base">
            <span>{liveTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</span>
          </div>
          <div className="text-slate-400 font-semibold">
            {liveTime.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col justify-center">
          
          {/* SUCCESS CONFIRMATION OVERLAY */}
          {punchResult ? (
            <div className="p-6 rounded-3xl bg-slate-950 border border-emerald-500/40 shadow-2xl text-center space-y-4 animate-in zoom-in-95">
              <div className="inline-flex p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                {punchResult.action === 'CHECK_IN' ? <LogIn className="w-8 h-8" /> : <LogOut className="w-8 h-8" />}
              </div>

              <div className="space-y-1">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                  punchResult.action === 'CHECK_IN'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}>
                  {punchResult.action === 'CHECK_IN' ? '✅ Check-In Recorded' : '👋 Check-Out Recorded'}
                </span>
                <h3 className="text-xl font-black text-white">{punchResult.employee?.name}</h3>
                <p className="text-xs text-slate-400">
                  {punchResult.employee?.designation} • {punchResult.employee?.department} ({punchResult.employee?.code})
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto pt-2">
                <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Punch Time</span>
                  <span className="font-mono font-black text-emerald-400 text-sm">{punchResult.time}</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Shift Duration</span>
                  <span className="font-mono font-black text-sky-400 text-sm">{punchResult.totalHours} hrs</span>
                </div>
              </div>

              <p className="text-xs text-slate-300 font-semibold">{punchResult.message}</p>

              <div className="pt-2">
                <button
                  onClick={() => setPunchResult(null)}
                  className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                >
                  Next Employee →
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* Mode Switcher Tabs */}
              <div className="flex rounded-2xl bg-slate-950 p-1 border border-slate-800 max-w-sm mx-auto">
                <button
                  onClick={() => setMode('NUMPAD')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                    mode === 'NUMPAD' ? 'bg-brand-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Hash className="w-4 h-4" />
                  <span>PIN / Staff ID</span>
                </button>
                <button
                  onClick={() => setMode('QR')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                    mode === 'QR' ? 'bg-brand-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Camera className="w-4 h-4" />
                  <span>Webcam / QR Scan</span>
                </button>
              </div>

              {error && (
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs text-center flex items-center justify-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Mode: TOUCH PIN NUMPAD */}
              {mode === 'NUMPAD' && (
                <div className="max-w-xs mx-auto space-y-4">
                  {/* PIN Display Input */}
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      value={pinInput}
                      placeholder="Enter Staff Code or PIN..."
                      className="w-full text-center py-3.5 px-4 rounded-2xl bg-slate-950 border-2 border-brand-500/50 text-xl font-mono font-black tracking-widest text-emerald-400 shadow-inner focus:outline-none"
                    />
                  </div>

                  {/* Touch Numpad Grid */}
                  <div className="grid grid-cols-3 gap-2.5">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                      <button
                        key={digit}
                        type="button"
                        onClick={() => handleNumpadPress(digit)}
                        className="py-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-lg font-black text-white active:scale-95 transition shadow-sm border border-slate-700/50"
                      >
                        {digit}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={handleNumpadClear}
                      className="py-3.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold active:scale-95 transition border border-rose-500/20"
                    >
                      CLEAR
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNumpadPress('0')}
                      className="py-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-lg font-black text-white active:scale-95 transition shadow-sm border border-slate-700/50"
                    >
                      0
                    </button>
                    <button
                      type="button"
                      onClick={handleNumpadBackspace}
                      className="py-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 text-xs font-bold active:scale-95 transition border border-slate-700/50"
                    >
                      ⌫
                    </button>
                  </div>

                  {/* Action Punch Button */}
                  <button
                    type="button"
                    onClick={() => executePunch(pinInput)}
                    disabled={loading || !pinInput}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-black tracking-wider uppercase shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 active:scale-95 transition disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{loading ? 'Verifying Punch...' : 'Punch Attendance Now'}</span>
                  </button>
                </div>
              )}

              {/* Mode: WEBCAM / QR CODE SCANNER */}
              {mode === 'QR' && (
                <div className="max-w-md mx-auto space-y-3 text-center">
                  <div className="relative rounded-2xl overflow-hidden bg-black aspect-video border-2 border-emerald-500/50 shadow-2xl flex items-center justify-center">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Visual Scanning Reticle */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-48 h-48 border-2 border-emerald-400 rounded-2xl animate-pulse relative shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                        <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-emerald-400 -mt-1 -ml-1"></div>
                        <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-emerald-400 -mt-1 -mr-1"></div>
                        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-emerald-400 -mb-1 -ml-1"></div>
                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-emerald-400 -mb-1 -mr-1"></div>
                        <div className="w-full h-0.5 bg-emerald-400/80 absolute top-1/2 -translate-y-1/2 animate-bounce"></div>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400">
                    Hold your Employee ID Card QR Code in front of the camera or scan with barcode gun.
                  </p>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
          <span>Barcode Guns & Touch Tablets Supported</span>
          <span>KwikStore Attendance Terminal v2.0</span>
        </div>
      </div>
    </div>
  );
}
