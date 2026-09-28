/**
 * Utility functions for Google Forms & Google Drive webhook data extraction and normalization.
 */

function extractDriveId(val) {
  if (!val || typeof val !== 'string') return null;
  // If multiple URLs separated by comma or semicolon, take the first one
  const first = val.split(/[,;\n]/)[0].trim();

  // Pattern 1: /d/<id>/
  const dMatch = first.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (dMatch && dMatch[1]) return dMatch[1];

  // Pattern 2: ?id=<id> or &id=<id>
  const idMatch = first.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch && idMatch[1]) return idMatch[1];

  // Pattern 3: direct ID (typically 25+ characters alphanumeric with _ and -)
  if (/^[a-zA-Z0-9_-]{25,}$/.test(first)) {
    return first;
  }

  return null;
}

function normalizeImageUrl(val) {
  if (!val || typeof val !== 'string') return null;
  const driveId = extractDriveId(val);
  if (driveId) {
    // Official Google direct content CDN format for Google Drive images
    // Renders cleanly in HTML <img> tags without redirects or authentication
    return `https://lh3.googleusercontent.com/d/${driveId}`;
  }
  return val.trim();
}

function parseAcademicYear(val) {
  if (val == null) return null;
  if (typeof val === 'number') {
    const intVal = Math.floor(val);
    return intVal >= 1 && intVal <= 4 ? intVal : intVal;
  }
  const str = String(val).toLowerCase().trim();
  if (str.includes('4') || str.includes('fourth') || str.includes('iv')) return 4;
  if (str.includes('3') || str.includes('third') || str.includes('iii')) return 3;
  if (str.includes('2') || str.includes('second') || str.includes('ii')) return 2;
  if (str.includes('1') || str.includes('first') || str.includes('i')) return 1;

  const num = parseInt(str.replace(/\D/g, ''), 10);
  return isNaN(num) ? null : num;
}

function parseCategory(val) {
  if (!val || typeof val !== 'string') return 'All-Rounder';
  const str = val.toLowerCase().trim();
  if (str.includes('wicket') || str.includes('keeper') || str.includes('wk')) {
    return 'Wicket-Keeper';
  }
  if (str.includes('bowl')) {
    return 'Bowler';
  }
  if (str.includes('bat')) {
    return 'Batsman';
  }
  if (str.includes('all') || str.includes('round')) {
    return 'All-Rounder';
  }
  const allowed = ['Batsman', 'Bowler', 'All-Rounder', 'Wicket-Keeper'];
  const matched = allowed.find((a) => a.toLowerCase() === str);
  return matched || 'All-Rounder';
}

function parseBasePrice(val, defaultPrice = 0.5) {
  if (val == null || val === '') return defaultPrice;
  const num = parseFloat(val);
  return isNaN(num) ? defaultPrice : num;
}

module.exports = {
  extractDriveId,
  normalizeImageUrl,
  parseAcademicYear,
  parseCategory,
  parseBasePrice,
};
