import { TikTokFeed } from '../components/TikTokFeed';
import { apiClient } from '../lib/api-client';
import type { PostWithCounts } from '@musio/shared';

async function fetchInitialFeed(): Promise<PostWithCounts[]> {
  try {
    const data = await apiClient.getFeed(5);
    return data.items;
  } catch (error) {
    console.error('Error fetching initial feed:', error);
    return [];
  }
}

export default async function FeedPage() {
  const posts = await fetchInitialFeed();

  return (
    <div className="min-h-screen bg-black">
      <TikTokFeed initialPosts={posts} />
    </div>
  );
}
