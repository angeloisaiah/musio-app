import { randomUUID } from 'node:crypto';
import { createDb } from '../db/connection';
import type { PostId } from '@musio/shared';
import { normalizeTag } from '../../../../packages/shared/src/tags/normalize';

// Mock OpenAI service for now - replace with real OpenAI calls in production
export class AIService {
  private static instance: AIService;

  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    // Mock embedding - in production, use OpenAI embeddings API
    // For now, generate a simple hash-based embedding
    const hash = this.simpleHash(text);
    const embedding = new Array(384).fill(0).map((_, i) => {
      return Math.sin(hash + i) * Math.cos(hash * i) * 0.1;
    });
    return embedding;
  }

  async generateTags(title: string, caption?: string): Promise<string[]> {
    // Mock AI tag generation - in production, use OpenAI or other LLM
    const text = `${title} ${caption || ''}`.toLowerCase();
    const possibleTags = [
      'house',
      'techno',
      'ambient',
      'electronic',
      'dance',
      'chill',
      'upbeat',
      'deep',
      'progressive',
      'minimal',
      'experimental',
      'melodic',
      'dark',
      'uplifting',
      'atmospheric',
      'groovy',
      'energetic',
      'smooth',
      'dreamy',
    ];

    const tags: string[] = [];

    // Simple keyword matching for demo
    for (const tag of possibleTags) {
      if (text.includes(tag) || this.semanticSimilarity(text, tag) > 0.3) {
        tags.push(tag);
      }
    }

    // Add some random tags if none found
    if (tags.length === 0) {
      const randomTags = ['electronic', 'music', 'audio'];
      tags.push(...randomTags.slice(0, 2));
    }

    // Limit to 5 tags max
    return tags.slice(0, 5);
  }

  async findSimilarPosts(
    postId: PostId,
    limit: number = 10,
  ): Promise<Array<{ id: string; similarity: number }>> {
    const db = createDb();

    try {
      // Get the target post's embedding
      const targetEmbedding = await db
        .selectFrom('embeddings')
        .select('embedding')
        .where('post_id', '=', postId)
        .executeTakeFirst();

      if (!targetEmbedding) {
        return [];
      }

      // In a real implementation, you would use vector similarity search
      // For now, return mock similar posts
      const allPosts = await db
        .selectFrom('posts as p')
        .leftJoin('embeddings as e', 'e.post_id', 'p.id')
        .select(['p.id', 'e.embedding'])
        .where('p.id', '!=', postId)
        .where('p.ready', '=', true)
        .where('p.visibility', '=', 'public')
        .execute();

      const similarities = allPosts
        .filter((post) => post.embedding)
        .map((post) => ({
          id: post.id,
          similarity: this.cosineSimilarity(
            JSON.parse(targetEmbedding.embedding as any),
            JSON.parse(post.embedding as any),
          ),
        }))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      return similarities;
    } finally {
      await db.destroy();
    }
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private semanticSimilarity(text: string, keyword: string): number {
    // Simple semantic similarity based on word overlap and context
    const textWords = text.split(/\s+/);
    const related = {
      house: ['deep', 'groove', 'bass', 'rhythm', 'dance'],
      techno: ['hard', 'industrial', 'electronic', 'beat', 'synth'],
      ambient: ['atmospheric', 'calm', 'peaceful', 'space', 'dreamy'],
      chill: ['relax', 'smooth', 'easy', 'mellow', 'soft'],
      upbeat: ['energy', 'fast', 'happy', 'positive', 'lively'],
    };

    if (textWords.includes(keyword)) return 1.0;

    const relatedWords = related[keyword as keyof typeof related] || [];
    const matches = textWords.filter((word) => relatedWords.includes(word)).length;
    return matches / Math.max(relatedWords.length, 1);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

export async function processPostWithAI(
  postId: PostId,
  title: string,
  caption?: string,
): Promise<void> {
  const ai = AIService.getInstance();
  const db = createDb();

  try {
    // Generate tags
    const suggestedTags = await ai.generateTags(title, caption);

    // Store tags in database
    for (const tagName of suggestedTags) {
      const normalized = normalizeTag(tagName);

      // Insert or get tag
      let tag = await db
        .selectFrom('tags')
        .select('id')
        .where('normalized', '=', normalized)
        .executeTakeFirst();

      if (!tag) {
        const tagId = await db
          .insertInto('tags')
          .values({
            name: tagName.charAt(0).toUpperCase() + tagName.slice(1),
            normalized,
          })
          .returning('id')
          .executeTakeFirstOrThrow();
        tag = { id: tagId.id };
      }

      // Link tag to post
      await db
        .insertInto('post_tags')
        .values({
          post_id: postId,
          tag_id: tag.id,
        })
        .onConflict((oc) => oc.columns(['post_id', 'tag_id']).doNothing())
        .execute();
    }

    // Generate and store embedding
    const embedding = await ai.generateEmbedding(`${title} ${caption || ''}`);
    await db
      .insertInto('embeddings')
      .values({
        id: randomUUID(),
        post_id: postId,
        embedding: JSON.stringify(embedding),
        created_at: new Date().toISOString(),
      })
      .onConflict((oc) =>
        oc.column('post_id').doUpdateSet({ embedding: JSON.stringify(embedding) }),
      )
      .execute();

    console.log(`[AI] Processed post ${postId}: ${suggestedTags.length} tags, embedding generated`);
  } catch (error) {
    console.error(`[AI] Failed to process post ${postId}:`, error);
  } finally {
    await db.destroy();
  }
}
