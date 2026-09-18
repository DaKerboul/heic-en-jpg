export const MAX_INPUT_BYTES = 25 * 1024 * 1024; // 25 Mo / fichier
export const MAX_FILES = 10;

export const PRESETS = {
  ants: { label: 'ANTS / Ameli / CAF (< 2 Mo)', maxBytes: 2 * 1024 * 1024, hint: 'Passeport, permis, carte vitale, CAF' },
  email: { label: 'Email / Candidature (< 500 Ko)', maxBytes: 500 * 1024, hint: 'CV, lettre, pièces jointes' },
  libre: { label: 'Qualité max (sans limite)', maxBytes: Infinity, hint: 'Impression, archivage' },
} as const;

export type PresetId = keyof typeof PRESETS;
export type OutputFormat = 'jpeg' | 'png' | 'pdf';

export const MAX_EDGE_OPTIONS = [
  { value: 0, label: 'Dimension d’origine' },
  { value: 2560, label: '2560 px (grand écran)' },
  { value: 1920, label: '1920 px (recommandé web)' },
  { value: 1280, label: '1280 px (léger)' },
] as const;

export const PDF_PAGE_OPTIONS = [
  { value: 'a4', label: 'A4 (210 × 297 mm)' },
  { value: 'letter', label: 'Lettre US' },
  { value: 'auto', label: 'Auto (taille image)' },
] as const;
export type PdfPageSize = (typeof PDF_PAGE_OPTIONS)[number]['value'];

export const PDF_ORIENTATION_OPTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: 'portrait', label: 'Portrait' },
  { value: 'paysage', label: 'Paysage' },
] as const;
export type PdfOrientation = (typeof PDF_ORIENTATION_OPTIONS)[number]['value'];

export const ACCEPTED_INPUTS =
  '.heic,.heif,.webp,.jpg,.jpeg,.png,.avif,.gif,.bmp,image/heic,image/heif,image/webp,image/jpeg,image/png,image/avif,image/gif,image/bmp';
