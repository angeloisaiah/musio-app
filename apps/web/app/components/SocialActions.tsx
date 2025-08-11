'use client';

import { useState } from 'react';

interface SocialActionsProps {
  postId: string;
  initialCounts: {
    likes: number;
    comments: number;
    shares: number;
  };
  initialStates?: {
    isLikedByMe?: boolean;
    isRepostedByMe?: boolean;
    isBookmarkedByMe?: boolean;
  };
  onComment?: () => void;
  vertical?: boolean;
}

export function SocialActions({
  postId,
  initialCounts,
  initialStates = {},
  onComment,
  vertical = false,
}: SocialActionsProps) {
  const [counts, setCounts] = useState(initialCounts);
  const [liked, setLiked] = useState(initialStates.isLikedByMe || false);
  const [reposted, setReposted] = useState(initialStates.isRepostedByMe || false);
  const [bookmarked, setBookmarked] = useState(initialStates.isBookmarkedByMe || false);
  const [loading, setLoading] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const handleLike = async () => {
    const token = localStorage.getItem('jwt_token');
    if (!token) {
      alert('Please log in to like posts');
      return;
    }

    setLoading('like');
    try {
      const res = await fetch(`${apiUrl}/api/posts/${postId}/like`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error('Failed to like post');

      const data = await res.json();
      setLiked(data.liked);
      setCounts((prev) => ({ ...prev, likes: data.likesCount }));
    } catch (error) {
      console.error('Error liking post:', error);
      alert('Failed to like post');
    } finally {
      setLoading(null);
    }
  };

  const handleRepost = async () => {
    const token = localStorage.getItem('jwt_token');
    if (!token) {
      alert('Please log in to repost');
      return;
    }

    setLoading('repost');
    try {
      const res = await fetch(`${apiUrl}/api/posts/${postId}/repost`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error('Failed to repost');

      const data = await res.json();
      setReposted(data.reposted);
      setCounts((prev) => ({ ...prev, shares: data.sharesCount }));
    } catch (error) {
      console.error('Error reposting:', error);
      alert('Failed to repost');
    } finally {
      setLoading(null);
    }
  };

  const handleBookmark = async () => {
    const token = localStorage.getItem('jwt_token');
    if (!token) {
      alert('Please log in to bookmark posts');
      return;
    }

    setLoading('bookmark');
    try {
      const res = await fetch(`${apiUrl}/api/posts/${postId}/bookmark`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error('Failed to bookmark post');

      const data = await res.json();
      setBookmarked(data.bookmarked);
    } catch (error) {
      console.error('Error bookmarking post:', error);
      alert('Failed to bookmark post');
    } finally {
      setLoading(null);
    }
  };

  if (vertical) {
    return (
      <div className="flex flex-col items-center space-y-4 text-white">
        {/* Like */}
        <div className="flex flex-col items-center">
          <button
            onClick={handleLike}
            disabled={loading === 'like'}
            className={`w-12 h-12 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center hover:bg-red-500/20 transition-colors ${
              liked ? 'text-red-500' : 'text-white'
            } ${loading === 'like' ? 'opacity-50' : ''}`}
          >
            <svg
              className="w-6 h-6"
              fill={liked ? 'currentColor' : 'none'}
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </button>
          <span className="text-xs mt-1 font-semibold">{counts.likes}</span>
        </div>

        {/* Comment */}
        <div className="flex flex-col items-center">
          <button
            onClick={onComment}
            className="w-12 h-12 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center hover:bg-blue-500/20 transition-colors text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </button>
          <span className="text-xs mt-1 font-semibold">{counts.comments}</span>
        </div>

        {/* Repost */}
        <div className="flex flex-col items-center">
          <button
            onClick={handleRepost}
            disabled={loading === 'repost'}
            className={`w-12 h-12 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center hover:bg-green-500/20 transition-colors ${
              reposted ? 'text-green-500' : 'text-white'
            } ${loading === 'repost' ? 'opacity-50' : ''}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
          <span className="text-xs mt-1 font-semibold">{counts.shares}</span>
        </div>

        {/* Bookmark */}
        <div className="flex flex-col items-center">
          <button
            onClick={handleBookmark}
            disabled={loading === 'bookmark'}
            className={`w-12 h-12 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center hover:bg-yellow-500/20 transition-colors ${
              bookmarked ? 'text-yellow-500' : 'text-white'
            } ${loading === 'bookmark' ? 'opacity-50' : ''}`}
          >
            <svg
              className="w-6 h-6"
              fill={bookmarked ? 'currentColor' : 'none'}
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
              />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-6 text-sm text-neutral-400">
      {/* Like */}
      <button
        onClick={handleLike}
        disabled={loading === 'like'}
        className={`flex items-center gap-2 hover:text-red-400 transition-colors ${
          liked ? 'text-red-500' : ''
        } ${loading === 'like' ? 'opacity-50' : ''}`}
      >
        <svg
          className="w-4 h-4"
          fill={liked ? 'currentColor' : 'none'}
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
        <span>{counts.likes}</span>
      </button>

      {/* Comment */}
      <button
        onClick={onComment}
        className="flex items-center gap-2 hover:text-blue-400 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        <span>{counts.comments}</span>
      </button>

      {/* Repost */}
      <button
        onClick={handleRepost}
        disabled={loading === 'repost'}
        className={`flex items-center gap-2 hover:text-green-400 transition-colors ${
          reposted ? 'text-green-500' : ''
        } ${loading === 'repost' ? 'opacity-50' : ''}`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        <span>{counts.shares}</span>
      </button>

      {/* Bookmark */}
      <button
        onClick={handleBookmark}
        disabled={loading === 'bookmark'}
        className={`hover:text-yellow-400 transition-colors ${
          bookmarked ? 'text-yellow-500' : ''
        } ${loading === 'bookmark' ? 'opacity-50' : ''}`}
      >
        <svg
          className="w-4 h-4"
          fill={bookmarked ? 'currentColor' : 'none'}
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
          />
        </svg>
      </button>

      {/* Play count */}
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293H15M9 10V9a2 2 0 012-2h2a2 2 0 012 2v1M9 10v5a2 2 0 002 2h2a2 2 0 002-2v-5"
          />
        </svg>
        <span>{counts.shares}</span>
      </div>
    </div>
  );
}
