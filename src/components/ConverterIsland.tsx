import { MAX_FILES } from '../lib/constants';
import { formatBytes } from '../lib/compress';
import { fr } from '../lib/i18n';
import { useConverter } from './converter/useConverter';
import { Dropzone } from './converter/Dropzone';
import { FileList } from './converter/FileList';
import { SettingsPanel } from './converter/SettingsPanel';
import { Toasts } from './converter/Toasts';
import { CompareModal } from './converter/CompareModal';
import { Icon } from './converter/icons';

export default function ConverterIsland() {
  const c = useConverter();
  const { prefs, setPrefs } = c;

  return (
    <div class="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
      {/* Barre d'outils supérieure */}
      <div class="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-3 text-xs dark:border-slate-700 dark:bg-slate-800/70 sm:px-6">
        <span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 font-bold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300" title="Aucun fichier n'est envoyé : tout est calculé dans cet onglet.">
          <Icon name="lock" cls="h-3.5 w-3.5" /> 100% local
        </span>
        <span class="text-slate-500 dark:text-slate-400">
          {c.stats.total === 0
            ? `Jusqu’à ${MAX_FILES} fichiers · 25 Mo max / fichier`
            : `${c.stats.total}/${MAX_FILES} fichiers · entrée ${formatBytes(c.stats.inBytes)}${c.stats.outBytes ? ` · sortie ${formatBytes(c.stats.outBytes)}` : ''}`}
        </span>
        <span class="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 font-bold text-slate-500 dark:bg-slate-700 dark:text-slate-300" title={c.offlineReady ? 'Le service worker est actif : la conversion marche hors-ligne après chargement.' : 'Connecté. Après une visite complète, l’outil marchera aussi hors-ligne.'}>
          <Icon name={c.online ? 'wifi' : 'wifiOff'} cls="h-3.5 w-3.5" />
          {c.online ? (c.offlineReady ? 'Hors-ligne prêt' : 'En ligne') : 'Hors-ligne'}
        </span>
        <span class="ml-auto flex items-center gap-1">
          {c.stats.err > 0 && !c.busy && (
            <button onClick={c.retryErrors} class="rounded-full bg-red-50 px-3 py-1 font-bold text-red-700 hover:bg-red-100 dark:bg-red-950 dark:text-red-300">
              {fr.retryErrors(c.stats.err)}
            </button>
          )}
          {!!c.items.length && (
            <span class="inline-flex overflow-hidden rounded-full border border-slate-200 dark:border-slate-600" role="group" aria-label="Affichage liste ou grille">
              <button onClick={() => setPrefs({ view: 'liste' })} aria-pressed={prefs.view === 'liste'} title="Vue liste" class={`p-1.5 ${prefs.view === 'liste' ? 'bg-slate-900 text-white dark:bg-slate-600' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                <Icon name="list" cls="h-4 w-4" />
              </button>
              <button onClick={() => setPrefs({ view: 'grille' })} aria-pressed={prefs.view === 'grille'} title="Vue grille" class={`p-1.5 ${prefs.view === 'grille' ? 'bg-slate-900 text-white dark:bg-slate-600' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                <Icon name="grid" cls="h-4 w-4" />
              </button>
            </span>
          )}
        </span>
      </div>

      <div class="grid gap-0 lg:grid-cols-[1fr_320px]">
        <div class="p-4 sm:p-6">
          <Dropzone onFiles={c.addFiles} disabled={c.busy} />

          {c.rejected.length > 0 && (
            <div class="anim-pop mt-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm dark:border-red-900 dark:bg-red-950/40" role="alert">
              <p class="font-bold text-red-800 dark:text-red-300">{fr.rejectedTitle}</p>
              <ul class="mt-1 list-disc pl-5 text-red-700 dark:text-red-400">
                {c.rejected.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          {(c.busy || c.globalPct > 0) && (
            <div class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800" aria-live="polite">
              <div class="flex items-center justify-between gap-3 text-sm">
                <p class="font-semibold" role="status">{c.statusLine || 'Prêt'}</p>
                <p class="font-bold tabular-nums text-emerald-700 dark:text-emerald-400">{c.globalPct}%</p>
              </div>
              <div class="progress-track mt-2 dark:bg-slate-700">
                <div class={`progress-fill ${c.busy ? 'busy' : ''}`} style={{ width: `${c.globalPct}%` }} />
              </div>
              {c.decoderLoading && <p class="mt-1.5 text-xs text-slate-500 dark:text-slate-400">Chargement unique du décodeur HEIC (WASM), mis en cache ensuite…</p>}
            </div>
          )}
          {!c.busy && c.statusLine && c.globalPct === 0 && (
            <p class="mt-3 text-sm font-medium text-slate-700 dark:text-slate-300" role="status">{c.statusLine}</p>
          )}

          <FileList
            items={c.items}
            view={prefs.view}
            format={prefs.format}
            busy={c.busy}
            onMove={c.move}
            onReorder={c.reorder}
            onRemove={c.removeOne}
            onDownload={c.downloadBlob}
            onCompare={c.setCompareId}
          />

          {!c.items.length && (
            <div class="mt-4 grid gap-2 text-center sm:grid-cols-3">
              {fr.steps.map((s) => (
                <div key={s.t} class="rounded-2xl border border-dashed border-slate-200 bg-white px-3 py-4 dark:border-slate-700 dark:bg-slate-800">
                  <p class="text-sm font-extrabold">{s.t}</p>
                  <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">{s.d}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <SettingsPanel
          prefs={prefs}
          setPrefs={setPrefs}
          busy={c.busy}
          hasItems={!!c.items.length}
          hasResults={c.items.some((it) => it.outBlob)}
          pdfSize={c.pdfInfo?.size ?? null}
          globalPct={c.globalPct}
          statusLine={c.statusLine}
          onConvert={() => void c.convertAll()}
          onCancel={c.cancel}
          onZip={() => void c.downloadZip()}
          onClear={c.clear}
        />
      </div>

      {c.compareItem && <CompareModal item={c.compareItem} onClose={() => c.setCompareId(null)} />}
      <Toasts toasts={c.toasts} />
    </div>
  );
}
