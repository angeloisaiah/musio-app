import Link from 'next/link';
import { AudioPlayer } from './components/AudioPlayer';
import { FeedPost } from './components/FeedPost';
import { NotificationBell } from './components/NotificationBell';
import { apiClient } from './lib/api-client';
import type { PostWithCounts, PaginatedResponse } from '@musio/shared';

async function fetchFeed(): Promise<PaginatedResponse<PostWithCounts>> {
  try {
    return await apiClient.getPosts(5);
  } catch (error) {
    console.error('Failed to fetch feed:', error);
    throw error;
  }
}

export default async function Page() {
  let data;
  try {
    data = await fetchFeed();
  } catch (error) {
    console.error('Error fetching feed in Page component:', error);
    return (
      <main className="p-4 max-w-xl mx-auto text-red-500">
        <h1 className="text-2xl font-semibold mb-4">Mus.io Feed</h1>
        <p>Error loading feed. Please ensure the API is running and accessible.</p>
        <p>API URL: {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}</p>
      </main>
    );
  }

  return (
    <main className="p-4 max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Mus.io Feed</h1>
        <NotificationBell />
      </div>
      <div className="flex gap-4 mb-4">
        <Link
          href="/feed"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
        >
          🎵 TikTok-Style Feed
        </Link>
        <Link href="/upload" className="text-blue-500 hover:underline">
          Upload New Post
        </Link>
        <Link href="/search" className="text-blue-500 hover:underline">
          Search & Discovery
        </Link>
      </div>
      <ul className="space-y-4">
        {data.items.map((post) => (
          <li key={post.id}>
            <FeedPost post={post} />
          </li>
        ))}
      </ul>
    </main>
  );
}
