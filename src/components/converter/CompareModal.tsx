import { useState } from 'preact/hooks';
import { formatBytes } from '../../lib/compress';
import type { Item } from './model';
import { Icon } from './icons';

// Comparateur avant / après : curseur à glisser sur les deux aperçus.
export function CompareModal({ item, onClose }: { item: Item; onClose: () => void }) {
  const [pos, setPos] = useState(50);
  const before = item.origPreview;
  const after = item.preview;
  if (!before || !after) return null;

  return (
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label={`Comparaison ${item.file.name}`} onClick={onClose}>
      <div class="anim-pop w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
        <div class="flex items-center justify-between border-b border-slate-100 px-5 py-3 dark:border-slate-700">
          <p class="truncate text-sm font-extrabold">{item.file.name}</p>
          <button onClick={onClose} class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Fermer la comparaison">
            <Icon name="x" cls="h-5 w-5" />
          </button>
        </div>
        <div class="relative select-none overflow-hidden bg-slate-950" style={{ touchAction: 'none' }}>
          <img src={after} alt="Après conversion" class="block max-h-[60vh] w-full object-contain" draggable={false} />
          <div class="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
            <img src={before} alt="Avant conversion" class="block h-full max-h-[60vh] w-full object-contain" draggable={false} />
          </div>
          <div class="absolute inset-y-0" style={{ left: `${pos}%` }}>
            <div class="h-full w-0.5 -translate-x-1/2 bg-white shadow" />
            <div class="absolute left-0 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-900 shadow-xl">
              <Icon name="compare" cls="h-5 w-5" />
            </div>
          </div>
          <span class="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-bold text-white">Avant · {formatBytes(item.file.size)}</span>
          <span class="absolute right-3 top-3 rounded-full bg-emerald-600/90 px-2.5 py-1 text-[11px] font-bold text-white">Après · {item.outBytes ? formatBytes(item.outBytes) : ''}</span>
          <input
            type="range"
            min={0}
            max={100}
            value={pos}
            onInput={(e) => setPos(Number((e.target as HTMLInputElement).value))}
            class="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
            aria-label="Curseur de comparaison avant après"
          />
        </div>
        <p class="px-5 py-3 text-center text-xs text-slate-500 dark:text-slate-400">Glissez le curseur pour comparer l’original et le fichier converti.</p>
      </div>
    </div>
  );
}
