/**
 * Vietnamese text normalization for asset name matching
 *
 * Critical for deduplication: "Hồ Ly", "Ho Ly", "hồ ly" must all match.
 * We store BOTH:
 * - rawName: Original as posted (for display)
 * - normalizedName: Lowercase, no diacritics, trimmed (for matching)
 */

// Vietnamese diacritic mappings (comprehensive)
const DIACRITIC_MAP: Record<string, string> = {
  'à': 'a', 'á': 'a', 'ạ': 'a', 'ả': 'a', 'ã': 'a',
  'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ậ': 'a', 'ẩ': 'a', 'ẫ': 'a',
  'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ặ': 'a', 'ẳ': 'a', 'ẵ': 'a',
  'è': 'e', 'é': 'e', 'ẹ': 'e', 'ẻ': 'e', 'ẽ': 'e',
  'ê': 'e', 'ề': 'e', 'ế': 'e', 'ệ': 'e', 'ể': 'e', 'ễ': 'e',
  'ì': 'i', 'í': 'i', 'ị': 'i', 'ỉ': 'i', 'ĩ': 'i',
  'ò': 'o', 'ó': 'o', 'ọ': 'o', 'ỏ': 'o', 'õ': 'o',
  'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ộ': 'o', 'ổ': 'o', 'ỗ': 'o',
  'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ợ': 'o', 'ở': 'o', 'ỡ': 'o',
  'ù': 'u', 'ú': 'u', 'ụ': 'u', 'ủ': 'u', 'ũ': 'u',
  'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ự': 'u', 'ử': 'u', 'ữ': 'u',
  'ỳ': 'y', 'ý': 'y', 'ỵ': 'y', 'ỷ': 'y', 'ỹ': 'y',
  'đ': 'd',
  // Uppercase versions
  'À': 'a', 'Á': 'a', 'Ạ': 'a', 'Ả': 'a', 'Ã': 'a',
  'Â': 'a', 'Ầ': 'a', 'Ấ': 'a', 'Ậ': 'a', 'Ẩ': 'a', 'Ẫ': 'a',
  'Ă': 'a', 'Ằ': 'a', 'Ắ': 'a', 'Ặ': 'a', 'Ẳ': 'a', 'Ẵ': 'a',
  'È': 'e', 'É': 'e', 'Ẹ': 'e', 'Ẻ': 'e', 'Ẽ': 'e',
  'Ê': 'e', 'Ề': 'e', 'Ế': 'e', 'Ệ': 'e', 'Ể': 'e', 'Ễ': 'e',
  'Ì': 'i', 'Í': 'i', 'Ị': 'i', 'Ỉ': 'i', 'Ĩ': 'i',
  'Ò': 'o', 'Ó': 'o', 'Ọ': 'o', 'Ỏ': 'o', 'Õ': 'o',
  'Ô': 'o', 'Ồ': 'o', 'Ố': 'o', 'Ộ': 'o', 'Ổ': 'o', 'Ỗ': 'o',
  'Ơ': 'o', 'Ờ': 'o', 'Ớ': 'o', 'Ợ': 'o', 'Ở': 'o', 'Ỡ': 'o',
  'Ù': 'u', 'Ú': 'u', 'Ụ': 'u', 'Ủ': 'u', 'Ũ': 'u',
  'Ư': 'u', 'Ừ': 'u', 'Ứ': 'u', 'Ự': 'u', 'Ử': 'u', 'Ữ': 'u',
  'Ỳ': 'y', 'Ý': 'y', 'Ỵ': 'y', 'Ỷ': 'y', 'Ỹ': 'y',
  'Đ': 'd',
};

/**
 * Remove Vietnamese diacritics and normalize text for matching
 *
 * @param text - Input text (may contain Vietnamese characters)
 * @returns Normalized text: lowercase, no diacritics, trimmed, single spaces
 *
 * @example
 * normalizeVietnamese("Hồ Ly") // "ho ly"
 * normalizeVietnamese("HỒ_LY") // "ho ly"
 * normalizeVietnamese("hồ  ly") // "ho ly"
 */
export function normalizeVietnamese(text: string): string {
  let result = text.toLowerCase();

  // Replace Vietnamese characters with ASCII equivalents
  for (const [vietnamese, ascii] of Object.entries(DIACRITIC_MAP)) {
    result = result.replaceAll(vietnamese.toLowerCase(), ascii);
  }

  // Normalize separators: _ and - become space
  result = result.replace(/[_\-]+/g, ' ');

  // Collapse multiple spaces to single space
  result = result.replace(/\s+/g, ' ');

  // Trim
  result = result.trim();

  return result;
}

/**
 * Check if two asset names match (normalized comparison)
 */
export function assetNamesMatch(name1: string, name2: string): boolean {
  return normalizeVietnamese(name1) === normalizeVietnamese(name2);
}

/**
 * Extract words from normalized name for search indexing
 */
export function extractSearchTokens(normalizedName: string): string[] {
  return normalizedName.split(' ').filter(token => token.length > 0);
}
