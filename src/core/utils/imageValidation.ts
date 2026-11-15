/**
 * Image URL validation to prevent SSRF attacks.
 *
 * Uses a denylist approach (blocking private/local IPs) combined with
 * an optional allowlist for production CDN domains.
 *
 * In production, configure ALLOWED_IMAGE_HOSTS with your actual storage/CDN domains.
 * Example: ALLOWED_IMAGE_HOSTS = new Set(['cdn.syncday.app', 'storage.syncday.app']);
 */

const ALLOWED_IMAGE_HOSTS = new Set<string>([
  // Configure with your production CDN/storage domains:
  // 'cdn.syncday.app',
  // 'storage.syncday.app',
  // 'images.syncday.app',
]);

/**
 * Validates if an image URL is safe to load.
 *
 * @param url - The image URL to validate
 * @returns true if the URL passes safety checks
 */
export function isSafeImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    // Only allow HTTPS
    if (parsed.protocol !== 'https:') return false;

    const hostname = parsed.hostname.toLowerCase();

    // Block localhost and local IPs
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return false;

    // Block link-local addresses (cloud metadata endpoints)
    if (hostname.startsWith('169.254.')) return false;

    // Block private IP ranges
    if (/^10\./.test(hostname)) return false;              // 10.0.0.0/8
    if (/^192\.168\./.test(hostname)) return false;        // 192.168.0.0/16
    if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)) return false; // 172.16.0.0/12

    // If allowlist is configured, enforce it
    if (ALLOWED_IMAGE_HOSTS.size > 0) {
      return ALLOWED_IMAGE_HOSTS.has(hostname);
    }

    // Otherwise, allow any HTTPS that passes denylist (dev/staging flexibility)
    return true;
  } catch {
    return false;
  }
}

/**
 * Configures the allowed image hosts for production use.
 * Call this during app initialization with your CDN domains.
 *
 * @param hosts - Array of allowed hostnames (e.g., ['cdn.syncday.app', 'storage.syncday.app'])
 */
export function configureAllowedImageHosts(hosts: string[]): void {
  ALLOWED_IMAGE_HOSTS.clear();
  for (const host of hosts) {
    ALLOWED_IMAGE_HOSTS.add(host.toLowerCase());
  }
}

/**
 * Gets the current allowed image hosts (for debugging/config verification).
 */
export function getAllowedImageHosts(): Set<string> {
  return new Set(ALLOWED_IMAGE_HOSTS);
}