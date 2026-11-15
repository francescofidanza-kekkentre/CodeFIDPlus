export interface DeviceInspection {
  isTablet: boolean;
  deviceType: 'tablet' | 'mobile' | 'desktop';
  reason: string;
  screenWidth: number;
  screenHeight: number;
  hasTouch: boolean;
  userAgent: string;
}

/**
 * Checks whether the current device is a tablet.
 * Optimized specifically for Android tablets and general tablet devices.
 */
export function inspectDevice(): DeviceInspection {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const maxTouchPoints = typeof navigator !== 'undefined' ? navigator.maxTouchPoints || 0 : 0;
  const hasTouch = typeof window !== 'undefined' && ('ontouchstart' in window || maxTouchPoints > 0);

  const screenW = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const screenH = typeof window !== 'undefined' ? window.innerHeight : 768;
  const minDim = Math.min(screenW, screenH);

  // 1. Android Tablet Detection:
  // Google's official standard: Android phones contain "Android" AND "Mobile".
  // Android tablets contain "Android" but DO NOT contain "Mobile".
  const isAndroid = /android/i.test(ua);
  const isMobileUa = /mobile/i.test(ua);
  const isAndroidTablet = isAndroid && !isMobileUa;

  // 2. iPad / iPadOS Detection:
  const isIPad =
    /ipad/i.test(ua) ||
    (typeof navigator !== 'undefined' &&
      navigator.platform === 'MacIntel' &&
      maxTouchPoints > 1);

  // 3. Generic Tablet by Touch + Dimensions:
  // Smartphones have minDim < 580px.
  // Tablets typically have minDim >= 580px and touch support (including large 12"-14.6" pro tablets).
  // Traditional desktop PCs usually have maxTouchPoints === 0.
  const isGenericTablet = hasTouch && minDim >= 580 && minDim <= 1600;

  if (isAndroidTablet) {
    return {
      isTablet: true,
      deviceType: 'tablet',
      reason: 'Rilevato Tablet Android nativo',
      screenWidth: screenW,
      screenHeight: screenH,
      hasTouch,
      userAgent: ua,
    };
  }

  if (isIPad) {
    return {
      isTablet: true,
      deviceType: 'tablet',
      reason: 'Rilevato iPad / iPadOS',
      screenWidth: screenW,
      screenHeight: screenH,
      hasTouch,
      userAgent: ua,
    };
  }

  if (isGenericTablet && !isMobileUa) {
    return {
      isTablet: true,
      deviceType: 'tablet',
      reason: 'Rilevato dispositivo touch con schermo tablet (>=600px)',
      screenWidth: screenW,
      screenHeight: screenH,
      hasTouch,
      userAgent: ua,
    };
  }

  // If mobile phone
  if (isMobileUa || minDim < 580) {
    return {
      isTablet: false,
      deviceType: 'mobile',
      reason: 'Rilevato smartphone (schermo o interfaccia inferiore a 600px)',
      screenWidth: screenW,
      screenHeight: screenH,
      hasTouch,
      userAgent: ua,
    };
  }

  // Otherwise it's desktop/laptop
  return {
    isTablet: false,
    deviceType: 'desktop',
    reason: 'Rilevato computer Desktop / Laptop non touch',
    screenWidth: screenW,
    screenHeight: screenH,
    hasTouch,
    userAgent: ua,
  };
}
