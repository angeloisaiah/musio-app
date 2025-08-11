'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AudioPlayer } from './AudioPlayer';
import { SocialActions } from './SocialActions';
import { Comments } from './Comments';
import type { PostWithCounts } from '@musio/shared';

interface FeedPostProps {
  post: PostWithCounts;
}

export function FeedPost({ post }: FeedPostProps) {
  const [showComments, setShowComments] = useState(false);

  return (
    <div className="rounded-md border border-neutral-800 p-4">
      {/* User Info */}
      <div className="mb-3">
        <Link
          href={`/users/${post.user.id}`}
          className="text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
        >
          {post.user.name ?? 'Unknown'}
        </Link>
        <div className="text-xs text-neutral-500">Post ID: {post.id}</div>

        {/* AI-Generated Tags */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {post.tags.map((tag) => (
              <span key={tag} className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
                #{tag}
              </span>
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
          onPlay={() => console.log('Playing:', post.id)}
          onPause={() => console.log('Paused:', post.id)}
        />
      </div>

      {/* Social Actions */}
      <SocialActions
        postId={post.id}
        initialCounts={post.counts}
        initialStates={{
          isLikedByMe: post.isLikedByMe,
          isRepostedByMe: post.isRepostedByMe,
          isBookmarkedByMe: post.isBookmarkedByMe,
        }}
        onComment={() => setShowComments(true)}
      />

      {/* Comments Modal */}
      <Comments postId={post.id} isOpen={showComments} onClose={() => setShowComments(false)} />
    </div>
  );
}
