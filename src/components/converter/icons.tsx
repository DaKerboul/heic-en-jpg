const PATHS: Record<string, string> = {
  upload: 'M12 16V4m0 0l-4 4m4-4l4 4M4 20v2a2 2 0 002 2h12a2 2 0 002-2v-2',
  image: 'M4 16l4-4 4-4m4 8l3-3 3-3m-9-2V6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2z',
  check: 'M5 13l4 4L19 7',
  alert: 'M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z',
  x: 'M6 18L18 6M6 6l12 12',
  down: 'M12 4v12m0 0l-4-4m4 4l4-4M4 20h16',
  lock: 'M7 11V7a5 5 0 0110 0v4m-11 0h12a1 1 0 011 1v7a1 1 0 01-1 1H6a1 1 0 01-1-1v-7a1 1 0 011-1z',
  zip: 'M7 3h7l5 5v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  list: 'M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01',
  compare: 'M8 3v18M16 3v18M3 8h5M3 16h5M16 8h5M16 16h5',
  stop: 'M6 6h12v12H6z',
  wifi: 'M2 9a15 15 0 0120 0M5.5 12.5a10 10 0 0113 0M9 16a5 5 0 016 0M12 19.5h.01',
  wifiOff: 'M2 9a15 15 0 015-3M12 4c3 0 6 1 8 3M5.5 12.5a10 10 0 014-2.5M9 16a5 5 0 015-1M12 19.5h.01M3 3l18 18',
  sun: 'M12 17a5 5 0 100-10 5 5 0 000 10zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z',
};

export function Icon({ name, cls = 'h-5 w-5' }: { name: keyof typeof PATHS | string; cls?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={cls} aria-hidden="true">
      <path d={PATHS[name] ?? PATHS.image} />
    </svg>
  );
}
