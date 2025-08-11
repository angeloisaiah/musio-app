import { randomUUID } from 'node:crypto';
import { createDb } from '../db/connection';
import type { PostId, UserId } from '@musio/shared';

export class NotificationService {
  private static instance: NotificationService;

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async createNotification(
    userId: UserId,
    type: string,
    title: string,
    message: string,
    data?: Record<string, any>,
  ): Promise<void> {
    const db = createDb();

    try {
      await db
        .insertInto('notifications')
        .values({
          id: randomUUID(),
          user_id: userId,
          type,
          title,
          message,
          read: false,
          data: data ? JSON.stringify(data) : null,
          created_at: new Date().toISOString(),
        })
        .execute();
    } catch (error) {
      console.error(`[Notification] Failed to create notification:`, error);
    } finally {
      await db.destroy();
    }
  }

  async createLikeNotification(
    postId: PostId,
    likerUserId: UserId,
    postOwnerUserId: UserId,
  ): Promise<void> {
    const db = createDb();

    try {
      // Get liker's name for the notification
      const liker = await db
        .selectFrom('users')
        .select('name')
        .where('id', '=', likerUserId)
        .executeTakeFirst();

      const likerName = liker?.name || 'Someone';

      await this.createNotification(
        postOwnerUserId,
        'like',
        'New Like',
        `${likerName} liked your post`,
        {
          postId,
          likerUserId,
        },
      );
    } catch (error) {
      console.error(`[Notification] Failed to create like notification:`, error);
    } finally {
      await db.destroy();
    }
  }

  async createCommentNotification(
    postId: PostId,
    commenterUserId: UserId,
    postOwnerUserId: UserId,
    commentText: string,
  ): Promise<void> {
    const db = createDb();

    try {
      // Get commenter's name for the notification
      const commenter = await db
        .selectFrom('users')
        .select('name')
        .where('id', '=', commenterUserId)
        .executeTakeFirst();

      const commenterName = commenter?.name || 'Someone';

      await this.createNotification(
        postOwnerUserId,
        'comment',
        'New Comment',
        `${commenterName} commented on your post: "${commentText.slice(0, 50)}${commentText.length > 50 ? '...' : ''}"`,
        {
          postId,
          commenterUserId,
          commentText,
        },
      );
    } catch (error) {
      console.error(`[Notification] Failed to create comment notification:`, error);
    } finally {
      await db.destroy();
    }
  }

  async createFollowNotification(followerUserId: UserId, followeeUserId: UserId): Promise<void> {
    const db = createDb();

    try {
      // Get follower's name for the notification
      const follower = await db
        .selectFrom('users')
        .select('name')
        .where('id', '=', followerUserId)
        .executeTakeFirst();

      const followerName = follower?.name || 'Someone';

      await this.createNotification(
        followeeUserId,
        'follow',
        'New Follower',
        `${followerName} started following you`,
        {
          followerUserId,
        },
      );
    } catch (error) {
      console.error(`[Notification] Failed to create follow notification:`, error);
    } finally {
      await db.destroy();
    }
  }
}
