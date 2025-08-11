'use client';

import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { useIntersectionObserver } from '../hooks/use-intersection-observer';
import { SocialActions } from './SocialActions';
import { Comments } from './Comments';
import type { PostWithCounts } from '@musio/shared';

interface OptimizedFeedItemProps {
  post: PostWithCounts;
  isActive: boolean;
  preloadNext?: boolean;
}

// Memoized component to prevent unnecessary re-renders
export const OptimizedFeedItem = memo(function OptimizedFeedItem({ 
  post, 
  isActive, 
  preloadNext 
}: OptimizedFeedItemProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [kenBurnsOffset, setKenBurnsOffset] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const kenBurnsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Use intersection observer to only load content when visible
  const [elementRef, isVisible] = useIntersectionObserver<HTMLDivElement>({
    threshold: 0.1,
    rootMargin: '100px', // Start loading 100px before element is visible
  });

  // Initialize volume from localStorage only once
  useEffect(() => {
    const savedVolume = localStorage.getItem('musio_volume');
    const savedMuted = localStorage.getItem('musio_muted');
    
    if (savedVolume) {
      const vol = parseFloat(savedVolume);
      if (!isNaN(vol) && vol >= 0 && vol <= 1) {
        setVolume(vol);
      }
    }
    
    if (savedMuted) {
      setIsMuted(savedMuted === 'true');
    }
  }, []);

  // Memoized volume update function
  const updateMediaVolume = useCallback((effectiveVolume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = effectiveVolume;
    }
    if (videoRef.current) {
      videoRef.current.volume = effectiveVolume;
    }
  }, []);

  // Update media volume when volume or mute state changes
  useEffect(() => {
    const effectiveVolume = isMuted ? 0 : volume;
    updateMediaVolume(effectiveVolume);
    
    // Save to localStorage
    localStorage.setItem('musio_volume', volume.toString());
    localStorage.setItem('musio_muted', isMuted.toString());
  }, [volume, isMuted, updateMediaVolume]);

  // Memoized play handler
  const handlePlay = useCallback(async () => {
    if (!isLoaded) return;
    
    try {
      if (post.video_url && videoRef.current) {
        await videoRef.current.play();
      } else if (audioRef.current) {
        await audioRef.current.play();
      }
      setIsPlaying(true);
    } catch (error) {
      console.warn('Failed to play media:', error);
    }
  }, [isLoaded, post.video_url]);

  // Memoized pause handler
  const handlePause = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
  }, []);

  // Handle autoplay when item becomes active
  useEffect(() => {
    if (isActive && isVisible) {
      handlePlay();
    } else {
      handlePause();
    }
  }, [isActive, isVisible, handlePlay, handlePause]);

  // Ken Burns effect animation - only when active and no video
  useEffect(() => {
    if (!post.video_url && isActive && isVisible) {
      kenBurnsIntervalRef.current = setInterval(() => {
        setKenBurnsOffset((prev) => (prev + 1) % 100);
      }, 100);
    } else {
      if (kenBurnsIntervalRef.current) {
        clearInterval(kenBurnsIntervalRef.current);
        kenBurnsIntervalRef.current = null;
      }
    }

    return () => {
      if (kenBurnsIntervalRef.current) {
        clearInterval(kenBurnsIntervalRef.current);
      }
    };
  }, [post.video_url, isActive, isVisible]);

  // Memoized time update handler
  const handleTimeUpdate = useCallback(() => {
    const media = videoRef.current || audioRef.current;
    if (media) {
      setCurrentTime(media.currentTime);
    }
  }, []);

  // Load media when visible or preload is requested
  useEffect(() => {
    if (isVisible || preloadNext) {
      setIsLoaded(true);
    }
  }, [isVisible, preloadNext]);

  // Memoized toggle functions
  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      handlePause();
    } else {
      handlePlay();
    }
  }, [isPlaying, handlePlay, handlePause]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  const handleVolumeChange = useCallback((newVolume: number) => {
    setVolume(newVolume);
    if (newVolume > 0) {
      setIsMuted(false);
    }
  }, []);

  // Memoized volume icon
  const VolumeIcon = useCallback(() => {
    const iconClass = "w-6 h-6";
    
    if (isMuted || volume === 0) {
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
        </svg>
      );
    }
    
    if (volume < 0.5) {
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M6.586 9H4a1 1 0 00-1 1v4a1 1 0 001 1h2.586l4.707 4.707C11.923 20.337 13 19.891 13 19V5c0-.891-1.077-1.337-1.707-.707L6.586 9z" />
        </svg>
      );
    }
    
    return (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m1.768-9.192a9 9 0 010 12.728M6.586 9H4a1 1 0 00-1 1v4a1 1 0 001 1h2.586l4.707 4.707C11.923 20.337 13 19.891 13 19V5c0-.891-1.077-1.337-1.707-.707L6.586 9z" />
      </svg>
    );
  }, [isMuted, volume]);

  const duration = post.duration_ms ? post.duration_ms / 1000 : 0;

  return (
    <div 
      ref={elementRef}
      className="relative h-full w-full bg-black overflow-hidden"
    >
      {/* Background Media - Only render when loaded */}
      {isLoaded && (
        <>
          {post.video_url ? (
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              loop
              playsInline
              muted={isMuted}
              preload={preloadNext ? 'metadata' : 'none'}
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => setIsPlaying(false)}
              onLoadedData={() => updateMediaVolume(isMuted ? 0 : volume)}
            >
              <source src={post.video_url} type="video/mp4" />
            </video>
          ) : (
            <div className="absolute inset-0 w-full h-full overflow-hidden">
              {post.cover_url && (
                <img
                  src={post.cover_url}
                  alt={post.title}
                  className="w-full h-full object-cover transition-transform duration-[20s] ease-linear"
                  style={{
                    transform: isActive
                      ? `scale(1.1) translate(${kenBurnsOffset * 0.1}%, ${kenBurnsOffset * 0.05}%)`
                      : 'scale(1.05)',
                  }}
                  loading={preloadNext ? 'eager' : 'lazy'}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
            </div>
          )}

          {/* Audio element for non-video samples */}
          {!post.video_url && post.preview_url && (
            <audio
              ref={audioRef}
              src={post.preview_url}
              preload={preloadNext ? 'metadata' : 'none'}
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => setIsPlaying(false)}
              onLoadedData={() => updateMediaVolume(isMuted ? 0 : volume)}
            />
          )}
        </>
      )}

      {/* Loading placeholder */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Content overlay - only render when loaded */}
      {isLoaded && (
        <>
          {/* Right Side Actions (TikTok Style) */}
          <div className="absolute right-4 bottom-20 z-30 flex flex-col items-center space-y-6">
            <SocialActions 
              postId={post.id}
              initialCounts={post.counts}
              initialStates={{
                isLikedByMe: post.isLikedByMe,
                isRepostedByMe: post.isRepostedByMe,
                isBookmarkedByMe: post.isBookmarkedByMe,
              }}
              onComment={() => setShowComments(true)}
              vertical={true}
            />
          </div>

          {/* Bottom Content */}
          <div className="absolute bottom-0 left-0 right-16 p-4 z-20">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                {post.user.avatar_url && (
                  <img
                    src={post.user.avatar_url}
                    alt={post.user.name || 'User'}
                    className="w-8 h-8 rounded-full border-2 border-white"
                    loading="lazy"
                  />
                )}
                <span className="text-white font-medium">
                  @{post.user.name || 'Unknown'}
                </span>
              </div>
              
              <h3 className="text-white text-lg font-semibold line-clamp-2">
                {post.title}
              </h3>
              
              {post.caption && (
                <p className="text-white/90 text-sm line-clamp-3">
                  {post.caption}
                </p>
              )}
              
              {post.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {post.tags.slice(0, 5).map((tag: string, index: number) => (
                    <span
                      key={index}
                      className="text-white/80 text-xs bg-black/20 backdrop-blur-sm px-2 py-1 rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Play/Pause Button */}
          <button
            onClick={togglePlayPause}
            className="absolute inset-0 z-10 flex items-center justify-center bg-black/0 hover:bg-black/10 transition-colors"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {!isPlaying && (
              <div className="w-16 h-16 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            )}
          </button>

          {/* Volume Control */}
          <div className="absolute top-4 right-4 z-30">
            <div className="relative">
              <button
                onClick={toggleMute}
                onMouseEnter={() => setShowVolumeSlider(true)}
                onMouseLeave={() => setShowVolumeSlider(false)}
                className="p-2 bg-black/50 backdrop-blur-sm rounded-full text-white hover:bg-black/70 transition-colors"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                <VolumeIcon />
              </button>
              
              {showVolumeSlider && (
                <div
                  className="absolute top-0 right-12 bg-black/70 backdrop-blur-sm rounded-lg p-2"
                  onMouseEnter={() => setShowVolumeSlider(true)}
                  onMouseLeave={() => setShowVolumeSlider(false)}
                >
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="w-20 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          {duration > 0 && (
            <div className="absolute bottom-16 left-4 right-20 z-20">
              <div className="bg-white/30 h-1 rounded-full overflow-hidden">
                <div
                  className="bg-white h-full transition-all duration-300"
                  style={{ width: `${(currentTime / duration) * 100}%` }}
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* Comments Modal */}
      {showComments && (
        <Comments
          postId={post.id}
          isOpen={showComments}
          onClose={() => setShowComments(false)}
        />
      )}
    </div>
  );
});
