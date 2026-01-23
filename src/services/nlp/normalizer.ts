// src/services/nlp/normalizer.ts
import type { NormalizationOptions, NormalizationResult } from './types';

/**
 * Vietnamese diacritic character mappings
 * Character-by-character mapping for Vietnamese diacritics
 *
 * Vietnamese has 6 tones applied to 12 vowels + d with stroke
 * Total: 89 diacritic characters -> 12 base vowels + d
 */
const CHAR_MAP: Record<string, string> = {
  // Lowercase a variants (17 chars)
  'à': 'a', 'á': 'a', 'ạ': 'a', 'ả': 'a', 'ã': 'a',
  'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ậ': 'a', 'ẩ': 'a', 'ẫ': 'a',
  'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ặ': 'a', 'ẳ': 'a', 'ẵ': 'a',
  // Uppercase A variants
  'À': 'a', 'Á': 'a', 'Ạ': 'a', 'Ả': 'a', 'Ã': 'a',
  'Â': 'a', 'Ầ': 'a', 'Ấ': 'a', 'Ậ': 'a', 'Ẩ': 'a', 'Ẫ': 'a',
  'Ă': 'a', 'Ằ': 'a', 'Ắ': 'a', 'Ặ': 'a', 'Ẳ': 'a', 'Ẵ': 'a',
  // Lowercase e variants (11 chars)
  'è': 'e', 'é': 'e', 'ẹ': 'e', 'ẻ': 'e', 'ẽ': 'e',
  'ê': 'e', 'ề': 'e', 'ế': 'e', 'ệ': 'e', 'ể': 'e', 'ễ': 'e',
  // Uppercase E variants
  'È': 'e', 'É': 'e', 'Ẹ': 'e', 'Ẻ': 'e', 'Ẽ': 'e',
  'Ê': 'e', 'Ề': 'e', 'Ế': 'e', 'Ệ': 'e', 'Ể': 'e', 'Ễ': 'e',
  // Lowercase i variants (5 chars)
  'ì': 'i', 'í': 'i', 'ị': 'i', 'ỉ': 'i', 'ĩ': 'i',
  // Uppercase I variants
  'Ì': 'i', 'Í': 'i', 'Ị': 'i', 'Ỉ': 'i', 'Ĩ': 'i',
  // Lowercase o variants (17 chars)
  'ò': 'o', 'ó': 'o', 'ọ': 'o', 'ỏ': 'o', 'õ': 'o',
  'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ộ': 'o', 'ổ': 'o', 'ỗ': 'o',
  'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ợ': 'o', 'ở': 'o', 'ỡ': 'o',
  // Uppercase O variants
  'Ò': 'o', 'Ó': 'o', 'Ọ': 'o', 'Ỏ': 'o', 'Õ': 'o',
  'Ô': 'o', 'Ồ': 'o', 'Ố': 'o', 'Ộ': 'o', 'Ổ': 'o', 'Ỗ': 'o',
  'Ơ': 'o', 'Ờ': 'o', 'Ớ': 'o', 'Ợ': 'o', 'Ở': 'o', 'Ỡ': 'o',
  // Lowercase u variants (11 chars)
  'ù': 'u', 'ú': 'u', 'ụ': 'u', 'ủ': 'u', 'ũ': 'u',
  'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ự': 'u', 'ử': 'u', 'ữ': 'u',
  // Uppercase U variants
  'Ù': 'u', 'Ú': 'u', 'Ụ': 'u', 'Ủ': 'u', 'Ũ': 'u',
  'Ư': 'u', 'Ừ': 'u', 'Ứ': 'u', 'Ự': 'u', 'Ử': 'u', 'Ữ': 'u',
  // Lowercase y variants (5 chars)
  'ỳ': 'y', 'ý': 'y', 'ỵ': 'y', 'ỷ': 'y', 'ỹ': 'y',
  // Uppercase Y variants
  'Ỳ': 'y', 'Ý': 'y', 'Ỵ': 'y', 'Ỷ': 'y', 'Ỹ': 'y',
  // d with stroke
  'đ': 'd', 'Đ': 'd',
};

/**
 * Remove Vietnamese diacritics from text
 *
 * @param text - Text with potential diacritics
 * @returns Text with diacritics removed
 *
 * @example
 * removeDiacritics('Hồ Ly') // 'Ho Ly'
 * removeDiacritics('đẹp') // 'dep'
 */
export function removeDiacritics(text: string): string {
  let result = '';

  for (const char of text) {
    result += CHAR_MAP[char] ?? char;
  }

  return result;
}

/**
 * Check if text contains Vietnamese diacritics
 */
export function hasDiacritics(text: string): boolean {
  for (const char of text) {
    if (CHAR_MAP[char] !== undefined) {
      return true;
    }
  }
  return false;
}

/**
 * Normalize Vietnamese text for consistent matching
 *
 * This is the main normalization function used throughout the app.
 * It handles:
 * - Vietnamese diacritic removal (Hồ Ly -> ho ly)
 * - Case normalization (Ho Ly -> ho ly)
 * - Separator normalization (ho_ly -> ho ly, ho-ly -> ho ly)
 * - Whitespace collapsing (ho  ly -> ho ly)
 *
 * @param text - Text to normalize
 * @param options - Normalization options
 * @returns Normalized text
 *
 * @example
 * normalizeVietnamese('Hồ Ly v3')  // 'ho ly v3'
 * normalizeVietnamese('Ho_Ly_v3')  // 'ho ly v3'
 * normalizeVietnamese('HỒ LY')     // 'ho ly'
 */
export function normalizeVietnamese(
  text: string,
  options: NormalizationOptions = {}
): string {
  const {
    preserveCase = false,
    collapseWhitespace = true,
    convertSeparators = true,
  } = options;

  let normalized = text.trim();

  // Remove diacritics
  normalized = removeDiacritics(normalized);

  // Lowercase unless preserveCase
  if (!preserveCase) {
    normalized = normalized.toLowerCase();
  }

  // Convert separators to spaces
  if (convertSeparators) {
    normalized = normalized.replace(/[_\-]+/g, ' ');
  }

  // Collapse multiple whitespace
  if (collapseWhitespace) {
    normalized = normalized.replace(/\s+/g, ' ');
  }

  return normalized.trim();
}

/**
 * Normalize with detailed result including original text
 */
export function normalizeWithDetails(
  text: string,
  options: NormalizationOptions = {}
): NormalizationResult {
  return {
    original: text,
    normalized: normalizeVietnamese(text, options),
    hadDiacritics: hasDiacritics(text),
  };
}

// Re-export types
export type { NormalizationOptions, NormalizationResult } from './types';
