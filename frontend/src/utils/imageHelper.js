/**
 * Helper to ensure player images (Google Drive, CDN, or uploaded)
 * load seamlessly across all browsers and devices without CORS or Referer blocking.
 */

export function getPlayerImageUrl(url) {
  if (!url || typeof url !== 'string' || !url.trim()) return null;
  const trimmed = url.trim();

  // If already full https/http or data url, return it
  return trimmed;
}

/**
 * Fallback handler when an <img> fails to load directly (e.g. Google Drive 403 / Referer blocking)
 */
export function handleImageError(e, originalUrl) {
  const target = e.currentTarget || e.target;
  if (!target) return;

  const apiUrl = import.meta.env.VITE_API_URL || '';

  // Step 1: If direct Google CDN failed, try via backend proxy
  if (!target.dataset.triedProxy && originalUrl) {
    target.dataset.triedProxy = 'true';
    const proxyUrl = `${apiUrl}/api/v1/players/image-proxy?url=${encodeURIComponent(originalUrl)}`;
    target.src = proxyUrl;
    return;
  }

  // Step 2: If proxy also failed or no originalUrl, hide broken image cleanly
  target.style.opacity = '0';
  target.onerror = null;
}
