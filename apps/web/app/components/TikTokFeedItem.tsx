'use client';

import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { useIntersectionObserver } from '../hooks/use-intersection-observer';
import { SocialActions } from './SocialActions';
import { Comments } from './Comments';
import { YouTubePlayer } from './YouTubePlayer';
import { MetadataDisplay } from './MetadataDisplay';
import { formatDuration, formatNumber } from '../types/shared';
import type { PostWithCounts } from '../types/shared';

interface TikTokFeedItemProps {
  post: PostWithCounts;
  isActive: boolean;
  preloadNext?: boolean;
  volume: number;
  isMuted: boolean;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
}

export const TikTokFeedItem = memo(function TikTokFeedItem({ 
  post, 
  isActive, 
  preloadNext,
  volume,
  isMuted,
  onVolumeChange,
  onMuteToggle
}: TikTokFeedItemProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [kenBurnsOffset, setKenBurnsOffset] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [metadata, setMetadata] = useState<any>(null);
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const youtubePlayerRef = useRef<any>(null);
  const kenBurnsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Use intersection observer for lazy loading
  const [elementRef, isVisible] = useIntersectionObserver<HTMLDivElement>({
    threshold: 0.1,
    rootMargin: '100px',
  });

  // Load metadata when component mounts
  useEffect(() => {
    if (post.artist_name && !metadata && !loadingMetadata) {
      loadMetadata();
    }
  }, [post.artist_name]);

  const loadMetadata = async () => {
    setLoadingMetadata(true);
    try {
      // Simulate metadata loading from Discogs/Spotify APIs
      // In real implementation, this would call your backend API
      const response = await fetch(`/api/metadata?artist=${encodeURIComponent(post.artist_name || '')}&title=${encodeURIComponent(post.title)}`);
      if (response.ok) {
        const data = await response.json();
        setMetadata(data);
      }
    } catch (error) {
      console.warn('Failed to load metadata:', error);
    } finally {
      setLoadingMetadata(false);
    }
  };

  // Update media volume when volume or mute state changes
  useEffect(() => {
    const effectiveVolume = isMuted ? 0 : volume;
    
    if (audioRef.current) {
      audioRef.current.volume = effectiveVolume;
    }
    
    if (videoRef.current) {
      videoRef.current.volume = effectiveVolume;
    }

    if (youtubePlayerRef.current && youtubePlayerRef.current.setVolume) {
      youtubePlayerRef.current.setVolume(effectiveVolume * 100);
    }
  }, [volume, isMuted]);

  // Handle autoplay when item becomes active
  useEffect(() => {
    if (isActive && isVisible) {
      handlePlay();
    } else {
      handlePause();
    }
  }, [isActive, isVisible]);

  // Ken Burns effect for static images
  useEffect(() => {
    if (!post.video_url && !post.youtube_id && isActive && isVisible) {
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
  }, [post.video_url, post.youtube_id, isActive, isVisible]);

  // Load content when visible or preload is requested
  useEffect(() => {
    if (isVisible || preloadNext) {
      setIsLoaded(true);
    }
  }, [isVisible, preloadNext]);

  const handlePlay = useCallback(async () => {
    if (!isLoaded) return;
    
    try {
      if (post.youtube_id && youtubePlayerRef.current) {
        await youtubePlayerRef.current.playVideo();
      } else if (post.video_url && videoRef.current) {
        await videoRef.current.play();
      } else if (audioRef.current) {
        await audioRef.current.play();
      }
      setIsPlaying(true);
    } catch (error) {
      console.warn('Failed to play media:', error);
    }
  }, [isLoaded, post.youtube_id, post.video_url]);

  const handlePause = useCallback(() => {
    if (post.youtube_id && youtubePlayerRef.current) {
      youtubePlayerRef.current.pauseVideo();
    } else if (videoRef.current) {
      videoRef.current.pause();
    } else if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
  }, [post.youtube_id]);

  const handleTimeUpdate = useCallback(() => {
    let current = 0;
    if (post.youtube_id && youtubePlayerRef.current) {
      current = youtubePlayerRef.current.getCurrentTime() || 0;
    } else {
      const media = videoRef.current || audioRef.current;
      if (media) {
        current = media.currentTime;
      }
    }
    setCurrentTime(current);
  }, [post.youtube_id]);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      handlePause();
    } else {
      handlePlay();
    }
  }, [isPlaying, handlePlay, handlePause]);

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
          {post.youtube_id ? (
            <YouTubePlayer
              videoId={post.youtube_id}
              onReady={(player) => {
                youtubePlayerRef.current = player;
                player.setVolume(isMuted ? 0 : volume * 100);
              }}
              onStateChange={(event) => {
                setIsPlaying(event.data === 1); // YT.PlayerState.PLAYING
              }}
              onTimeUpdate={handleTimeUpdate}
              autoplay={isActive}
              muted={isMuted}
            />
          ) : post.video_url ? (
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              loop
              playsInline
              muted={isMuted}
              preload={preloadNext ? 'metadata' : 'none'}
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => setIsPlaying(false)}
              onLoadedData={() => {
                if (videoRef.current) {
                  videoRef.current.volume = isMuted ? 0 : volume;
                }
              }}
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
          {!post.video_url && !post.youtube_id && (() => {
            const previewFile = post.media_files?.find(file => file.type === 'preview');
            return previewFile && (
              <audio
                ref={audioRef}
                src={previewFile.url}
                preload={preloadNext ? 'metadata' : 'none'}
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => setIsPlaying(false)}
                onLoadedData={() => {
                  if (audioRef.current) {
                    audioRef.current.volume = isMuted ? 0 : volume;
                  }
                }}
              />
            );
          })()}
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
              initialCounts={post._count}
              initialStates={{
                isLikedByMe: false, // TODO: Implement user state
                isRepostedByMe: false,
                isBookmarkedByMe: false,
              }}
              onComment={() => setShowComments(true)}
              vertical={true}
            />
          </div>

          {/* Bottom Content */}
          <div className="absolute bottom-0 left-0 right-16 p-4 z-20 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
            <div className="space-y-3">
              {/* User Info */}
              {post.user && (
                <div className="flex items-center space-x-3">
                  {post.user.avatar_url && (
                    <img
                      src={post.user.avatar_url}
                      alt={post.user.username || 'User'}
                      className="w-10 h-10 rounded-full border-2 border-white"
                      loading="lazy"
                    />
                  )}
                  <div>
                    <div className="text-white font-semibold text-sm">
                      @{post.user.username || 'Unknown'}
                    </div>
                    {post.artist_name && (
                      <div className="text-white/80 text-xs">
                        {post.artist_name}
                      </div>
                    )}
                  </div>
                  <button className="ml-auto px-4 py-1 bg-white text-black text-sm font-semibold rounded-full hover:bg-gray-200 transition-colors">
                    Follow
                  </button>
                </div>
              )}
              
              {/* Title and Caption */}
              <div>
                <h3 className="text-white text-base font-semibold line-clamp-2 mb-1">
                  {post.title}
                </h3>
                
                {post.caption && (
                  <p className="text-white/90 text-sm line-clamp-2 mb-2">
                    {post.caption}
                  </p>
                )}
              </div>

              {/* Metadata Display */}
              {metadata && (
                <MetadataDisplay 
                  metadata={metadata}
                  loading={loadingMetadata}
                />
              )}
              
              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {post.tags.slice(0, 5).map((tag, index) => (
                    <span
                      key={tag.id}
                      className="text-white/80 text-xs bg-black/30 backdrop-blur-sm px-2 py-1 rounded-full hover:bg-black/50 transition-colors cursor-pointer"
                    >
                      #{tag.name}
                    </span>
                  ))}
                  {post.tags.length > 5 && (
                    <span className="text-white/60 text-xs">
                      +{post.tags.length - 5} more
                    </span>
                  )}
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center space-x-4 text-white/80 text-xs">
                {post.duration_ms && (
                  <span>{formatDuration(post.duration_ms)}</span>
                )}
                {post.bpm && (
                  <span>{post.bpm} BPM</span>
                )}
                {post.key && (
                  <span>Key: {post.key}</span>
                )}
                <span>{formatNumber(post._count.shares)} shares</span>
              </div>
            </div>
          </div>

          {/* Play/Pause Button */}
          <button
            onClick={togglePlayPause}
            className="absolute inset-0 z-10 flex items-center justify-center bg-transparent"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {!isPlaying && (
              <div className="w-16 h-16 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/70 transition-colors">
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
                onClick={onMuteToggle}
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
                    onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                    className="w-20 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          {duration > 0 && (
            <div className="absolute bottom-20 left-4 right-20 z-20">
              <div className="bg-white/20 h-1 rounded-full overflow-hidden">
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
