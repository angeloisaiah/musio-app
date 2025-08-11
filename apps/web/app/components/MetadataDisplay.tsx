'use client';

import { useState } from 'react';
import { formatNumber } from '@musio/shared';

interface DiscogsMetadata {
  title?: string;
  artist?: string;
  label?: string;
  year?: number;
  genre?: string[];
  style?: string[];
  country?: string;
  format?: string[];
  thumb?: string;
  uri?: string;
  master_url?: string;
  resource_url?: string;
}

interface SpotifyMetadata {
  name?: string;
  artists?: Array<{ name: string; id: string }>;
  album?: { name: string; images?: Array<{ url: string; height: number; width: number }> };
  popularity?: number;
  duration_ms?: number;
  explicit?: boolean;
  external_urls?: { spotify: string };
  audio_features?: {
    acousticness?: number;
    danceability?: number;
    energy?: number;
    instrumentalness?: number;
    liveness?: number;
    loudness?: number;
    speechiness?: number;
    tempo?: number;
    valence?: number;
    key?: number;
    mode?: number;
    time_signature?: number;
  };
}

interface MetadataDisplayProps {
  metadata: {
    discogs?: DiscogsMetadata;
    spotify?: SpotifyMetadata;
  };
  loading?: boolean;
}

const keyNames = ['C', 'C♯/D♭', 'D', 'D♯/E♭', 'E', 'F', 'F♯/G♭', 'G', 'G♯/A♭', 'A', 'A♯/B♭', 'B'];
const modeNames = ['Minor', 'Major'];

export function MetadataDisplay({ metadata, loading }: MetadataDisplayProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'audio'>('info');

  if (loading) {
    return (
      <div className="bg-black/30 backdrop-blur-sm rounded-lg p-3">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-white/50 border-t-transparent rounded-full animate-spin" />
          <span className="text-white/80 text-sm">Loading metadata...</span>
        </div>
      </div>
    );
  }

  if (!metadata || (!metadata.discogs && !metadata.spotify)) {
    return null;
  }

  const { discogs, spotify } = metadata;

  // Determine primary info source
  const title = spotify?.name || discogs?.title;
  const artist = spotify?.artists?.[0]?.name || discogs?.artist;
  const year = discogs?.year || (spotify?.album?.name ? new Date().getFullYear() : undefined);
  const genre = discogs?.genre?.[0] || 'Unknown';
  const label = discogs?.label;
  const popularity = spotify?.popularity;
  const audioFeatures = spotify?.audio_features;

  return (
    <div className="bg-black/40 backdrop-blur-sm rounded-lg overflow-hidden">
      {/* Compact display */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full p-3 text-left hover:bg-white/10 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Album art or Discogs thumbnail */}
            {(spotify?.album?.images?.[0]?.url || discogs?.thumb) && (
              <img
                src={spotify?.album?.images?.[0]?.url || discogs?.thumb}
                alt="Album artwork"
                className="w-10 h-10 rounded object-cover"
                loading="lazy"
              />
            )}
            
            <div>
              <div className="text-white text-sm font-medium line-clamp-1">
                {title}
              </div>
              <div className="text-white/70 text-xs line-clamp-1">
                {artist} • {year} • {genre}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Spotify popularity */}
            {popularity && (
              <div className="flex items-center space-x-1">
                <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <span className="text-green-400 text-xs">{popularity}%</span>
              </div>
            )}
            
            {/* Expand/collapse icon */}
            <svg 
              className={`w-4 h-4 text-white/70 transition-transform ${showDetails ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </button>

      {/* Detailed display */}
      {showDetails && (
        <div className="border-t border-white/10">
          {/* Tab navigation */}
          <div className="flex border-b border-white/10">
            <button
              onClick={() => setActiveTab('info')}
              className={`flex-1 py-2 px-3 text-xs font-medium transition-colors ${
                activeTab === 'info'
                  ? 'text-white bg-white/10'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              Release Info
            </button>
            {audioFeatures && (
              <button
                onClick={() => setActiveTab('audio')}
                className={`flex-1 py-2 px-3 text-xs font-medium transition-colors ${
                  activeTab === 'audio'
                    ? 'text-white bg-white/10'
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                Audio Features
              </button>
            )}
          </div>

          <div className="p-3">
            {activeTab === 'info' && (
              <div className="space-y-2 text-xs">
                {/* Basic info */}
                <div className="grid grid-cols-2 gap-2">
                  {artist && (
                    <div>
                      <span className="text-white/50">Artist:</span>
                      <span className="text-white ml-1">{artist}</span>
                    </div>
                  )}
                  {year && (
                    <div>
                      <span className="text-white/50">Year:</span>
                      <span className="text-white ml-1">{year}</span>
                    </div>
                  )}
                  {label && (
                    <div>
                      <span className="text-white/50">Label:</span>
                      <span className="text-white ml-1">{label}</span>
                    </div>
                  )}
                  {discogs?.country && (
                    <div>
                      <span className="text-white/50">Country:</span>
                      <span className="text-white ml-1">{discogs.country}</span>
                    </div>
                  )}
                </div>

                {/* Genres and styles */}
                {discogs?.genre && discogs.genre.length > 0 && (
                  <div>
                    <span className="text-white/50">Genres:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {discogs.genre.map((g, i) => (
                        <span key={i} className="bg-white/20 px-2 py-1 rounded text-xs text-white">
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {discogs?.style && discogs.style.length > 0 && (
                  <div>
                    <span className="text-white/50">Styles:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {discogs.style.slice(0, 3).map((s, i) => (
                        <span key={i} className="bg-white/10 px-2 py-1 rounded text-xs text-white/80">
                          {s}
                        </span>
                      ))}
                      {discogs.style.length > 3 && (
                        <span className="text-white/60 text-xs">+{discogs.style.length - 3} more</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Format */}
                {discogs?.format && discogs.format.length > 0 && (
                  <div>
                    <span className="text-white/50">Format:</span>
                    <span className="text-white ml-1">{discogs.format.join(', ')}</span>
                  </div>
                )}

                {/* External links */}
                <div className="flex space-x-2 pt-2">
                  {spotify?.external_urls?.spotify && (
                    <a
                      href={spotify.external_urls.spotify}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-1 bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-xs text-white transition-colors"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                      </svg>
                      <span>Spotify</span>
                    </a>
                  )}
                  {discogs?.resource_url && (
                    <a
                      href={discogs.resource_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-1 bg-gray-600 hover:bg-gray-700 px-2 py-1 rounded text-xs text-white transition-colors"
                    >
                      <span>Discogs</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'audio' && audioFeatures && (
              <div className="space-y-3 text-xs">
                {/* Key and tempo */}
                <div className="grid grid-cols-2 gap-2">
                  {audioFeatures.key !== undefined && (
                    <div>
                      <span className="text-white/50">Key:</span>
                      <span className="text-white ml-1">
                        {keyNames[audioFeatures.key] || 'Unknown'} {modeNames[audioFeatures.mode || 0]}
                      </span>
                    </div>
                  )}
                  {audioFeatures.tempo && (
                    <div>
                      <span className="text-white/50">Tempo:</span>
                      <span className="text-white ml-1">{Math.round(audioFeatures.tempo)} BPM</span>
                    </div>
                  )}
                </div>

                {/* Audio feature bars */}
                <div className="space-y-2">
                  {[
                    { label: 'Energy', value: audioFeatures.energy, color: 'bg-red-500' },
                    { label: 'Danceability', value: audioFeatures.danceability, color: 'bg-green-500' },
                    { label: 'Valence', value: audioFeatures.valence, color: 'bg-yellow-500' },
                    { label: 'Acousticness', value: audioFeatures.acousticness, color: 'bg-blue-500' },
                  ].map(({ label, value, color }) => (
                    value !== undefined && (
                      <div key={label}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-white/70">{label}</span>
                          <span className="text-white">{Math.round(value * 100)}%</span>
                        </div>
                        <div className="bg-white/20 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${color} transition-all duration-300`}
                            style={{ width: `${value * 100}%` }}
                          />
                        </div>
                      </div>
                    )
                  ))}
                </div>

                {/* Additional features */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
                  {audioFeatures.loudness && (
                    <div>
                      <span className="text-white/50">Loudness:</span>
                      <span className="text-white ml-1">{audioFeatures.loudness.toFixed(1)} dB</span>
                    </div>
                  )}
                  {audioFeatures.time_signature && (
                    <div>
                      <span className="text-white/50">Time Sig:</span>
                      <span className="text-white ml-1">{audioFeatures.time_signature}/4</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
