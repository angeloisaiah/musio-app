'use client';

import { useState, useRef, useEffect } from 'react';

export interface AudioPlayerProps {
  previewUrl: string | null;
  waveformUrl: string | null;
  duration?: number | null;
  title?: string;
  onPlay?: () => void;
  onPause?: () => void;
}

export function AudioPlayer({
  previewUrl,
  waveformUrl,
  duration,
  title,
  onPlay,
  onPause,
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadStart = () => {
      setIsLoading(true);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      onPause?.();
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [onPause]);

  const handlePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio || !previewUrl) return;

    try {
      if (isPlaying) {
        await audio.pause();
        setIsPlaying(false);
        onPause?.();
      } else {
        await audio.play();
        setIsPlaying(true);
        onPlay?.();
      }
    } catch (error) {
      console.error('Audio playback error:', error);
      setIsPlaying(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const audioDuration = duration ? duration / 1000 : audioRef.current?.duration || 0;

  if (!previewUrl) {
    return (
      <div className="bg-neutral-800 rounded-lg p-4">
        <div className="text-neutral-400 text-sm">
          Processing audio... Preview will be available soon.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-neutral-800 rounded-lg p-4">
      <audio ref={audioRef} src={previewUrl} preload="metadata" className="hidden" />

      {title && <div className="text-sm font-medium text-neutral-200 mb-2">{title}</div>}

      <div className="flex items-center gap-3">
        <button
          onClick={handlePlayPause}
          disabled={isLoading}
          className="flex items-center justify-center w-10 h-10 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-full transition-colors"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : isPlaying ? (
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <div className="flex-1">
          <input
            type="range"
            min={0}
            max={audioDuration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer slider"
            disabled={!audioDuration}
          />
          <div className="flex justify-between text-xs text-neutral-400 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(audioDuration)}</span>
          </div>
        </div>
      </div>

      {/* Simple waveform visualization placeholder */}
      {waveformUrl && (
        <div className="mt-3">
          <div className="h-12 bg-neutral-700 rounded flex items-end justify-center gap-0.5 p-2">
            {Array.from({ length: 50 }, (_, i) => (
              <div
                key={i}
                className="bg-blue-500 w-1 rounded-t"
                style={{
                  height: `${Math.random() * 80 + 20}%`,
                  opacity: (currentTime / audioDuration) * 50 > i ? 1 : 0.3,
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
