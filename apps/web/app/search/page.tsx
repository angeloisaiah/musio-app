'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AudioPlayer } from '../components/AudioPlayer';
import { SocialActions } from '../components/SocialActions';
import { Comments } from '../components/Comments';

interface SearchResult {
  id: string;
  title: string;
  caption: string | null;
  user: {
    id: string;
    name: string | null;
    avatar_url: string | null;
  };
  preview_url: string | null;
  duration_ms: number | null;
  waveform_url: string | null;
  counts: {
    likes: number;
    comments: number;
    reposts: number;
    plays: number;
  };
  tags: string[];
  created_at: string;
}

interface PopularTag {
  name: string;
  count: number;
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [popularTags, setPopularTags] = useState<PopularTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showComments, setShowComments] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    // Fetch popular tags on mount
    fetchPopularTags();
  }, []);

  const fetchPopularTags = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/tags/popular?limit=15`);
      if (res.ok) {
        const data = await res.json();
        setPopularTags(data.items);
      }
    } catch (error) {
      console.error('Error fetching popular tags:', error);
    }
  };

  const performSearch = async () => {
    if (!query.trim() && selectedTags.length === 0) {
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set('q', query.trim());
      if (selectedTags.length > 0) params.set('tags', selectedTags.join(','));
      params.set('limit', '20');

      const res = await fetch(`${apiUrl}/api/search?${params}`);
      if (!res.ok) throw new Error('Search failed');

      const data = await res.json();
      setResults(data.items);
    } catch (error) {
      console.error('Search error:', error);
      alert('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTagToggle = (tagName: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagName) ? prev.filter((t) => t !== tagName) : [...prev, tagName],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch();
  };

  return (
    <main className="p-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link href="/" className="text-blue-500 hover:underline text-sm">
          ← Back to Feed
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-8">Search & Discovery</h1>

      {/* Search Form */}
      <div className="bg-neutral-900 rounded-lg p-6 mb-6">
        <form onSubmit={handleSubmit} className="mb-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search posts, users, or content..."
              className="flex-1 p-3 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={loading || (!query.trim() && selectedTags.length === 0)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>

        {/* Selected Tags */}
        {selectedTags.length > 0 && (
          <div className="mb-4">
            <div className="text-sm text-neutral-400 mb-2">Selected tags:</div>
            <div className="flex flex-wrap gap-2">
              {selectedTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleTagToggle(tag)}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded-full hover:bg-blue-700 transition-colors"
                >
                  {tag} ×
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Popular Tags */}
        <div>
          <div className="text-sm text-neutral-400 mb-3">Popular tags:</div>
          <div className="flex flex-wrap gap-2">
            {popularTags.map((tag) => (
              <button
                key={tag.name}
                onClick={() => handleTagToggle(tag.name)}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  selectedTags.includes(tag.name)
                    ? 'bg-blue-600 text-white'
                    : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                }`}
              >
                {tag.name} ({tag.count})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search Results */}
      {hasSearched && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Search Results ({results.length})</h2>

          {loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-neutral-400">Searching...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="bg-neutral-900 rounded-lg p-8 text-center">
              <p className="text-neutral-400">No results found. Try different keywords or tags.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {results.map((post) => (
                <div key={post.id} className="bg-neutral-900 rounded-lg p-6">
                  {/* Post Header */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <Link
                        href={`/users/${post.user.id}`}
                        className="text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
                      >
                        {post.user.name || 'Unknown User'}
                      </Link>
                      <span className="text-xs text-neutral-500">
                        {new Date(post.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="text-lg font-medium text-neutral-100 mb-1">{post.title}</h3>
                    {post.caption && <p className="text-sm text-neutral-300">{post.caption}</p>}

                    {/* Tags */}
                    {post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {post.tags.map((tag) => (
                          <button
                            key={tag}
                            onClick={() => handleTagToggle(tag)}
                            className="px-2 py-1 bg-neutral-800 text-neutral-300 text-xs rounded-full hover:bg-neutral-700 transition-colors"
                          >
                            #{tag}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Audio Player */}
                  <div className="mb-4">
                    <AudioPlayer
                      previewUrl={post.preview_url}
                      waveformUrl={post.waveform_url}
                      duration={post.duration_ms}
                      title={post.title}
                      onPlay={() => console.log('Playing:', post.id)}
                      onPause={() => console.log('Paused:', post.id)}
                    />
                  </div>

                  {/* Social Actions */}
                  <SocialActions
                    postId={post.id}
                    initialCounts={post.counts}
                    onComment={() => setShowComments(post.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Comments Modal */}
      {showComments && (
        <Comments postId={showComments} isOpen={true} onClose={() => setShowComments(null)} />
      )}
    </main>
  );
}
