import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { 
  HelpCircle, 
  RefreshCw, 
  ExternalLink, 
  Globe, 
  Mail, 
  Phone, 
  MessageSquare, 
  ShieldCheck, 
  Github, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  BookOpen, 
  Info, 
  Headphones, 
  Download, 
  Sparkles, 
  Clock, 
  Terminal,
  Monitor
} from 'lucide-react';

const CURRENT_VERSION = '1.1.0';
const GITHUB_REPO_URL = 'https://github.com/RJRAJESH14/KwikStore';
const GITHUB_API_RELEASES = 'https://api.github.com/repos/RJRAJESH14/KwikStore/releases/latest';

export function HelpModal({ isOpen, onClose, initialTab = 'support' }) {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState(initialTab);

  // Update check states
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateStatus, setUpdateStatus] = useState(null); // 'LATEST', 'AVAILABLE', 'ERROR', null
  const [latestRelease, setLatestRelease] = useState(null);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
      if (initialTab === 'updates') {
        handleCheckUpdate();
      }
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    setUpdateStatus(null);
    setLatestRelease(null);

    try {
      const res = await fetch(GITHUB_API_RELEASES, {
        headers: { 'Accept': 'application/vnd.github.v3+json' }
      });

      if (res.ok) {
        const data = await res.json();
        const rawTag = (data.tag_name || '');
        const tagName = rawTag.replace(/^[^\d]*/, '');
        setLatestRelease(data);

        // Semver comparison
        if (tagName && tagName !== CURRENT_VERSION && tagName > CURRENT_VERSION) {
          setUpdateStatus('AVAILABLE');
        } else {
          setUpdateStatus('LATEST');
        }
      } else if (res.status === 404) {
        // No release yet published on repository, fallback to repository check
        setUpdateStatus('LATEST');
      } else {
        setUpdateStatus('LATEST'); // Fallback gracefully
      }
    } catch (err) {
      // Offline or network error
      setUpdateStatus('LATEST');
    } finally {
      setTimeout(() => {
        setCheckingUpdate(false);
      }, 600);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`border rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150 ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
      }`}>
        {/* Header */}
        <div className={`p-5 border-b flex justify-between items-center ${
          isDark ? 'bg-slate-800/90 border-slate-700' : 'bg-slate-100 border-slate-200'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-sky-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Help, Support & Updates
              </h2>
              <p className="text-xs text-slate-400">
                FleetBillPro Customer Care • GitHub Version Updates • Shortcuts & Documentation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className={`px-5 pt-3 border-b flex space-x-2 ${
          isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          {[
            { id: 'support', label: 'FleetBillPro Support', icon: Headphones },
            { id: 'updates', label: 'Check for Updates', icon: RefreshCw },
            { id: 'guide', label: 'Shortcuts & Guide', icon: BookOpen },
            { id: 'about', label: 'About KwikStore', icon: Info }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === 'updates' && !latestRelease && !checkingUpdate) {
                    handleCheckUpdate();
                  }
                }}
                className={`pb-2.5 px-3 border-b-2 text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                  isActive
                    ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-brand-500' : ''}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: FLEETBILLPRO SUPPORT */}
          {activeTab === 'support' && (
            <div className="space-y-4 text-xs">
              {/* FleetBillPro Banner */}
              <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                isDark ? 'bg-gradient-to-r from-sky-950/40 via-slate-900 to-indigo-950/40 border-sky-500/30' : 'bg-gradient-to-r from-sky-50 to-indigo-50 border-sky-200'
              }`}>
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-bold text-sm text-sky-500">FleetBillPro Enterprise Support</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                      Active Support
                    </span>
                  </div>
                  <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    Official Customer Care, Training & Technical Assistance for KwikStore Pro & FleetBillPro users.
                  </p>
                </div>
                <a
                  href="https://fleetbillpro.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md shadow-sky-500/20 flex items-center space-x-1.5 shrink-0 transition-all"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Visit fleetbillpro.in</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Support Channels Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Official Website / Portal */}
                <div className={`p-3.5 rounded-xl border space-y-2 ${
                  isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center space-x-2 text-sky-500 font-bold">
                    <Globe className="w-4 h-4" />
                    <span>Official Portal</span>
                  </div>
                  <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Access documentation, training videos, and live support tickets.
                  </div>
                  <a
                    href="https://fleetbillpro.in"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-500 font-mono font-bold hover:underline flex items-center gap-1 text-[11px]"
                  >
                    <span>https://fleetbillpro.in</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* Email Support */}
                <div className={`p-3.5 rounded-xl border space-y-2 ${
                  isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center space-x-2 text-indigo-400 font-bold">
                    <Mail className="w-4 h-4" />
                    <span>Email Helpdesk</span>
                  </div>
                  <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Write to our technical team for custom invoice templates or hardware setup.
                  </div>
                  <a
                    href="mailto:support@fleetbillpro.in"
                    className="text-indigo-400 font-mono font-bold hover:underline flex items-center gap-1 text-[11px]"
                  >
                    <span>support@fleetbillpro.in</span>
                  </a>
                </div>

                {/* Phone & WhatsApp Helpline */}
                <div className={`p-3.5 rounded-xl border space-y-2.5 ${
                  isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center space-x-2 text-emerald-500 font-bold">
                    <Phone className="w-4 h-4" />
                    <span>Helpline & WhatsApp</span>
                  </div>
                  <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Direct call or WhatsApp support for quick queries and billing assistance.
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    <a
                      href="tel:+918338833377"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                      title="Call Helpline"
                    >
                      <Phone className="w-3 h-3" />
                      <span>+91 8338833377</span>
                    </a>
                    <a
                      href="https://wa.me/918338833377?text=Hi%20FleetBillPro%20Support%2C%20I%20need%20assistance%20with%20KwikStore"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
                      title="Open WhatsApp Chat"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>WhatsApp Chat</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                    </a>
                  </div>
                </div>

                {/* Remote Assistance (AnyDesk / TeamViewer) */}
                <div className={`p-3.5 rounded-xl border space-y-2 ${
                  isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center space-x-2 text-amber-500 font-bold">
                    <Monitor className="w-4 h-4" />
                    <span>Remote Desk Setup</span>
                  </div>
                  <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Our engineers can connect via AnyDesk to calibrate thermal printers & barcode scanners.
                  </div>
                  <div className="text-amber-500 font-mono font-bold text-[11px]">
                    Mon - Sat: 9:00 AM – 9:00 PM IST
                  </div>
                </div>
              </div>

              {/* Working Hours Info */}
              <div className={`p-3 rounded-xl border flex items-center space-x-2 text-[11px] ${
                isDark ? 'bg-slate-950/40 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
              }`}>
                <Clock className="w-4 h-4 text-brand-500 shrink-0" />
                <span>
                  <strong>Standard Support Hours:</strong> Monday through Saturday, 9:00 AM to 9:00 PM IST. Emergency 24/7 support available for active subscribers.
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: CHECK FOR UPDATES */}
          {activeTab === 'updates' && (
            <div className="space-y-4 text-xs">
              {/* Current Version Card */}
              <div className={`p-4 rounded-xl border flex items-center justify-between ${
                isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-500/20 text-brand-500 flex items-center justify-center font-black text-sm font-mono">
                    v{CURRENT_VERSION}
                  </div>
                  <div>
                    <div className="font-bold text-sm">KwikStore Pro (Desktop Edition)</div>
                    <div className="text-slate-400 text-[11px]">Installed Local Version: <strong className="font-mono text-brand-500">v{CURRENT_VERSION}</strong></div>
                  </div>
                </div>

                <button
                  onClick={handleCheckUpdate}
                  disabled={checkingUpdate}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-500 hover:to-emerald-500 text-white font-bold text-xs shadow-md shadow-brand-500/20 flex items-center space-x-1.5 transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${checkingUpdate ? 'animate-spin' : ''}`} />
                  <span>{checkingUpdate ? 'Checking GitHub...' : 'Check for Updates'}</span>
                </button>
              </div>

              {/* Status Result */}
              {updateStatus === 'LATEST' && (
                <div className={`p-4 rounded-xl border flex items-center space-x-3 ${
                  isDark ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}>
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                  <div>
                    <div className="font-bold text-sm">KwikStore Pro is Up to Date!</div>
                    <p className="text-[11px] opacity-90 mt-0.5">
                      You are using the latest version (v{CURRENT_VERSION}). All billing modules, GST calculations, and SQLite engines are current.
                    </p>
                  </div>
                </div>
              )}

              {updateStatus === 'AVAILABLE' && (
                <div className={`p-4 rounded-xl border space-y-3 ${
                  isDark ? 'bg-sky-500/10 border-sky-500/30 text-sky-200' : 'bg-sky-50 border-sky-200 text-sky-900'
                }`}>
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-5 h-5 text-sky-400 shrink-0" />
                    <div className="font-bold text-sm">
                      New Release Available: {latestRelease?.name || latestRelease?.tag_name}
                    </div>
                  </div>
                  <p className="text-[11px] opacity-90">
                    A new version of KwikStore Pro is available on GitHub with updated features and performance improvements.
                  </p>
                  {latestRelease?.body && (
                    <div className={`p-3 rounded-lg border font-mono text-[10px] max-h-32 overflow-y-auto ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
                    }`}>
                      {latestRelease.body}
                    </div>
                  )}
                  <div className="flex space-x-2 pt-1">
                    <a
                      href={latestRelease?.html_url || GITHUB_REPO_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md flex items-center space-x-1.5 transition-all"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Latest Release</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}

              {/* GitHub Repository Card */}
              <div className={`p-4 rounded-xl border space-y-2.5 ${
                isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Github className="w-4 h-4 text-slate-300" />
                    <span className="font-bold">Official GitHub Repository</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    RJRAJESH14/KwikStore
                  </span>
                </div>
                <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Source code, releases, changelog, and desktop installers are maintained on GitHub.
                </p>
                <a
                  href={GITHUB_REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1.5 text-brand-500 hover:text-brand-400 font-bold text-xs hover:underline"
                >
                  <span>https://github.com/RJRAJESH14/KwikStore</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {/* TAB 3: KEYBOARD SHORTCUTS & GUIDE */}
          {activeTab === 'guide' && (
            <div className="space-y-4 text-xs">
              <div className="font-bold text-sm mb-2">POS Billing Keyboard Shortcuts</div>
              <div className="grid grid-cols-2 gap-2 font-mono">
                {[
                  { key: 'F2', action: 'New Clean Bill / Reset' },
                  { key: 'F3', action: 'Barcode / Product Live Search' },
                  { key: 'F4', action: 'Collect Payment / Tender Modal' },
                  { key: 'F8', action: 'Hold Current Bill' },
                  { key: 'F9', action: 'Recall Held Bill' },
                  { key: 'F10', action: 'Reports & GST Analytics' },
                  { key: 'Ctrl + B', action: 'Hide / Show Side Menu' },
                  { key: 'Enter', action: 'Add Exact Scanned Barcode to Cart' }
                ].map((s, idx) => (
                  <div key={idx} className={`p-2.5 rounded-xl border flex items-center justify-between ${
                    isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <span className="font-bold text-slate-300">{s.action}</span>
                    <span className="px-2 py-0.5 rounded bg-brand-500/20 text-brand-400 border border-brand-500/30 text-[10px] font-bold font-mono">
                      {s.key}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: ABOUT KWIKSTORE */}
          {activeTab === 'about' && (
            <div className="space-y-4 text-xs text-center py-2">
              <img 
                src="/icon.png" 
                alt="KwikStore Pro" 
                className="w-16 h-16 rounded-2xl shadow-xl shadow-emerald-500/25 mx-auto object-cover border border-emerald-500/30" 
              />
              <div>
                <h3 className="text-base font-bold">KwikStore Pro Universal Billing & HRMS</h3>
                <p className="text-slate-400 text-xs mt-0.5">Version {CURRENT_VERSION} • 100% Offline SQLite Architecture</p>
              </div>

              <p className={`text-xs max-w-md mx-auto leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                Designed for retail supermarkets, garment outlets, electronics IMEI stores, pharmacies, hardware shops, and FMCG wholesale distributors.
              </p>

              <div className={`p-3 rounded-xl border inline-block text-left text-[11px] font-mono space-y-1 ${
                isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}>
                <div>Repository: <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer" className="text-brand-500 hover:underline">github.com/RJRAJESH14/KwikStore</a></div>
                <div>Support Portal: <a href="https://fleetbillpro.in" target="_blank" rel="noopener noreferrer" className="text-sky-500 hover:underline">fleetbillpro.in</a></div>
                <div>Local Database: SQLite 3 WAL Mode with Multi-Counter LAN Sync</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`p-4 border-t flex justify-between items-center ${
          isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="text-[11px] text-slate-400 flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>KwikStore Pro v{CURRENT_VERSION} • FleetBillPro Ecosystem</span>
          </div>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-xl text-xs font-semibold ${
              isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
