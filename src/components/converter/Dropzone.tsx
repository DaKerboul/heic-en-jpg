import { useRef, useState } from 'preact/hooks';
import { MAX_FILES } from '../../lib/constants';
import { fr } from '../../lib/i18n';
import { Icon } from './icons';

export function Dropzone({ onFiles, disabled }: { onFiles: (f: FileList | File[]) => void; disabled: boolean }) {
  const [active, setActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const counter = useRef(0);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Zone de dépôt : glissez vos images, cliquez pour choisir, ou collez avec Ctrl+V"
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !disabled) inputRef.current?.click();
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        if (disabled) return;
        counter.current++;
        setActive(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        counter.current = Math.max(0, counter.current - 1);
        if (counter.current === 0) setActive(false);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        counter.current = 0;
        setActive(false);
        if (!disabled && e.dataTransfer?.files?.length) onFiles(e.dataTransfer.files);
      }}
      onClick={() => {
        if (!disabled) inputRef.current?.click();
      }}
      class={`group relative cursor-pointer rounded-2xl border-2 border-dashed px-4 py-10 text-center transition-all dark:border-slate-600 sm:py-12 ${active ? 'dropzone-active anim-pulse-ring' : 'border-slate-300 bg-slate-50/60 hover:border-emerald-400 hover:bg-emerald-50/40 dark:bg-slate-800/60 dark:hover:border-emerald-500 dark:hover:bg-emerald-950/30'} ${disabled ? 'pointer-events-none opacity-60' : ''}`}
    >
      <div class={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl shadow-md transition ${active ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white group-hover:bg-emerald-600 dark:bg-emerald-600'}`}>
        <Icon name="upload" />
      </div>
      <p class="mt-3 text-lg font-extrabold tracking-tight">{active ? fr.dropActive : fr.dropTitle(MAX_FILES)}</p>
      <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">{fr.dropSub}</p>
      <p class="mt-3 inline-block rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white group-hover:bg-emerald-600 dark:bg-emerald-600 dark:group-hover:bg-emerald-500">{fr.dropCta}</p>
      <p class="mt-2 text-xs text-slate-400 dark:text-slate-500">{fr.dropPaste}</p>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".heic,.heif,.webp,.jpg,.jpeg,.png,.avif,.gif,.bmp,image/*"
        class="hidden"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => {
          const files = (e.target as HTMLInputElement).files;
          if (files?.length) onFiles(files);
          (e.target as HTMLInputElement).value = '';
        }}
      />
    </div>
  );
}
