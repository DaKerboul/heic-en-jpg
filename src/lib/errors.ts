// Erreurs typées du pipeline de conversion : chaque échec utilisateur
// reçoit un code stable (testable, traduisible) + un message FR prêt à afficher.
export type ConversionErrorCode =
  | 'TROP_LOURD'
  | 'FORMAT_NON_SUPPORTE'
  | 'HEIC_NON_SUPPORTE'
  | 'LECTURE_IMPOSSIBLE'
  | 'ENCODAGE_IMPOSSIBLE'
  | 'PDF_IMPOSSIBLE'
  | 'ANNULE';

export class ConversionError extends Error {
  readonly code: ConversionErrorCode;
  readonly fileName?: string;

  constructor(code: ConversionErrorCode, message: string, fileName?: string) {
    super(message);
    this.name = 'ConversionError';
    this.code = code;
    this.fileName = fileName;
  }
}

const HEIC_HINT = ' — essayez de réexporter la photo en JPG depuis l’app Photos de l’iPhone.';

export function errorMessage(e: unknown): { code: ConversionErrorCode | 'INCONNU'; message: string } {
  if (e instanceof ConversionError) {
    const message = e.code === 'HEIC_NON_SUPPORTE' ? e.message + HEIC_HINT : e.message;
    return { code: e.code, message };
  }
  if (e instanceof Error) {
    const m = e.message;
    if (/HEIC|heic|libheif|decode/i.test(m)) return { code: 'HEIC_NON_SUPPORTE', message: m + HEIC_HINT };
    if (/canvas|encod|toBlob/i.test(m)) return { code: 'ENCODAGE_IMPOSSIBLE', message: m };
    return { code: 'INCONNU', message: m };
  }
  return { code: 'INCONNU', message: 'Échec de conversion.' };
}
