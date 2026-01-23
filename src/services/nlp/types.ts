// src/services/nlp/types.ts

export interface NormalizationOptions {
  preserveCase?: boolean;  // Default: false (lowercase)
  collapseWhitespace?: boolean;  // Default: true
  convertSeparators?: boolean;  // Default: true (convert _ and - to space)
}

export interface NormalizationResult {
  original: string;
  normalized: string;
  hadDiacritics: boolean;
}
