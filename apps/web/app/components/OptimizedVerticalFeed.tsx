'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { OptimizedFeedItem } from './OptimizedFeedItem';
import { apiClient } from '../lib/api-client';
import { useMediaQuery } from '../hooks/use-media-query';
import type { PostWithCounts } from '../types/shared';

interface OptimizedVerticalFeedProps {
  initialPosts?: PostWithCounts[];
}

export function OptimizedVerticalFeed({ initialPosts = [] }: OptimizedVerticalFeedProps) {
  const [posts, setPosts] = useState<PostWithCounts[]>(initialPosts);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const isLoadingRef = useRef(false);
  const lastFetchTime = useRef(0);
  
  // Use media query for responsive behavior
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  // Memoized fetch function with debouncing
  const fetchMorePosts = useCallback(async () => {
    const now = Date.now();
    if (isLoadingRef.current || (now - lastFetchTime.current < 1000)) {
      return; // Prevent rapid consecutive calls
    }

    isLoadingRef.current = true;
    lastFetchTime.current = now;
    setLoading(true);
    setError(null);

    try {
      const data = await apiClient.getFeed(10, nextCursor || undefined);
      
      setPosts(prevPosts => {
        // Avoid duplicates
        const existingIds = new Set(prevPosts.map(p => p.id));
        const newPosts = data.data.filter((post: PostWithCounts) => !existingIds.has(post.id));
        return [...prevPosts, ...newPosts];
      });
      
      setNextCursor(data.pagination.nextCursor || null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch more posts';
      setError(errorMessage);
      console.error('Failed to fetch more posts:', err);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [nextCursor]);

  // Optimized intersection observer setup
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute('data-index') || '0', 10);
            setCurrentIndex(index);
          }
        });
      },
      {
        root: container,
        rootMargin: '0px',
        threshold: 0.5, // Item is considered active when 50% visible
      }
    );

    observerRef.current = observer;

    // Observe all current items
    const items = container.querySelectorAll('[data-index]');
    items.forEach(item => observer.observe(item));

    return () => {
      observer.disconnect();
    };
  }, [posts.length]);

  // Set up infinite scroll observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const loadMoreObserver = new IntersectionObserver(
      (entries) => {
        const lastEntry = entries[0];
        if (lastEntry.isIntersecting && !loading && nextCursor) {
          fetchMorePosts();
        }
      },
      {
        root: container,
        rootMargin: '200px', // Start loading 200px before reaching the end
        threshold: 0.1,
      }
    );

    // Observe the last few items for infinite scroll
    const items = container.querySelectorAll('[data-index]');
    const lastItems = Array.from(items).slice(-3); // Observe last 3 items
    lastItems.forEach(item => loadMoreObserver.observe(item));

    return () => {
      loadMoreObserver.disconnect();
    };
  }, [posts.length, loading, nextCursor, fetchMorePosts]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current) return;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          if (currentIndex > 0) {
            const prevItem = containerRef.current.querySelector(`[data-index="${currentIndex - 1}"]`);
            prevItem?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (currentIndex < posts.length - 1) {
            const nextItem = containerRef.current.querySelector(`[data-index="${currentIndex + 1}"]`);
            nextItem?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, posts.length]);

  // Memoized posts to render (virtualization for large lists)
  const postsToRender = useMemo(() => {
    // For mobile, render all posts for smooth scrolling
    if (isMobile) return posts;
    
    // For desktop, implement basic virtualization
    const bufferSize = 5;
    const startIndex = Math.max(0, currentIndex - bufferSize);
    const endIndex = Math.min(posts.length, currentIndex + bufferSize + 1);
    
    return posts.slice(startIndex, endIndex).map((post, index) => ({
      ...post,
      originalIndex: startIndex + index,
    }));
  }, [posts, currentIndex, isMobile]);

  // Retry function for error state
  const handleRetry = useCallback(() => {
    setError(null);
    fetchMorePosts();
  }, [fetchMorePosts]);

  if (posts.length === 0 && !loading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <h2 className="text-xl font-semibold mb-2">No posts available</h2>
          <p className="text-gray-400">Check back later for new content!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen bg-black">
      {/* Header - only show on mobile */}
      {isMobile && (
        <div className="absolute top-0 left-0 right-0 z-40 bg-gradient-to-b from-black/50 to-transparent">
          <div className="flex items-center justify-between p-4">
            <h1 className="text-white text-lg font-semibold">Mus.io</h1>
            <div className="flex items-center space-x-4">
              <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feed Container */}
      <div
        ref={containerRef}
        className="h-screen overflow-y-scroll snap-y snap-mandatory scrollbar-hide bg-black"
        style={{ 
          scrollbarWidth: 'none', 
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
        }}
      >
        {postsToRender.map((post, index) => {
          const actualIndex = 'originalIndex' in post ? post.originalIndex : index;
          return (
            <div
              key={post.id}
              data-index={actualIndex}
              className="h-screen snap-start snap-always flex-shrink-0 relative"
            >
              <OptimizedFeedItem
                post={post}
                isActive={actualIndex === currentIndex}
                preloadNext={actualIndex === currentIndex + 1}
              />
            </div>
          );
        })}

        {/* Loading indicator */}
        {loading && (
          <div className="h-20 flex items-center justify-center bg-black">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="h-20 flex items-center justify-center bg-black">
            <div className="text-center">
              <p className="text-red-400 text-sm mb-2">{error}</p>
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* End of content indicator */}
        {!nextCursor && posts.length > 0 && !loading && (
          <div className="h-20 flex items-center justify-center bg-black">
            <p className="text-white/60 text-sm">You've reached the end!</p>
          </div>
        )}
      </div>

      {/* Progress indicator */}
      <div className="fixed bottom-4 left-4 z-50">
        <div className="bg-black/50 backdrop-blur-sm rounded-full px-3 py-1 text-white text-sm">
          {currentIndex + 1} / {posts.length}
        </div>
      </div>

      {/* Navigation hints (desktop only) */}
      {!isMobile && posts.length > 1 && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="bg-black/50 backdrop-blur-sm rounded-lg p-2 text-white text-xs">
            <div>↑↓ Navigate</div>
          </div>
        </div>
      )}
    </div>
  );
}
