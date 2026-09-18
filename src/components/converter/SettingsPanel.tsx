import { MAX_EDGE_OPTIONS, PDF_ORIENTATION_OPTIONS, PDF_PAGE_OPTIONS, PRESETS, type OutputFormat, type PdfOrientation, type PdfPageSize, type PresetId } from '../../lib/constants';
import { formatBytes } from '../../lib/compress';
import type { Prefs } from './model';
import { Icon } from './icons';

type Props = {
  prefs: Prefs;
  setPrefs: (p: Partial<Prefs>) => void;
  busy: boolean;
  hasItems: boolean;
  hasResults: boolean;
  pdfSize: number | null;
  globalPct: number;
  statusLine: string;
  onConvert: () => void;
  onCancel: () => void;
  onZip: () => void;
  onClear: () => void;
};

export function SettingsPanel(p: Props) {
  const { prefs, setPrefs } = p;
  const canConvert = !p.busy && p.hasItems;

  return (
    <aside class="border-t border-slate-100 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-800/60 sm:p-6 lg:border-l lg:border-t-0" aria-label="Réglages de conversion">
      <p class="text-xs font-black uppercase tracking-widest text-slate-400">Réglages</p>

      <div class="mt-3 text-sm">
        <span class="mb-1.5 block font-bold" id="fmt-label">Format de sortie</span>
        <div class="grid grid-cols-3 gap-1.5" role="radiogroup" aria-labelledby="fmt-label">
          {(['jpeg', 'png', 'pdf'] as OutputFormat[]).map((f) => (
            <button
              key={f}
              role="radio"
              aria-checked={prefs.format === f}
              onClick={() => setPrefs({ format: f })}
              class={`rounded-xl border-2 px-2 py-2 text-xs font-extrabold transition ${prefs.format === f ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}
            >
              {f === 'jpeg' ? 'JPG' : f === 'png' ? 'PNG' : 'PDF'}
            </button>
          ))}
        </div>
        <span class="mt-1 block text-xs text-slate-500 dark:text-slate-400">{prefs.format === 'jpeg' ? 'Universel : démarches, emploi, impression.' : prefs.format === 'png' ? 'Sans perte : captures, logos.' : 'Multipage : dossiers, justificatifs.'}</span>
      </div>

      <label class="mt-4 block text-sm">
        <span class="mb-1.5 block font-bold">Taille cible</span>
        <select value={prefs.presetId} onChange={(e) => setPrefs({ presetId: (e.target as HTMLSelectElement).value as PresetId })} class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm dark:border-slate-600 dark:bg-slate-800">
          {(Object.keys(PRESETS) as PresetId[]).map((k) => (
            <option key={k} value={k}>{PRESETS[k].label}</option>
          ))}
        </select>
        <span class="mt-1 block text-xs text-slate-500 dark:text-slate-400">{PRESETS[prefs.presetId].hint}</span>
      </label>

      {prefs.format === 'jpeg' && (
        <div class="anim-pop mt-4 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-600 dark:bg-slate-800">
          <label class="block text-sm">
            <span class="flex items-center justify-between font-bold">Qualité max <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs tabular-nums dark:bg-slate-700">{Math.round(prefs.jpegQuality * 100)}%</span></span>
            <input type="range" min={0.6} max={0.95} step={0.01} value={prefs.jpegQuality} onInput={(e) => setPrefs({ jpegQuality: Number((e.target as HTMLInputElement).value) })} class="mt-2 w-full accent-emerald-600" aria-label="Qualité JPEG maximale" />
          </label>
          <label class="mt-3 block text-sm">
            <span class="mb-1 block font-bold">Dimension max</span>
            <select value={prefs.maxEdge} onChange={(e) => setPrefs({ maxEdge: Number((e.target as HTMLSelectElement).value) })} class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800">
              {MAX_EDGE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label class="mt-3 flex cursor-pointer items-start gap-2.5 rounded-xl border border-dashed border-slate-300 p-2.5 text-sm dark:border-slate-600">
            <input type="checkbox" checked={prefs.cropIdentite} onChange={(e) => setPrefs({ cropIdentite: (e.target as HTMLInputElement).checked })} class="mt-1 h-4 w-4 accent-emerald-600" />
            <span>
              <span class="block font-bold">Recadrer 35×45 (identité)</span>
              <span class="block text-xs text-slate-500 dark:text-slate-400">Centré au ratio passeport/CNI, export 413×531 px.</span>
            </span>
          </label>
          <p class="mt-2 flex items-start gap-1.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
            <Icon name="lock" cls="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
            Le ré-encodage supprime les métadonnées EXIF/GPS du fichier produit.
          </p>
        </div>
      )}

      {prefs.format === 'pdf' && (
        <div class="anim-pop mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-600 dark:bg-slate-800">
          <label class="block text-sm">
            <span class="mb-1 block font-bold">Taille de page</span>
            <select value={prefs.pdfPage} onChange={(e) => setPrefs({ pdfPage: (e.target as HTMLSelectElement).value as PdfPageSize })} class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800">
              {PDF_PAGE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label class="block text-sm">
            <span class="mb-1 block font-bold">Orientation</span>
            <select value={prefs.pdfOrientation} onChange={(e) => setPrefs({ pdfOrientation: (e.target as HTMLSelectElement).value as PdfOrientation })} class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800">
              {PDF_ORIENTATION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label class="block text-sm">
            <span class="mb-1 block font-bold">Qualité images PDF</span>
            <select value={prefs.pdfQuality} onChange={(e) => setPrefs({ pdfQuality: Number((e.target as HTMLSelectElement).value) })} class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800">
              <option value={0.92}>Haute (fichiers lourds)</option>
              <option value={0.85}>Standard (recommandée)</option>
              <option value={0.7}>Légère (petits fichiers)</option>
            </select>
          </label>
          <label class="block text-sm">
            <span class="mb-1 block font-bold">Nom du fichier</span>
            <div class="flex items-center gap-1">
              <input value={prefs.pdfName} onInput={(e) => setPrefs({ pdfName: (e.target as HTMLInputElement).value })} maxlength={40} class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800" placeholder="documents" aria-label="Nom du fichier PDF" />
              <span class="text-sm text-slate-400">.pdf</span>
            </div>
          </label>
          <p class="text-[11px] text-slate-500 dark:text-slate-400">Ordre des pages = ordre de la liste (glisser-déposer ou ↑ ↓).</p>
        </div>
      )}

      {prefs.format !== 'pdf' && (
        <div class="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-600 dark:bg-slate-800">
          <label class="block text-sm">
            <span class="mb-1 block font-bold">Renommage par lot <span class="font-normal text-slate-400">(optionnel)</span></span>
            <div class="flex items-center gap-1">
              <input value={prefs.prefix} onInput={(e) => setPrefs({ prefix: (e.target as HTMLInputElement).value })} maxlength={40} class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800" placeholder="ex : caf-dossier" aria-label="Préfixe de renommage" />
            </div>
            <span class="mt-1 block text-[11px] text-slate-500 dark:text-slate-400">{prefs.prefix.trim() ? `Aperçu : ${prefs.prefix.trim()}-01.jpg, -02…` : 'Vide = conserve les noms d’origine.'}</span>
          </label>
          <label class="block text-sm">
            <span class="mb-1 block font-bold">Nom du ZIP</span>
            <div class="flex items-center gap-1">
              <input value={prefs.zipName} onInput={(e) => setPrefs({ zipName: (e.target as HTMLInputElement).value })} maxlength={40} class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800" placeholder="images-converties" aria-label="Nom du fichier ZIP" />
              <span class="text-sm text-slate-400">.zip</span>
            </div>
          </label>
        </div>
      )}

      <div class="mt-4 grid gap-2">
        {p.busy ? (
          <button onClick={p.onCancel} class="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3.5 font-extrabold text-white shadow-lg transition hover:bg-red-500">
            <Icon name="stop" cls="h-4 w-4" /> Annuler ({p.globalPct}%)
          </button>
        ) : (
          <button
            onClick={p.onConvert}
            disabled={!canConvert}
            class={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 font-extrabold text-white shadow-lg transition ${!canConvert ? 'cursor-not-allowed bg-slate-300 shadow-none dark:bg-slate-700' : 'bg-gradient-to-r from-emerald-600 to-teal-600 shadow-emerald-200 hover:brightness-110 active:scale-[0.99] dark:shadow-none'}`}
          >
            {prefs.format === 'pdf' ? 'Générer le PDF' : 'Convertir'}
          </button>
        )}
        {prefs.format !== 'pdf' && p.hasResults && (
          <button onClick={p.onZip} disabled={p.busy} class="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-900 bg-white px-4 py-3 font-extrabold transition hover:bg-slate-900 hover:text-white disabled:opacity-40 dark:border-slate-300 dark:bg-transparent dark:hover:bg-slate-700">
            <Icon name="zip" cls="h-4 w-4" /> Tout télécharger en ZIP
          </button>
        )}
        {p.pdfSize !== null && prefs.format === 'pdf' && (
          <p class="anim-pop rounded-xl bg-emerald-50 px-3 py-2 text-center text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            PDF téléchargé · {formatBytes(p.pdfSize)} — relancez pour régénérer après réordre.
          </p>
        )}
        <button onClick={p.onClear} disabled={p.busy || !p.hasItems} class="rounded-xl px-3 py-2 text-sm font-semibold text-slate-400 hover:text-red-600 disabled:opacity-40">
          Tout effacer (mémoire locale)
        </button>
      </div>
    </aside>
  );
}
