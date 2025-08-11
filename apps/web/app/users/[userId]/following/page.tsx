import Link from 'next/link';

interface Following {
  id: string;
  name: string | null;
  avatar_url: string | null;
  followed_at: string;
}

async function fetchFollowing(
  userId: string,
): Promise<{ items: Following[]; nextCursor: string | null }> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const res = await fetch(`${apiUrl}/api/users/${userId}/following`, {
    next: { revalidate: 30 },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch following: ${res.status}`);
  }

  return res.json();
}

async function fetchUserName(userId: string): Promise<string> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const res = await fetch(`${apiUrl}/api/users/${userId}`, {
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch user: ${res.status}`);
  }

  const data = await res.json();
  return data.user.name || 'Unknown User';
}

export default async function FollowingPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  let following: { items: Following[]; nextCursor: string | null };
  let userName: string;

  try {
    [following, userName] = await Promise.all([fetchFollowing(userId), fetchUserName(userId)]);
  } catch (error) {
    console.error('Error fetching following:', error);
    return (
      <main className="p-4 max-w-2xl mx-auto">
        <div className="text-red-500">
          <h1 className="text-2xl font-semibold mb-4">Error</h1>
          <p>Could not load following.</p>
          <Link href={`/users/${userId}`} className="text-blue-500 hover:underline mt-4 block">
            ← Back to Profile
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="p-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link href={`/users/${userId}`} className="text-blue-500 hover:underline text-sm">
          ← Back to {userName}
        </Link>
      </div>

      <h1 className="text-2xl font-semibold mb-6">Following</h1>

      {following.items.length === 0 ? (
        <div className="bg-neutral-900 rounded-lg p-8 text-center">
          <p className="text-neutral-400">{userName} is not following anyone yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {following.items.map((user) => (
            <div key={user.id} className="bg-neutral-900 rounded-lg p-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-neutral-700 rounded-full flex items-center justify-center flex-shrink-0">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.name || 'User avatar'}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <svg
                      className="w-6 h-6 text-neutral-400"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  )}
                </div>

                <div className="flex-1">
                  <Link
                    href={`/users/${user.id}`}
                    className="font-medium text-neutral-100 hover:text-neutral-300 transition-colors"
                  >
                    {user.name || 'Anonymous User'}
                  </Link>
                  <p className="text-sm text-neutral-400">
                    Followed on {new Date(user.followed_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {following.nextCursor && (
        <div className="mt-6 text-center">
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md">
            Load More
          </button>
        </div>
      )}
    </main>
  );
}
