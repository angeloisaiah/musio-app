import Link from 'next/link';
import { AudioPlayer } from '../../components/AudioPlayer';
import { FollowButton } from '../../components/FollowButton';

interface UserProfile {
  user: {
    id: string;
    name: string | null;
    bio: string | null;
    avatar_url: string | null;
    created_at: string;
  };
  stats: {
    postsCount: number;
    followersCount: number;
    followingCount: number;
  };
}

interface UserPost {
  id: string;
  title: string;
  caption: string | null;
  preview_url: string | null;
  waveform_url: string | null;
  duration_ms: number | null;
  created_at: string;
  counts: {
    likes: number;
    comments: number;
    reposts: number;
    plays: number;
  };
}

async function fetchUserProfile(userId: string): Promise<UserProfile> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const res = await fetch(`${apiUrl}/api/users/${userId}`, {
    next: { revalidate: 60 }, // Revalidate every minute
    cache: 'force-cache',
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch user profile: ${res.status}`);
  }

  return res.json();
}

async function fetchUserPosts(
  userId: string,
): Promise<{ items: UserPost[]; nextCursor: string | null }> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const res = await fetch(`${apiUrl}/api/users/${userId}/posts?limit=10`, {
    next: { revalidate: 30 }, // Revalidate every 30 seconds
    cache: 'force-cache',
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch user posts: ${res.status}`);
  }

  return res.json();
}

export default async function UserProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  let profile: UserProfile;
  let posts: { items: UserPost[]; nextCursor: string | null };

  try {
    const { userId } = await params;
    [profile, posts] = await Promise.all([fetchUserProfile(userId), fetchUserPosts(userId)]);
  } catch (error) {
    console.error('Error fetching user data:', error);
    return (
      <main className="p-4 max-w-2xl mx-auto">
        <div className="text-red-500">
          <h1 className="text-2xl font-semibold mb-4">User Not Found</h1>
          <p>The user profile could not be loaded.</p>
          <Link href="/" className="text-blue-500 hover:underline mt-4 block">
            ← Back to Feed
          </Link>
        </div>
      </main>
    );
  }

  const joinedDate = new Date(profile.user.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
  });

  return (
    <main className="p-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link href="/" className="text-blue-500 hover:underline text-sm">
          ← Back to Feed
        </Link>
      </div>

      {/* Profile Header */}
      <div className="bg-neutral-900 rounded-lg p-6 mb-6">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-20 h-20 bg-neutral-700 rounded-full flex items-center justify-center flex-shrink-0">
            {profile.user.avatar_url ? (
              <img
                src={profile.user.avatar_url}
                alt={profile.user.name || 'User avatar'}
                className="w-20 h-20 rounded-full object-cover"
              />
            ) : (
              <svg className="w-10 h-10 text-neutral-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            )}
          </div>

          {/* User Info */}
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-neutral-100 mb-1">
              {profile.user.name || 'Anonymous User'}
            </h1>

            <p className="text-neutral-400 text-sm mb-3">Joined {joinedDate}</p>

            {profile.user.bio && <p className="text-neutral-300 mb-4">{profile.user.bio}</p>}

            {/* Stats and Follow Button */}
            <div className="flex items-center justify-between">
              <div className="flex gap-6">
                <div className="text-center">
                  <div className="text-xl font-bold text-neutral-100">
                    {profile.stats.postsCount}
                  </div>
                  <div className="text-sm text-neutral-400">Posts</div>
                </div>
                <Link
                  href={`/users/${profile.user.id}/followers`}
                  className="text-center hover:opacity-80 transition-opacity"
                >
                  <div className="text-xl font-bold text-neutral-100">
                    {profile.stats.followersCount}
                  </div>
                  <div className="text-sm text-neutral-400">Followers</div>
                </Link>
                <Link
                  href={`/users/${profile.user.id}/following`}
                  className="text-center hover:opacity-80 transition-opacity"
                >
                  <div className="text-xl font-bold text-neutral-100">
                    {profile.stats.followingCount}
                  </div>
                  <div className="text-sm text-neutral-400">Following</div>
                </Link>
              </div>

              <FollowButton
                userId={profile.user.id}
                initialFollowersCount={profile.stats.followersCount}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Posts Section */}
      <div>
        <h2 className="text-xl font-semibold text-neutral-100 mb-4">
          Posts ({profile.stats.postsCount})
        </h2>

        {posts.items.length === 0 ? (
          <div className="bg-neutral-900 rounded-lg p-8 text-center">
            <p className="text-neutral-400">No posts yet.</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {posts.items.map((post) => (
              <li key={post.id} className="bg-neutral-900 rounded-lg p-4">
                <div className="mb-3">
                  <h3 className="font-medium text-neutral-100">{post.title}</h3>
                  {post.caption && <p className="text-sm text-neutral-400 mt-1">{post.caption}</p>}
                  <p className="text-xs text-neutral-500 mt-1">
                    {new Date(post.created_at).toLocaleDateString()}
                  </p>
                </div>

                <AudioPlayer
                  previewUrl={post.preview_url}
                  waveformUrl={post.waveform_url}
                  duration={post.duration_ms}
                  title={post.title}
                  onPlay={() => console.log('Playing:', post.id)}
                  onPause={() => console.log('Paused:', post.id)}
                />

                {/* Post Stats */}
                <div className="flex gap-4 mt-3 text-sm text-neutral-400">
                  <span>{post.counts.likes} likes</span>
                  <span>{post.counts.comments} comments</span>
                  <span>{post.counts.reposts} reposts</span>
                  <span>{post.counts.plays} plays</span>
                </div>
              </li>
            ))}
          </ul>
        )}

        {posts.nextCursor && (
          <div className="mt-6 text-center">
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md">
              Load More Posts
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
