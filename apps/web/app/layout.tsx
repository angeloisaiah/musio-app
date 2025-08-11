import type { Metadata, Viewport } from 'next';
import './globals.css';
import type { ReactNode } from 'react';
import { ServiceWorkerProvider } from './components/ServiceWorkerProvider';

export const metadata: Metadata = {
  title: {
    default: 'Mus.io - Music Discovery & Sharing',
    template: '%s | Mus.io',
  },
  description: 'Discover, share, and enjoy music samples in a TikTok-style feed with rich metadata from Discogs and Spotify',
  keywords: ['music', 'samples', 'discovery', 'sharing', 'TikTok', 'feed', 'Discogs', 'Spotify'],
  authors: [{ name: 'Mus.io Team' }],
  creator: 'Mus.io',
  publisher: 'Mus.io',
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://musio.app',
    siteName: 'Mus.io',
    title: 'Mus.io - Music Discovery & Sharing',
    description: 'Discover, share, and enjoy music samples in a TikTok-style feed',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Mus.io - Music Discovery Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mus.io - Music Discovery & Sharing',
    description: 'Discover, share, and enjoy music samples in a TikTok-style feed',
    images: ['/og-image.png'],
    creator: '@musio_app',
  },
  manifest: '/manifest.json',
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'apple-mobile-web-app-title': 'Mus.io',
    'application-name': 'Mus.io',
    'msapplication-TileColor': '#000000',
    'theme-color': '#3B82F6',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#3B82F6' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        {/* PWA Icons */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        
        {/* Preload critical resources */}
        <link rel="preconnect" href="https://api.spotify.com" />
        <link rel="preconnect" href="https://api.discogs.com" />
        <link rel="preconnect" href="https://www.youtube.com" />
        
        {/* DNS prefetch for external resources */}
        <link rel="dns-prefetch" href="//i.scdn.co" />
        <link rel="dns-prefetch" href="//img.youtube.com" />
        
        {/* Optimization hints */}
        <meta name="format-detection" content="telephone=no" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        
        {/* Security headers */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-Frame-Options" content="DENY" />
        <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
        
        {/* Performance hints */}
        <meta name="google" content="notranslate" />
      </head>
      <body className="min-h-screen bg-black text-white overflow-x-hidden">
        <ServiceWorkerProvider>
          {children}
        </ServiceWorkerProvider>
      </body>
    </html>
  );
}
