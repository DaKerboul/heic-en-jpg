// URL publique du site — à ajuster au déploiement (utilisée pour canonical, OG, sitemap).
export const SITE_URL = 'https://heic-en-jpg.kerboul.me';
export const SITE_NAME = 'Convertisseur Local';
export const SITE_TAGLINE = 'HEIC & WebP → JPG / PDF, 100% dans votre navigateur';

export const NAV_LINKS = [
  { href: '/convertir-heic-en-jpg/', label: 'HEIC → JPG' },
  { href: '/convertir-webp-en-pdf/', label: 'WebP → PDF' },
  { href: '/reduire-photo-moins-2mo/', label: 'Réduire < 2 Mo' },
  { href: '/confidentialite/', label: 'Confidentialité' },
] as const;

export const ACCEPT_EXTENSIONS = ['.heic', '.heif', '.webp', '.jpg', '.jpeg', '.png', '.avif', '.gif', '.bmp'];
