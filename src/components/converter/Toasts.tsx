import type { Toast } from './model';
import { Icon } from './icons';

export function Toasts({ toasts }: { toasts: Toast[] }) {
  return (
    <div class="pointer-events-none fixed bottom-4 left-1/2 z-50 flex w-full max-w-md -translate-x-1/2 flex-col gap-2 px-4" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} class={`anim-pop pointer-events-auto flex items-start gap-2 rounded-2xl px-4 py-3 text-sm font-semibold shadow-xl ${t.kind === 'ok' ? 'bg-emerald-600 text-white' : t.kind === 'erreur' ? 'bg-red-600 text-white' : 'bg-slate-900 text-white dark:bg-slate-700'}`} role={t.kind === 'erreur' ? 'alert' : 'status'}>
          <Icon name={t.kind === 'ok' ? 'check' : t.kind === 'erreur' ? 'alert' : 'image'} cls="mt-0.5 h-4 w-4 shrink-0" />
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}
