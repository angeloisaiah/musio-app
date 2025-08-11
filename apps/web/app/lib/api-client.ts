import type { PostWithCounts, PaginatedResponse } from '@musio/shared';
import { APIError, NetworkError } from './error-handler';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://musio-app-production.up.railway.app';

async function fetchWithRetry(url: string, options: RequestInit = {}, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (response.ok) {
        return response;
      }

      if (response.status >= 400 && response.status < 500) {
        // Client errors shouldn't be retried
        throw new APIError(response.status, `Request failed: ${response.statusText}`);
      }

      if (i === retries - 1) {
        throw new APIError(response.status, `Request failed after ${retries} retries: ${response.statusText}`);
      }
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      
      if (i === retries - 1) {
        throw new NetworkError(`Network error after ${retries} retries`, error instanceof Error ? error : new Error(String(error)));
      }
      
      // Wait before retry with exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
  
  throw new NetworkError('Unexpected error in fetchWithRetry');
}

export const apiClient = {
  async getFeed(limit = 20, cursor?: string): Promise<PaginatedResponse<PostWithCounts>> {
    const url = new URL(`${API_BASE_URL}/api/feed`);
    url.searchParams.set('limit', limit.toString());
    if (cursor) {
      url.searchParams.set('cursor', cursor);
    }

    const response = await fetchWithRetry(url.toString(), {
      next: { revalidate: 30 }, // Cache for 30 seconds
    });

    return response.json();
  },

  async getPosts(limit = 20, cursor?: string, filter?: string): Promise<PaginatedResponse<PostWithCounts>> {
    const url = new URL(`${API_BASE_URL}/api/posts`);
    url.searchParams.set('limit', limit.toString());
    if (cursor) {
      url.searchParams.set('cursor', cursor);
    }
    if (filter) {
      url.searchParams.set('filter', filter);
    }

    const response = await fetchWithRetry(url.toString(), {
      next: { revalidate: 10 }, // Shorter cache for posts
    });

    return response.json();
  },

  async searchPosts(query?: string, tags?: string[], limit = 20, cursor?: string): Promise<PaginatedResponse<PostWithCounts>> {
    const url = new URL(`${API_BASE_URL}/api/search`);
    url.searchParams.set('limit', limit.toString());
    if (query) {
      url.searchParams.set('q', query);
    }
    if (tags && tags.length > 0) {
      url.searchParams.set('tags', tags.join(','));
    }
    if (cursor) {
      url.searchParams.set('cursor', cursor);
    }

    const response = await fetchWithRetry(url.toString());
    return response.json();
  },

  async getPopularTags(limit = 20): Promise<{ items: Array<{ name: string; count: number }> }> {
    const url = new URL(`${API_BASE_URL}/api/tags/popular`);
    url.searchParams.set('limit', limit.toString());

    const response = await fetchWithRetry(url.toString(), {
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    return response.json();
  },
};
