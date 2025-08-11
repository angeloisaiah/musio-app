'use client';

import { useState } from 'react';

interface FollowButtonProps {
  userId: string;
  initialFollowing?: boolean;
  initialFollowersCount?: number;
}

export function FollowButton({
  userId,
  initialFollowing = false,
  initialFollowersCount = 0,
}: FollowButtonProps) {
  const [following, setFollowing] = useState(initialFollowing);
  const [followersCount, setFollowersCount] = useState(initialFollowersCount);
  const [loading, setLoading] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const handleFollow = async () => {
    const token = localStorage.getItem('jwt_token');
    if (!token) {
      alert('Please log in to follow users');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/users/${userId}/follow`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to follow user');
      }

      const data = await res.json();
      setFollowing(data.following);
      setFollowersCount(data.followersCount);
    } catch (error) {
      console.error('Error following user:', error);
      alert('Failed to follow user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleFollow}
      disabled={loading}
      className={`px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        following
          ? 'bg-neutral-700 hover:bg-neutral-600 text-neutral-200'
          : 'bg-blue-600 hover:bg-blue-700 text-white'
      }`}
    >
      {loading ? 'Loading...' : following ? 'Following' : 'Follow'}
    </button>
  );
}
