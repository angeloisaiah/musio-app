'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AudioPlayer } from './AudioPlayer';
import { SocialActions } from './SocialActions';
import { Comments } from './Comments';
import type { PostWithCounts } from '../types/shared';

interface FeedPostProps {
  post: PostWithCounts;
}

export function FeedPost({ post }: FeedPostProps) {
  const [showComments, setShowComments] = useState(false);

  // Find preview audio file
  const previewFile = post.media_files?.find(file => file.type === 'preview');
  const previewUrl = previewFile?.url || null;

  // Find waveform file
  const waveformFile = post.media_files?.find(file => file.type === 'waveform_json');
  const waveformUrl = waveformFile?.url || null;

  return (
    <div className="rounded-md border border-neutral-800 p-4">
      {/* User Info */}
      <div className="mb-3">
        {post.user && (
          <Link
            href={`/users/${post.user.id}`}
            className="text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            {post.user.username ?? 'Unknown'}
          </Link>
        )}
        <div className="text-xs text-neutral-500">Post ID: {post.id}</div>

        {/* AI-Generated Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {post.tags.map((tag) => (
              <span key={tag.id} className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
                #{tag.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Audio Player */}
      <div className="mb-4">
        <AudioPlayer
          previewUrl={previewUrl}
          waveformUrl={waveformUrl}
          duration={post.duration_ms}
          onPlay={() => console.log('Playing:', post.id)}
          onPause={() => console.log('Paused:', post.id)}
        />
      </div>

      {/* Social Actions */}
      <SocialActions
        postId={post.id}
        initialCounts={post._count}
        initialStates={{
          isLikedByMe: false, // TODO: Implement user state
          isRepostedByMe: false,
          isBookmarkedByMe: false,
        }}
        onComment={() => setShowComments(true)}
      />

      {/* Comments Modal */}
      <Comments postId={post.id} isOpen={showComments} onClose={() => setShowComments(false)} />
    </div>
  );
}
