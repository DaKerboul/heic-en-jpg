import { useState } from 'preact/hooks';
import { formatBytes } from '../../lib/compress';
import { fr } from '../../lib/i18n';
import type { Item } from './model';
import { Icon } from './icons';

type Props = {
  items: Item[];
  view: 'liste' | 'grille';
  format: string;
  busy: boolean;
  onMove: (id: string, dir: -1 | 1) => void;
  onReorder: (dragId: string, targetId: string) => void;
  onRemove: (id: string) => void;
  onDownload: (blob: Blob, name: string) => void;
  onCompare: (id: string) => void;
};

const badge: Record<Item['status'], string> = {
  attente: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300',
  conversion: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
  ok: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
  erreur: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
};

function dims(it: Item): string {
  const parts: string[] = [];
  if (it.outW && it.outH) parts.push(`${it.outW}×${it.outH} px`);
  else if (it.origW && it.origH) parts.push(`${it.origW}×${it.origH} px`);
  return parts.join(' · ');
}

export function FileList({ items, view, format, busy, onMove, onReorder, onRemove, onDownload, onCompare }: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  if (!items.length) return null;

  const card = (it: Item, idx: number) => {
    const isPdf = format === 'pdf';
    const canCompare = !!it.outBlob && (!!it.origPreview || !!it.preview);
    return (
      <li
        key={it.id}
        draggable={!busy}
        onDragStart={(e) => {
          if (busy) return;
          setDragId(it.id);
          e.dataTransfer!.effectAllowed = 'move';
        }}
        onDragEnd={() => {
          setDragId(null);
          setOverId(null);
        }}
        onDragOver={(e) => {
          if (busy || !dragId || dragId === it.id) return;
          e.preventDefault();
          setOverId(it.id);
        }}
        onDragLeave={() => setOverId((o) => (o === it.id ? null : o))}
        onDrop={(e) => {
          e.preventDefault();
          if (dragId) onReorder(dragId, it.id);
          setDragId(null);
          setOverId(null);
        }}
        class={`anim-pop rounded-2xl border p-2.5 transition dark:border-slate-700 sm:p-3 ${overId === it.id ? 'border-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-800' : ''} ${dragId === it.id ? 'opacity-40' : ''} ${it.status === 'erreur' ? 'border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/30' : it.status === 'ok' ? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-900 dark:bg-emerald-950/20' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800'}`}
      >
        <div class="flex items-center gap-3">
          <span class="w-6 shrink-0 cursor-grab text-center text-xs font-black text-slate-400" title="Glisser pour réordonner" aria-hidden="true">⋮⋮</span>
            {it.preview ?? it.origPreview ? (
              <img src={(it.preview ?? it.origPreview)!} alt="" class="h-12 w-12 shrink-0 rounded-xl object-cover shadow-sm" loading="lazy" />
            ) : (
            <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-[10px] font-black text-white dark:bg-slate-700">HEIC</div>
          )}
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-bold">{it.file.name}</p>
            <p class={`truncate text-xs ${it.status === 'erreur' ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
              {it.status === 'conversion' ? `${it.detail} (${it.pct}%)` : it.detail}
              {dims(it) && <span class="ml-1.5 text-slate-400">· {dims(it)}</span>}
              {it.gain && it.status === 'ok' && <span class="ml-1.5 rounded-full bg-emerald-100 px-1.5 py-0.5 font-bold text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">{it.gain}</span>}
            </p>
            {it.status === 'conversion' && (
              <div class="progress-track mt-1.5">
                <div class="progress-fill busy" style={{ width: `${it.pct}%` }} />
              </div>
            )}
          </div>
          <span class={`hidden shrink-0 rounded-full px-2 py-1 text-[11px] font-bold sm:inline-block ${badge[it.status]}`}>{fr.status[it.status]}</span>
          <div class="flex shrink-0 items-center gap-1">
            {isPdf && (
              <>
                <button onClick={() => onMove(it.id, -1)} disabled={busy} class="rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700" title="Monter (ordre des pages)" aria-label={`Monter ${it.file.name}`}>↑</button>
                <button onClick={() => onMove(it.id, 1)} disabled={busy} class="rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700" title="Descendre (ordre des pages)" aria-label={`Descendre ${it.file.name}`}>↓</button>
              </>
            )}
            {canCompare && (
              <button onClick={() => onCompare(it.id)} class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200" title="Comparer avant / après" aria-label={`Comparer ${it.file.name}`}>
                <Icon name="compare" cls="h-4 w-4" />
              </button>
            )}
            {it.status === 'ok' && it.outBlob && it.outName && (
                <button onClick={() => onDownload(it.outBlob!, it.outName!)} class="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-500">
                  <Icon name="down" cls="h-3.5 w-3.5" /> Télécharger
                </button>
            )}
            <button onClick={() => onRemove(it.id)} disabled={busy} class="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 dark:hover:bg-red-950" title="Retirer" aria-label={`Retirer ${it.file.name}`}>
              <Icon name="x" cls="h-4 w-4" />
            </button>
          </div>
        </div>
      </li>
    );
  };

  if (view === 'grille') {
    return (
      <ul class="stagger mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3" aria-label="Fichiers à convertir (grille)">
        {items.map((it, idx) => (
          <li
            key={it.id}
            draggable={!busy}
            onDragStart={(e) => {
              if (busy) return;
              setDragId(it.id);
              e.dataTransfer!.effectAllowed = 'move';
            }}
            onDragEnd={() => {
              setDragId(null);
              setOverId(null);
            }}
            onDragOver={(e) => {
              if (busy || !dragId || dragId === it.id) return;
              e.preventDefault();
              setOverId(it.id);
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragId) onReorder(dragId, it.id);
              setDragId(null);
              setOverId(null);
            }}
            class={`anim-pop overflow-hidden rounded-2xl border transition dark:border-slate-700 ${overId === it.id ? 'border-emerald-500 ring-2 ring-emerald-200' : ''} ${dragId === it.id ? 'opacity-40' : ''} ${it.status === 'erreur' ? 'border-red-200 dark:border-red-900' : it.status === 'ok' ? 'border-emerald-200 dark:border-emerald-900' : 'border-slate-200'}`}
          >
            <div class="relative aspect-square bg-slate-100 dark:bg-slate-700">
              {it.preview ?? it.origPreview ? (
                <img src={(it.preview ?? it.origPreview)!} alt="" class="h-full w-full object-cover" loading="lazy" />
              ) : (
                <div class="flex h-full w-full items-center justify-center text-xs font-black text-slate-400">HEIC</div>
              )}
              <span class={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-bold ${badge[it.status]}`}>{fr.status[it.status]}</span>
              <span class="absolute right-2 top-2 rounded-full bg-black/50 px-2 py-0.5 text-[11px] font-bold text-white">{idx + 1}</span>
              {it.status === 'conversion' && (
                <div class="absolute inset-x-0 bottom-0 p-2">
                  <div class="progress-track bg-white/60"><div class="progress-fill busy" style={{ width: `${it.pct}%` }} /></div>
                </div>
              )}
            </div>
            <div class="bg-white p-2 dark:bg-slate-800">
              <p class="truncate text-xs font-bold">{it.file.name}</p>
              <p class="truncate text-[11px] text-slate-500 dark:text-slate-400">{it.status === 'ok' && it.outBytes ? `${formatBytes(it.file.size)} → ${formatBytes(it.outBytes)}` : formatBytes(it.file.size)}</p>
              <div class="mt-1.5 flex gap-1">
                {it.status === 'ok' && it.outBlob && it.outName && (
                  <button onClick={() => onDownload(it.outBlob!, it.outName!)} class="flex-1 rounded-lg bg-emerald-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-emerald-500">Télécharger</button>
                )}
                {(it.origPreview || it.preview) && it.outBlob && (
                  <button onClick={() => onCompare(it.id)} class="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-500 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300" title="Comparer">⇔</button>
                )}
                <button onClick={() => onRemove(it.id)} disabled={busy} class="rounded-lg px-2 py-1 text-[11px] text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40" aria-label={`Retirer ${it.file.name}`}>✕</button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul class="stagger mt-4 space-y-2.5" aria-label="Fichiers à convertir">
      {items.map((it, idx) => card(it, idx))}
    </ul>
  );
}
