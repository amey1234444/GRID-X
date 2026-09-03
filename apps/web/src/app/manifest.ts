import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'GRID-X Partner',
    short_name: 'GRID-X',
    description:
      'OSWAR GRID-X partner application — jobs, drawings, material, inspections and payments for manufacturing partners.',
    start_url: '/partner',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#090909',
    theme_color: '#090909',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
