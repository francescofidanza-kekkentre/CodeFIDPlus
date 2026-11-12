import React, { useState, useEffect } from 'react';
import { Tablet, AlertTriangle, Monitor, Smartphone, Terminal, RefreshCw } from 'lucide-react';
import { inspectDevice, DeviceInspection } from '../utils/deviceDetector';

interface TabletGateProps {
  children: React.ReactNode;
}

const BYPASS_KEY = 'codefid_tablet_bypass';

export const TabletGate: React.FC<TabletGateProps> = ({ children }) => {
  const [inspection, setInspection] = useState<DeviceInspection>(() => inspectDevice());
  const [isBypassed, setIsBypassed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(BYPASS_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const checkDevice = () => {
    setInspection(inspectDevice());
  };

  useEffect(() => {
    checkDevice();
    window.addEventListener('resize', checkDevice);
    window.addEventListener('orientationchange', checkDevice);
    return () => {
      window.removeEventListener('resize', checkDevice);
      window.removeEventListener('orientationchange', checkDevice);
    };
  }, []);

  const handleBypass = () => {
    try {
      sessionStorage.setItem(BYPASS_KEY, 'true');
    } catch {
      // ignore
    }
    setIsBypassed(true);
  };

  // If detected as tablet or user manually bypassed for development testing
  if (inspection.isTablet || isBypassed) {
    return <>{children}</>;
  }

  return (
    <div className="h-[100dvh] w-screen flex flex-col items-center justify-center bg-[#0b0f19] text-slate-100 p-6 select-none overflow-y-auto">
      <div className="w-full max-w-lg bg-[#111827] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center">
        {/* Device Icon */}
        <div className="relative mb-5">
          <div className="w-20 h-20 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <Tablet className="w-10 h-10" />
          </div>
          <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center text-slate-950 font-bold shadow-md">
            <AlertTriangle className="w-4 h-4 text-slate-950" />
          </div>
        </div>

        {/* Title & Description */}
        <h1 className="text-xl sm:text-2xl font-extrabold text-white mb-2">
          Eseguibile Solo da Tablet
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 mb-6 leading-relaxed">
          <strong className="text-indigo-400">CodeFID+</strong> è ottimizzata ed eseguibile
          esclusivamente su <strong>tablet Android / iOS (iPad)</strong> (e dispositivi tablet touch).
          L'interfaccia a 3 pannelli e la barra simboli sono calibrate per l'ergonomia touch da 7" a 14".
        </p>

        {/* Diagnostic Card */}
        <div className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 mb-6 text-left text-xs font-mono space-y-2">
          <div className="flex items-center justify-between text-slate-400 border-b border-slate-800/80 pb-2">
            <span className="font-sans font-semibold text-slate-300 flex items-center gap-1.5">
              {inspection.deviceType === 'desktop' ? (
                <Monitor className="w-4 h-4 text-amber-400" />
              ) : (
                <Smartphone className="w-4 h-4 text-amber-400" />
              )}
              <span>Dispositivo Rilevato</span>
            </span>
            <span className="capitalize px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
              {inspection.deviceType === 'desktop' ? 'Computer Desktop / Laptop' : 'Smartphone'}
            </span>
          </div>

          <div className="flex justify-between text-slate-400 text-[11px]">
            <span>Risoluzione finestra:</span>
            <span className="text-slate-200">
              {inspection.screenWidth} × {inspection.screenHeight} px
            </span>
          </div>

          <div className="flex justify-between text-slate-400 text-[11px]">
            <span>Schermo Touch:</span>
            <span className={inspection.hasTouch ? 'text-emerald-400' : 'text-slate-400'}>
              {inspection.hasTouch ? 'Rilevato' : 'Non rilevato'}
            </span>
          </div>

          <div className="flex justify-between text-slate-400 text-[11px]">
            <span>Motivo blocco:</span>
            <span className="text-amber-300 truncate max-w-[220px]">
              {inspection.reason}
            </span>
          </div>
        </div>

        {/* Instructions */}
        <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/30 text-indigo-200 text-xs mb-6 w-full text-left">
          💡 <strong>Come accedere da Tablet:</strong>
          <ul className="list-disc ml-4 mt-2 space-y-1.5 text-slate-300">
            <li>
              <strong>Tablet Android:</strong> apri la pagina web da <em>Chrome</em> e tocca <em>"Installa App"</em> (oppure menu <code>⋮</code> → <em>"Aggiungi a schermata Home"</em>).
            </li>
            <li>
              <strong>Apple iPad (iOS / iPadOS):</strong> apri la pagina web da <em>Safari</em>, tocca l'icona <em>Condividi</em> (quadrato con freccia) e seleziona <em>"Aggiungi alla schermata Home"</em>.
            </li>
          </ul>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
          <button
            type="button"
            onClick={checkDevice}
            className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Riprova Rilevamento</span>
          </button>

          {/* Development / Debug Bypass */}
          <button
            type="button"
            onClick={handleBypass}
            className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 active:bg-indigo-600/40 text-indigo-300 text-xs font-semibold flex items-center justify-center gap-1.5 border border-indigo-500/40 transition-colors"
            title="Consente di testare l'app su desktop simulando o bypassando il controllo"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Forza Avvio (Dev)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
