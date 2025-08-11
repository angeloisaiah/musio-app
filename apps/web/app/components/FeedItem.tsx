'use client';

import { useState, useRef, useEffect } from 'react';
import { FeedSample } from './VerticalFeed';
import { SocialActions } from './SocialActions';
import { Comments } from './Comments';

interface FeedItemProps {
  sample: FeedSample;
  isActive: boolean;
  preloadNext?: boolean;
}

export function FeedItem({ sample, isActive, preloadNext }: FeedItemProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [kenBurnsOffset, setKenBurnsOffset] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Initialize volume from localStorage
  useEffect(() => {
    const savedVolume = localStorage.getItem('musio_volume');
    const savedMuted = localStorage.getItem('musio_muted');
    
    if (savedVolume) {
      const vol = parseFloat(savedVolume);
      setVolume(vol);
    }
    
    if (savedMuted) {
      setIsMuted(savedMuted === 'true');
    }
  }, []);

  // Update media volume when volume or mute state changes
  useEffect(() => {
    const effectiveVolume = isMuted ? 0 : volume;
    
    if (audioRef.current) {
      audioRef.current.volume = effectiveVolume;
    }
    
    if (videoRef.current) {
      videoRef.current.volume = effectiveVolume;
    }
  }, [volume, isMuted]);

  // Handle autoplay when item becomes active
  useEffect(() => {
    if (isActive) {
      handlePlay();
    } else {
      handlePause();
    }
  }, [isActive]);

  // Ken Burns effect animation
  useEffect(() => {
    if (!sample.video_url && isActive) {
      const interval = setInterval(() => {
        setKenBurnsOffset((prev) => (prev + 1) % 100);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [sample.video_url, isActive]);

  // Preload media for next item
  useEffect(() => {
    if (preloadNext) {
      if (sample.video_url && videoRef.current) {
        videoRef.current.load();
      } else if (sample.preview_url && audioRef.current) {
        audioRef.current.load();
      }
    }
  }, [preloadNext, sample.video_url, sample.preview_url]);

  const handlePlay = async () => {
    try {
      if (sample.video_url && videoRef.current) {
        await videoRef.current.play();
        setIsPlaying(true);
      } else if (sample.preview_url && audioRef.current) {
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Playback error:', error);
    }
  };

  const handlePause = () => {
    if (sample.video_url && videoRef.current) {
      videoRef.current.pause();
    } else if (sample.preview_url && audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
  };

  const handleTimeUpdate = () => {
    if (sample.video_url && videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    } else if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    localStorage.setItem('musio_volume', newVolume.toString());
    
    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
      localStorage.setItem('musio_muted', 'false');
    }
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    localStorage.setItem('musio_muted', newMuted.toString());
  };

  const getVolumeIcon = () => {
    if (isMuted || volume === 0) {
      return (
        <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
      );
    } else if (volume < 0.3) {
      return (
        <path d="M7 9v6h4l5 5V4l-5 5H7z"/>
      );
    } else if (volume < 0.7) {
      return (
        <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/>
      );
    } else {
      return (
        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
      );
    }
  };

  const duration = sample.duration_ms ? sample.duration_ms / 1000 : 0;

  return (
    <div className="relative h-full w-full bg-black overflow-hidden">
      {/* Background Media */}
      {sample.video_url ? (
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          loop
          playsInline
          preload={preloadNext ? 'metadata' : 'none'}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setIsPlaying(false)}
        >
          <source src={sample.video_url} type="video/mp4" />
        </video>
      ) : (
        <div className="absolute inset-0 w-full h-full overflow-hidden">
          {sample.cover_url && (
            <img
              src={sample.cover_url}
              alt={sample.title}
              className="w-full h-full object-cover transition-transform duration-[20s] ease-linear"
              style={{
                transform: isActive
                  ? `scale(1.1) translate(${kenBurnsOffset * 0.1}%, ${kenBurnsOffset * 0.05}%)`
                  : 'scale(1.05)',
              }}
            />
          )}
          {/* Gradient overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
        </div>
      )}

      {/* Audio element for non-video samples */}
      {!sample.video_url && sample.preview_url && (
        <audio
          ref={audioRef}
          src={sample.preview_url}
          preload={preloadNext ? 'metadata' : 'none'}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setIsPlaying(false)}
        />
      )}

      {/* Right Side Actions (TikTok Style) */}
      <div className="absolute right-4 bottom-20 z-30 flex flex-col items-center space-y-6">
        <SocialActions
          postId={sample.id}
          initialCounts={sample.counts}
          initialStates={{
            isLikedByMe: sample.isLikedByMe,
            isRepostedByMe: sample.isRepostedByMe,
            isBookmarkedByMe: sample.isBookmarkedByMe,
          }}
          onComment={() => setShowComments(true)}
          vertical={true}
        />
      </div>

      {/* Bottom Content */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-4 pb-safe">
        {/* User Info */}
        <div className="flex items-center space-x-3 mb-3">
          <img
            src={sample.user.avatar_url || '/default-avatar.png'}
            alt={sample.user.name || 'User'}
            className="w-10 h-10 rounded-full border-2 border-white"
          />
          <div>
            <h3 className="text-white font-semibold">{sample.user.name || 'Unknown User'}</h3>
            {sample.source_type === 'youtube' && (
              <p className="text-gray-300 text-sm">via YouTube</p>
            )}
          </div>
        </div>

        {/* Track Info */}
        <div className="mb-4">
          <h2 className="text-white text-lg font-bold mb-1 line-clamp-2">{sample.title}</h2>
          {sample.artist_name && (
            <p className="text-gray-300 text-sm mb-2">by {sample.artist_name}</p>
          )}

          {/* Tags */}
          {sample.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {sample.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-white/20 backdrop-blur-sm text-white text-xs rounded-full"
                >
                  #{tag}
                </span>
              ))}
              {sample.tags.length > 3 && (
                <span className="px-2 py-1 bg-white/20 backdrop-blur-sm text-white text-xs rounded-full">
                  +{sample.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Waveform and Progress */}
        <div className="mb-4">
          {/* Progress Bar */}
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-white text-xs font-mono">{formatTime(currentTime)}</span>
            <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-100"
                style={{
                  width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%',
                }}
              />
            </div>
            <span className="text-white text-xs font-mono">{formatTime(duration)}</span>
          </div>

          {/* Simple Waveform Visualization */}
          {sample.waveform_url && (
            <div className="h-12 flex items-end justify-center gap-0.5 px-2 bg-black/20 backdrop-blur-sm rounded">
              {Array.from({ length: 60 }, (_, i) => (
                <div
                  key={i}
                  className="bg-white/60 w-1 rounded-t transition-all duration-100"
                  style={{
                    height: `${Math.random() * 80 + 20}%`,
                    opacity: duration > 0 && (currentTime / duration) * 60 > i ? 1 : 0.3,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center space-x-4">
          {/* Volume Control */}
          <div className="relative">
            <button
              onClick={toggleMute}
              onMouseEnter={() => setShowVolumeSlider(true)}
              onMouseLeave={() => setShowVolumeSlider(false)}
              className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                {getVolumeIcon()}
              </svg>
            </button>
            
            {/* Volume Slider */}
            {showVolumeSlider && (
              <div 
                className="absolute bottom-12 left-1/2 transform -translate-x-1/2 bg-black/80 backdrop-blur-sm rounded-lg p-3 min-w-[120px]"
                onMouseEnter={() => setShowVolumeSlider(true)}
                onMouseLeave={() => setShowVolumeSlider(false)}
              >
                <div className="flex flex-col items-center space-y-2">
                  <span className="text-white text-xs font-mono">
                    {Math.round(volume * 100)}%
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="w-20 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                    style={{
                      background: `linear-gradient(to right, #ffffff 0%, #ffffff ${volume * 100}%, rgba(255,255,255,0.2) ${volume * 100}%, rgba(255,255,255,0.2) 100%)`
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Play/Pause Button */}
          <button
            onClick={isPlaying ? handlePause : handlePlay}
            className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
          >
            {isPlaying ? (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-6 h-6 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Comments Modal */}
      <Comments postId={sample.id} isOpen={showComments} onClose={() => setShowComments(false)} />
    </div>
  );
}
