'use client';

import { useEffect, useRef } from 'react';

interface ServiceWorkerProviderProps {
  children: React.ReactNode;
}

export function ServiceWorkerProvider({ children }: ServiceWorkerProviderProps) {
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const isRegistering = useRef(false);

  useEffect(() => {
    // Only register service worker in production and if supported
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      process.env.NODE_ENV !== 'production' ||
      isRegistering.current
    ) {
      return;
    }

    isRegistering.current = true;

    const registerServiceWorker = async () => {
      try {
        console.log('Registering service worker...');
        
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        registrationRef.current = registration;

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker is available
              console.log('New service worker available');
              
              // Notify user about update
              if (window.confirm('A new version is available. Reload to update?')) {
                window.location.reload();
              }
            }
          });
        });

        // Listen for controlling service worker changes
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          console.log('Service worker controller changed');
          window.location.reload();
        });

        console.log('Service worker registered successfully:', registration.scope);

        // Set up message channel for communication
        setupMessageChannel(registration);

        // Preload critical audio files
        await preloadCriticalAssets();

      } catch (error) {
        console.error('Service worker registration failed:', error);
      }
    };

    registerServiceWorker();

    // Cleanup
    return () => {
      isRegistering.current = false;
    };
  }, []);

  const setupMessageChannel = (registration: ServiceWorkerRegistration) => {
    const channel = new MessageChannel();
    
    // Listen for messages from service worker
    channel.port1.onmessage = (event) => {
      const { type, data } = event.data;
      
      switch (type) {
        case 'CACHE_STATS':
          console.log('Cache stats:', data);
          break;
        case 'CACHE_CLEARED':
          console.log('Cache cleared:', data.cacheName);
          break;
        case 'AUDIO_PRELOADED':
          console.log('Audio preloaded:', data.urls);
          break;
        default:
          console.log('Service worker message:', event.data);
      }
    };

    // Send port to service worker
    if (registration.active) {
      registration.active.postMessage(
        { type: 'INIT_PORT' },
        [channel.port2]
      );
    }

    // Store channel for later use
    (window as any).swChannel = channel.port1;
  };

  const preloadCriticalAssets = async () => {
    if (!registrationRef.current?.active) return;

    try {
      // Get initial feed data to preload audio
      const response = await fetch('/api/feed?limit=5');
      if (response.ok) {
        const data = await response.json();
        const audioUrls = data.items
          .map((item: any) => item.preview_url)
          .filter(Boolean);

        if (audioUrls.length > 0) {
          // Ask service worker to preload audio
          const channel = (window as any).swChannel;
          if (channel) {
            channel.postMessage({
              type: 'PRELOAD_AUDIO',
              data: { urls: audioUrls }
            });
          }
        }
      }
    } catch (error) {
      console.warn('Failed to preload critical assets:', error);
    }
  };

  return <>{children}</>;
}

// Utility functions for interacting with service worker
export const serviceWorkerUtils = {
  // Get cache statistics
  getCacheStats: (): Promise<any> => {
    return new Promise((resolve) => {
      const channel = (window as any).swChannel;
      if (!channel) {
        resolve({});
        return;
      }

      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event) => {
        if (event.data.type === 'CACHE_STATS') {
          resolve(event.data.data);
        }
      };

      channel.postMessage(
        { type: 'CACHE_STATS' },
        [messageChannel.port2]
      );
    });
  },

  // Clear specific cache
  clearCache: (cacheName?: string): Promise<void> => {
    return new Promise((resolve) => {
      const channel = (window as any).swChannel;
      if (!channel) {
        resolve();
        return;
      }

      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event) => {
        if (event.data.type === 'CACHE_CLEARED') {
          resolve();
        }
      };

      channel.postMessage(
        { type: 'CLEAR_CACHE', data: { cacheName } },
        [messageChannel.port2]
      );
    });
  },

  // Preload audio files
  preloadAudio: (urls: string[]): Promise<void> => {
    return new Promise((resolve) => {
      const channel = (window as any).swChannel;
      if (!channel) {
        resolve();
        return;
      }

      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event) => {
        if (event.data.type === 'AUDIO_PRELOADED') {
          resolve();
        }
      };

      channel.postMessage(
        { type: 'PRELOAD_AUDIO', data: { urls } },
        [messageChannel.port2]
      );
    });
  },

  // Check if service worker is supported and active
  isSupported: (): boolean => {
    return typeof window !== 'undefined' && 'serviceWorker' in navigator;
  },

  // Check if app is running offline
  isOffline: (): boolean => {
    return typeof navigator !== 'undefined' && !navigator.onLine;
  },

  // Register for background sync
  registerBackgroundSync: async (tag: string): Promise<void> => {
    if (!('serviceWorker' in navigator) || !('sync' in window.ServiceWorkerRegistration.prototype)) {
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await (registration as any).sync.register(tag);
    } catch (error) {
      console.warn('Background sync registration failed:', error);
    }
  },
};
