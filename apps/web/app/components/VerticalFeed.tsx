'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { FeedItem } from './FeedItem';

export interface FeedSample {
  id: string;
  title: string;
  artist_name: string | null;
  user: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  duration_ms: number | null;
  source_type: string;
  youtube_id: string | null;
  _count: {
    likes: number;
    comments: number;
    shares: number;
  };
  tags: Array<{
    id: string;
    name: string;
    normalized: string;
    created_at: string;
  }>;
  media_files: Array<{
    id: string;
    post_id: string;
    url: string;
    type: string;
    mime: string;
    size?: number;
    duration_ms?: number;
  }>;
  cover_url: string | null;
  video_url: string | null;
}

interface VerticalFeedProps {
  initialSamples?: FeedSample[];
}

export function VerticalFeed({ initialSamples = [] }: VerticalFeedProps) {
  const [samples, setSamples] = useState<FeedSample[]>(initialSamples);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Fetch more samples
  const fetchMoreSamples = useCallback(async () => {
    if (loading) return;

    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const url = new URL(`${apiUrl}/api/feed`);
      url.searchParams.set('limit', '10');
      if (nextCursor) {
        url.searchParams.set('cursor', nextCursor);
      }

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      const data = await response.json();

              setSamples((prev) => [...prev, ...data.data]);
              setNextCursor(data.pagination.nextCursor);
    } catch (error) {
      console.error('Failed to fetch more samples:', error);
    } finally {
      setLoading(false);
    }
  }, [loading, nextCursor]);

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute('data-index') || '0', 10);
            setCurrentIndex(index);

            // Preload next samples when approaching the end
            if (index >= samples.length - 3 && nextCursor && !loading) {
              fetchMoreSamples();
            }
          }
        });
      },
      {
        root: containerRef.current,
        threshold: 0.5,
        rootMargin: '0px',
      },
    );

    observerRef.current = observer;

    return () => {
      observer.disconnect();
    };
  }, [samples.length, nextCursor, loading, fetchMoreSamples]);

  // Observe sample items
  useEffect(() => {
    if (!observerRef.current) return;

    const observer = observerRef.current;
    const items = containerRef.current?.querySelectorAll('[data-index]');

    items?.forEach((item) => {
      observer.observe(item);
    });

    return () => {
      items?.forEach((item) => {
        observer.unobserve(item);
      });
    };
  }, [samples]);

  // Handle scroll with keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' && currentIndex < samples.length - 1) {
        const nextItem = containerRef.current?.querySelector(`[data-index="${currentIndex + 1}"]`);
        nextItem?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (e.key === 'ArrowUp' && currentIndex > 0) {
        const prevItem = containerRef.current?.querySelector(`[data-index="${currentIndex - 1}"]`);
        prevItem?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, samples.length]);

  // Initial fetch if no samples provided
  useEffect(() => {
    if (samples.length === 0) {
      fetchMoreSamples();
    }
  }, [samples.length, fetchMoreSamples]);

  if (samples.length === 0 && loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Loading feed...</p>
        </div>
      </div>
    );
  }

  if (samples.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <p className="text-xl mb-2">No samples available</p>
          <p className="text-gray-400">Check back later for new content!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Top Navigation */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-black/20 backdrop-blur-sm">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-4">
            <h1 className="text-white font-bold text-xl">Mus.io</h1>
          </div>
          <div className="flex items-center space-x-4 text-white">
            <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="m7 7 5 5 5-5"
                />
              </svg>
            </button>
            <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </button>
            <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            </button>
            <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Feed Container */}
      <div
        ref={containerRef}
        className="h-screen overflow-y-scroll snap-y snap-mandatory scrollbar-hide bg-black"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {samples.map((sample, index) => (
          <div
            key={sample.id}
            data-index={index}
            className="h-screen snap-start snap-always flex-shrink-0 relative"
          >
            <FeedItem
              sample={sample}
              isActive={index === currentIndex}
              preloadNext={index === currentIndex + 1}
            />
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="h-20 flex items-center justify-center bg-black">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Progress indicator */}
      <div className="fixed bottom-4 left-4 z-50">
        <div className="bg-black/50 backdrop-blur-sm rounded-full px-3 py-1 text-white text-sm">
          {currentIndex + 1} / {samples.length}
        </div>
      </div>
    </div>
  );
}
