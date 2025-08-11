import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TikTokFeed } from '../TikTokFeed';
import { apiClient } from '../../lib/api-client';
import type { PostWithCounts } from '../../types/shared';

// Mock API client
vi.mock('../../lib/api-client', () => ({
  apiClient: {
    getFeed: vi.fn(),
  },
}));

// Mock IntersectionObserver
const mockIntersectionObserver = vi.fn();
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null,
});
window.IntersectionObserver = mockIntersectionObserver;

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock matchMedia for media queries
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

const mockPosts: PostWithCounts[] = [
  {
    id: '1',
    user_id: 'user1',
    title: 'Test Track 1',
    caption: 'A great track',
    duration_ms: 180000,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ready: true,
    visibility: 'public',
    bpm: 128,
    key: 'C major',
    video_url: undefined,
    cover_url: 'https://example.com/cover1.jpg',
    youtube_id: undefined,
    source_type: 'user',
    artist_name: 'Test Artist 1',
    user: {
      id: 'user1',
      username: 'User One',
      email: 'user1@example.com',
      avatar_url: 'https://example.com/avatar1.jpg',
      bio: 'Test user',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    _count: {
      likes: 42,
      comments: 5,
      shares: 12,
    },
    tags: [
      { id: 'tag1', name: 'electronic', normalized: 'electronic', created_at: '2024-01-01T00:00:00Z' },
      { id: 'tag2', name: 'house', normalized: 'house', created_at: '2024-01-01T00:00:00Z' }
    ],
    media_files: [
      {
        id: 'media1',
        post_id: '1',
        url: 'https://example.com/preview1.mp3',
        type: 'preview',
        mime: 'audio/mpeg',
        size: 1024,
        duration_ms: 180000,
      }
    ],
  },
  {
    id: '2',
    user_id: 'user2',
    title: 'Test Track 2',
    caption: 'Another great track',
    duration_ms: 240000,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    ready: true,
    visibility: 'public',
    bpm: 140,
    key: 'A minor',
    video_url: 'https://example.com/video2.mp4',
    cover_url: undefined,
    youtube_id: undefined,
    source_type: 'user',
    artist_name: 'Test Artist 2',
    user: {
      id: 'user2',
      username: 'User Two',
      email: 'user2@example.com',
      avatar_url: 'https://example.com/avatar2.jpg',
      bio: 'Test user 2',
      created_at: '2024-01-02T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
    },
    _count: {
      likes: 89,
      comments: 15,
      shares: 23,
    },
    tags: [
      { id: 'tag3', name: 'techno', normalized: 'techno', created_at: '2024-01-02T00:00:00Z' },
      { id: 'tag4', name: 'dark', normalized: 'dark', created_at: '2024-01-02T00:00:00Z' }
    ],
    media_files: [
      {
        id: 'media2',
        post_id: '2',
        url: 'https://example.com/preview2.mp3',
        type: 'preview',
        mime: 'audio/mpeg',
        size: 2048,
        duration_ms: 240000,
      }
    ],
  },
];

describe('TikTokFeed', () => {
  const mockApiClient = apiClient as any;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders initial posts correctly', () => {
    render(<TikTokFeed initialPosts={mockPosts} />);

    expect(screen.getByText('Test Track 1')).toBeInTheDocument();
    expect(screen.getByText('Test Track 2')).toBeInTheDocument();
    expect(screen.getByText('User One')).toBeInTheDocument();
    expect(screen.getByText('User Two')).toBeInTheDocument();
  });

  it('displays progress indicator correctly', () => {
    render(<TikTokFeed initialPosts={mockPosts} />);

    expect(screen.getByText('1 / 2')).toBeInTheDocument();
  });

  it('loads volume settings from localStorage', () => {
    localStorageMock.getItem
      .mockReturnValueOnce('0.5') // volume
      .mockReturnValueOnce('true'); // muted

    render(<TikTokFeed initialPosts={mockPosts} />);

    expect(localStorageMock.getItem).toHaveBeenCalledWith('musio_volume');
    expect(localStorageMock.getItem).toHaveBeenCalledWith('musio_muted');
  });

  it('saves volume settings to localStorage', async () => {
    render(<TikTokFeed initialPosts={mockPosts} />);

    // Volume should be saved to localStorage
    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith('musio_volume', '0.8');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('musio_muted', 'false');
    });
  });

  it('fetches more posts when scrolling', async () => {
    mockApiClient.getFeed.mockResolvedValue({
      items: [
        {
          ...mockPosts[0],
          id: '3',
          title: 'Test Track 3',
        },
      ],
      nextCursor: 'cursor_3',
    });

    render(<TikTokFeed initialPosts={mockPosts} />);

    // Simulate intersection observer triggering for infinite scroll
    const callbacks = mockIntersectionObserver.mock.calls[0][0];
    callbacks([{ isIntersecting: true, target: { getAttribute: () => '1' } }]);

    await waitFor(() => {
      expect(mockApiClient.getFeed).toHaveBeenCalledWith(10, undefined);
    });
  });

  it('handles fetch errors gracefully', async () => {
    mockApiClient.getFeed.mockRejectedValue(new Error('Network error'));

    render(<TikTokFeed initialPosts={[]} />);

    // Should show error message and retry button
    await waitFor(() => {
      expect(screen.getByText(/Network error/)).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });
  });

  it('shows empty state when no posts available', () => {
    render(<TikTokFeed initialPosts={[]} />);

    expect(screen.getByText('No posts available')).toBeInTheDocument();
    expect(screen.getByText('Check back later for new content!')).toBeInTheDocument();
    expect(screen.getByText('Refresh')).toBeInTheDocument();
  });

  it('handles keyboard navigation', () => {
    render(<TikTokFeed initialPosts={mockPosts} />);

    // Mock scrollIntoView
    const mockScrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = mockScrollIntoView;

    // Mock querySelector to return an element
    const mockElement = { scrollIntoView: mockScrollIntoView };
    document.querySelector = vi.fn().mockReturnValue(mockElement);

    // Test arrow down navigation
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(mockScrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    });

    // Test mute toggle
    fireEvent.keyDown(window, { key: 'm' });
    // Volume state should be updated (can't easily test without more complex setup)
  });

  it('prevents duplicate posts when fetching', async () => {
    // Return the same post ID that already exists
    mockApiClient.getFeed.mockResolvedValue({
      items: [mockPosts[0]], // Same post
      nextCursor: null,
    });

    render(<TikTokFeed initialPosts={mockPosts} />);

    const initialPostCount = screen.getAllByText(/Test Track/).length;

    // Trigger fetch
    const callbacks = mockIntersectionObserver.mock.calls[0][0];
    callbacks([{ isIntersecting: true, target: { getAttribute: () => '1' } }]);

    await waitFor(() => {
      expect(mockApiClient.getFeed).toHaveBeenCalled();
    });

    // Should not have duplicate posts
    const finalPostCount = screen.getAllByText(/Test Track/).length;
    expect(finalPostCount).toBe(initialPostCount);
  });

  it('respects rate limiting for fetches', async () => {
    mockApiClient.getFeed.mockResolvedValue({
      items: [],
      nextCursor: null,
    });

    render(<TikTokFeed initialPosts={mockPosts} />);

    // Trigger multiple rapid fetches
    const callbacks = mockIntersectionObserver.mock.calls[0][0];
    callbacks([{ isIntersecting: true, target: { getAttribute: () => '1' } }]);
    callbacks([{ isIntersecting: true, target: { getAttribute: () => '1' } }]);
    callbacks([{ isIntersecting: true, target: { getAttribute: () => '1' } }]);

    // Should only make one API call due to rate limiting
    await waitFor(() => {
      expect(mockApiClient.getFeed).toHaveBeenCalledTimes(1);
    });
  });

  it('displays keyboard shortcuts on desktop', () => {
    // Mock non-mobile
    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: query === '(max-width: 768px)' ? false : true,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(<TikTokFeed initialPosts={mockPosts} />);

    expect(screen.getByText('↑↓ or j/k: Navigate')).toBeInTheDocument();
    expect(screen.getByText('Space: Play/Pause')).toBeInTheDocument();
    expect(screen.getByText('m: Mute/Unmute')).toBeInTheDocument();
  });

  it('shows mobile header on mobile devices', () => {
    // Mock mobile
    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: query === '(max-width: 768px)' ? true : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(<TikTokFeed initialPosts={mockPosts} />);

    expect(screen.getByText('Mus.io')).toBeInTheDocument();
  });

  it('shows end of content indicator when no more posts', () => {
    render(<TikTokFeed initialPosts={mockPosts} />);

    // Simulate reaching end (no nextCursor)
    expect(screen.getByText("You've reached the end!")).toBeInTheDocument();
  });

  describe('accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<TikTokFeed initialPosts={mockPosts} />);

      // Check for scroll container
      const feedContainer = screen.getByRole('main', { hidden: true }) || document.querySelector('[role="main"]');
      expect(feedContainer || document.querySelector('.h-screen')).toBeInTheDocument();
    });

    it('supports keyboard navigation', () => {
      render(<TikTokFeed initialPosts={mockPosts} />);

      // All interactive elements should be keyboard accessible
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).not.toHaveAttribute('tabIndex', '-1');
      });
    });
  });

  describe('performance', () => {
    it('implements virtualization for large post counts', () => {
      // Create many posts
      const manyPosts = Array.from({ length: 50 }, (_, i) => ({
        ...mockPosts[0],
        id: `post_${i}`,
        title: `Test Track ${i}`,
      }));

      render(<TikTokFeed initialPosts={manyPosts} />);

      // Should not render all posts at once
      const renderedTracks = screen.getAllByText(/Test Track/);
      expect(renderedTracks.length).toBeLessThan(manyPosts.length);
    });

    it('preloads next posts for smooth scrolling', async () => {
      mockApiClient.getFeed.mockResolvedValue({
        items: [
          {
            ...mockPosts[0],
            id: '3',
            title: 'Preloaded Track',
          },
        ],
        nextCursor: 'cursor_3',
      });

      render(<TikTokFeed initialPosts={mockPosts} />);

      // Should preload when approaching end
      await waitFor(() => {
        expect(mockApiClient.getFeed).toHaveBeenCalled();
      });
    });
  });
});
