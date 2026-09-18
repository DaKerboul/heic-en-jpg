import { describe, expect, it } from 'vitest';
import { formatBytes, gainPct } from '../compress';
import { slugFilename } from '../pdf';
import { batchName, renameWithExt } from '../image';
import { ConversionError, errorMessage } from '../errors';
import { DEFAULT_PREFS, loadPrefs } from '../../components/converter/model';

describe('formatBytes', () => {
  it('formate les petites tailles', () => {
    expect(formatBytes(0)).toBe('0 o');
    expect(formatBytes(512)).toBe('512 o');
  });
  it('formate les Ko et Mo', () => {
    expect(formatBytes(2048)).toBe('2 Ko');
    expect(formatBytes(500 * 1024)).toBe('500 Ko');
    expect(formatBytes(2 * 1024 * 1024)).toBe('2.00 Mo');
  });
  it('gère les valeurs non finies', () => {
    expect(formatBytes(Infinity)).toBe('—');
  });
});

describe('gainPct', () => {
  it('calcule réduction et augmentation', () => {
    expect(gainPct(1000, 500)).toBe('−50 %');
    expect(gainPct(500, 1000)).toBe('+100 %');
    expect(gainPct(0, 100)).toBe('—');
  });
});

describe('renameWithExt / batchName / slugFilename', () => {
  it('renomme en changeant l’extension', () => {
    expect(renameWithExt('IMG_001.HEIC', 'jpg')).toBe('IMG_001.jpg');
    expect(renameWithExt('capture.webp', 'png')).toBe('capture.png');
  });
  it('numérote avec zéros selon le total', () => {
    expect(batchName('caf-dossier', 0, 10, 'jpg')).toBe('caf-dossier-01.jpg');
    expect(batchName('caf-dossier', 9, 10, 'jpg')).toBe('caf-dossier-10.jpg');
    expect(batchName('', 0, 3, 'png')).toBe('image-1.png');
  });
  it('slugifie les noms de PDF', () => {
    expect(slugFilename('Mes justificatifs CAF !')).toBe('Mes-justificatifs-CAF');
    expect(slugFilename('   ')).toBe('documents');
  });
});

describe('ConversionError', () => {
  it('porte un code stable', () => {
    const e = new ConversionError('TROP_LOURD', 'trop lourd');
    expect(e.code).toBe('TROP_LOURD');
    expect(e).toBeInstanceOf(Error);
  });
  it('ajoute le conseil iPhone aux erreurs HEIC', () => {
    const { code, message } = errorMessage(new ConversionError('HEIC_NON_SUPPORTE', 'décodage impossible'));
    expect(code).toBe('HEIC_NON_SUPPORTE');
    expect(message).toContain('Photos');
  });
  it('qualifie les erreurs inconnues', () => {
    expect(errorMessage('boom').code).toBe('INCONNU');
    expect(errorMessage(new Error('x')).code).toBe('INCONNU');
  });
});

describe('prefs', () => {
  it('retombe sur les défauts sans localStorage (SSR / node)', () => {
    expect(loadPrefs()).toEqual(DEFAULT_PREFS);
  });
});
