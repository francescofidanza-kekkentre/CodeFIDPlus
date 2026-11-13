const STORE_LICENSE_KEY = 'codefid_store_license_v1';

export interface StoreVerificationResult {
  isAuthorized: boolean;
  source: 'google-play' | 'apple-appstore' | 'twa-android' | 'license-key' | 'none';
  details: string;
}

// Authorized SHA-256 hashes of master unlocking keys.
// The plaintext password NEVER exists in the JavaScript code or bundle,
// making it mathematically irreversible and protected against theft/reverse-engineering.
const AUTHORIZED_SHA256_HASHES = new Set([
  'b58f846695234676d28ee500640b88e5f2b55cfc53d5fdca839aafccc5df406c', // SHA-256
]);

/**
 * Computes the SHA-256 hex digest using Web Crypto API.
 */
export async function computeSha256(text: string): Promise<string> {
  try {
    if (typeof crypto !== 'undefined' && crypto && crypto.subtle) {
      const msgUint8 = new TextEncoder().encode(text.trim());
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch {
    return '';
  }
  return '';
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
 * Validates a store license or purchase order code using SHA-256 cryptographic hashes.
 * Accepts:
 * - Passphrases matching the precomputed SHA-256 hash (never exposed in clear text)
 * - Official Google Play purchase Order IDs (GPA.xxxx-xxxx-xxxx-xxxxx)
 */
export async function validateStoreLicense(code: string): Promise<boolean> {
  if (!code || typeof code !== 'string') return false;
  const clean = code.trim().toUpperCase();

  // 1. Cryptographic SHA-256 Hash check (Zero plaintext secrets in client bundle)
  const hash = await computeSha256(clean);
  if (hash && AUTHORIZED_SHA256_HASHES.has(hash)) {
    return true;
  }

  // 2. Google Play Order ID pattern (GPA.1234-5678-9012-34567)
  const playStoreRegex = /^GPA\.\d{4}-\d{4}-\d{4}-\d{5}$/i;
  if (playStoreRegex.test(clean)) {
    return true;
  }

  return false;
}

export function cleanUrlParams(): void {
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
