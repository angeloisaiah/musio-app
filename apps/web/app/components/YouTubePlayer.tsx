'use client';

import { useEffect, useRef, useState } from 'react';

// YouTube Player API types
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YouTubePlayerProps {
  videoId: string;
  onReady?: (player: any) => void;
  onStateChange?: (event: any) => void;
  onTimeUpdate?: () => void;
  autoplay?: boolean;
  muted?: boolean;
  width?: number;
  height?: number;
  className?: string;
}

export function YouTubePlayer({
  videoId,
  onReady,
  onStateChange,
  onTimeUpdate,
  autoplay = false,
  muted = false,
  width = 640,
  height = 360,
  className = '',
}: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const timeUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isAPILoaded, setIsAPILoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load YouTube API
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      setIsAPILoaded(true);
      return;
    }

    // Create script tag for YouTube API
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    
    // Set up API ready callback
    window.onYouTubeIframeAPIReady = () => {
      setIsAPILoaded(true);
    };
    
    document.head.appendChild(script);

    return () => {
      // Cleanup
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  // Initialize player when API is loaded
  useEffect(() => {
    if (!isAPILoaded || !containerRef.current || !videoId) return;

    // Clear any existing player
    if (playerRef.current) {
      try {
        playerRef.current.destroy();
      } catch (e) {
        console.warn('Error destroying YouTube player:', e);
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      playerRef.current = new window.YT.Player(containerRef.current, {
        width,
        height,
        videoId,
        playerVars: {
          // Player parameters for TikTok-like experience
          autoplay: autoplay ? 1 : 0,
          mute: muted ? 1 : 0,
          controls: 0, // Hide controls for TikTok-like experience
          disablekb: 1, // Disable keyboard controls
          enablejsapi: 1, // Enable JS API
          fs: 0, // Disable fullscreen button
          iv_load_policy: 3, // Hide video annotations
          modestbranding: 1, // Reduce YouTube branding
          playsinline: 1, // Play inline on mobile
          rel: 0, // Don't show related videos at end
          showinfo: 0, // Hide video title and uploader
          start: 0, // Start from beginning
          loop: 1, // Loop the video
          playlist: videoId, // Required for looping
          cc_load_policy: 0, // Hide closed captions
          color: 'white', // Progress bar color
          origin: window.location.origin, // Required for security
        },
        events: {
          onReady: (event: any) => {
            setIsLoading(false);
            
            // Set initial volume if muted
            if (muted) {
              event.target.mute();
            }
            
            // Start time update interval
            if (onTimeUpdate) {
              timeUpdateIntervalRef.current = setInterval(() => {
                onTimeUpdate();
              }, 100);
            }
            
            if (onReady) {
              onReady(event.target);
            }
          },
          onStateChange: (event: any) => {
            if (onStateChange) {
              onStateChange(event);
            }

            // Handle time updates based on player state
            if (event.data === window.YT.PlayerState.PLAYING) {
              if (onTimeUpdate && !timeUpdateIntervalRef.current) {
                timeUpdateIntervalRef.current = setInterval(() => {
                  onTimeUpdate();
                }, 100);
              }
            } else {
              if (timeUpdateIntervalRef.current) {
                clearInterval(timeUpdateIntervalRef.current);
                timeUpdateIntervalRef.current = null;
              }
            }
          },
          onError: (event: any) => {
            setIsLoading(false);
            const errorMessages: { [key: number]: string } = {
              2: 'Invalid video ID',
              5: 'HTML5 player error',
              100: 'Video not found or private',
              101: 'Video not allowed to be embedded',
              150: 'Video not allowed to be embedded',
            };
            
            const errorMessage = errorMessages[event.data] || `YouTube error: ${event.data}`;
            setError(errorMessage);
            console.error('YouTube player error:', errorMessage, event);
          },
        },
      });
    } catch (err) {
      setIsLoading(false);
      setError('Failed to initialize YouTube player');
      console.error('YouTube player initialization error:', err);
    }

    // Cleanup function
    return () => {
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current);
        timeUpdateIntervalRef.current = null;
      }
      
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          console.warn('Error destroying YouTube player:', e);
        }
        playerRef.current = null;
      }
    };
  }, [isAPILoaded, videoId, autoplay, muted, width, height, onReady, onStateChange, onTimeUpdate]);

  // Update mute state when prop changes
  useEffect(() => {
    if (playerRef.current && playerRef.current.isMuted) {
      try {
        if (muted && !playerRef.current.isMuted()) {
          playerRef.current.mute();
        } else if (!muted && playerRef.current.isMuted()) {
          playerRef.current.unMute();
        }
      } catch (e) {
        console.warn('Error updating mute state:', e);
      }
    }
  }, [muted]);

  // Expose player methods via ref
  useEffect(() => {
    if (playerRef.current && onReady) {
      const player = playerRef.current;
      
      // Add custom methods for easier control
      player.isReady = () => player.getPlayerState() !== -1;
      player.isPlaying = () => player.getPlayerState() === window.YT?.PlayerState?.PLAYING;
      player.isPaused = () => player.getPlayerState() === window.YT?.PlayerState?.PAUSED;
      
      // Safe method wrappers
      const originalPlay = player.playVideo;
      player.playVideo = () => {
        try {
          return originalPlay.call(player);
        } catch (e) {
          console.warn('Error playing YouTube video:', e);
        }
      };
      
      const originalPause = player.pauseVideo;
      player.pauseVideo = () => {
        try {
          return originalPause.call(player);
        } catch (e) {
          console.warn('Error pausing YouTube video:', e);
        }
      };
    }
  }, [isAPILoaded, onReady]);

  if (!isAPILoaded) {
    return (
      <div className={`flex items-center justify-center bg-gray-900 ${className}`}>
        <div className="text-center text-white">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm">Loading YouTube...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-900 ${className}`}>
        <div className="text-center text-white p-4">
          <svg className="w-12 h-12 text-red-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className="text-sm text-red-400">{error}</p>
          <p className="text-xs text-gray-400 mt-1">Video unavailable</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative bg-black ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
          <div className="text-center text-white">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm">Loading video...</p>
          </div>
        </div>
      )}
      
      <div 
        ref={containerRef}
        className="w-full h-full"
        style={{ 
          minWidth: width, 
          minHeight: height,
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  );
}
