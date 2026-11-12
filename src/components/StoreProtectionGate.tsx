import React, { useState } from 'react';
import {
  ShieldAlert,
  Lock,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Smartphone,
} from 'lucide-react';
import {
  checkStoreAuthorization,
  saveStoreAuthorization,
  validateStoreLicense,
  StoreVerificationResult,
} from '../utils/storeProtection';

interface StoreProtectionGateProps {
  children: React.ReactNode;
}

export const StoreProtectionGate: React.FC<StoreProtectionGateProps> = ({ children }) => {
  const [auth, setAuth] = useState<StoreVerificationResult>(() => checkStoreAuthorization());
  const [inputCode, setInputCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const lic = params.get('license');
      if (lic) {
        validateStoreLicense(lic).then((valid) => {
          if (valid) {
            saveStoreAuthorization('license-key', 'Licenza sbloccata via link');
            setAuth({
              isAuthorized: true,
              source: 'license-key',
              details: 'Licenza sbloccata via link',
            });
          }
        });
      }
    }
  }, []);

  const handleUnlockWithLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!inputCode.trim()) {
      setErrorMessage('Inserisci un codice licenza o un numero ordine dello Store.');
      return;
    }

    const isValid = await validateStoreLicense(inputCode.trim());
    if (isValid) {
      saveStoreAuthorization('license-key', 'Licenza verificata con successo');
      setSuccessMessage('Licenza verificata con successo! Avvio in corso...');
      setTimeout(() => {
        setAuth({
          isAuthorized: true,
          source: 'license-key',
          details: 'Licenza attivata con successo',
        });
      }, 500);
    } else {
      setErrorMessage(
        'Codice non valido. Inserisci il numero di ordine di Google Play (es. GPA.xxxx-xxxx-xxxx-xxxxx) o una chiave autorizzata.'
      );
    }
  };

  if (auth.isAuthorized) {
    return <>{children}</>;
  }

  return (
    <div className="h-[100dvh] w-screen flex flex-col items-center justify-center bg-[#070a13] text-slate-100 p-4 sm:p-6 select-none overflow-y-auto">
      <div className="w-full max-w-lg bg-[#111827] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-rose-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Security Shield Icon */}
        <div className="relative mb-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-rose-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
            <Lock className="w-10 h-10 text-indigo-400" />
          </div>
          <div className="absolute -top-1.5 -right-1.5 w-7 h-7 rounded-full bg-rose-500 flex items-center justify-center text-white font-bold shadow-lg shadow-rose-500/40">
            <ShieldAlert className="w-4 h-4" />
          </div>
        </div>

        {/* Title & Description */}
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-2">
          Applicazione Riservata agli Store
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 mb-5 leading-relaxed">
          <strong className="text-indigo-400">CodeFID+</strong> è un software commerciale a pagamento.
          L'esecuzione è protetta ed è consentita <strong>esclusivamente agli utenti che hanno acquistato l'applicazione</strong> su{' '}
          <strong>Google Play Store</strong> o <strong>Apple App Store</strong>.
        </p>

        {/* Direct web block warning banner */}
        <div className="w-full bg-rose-950/30 border border-rose-500/30 rounded-2xl p-3.5 mb-5 text-left text-xs space-y-1.5">
          <div className="flex items-center gap-2 text-rose-300 font-bold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Accesso Web Diretto Disabilitato</span>
          </div>
          <p className="text-rose-200/80 text-[11px] leading-relaxed">
            L'accesso diretto tramite l'indirizzo pubblico GitHub Pages da un comune browser web non consente l'esecuzione non autorizzata dell'ambiente di sviluppo.
          </p>
        </div>

        {/* Store purchase instructions */}
        <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-4 mb-5 text-left text-xs space-y-3">
          <div className="font-semibold text-slate-200 flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-emerald-400" />
            <span>Come usare l'applicazione dopo l'acquisto:</span>
          </div>
          <ul className="list-disc ml-4 space-y-1.5 text-slate-300 text-[11.5px]">
            <li>
              Apri l'app direttamente dall'icona installata dal <strong>Google Play Store</strong> o <strong>Apple App Store</strong> sul tuo tablet. L'ambiente si sbloccherà automaticamente al primo avvio.
            </li>
            <li>
              Se sei lo sviluppatore, un tester o hai acquistato una licenza diretta, inserisci il codice di sblocco qui sotto.
            </li>
          </ul>
        </div>

        {/* Unlock License Key Form */}
        <form onSubmit={handleUnlockWithLicense} className="w-full space-y-3">
          <div className="text-left">
            <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
              <span>Hai un codice licenza o numero d'ordine Store?</span>
            </label>
            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              placeholder="es. GPA.xxxx-xxxx-xxxx-xxxxx o Codice Licenza"
              className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-mono outline-none placeholder:text-slate-600 transition-colors"
            />
          </div>

          {errorMessage && (
            <div className="text-[11px] text-rose-400 bg-rose-950/40 border border-rose-800/40 rounded-xl p-2.5 text-left flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="text-[11px] text-emerald-300 bg-emerald-950/40 border border-emerald-800/40 rounded-xl p-2.5 text-left flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Verifica Licenza e Sblocca</span>
          </button>
        </form>
      </div>
    </div>
  );
};
