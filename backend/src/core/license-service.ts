/**
 * LicenseService — bản stub.
 *
 * Hành vi:
 * - Mặc định: has() luôn false → các plugin có requiresLicense bị skip.
 * - Dev/test: bật feature qua env ZALOCRM_LICENSE_FEATURES="a,b,c"
 *   (chỉ để thử pipeline local).
 */
import type { LicenseService } from '../plugin-api/index.js';

function communityLicense(): LicenseService {
  return {
    has: () => false,
    edition: () => 'community',
    expiresAt: () => null,
    seats: () => null,
  };
}

function devFeatureLicense(features: string[]): LicenseService {
  const set = new Set(features);
  return {
    has: (f) => set.has(f),
    edition: () => 'enterprise',
    expiresAt: () => null,
    seats: () => null,
  };
}

export function loadLicense(): LicenseService {
  // TODO: đọc ZALOCRM_LICENSE_KEY (JWT) + verify RS256 bằng public key.
  const raw = process.env.ZALOCRM_LICENSE_FEATURES?.trim();
  if (raw) {
    const features = raw.split(',').map((s) => s.trim()).filter(Boolean);
    if (features.length) return devFeatureLicense(features);
  }
  return communityLicense();
}
