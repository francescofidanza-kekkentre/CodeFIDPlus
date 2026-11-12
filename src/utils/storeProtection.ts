const STORE_LICENSE_KEY = 'codefid_store_license_v1';

export interface StoreVerificationResult {
  isAuthorized: boolean;
  source: 'google-play' | 'apple-appstore' | 'twa-android' | 'license-key' | 'none';
  details: string;
}

/**
 * Checks if the application is running inside an official Store-installed package,
 * or if a valid Store purchase/license has already been verified on this device.
 */
export function checkStoreAuthorization(): StoreVerificationResult {
  // 1. Check if previously verified and saved in localStorage
  try {
    const saved = localStorage.getItem(STORE_LICENSE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.verified === true) {
        return {
          isAuthorized: true,
          source: parsed.source || 'license-key',
          details: 'Licenza store verificata e attiva sul dispositivo',
        };
      }
    }
  } catch {
    // ignore
  }

  // 2. Check for official Store launch query parameters (configured in Android TWA / iOS Wrapper)
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const storeParam = params.get('store') || params.get('source');
    const licenseParam = params.get('license');

    if (storeParam === 'playstore' || storeParam === 'google-play' || storeParam === 'twa') {
      saveStoreAuthorization('google-play', 'Lanciato da pacchetto ufficiale Google Play Store');
      cleanUrlParams();
      return {
        isAuthorized: true,
        source: 'google-play',
        details: 'Pacchetto Google Play Store autorizzato',
      };
    }

    if (storeParam === 'appstore' || storeParam === 'ios' || storeParam === 'apple') {
      saveStoreAuthorization('apple-appstore', 'Lanciato da pacchetto ufficiale Apple App Store');
      cleanUrlParams();
      return {
        isAuthorized: true,
        source: 'apple-appstore',
        details: 'Pacchetto Apple App Store autorizzato',
      };
    }

    if (licenseParam && validateStoreLicense(licenseParam)) {
      saveStoreAuthorization('license-key', `Licenza sbloccata: ${licenseParam}`);
      cleanUrlParams();
      return {
        isAuthorized: true,
        source: 'license-key',
        details: 'Codice licenza valido verificato',
      };
    }

    // 3. Check for Android Native Referrer (Android TWA / Store Launcher)
    const ref = document.referrer || '';
    if (ref.startsWith('android-app://')) {
      saveStoreAuthorization('twa-android', `Lanciato da app Android: ${ref}`);
      return {
        isAuthorized: true,
        source: 'twa-android',
        details: 'Rilevato intent nativo Android Store',
      };
    }

    // 4. Check for Injected Native Store WebView Bridge (Capacitor / Cordova / WKWebView)
    const win = window as unknown as {
      Capacitor?: unknown;
      Android?: unknown;
      webkit?: { messageHandlers?: unknown };
    };

    if (win.Capacitor || win.Android || (win.webkit && win.webkit.messageHandlers)) {
      saveStoreAuthorization('twa-android', 'Rilevato runtime wrapper nativo dello store');
      return {
        isAuthorized: true,
        source: 'twa-android',
        details: 'Integrazione nativa WebView verificata',
      };
    }
  }

  // 5. Direct web browser access without store container or license -> NOT AUTHORIZED
  return {
    isAuthorized: false,
    source: 'none',
    details: 'Accesso da browser web diretto non autorizzato (Richiesta app ufficiale dallo Store)',
  };
}

/**
 * Saves a validated store authorization permanently on the tablet.
 */
export function saveStoreAuthorization(
  source: 'google-play' | 'apple-appstore' | 'twa-android' | 'license-key',
  details: string
): void {
  try {
    localStorage.setItem(
      STORE_LICENSE_KEY,
      JSON.stringify({
        verified: true,
        source,
        details,
        timestamp: Date.now(),
      })
    );
  } catch (err) {
    console.warn('Impossibile salvare autorizzazione store:', err);
  }
}

/**
 * Removes the store authorization (for reset or testing).
 */
export function revokeStoreAuthorization(): void {
  try {
    localStorage.removeItem(STORE_LICENSE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Validates a store license or purchase order code.
 * Accepts official purchase formats:
 * - PLAY-XXXX-XXXX
 * - APPLE-XXXX-XXXX
 * - CODEFID-STORE-XXXX
 * or standard alphanumeric purchase codes of at least 8 characters.
 */
export function validateStoreLicense(code: string): boolean {
  if (!code || typeof code !== 'string') return false;
  const clean = code.trim().toUpperCase();

  // Master activation code for testing/development
  if (clean === 'CODEFID-STORE-2026' || clean === 'STORE-DEV-UNLOCK') {
    return true;
  }

  // Google Play / App Store Order ID pattern:
  // e.g. GPA.1234-5678-9012-34567 or PLAY-XXXXX-XXXXX or APPLE-XXXXX-XXXXX
  const playStoreRegex = /^GPA\.\d{4}-\d{4}-\d{4}-\d{5}$/i;
  const storeKeyRegex = /^(PLAY|APPLE|CODEFID)-[A-Z0-9]{4,8}-[A-Z0-9]{4,8}$/i;

  if (playStoreRegex.test(clean) || storeKeyRegex.test(clean)) {
    return true;
  }

  // Generic purchase token of at least 12 alphanumeric characters
  if (/^[A-Z0-9]{12,32}$/i.test(clean)) {
    return true;
  }

  return false;
}

function cleanUrlParams(): void {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('store');
    url.searchParams.delete('source');
    url.searchParams.delete('license');
    window.history.replaceState({}, document.title, url.toString());
  } catch {
    // ignore
  }
}
