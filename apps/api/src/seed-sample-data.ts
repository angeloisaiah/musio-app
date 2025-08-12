import 'dotenv/config';
import { createDb } from './db/connection';
import { randomUUID } from 'node:crypto';

async function seedSampleData() {
  const db = createDb();

  try {
    console.log('🌱 Seeding sample data...');

    // Create sample users
    const users = [
      {
        id: randomUUID(),
        name: 'DJ Cosmic',
        email: 'dj.cosmic@example.com',
        avatar_url:
          'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=150&h=150&fit=crop&crop=face',
        bio: 'Electronic music producer and DJ',
        created_at: new Date().toISOString(),
      },
      {
        id: randomUUID(),
        name: 'Beat Maker',
        email: 'beatmaker@example.com',
        avatar_url:
          'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
        bio: 'Hip-hop producer from LA',
        created_at: new Date().toISOString(),
      },
      {
        id: randomUUID(),
        name: 'Synth Queen',
        email: 'synthqueen@example.com',
        avatar_url:
          'https://images.unsplash.com/photo-1494790108755-2616b332c1f5?w=150&h=150&fit=crop&crop=face',
        bio: 'Synthwave and retrowave artist',
        created_at: new Date().toISOString(),
      },
      {
        id: randomUUID(),
        name: 'Bass Drop',
        email: 'bassdrop@example.com',
        avatar_url:
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
        bio: 'Dubstep and bass music producer',
        created_at: new Date().toISOString(),
      },
    ];

    await db.insertInto('users').values(users).execute();
    console.log(`✅ Created ${users.length} sample users`);

    // Create sample posts
    const posts = [
      {
        id: randomUUID(),
        user_id: users[0].id,
        title: 'Cosmic Journey',
        caption:
          'A deep house track that takes you on a journey through space and time. Perfect for late night drives.',
        artist_name: 'DJ Cosmic',
        duration_ms: 240000,
        bpm: 124,
        key: 'A minor',
        visibility: 'public',
        ready: true,
        source_type: 'user',
        cover_url:
          'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&h=500&fit=crop',
        created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        updated_at: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: randomUUID(),
        user_id: users[1].id,
        title: 'Street Rhythms',
        caption: 'Heavy 808s and crispy hi-hats. This beat is fire! 🔥',
        artist_name: 'Beat Maker',
        duration_ms: 180000,
        bpm: 140,
        key: 'C major',
        visibility: 'public',
        ready: true,
        source_type: 'user',
        cover_url:
          'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&h=500&fit=crop',
        created_at: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        updated_at: new Date(Date.now() - 7200000).toISOString(),
      },
      {
        id: randomUUID(),
        user_id: users[2].id,
        title: 'Neon Dreams',
        caption: 'Synthwave vibes with a touch of nostalgia. Transport yourself to the 80s.',
        artist_name: 'Synth Queen',
        duration_ms: 200000,
        bpm: 110,
        key: 'E minor',
        visibility: 'public',
        ready: true,
        source_type: 'user',
        cover_url:
          'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&h=500&fit=crop',
        created_at: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
        updated_at: new Date(Date.now() - 10800000).toISOString(),
      },
      {
        id: randomUUID(),
        user_id: users[3].id,
        title: 'Drop the Bass',
        caption: 'Massive bass drop incoming! Turn up your speakers and feel the wobble.',
        artist_name: 'Bass Drop',
        duration_ms: 220000,
        bpm: 150,
        key: 'F# minor',
        visibility: 'public',
        ready: true,
        source_type: 'user',
        cover_url:
          'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&h=500&fit=crop',
        created_at: new Date(Date.now() - 14400000).toISOString(), // 4 hours ago
        updated_at: new Date(Date.now() - 14400000).toISOString(),
      },
      {
        id: randomUUID(),
        user_id: users[0].id,
        title: 'Ambient Spaces',
        caption: 'Chill ambient track for studying, meditation, or just relaxing.',
        artist_name: 'DJ Cosmic',
        duration_ms: 300000,
        bpm: 85,
        key: 'D major',
        visibility: 'public',
        ready: true,
        source_type: 'user',
        cover_url:
          'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&h=500&fit=crop',
        created_at: new Date(Date.now() - 18000000).toISOString(), // 5 hours ago
        updated_at: new Date(Date.now() - 18000000).toISOString(),
      },
    ];

    await db.insertInto('posts').values(posts).execute();
    console.log(`✅ Created ${posts.length} sample posts`);

    // Create sample media files (preview audio)
    const mediaFiles = posts.map((post) => ({
      id: randomUUID(),
      post_id: post.id,
      url: `https://www.soundjay.com/misc/sounds-1015.mp3`, // Sample audio URL
      type: 'preview' as const,
      mime: 'audio/mpeg',
      size: 1024000, // 1MB
      duration_ms: post.duration_ms,
      width: null,
      height: null,
    }));

    await db.insertInto('media_files').values(mediaFiles).execute();
    console.log(`✅ Created ${mediaFiles.length} sample media files`);

    // Create sample tags
    const tags = [
      { name: 'House', normalized: 'house' },
      { name: 'Hip-Hop', normalized: 'hip-hop' },
      { name: 'Synthwave', normalized: 'synthwave' },
      { name: 'Dubstep', normalized: 'dubstep' },
      { name: 'Ambient', normalized: 'ambient' },
      { name: 'Electronic', normalized: 'electronic' },
      { name: 'Chill', normalized: 'chill' },
      { name: 'Bass', normalized: 'bass' },
    ];

    const insertedTags = await db.insertInto('tags').values(tags).returning('id').execute();
    console.log(`✅ Created ${insertedTags.length} sample tags`);

    // Link posts to tags
    const postTags = [
      { post_id: posts[0].id, tag_id: insertedTags[0].id }, // Cosmic Journey - House
      { post_id: posts[0].id, tag_id: insertedTags[5].id }, // Cosmic Journey - Electronic
      { post_id: posts[1].id, tag_id: insertedTags[1].id }, // Street Rhythms - Hip-Hop
      { post_id: posts[1].id, tag_id: insertedTags[7].id }, // Street Rhythms - Bass
      { post_id: posts[2].id, tag_id: insertedTags[2].id }, // Neon Dreams - Synthwave
      { post_id: posts[2].id, tag_id: insertedTags[5].id }, // Neon Dreams - Electronic
      { post_id: posts[3].id, tag_id: insertedTags[3].id }, // Drop the Bass - Dubstep
      { post_id: posts[3].id, tag_id: insertedTags[7].id }, // Drop the Bass - Bass
      { post_id: posts[4].id, tag_id: insertedTags[4].id }, // Ambient Spaces - Ambient
      { post_id: posts[4].id, tag_id: insertedTags[6].id }, // Ambient Spaces - Chill
    ];

    await db.insertInto('post_tags').values(postTags).execute();
    console.log(`✅ Created ${postTags.length} post-tag associations`);

    // Create sample analytics
    const analytics = posts.map((post) => ({
      post_id: post.id,
      views: BigInt(Math.floor(Math.random() * 10000) + 100),
      plays: BigInt(Math.floor(Math.random() * 5000) + 50),
      likes: BigInt(Math.floor(Math.random() * 1000) + 10),
      reposts: BigInt(Math.floor(Math.random() * 200) + 5),
    }));

    await db.insertInto('analytics').values(analytics).execute();
    console.log(`✅ Created analytics for ${analytics.length} posts`);

    // Create some sample likes and comments
    const likes: Array<{ id: string; post_id: string; user_id: string; created_at: string }> = [];
    const comments: Array<{
      id: string;
      post_id: string;
      user_id: string;
      text: string;
      created_at: string;
    }> = [];

    for (let i = 0; i < 20; i++) {
      const randomPost = posts[Math.floor(Math.random() * posts.length)];
      const randomUser = users[Math.floor(Math.random() * users.length)];

      // Avoid duplicate likes
      const likeExists = likes.some(
        (like) => like.post_id === randomPost.id && like.user_id === randomUser.id,
      );

      if (!likeExists) {
        likes.push({
          id: randomUUID(),
          post_id: randomPost.id,
          user_id: randomUser.id,
          created_at: new Date(Date.now() - Math.random() * 86400000).toISOString(),
        });
      }
    }

    if (likes.length > 0) {
      await db.insertInto('likes').values(likes).execute();
      console.log(`✅ Created ${likes.length} sample likes`);
    }

    // Add some comments
    const sampleComments = [
      'This is fire! 🔥',
      'Love the vibe on this one',
      'Perfect for my workout playlist',
      'The bass hits different',
      'More tracks like this please!',
      'Instant classic',
      "Can't stop listening to this",
      'The production quality is amazing',
    ];

    for (let i = 0; i < 15; i++) {
      const randomPost = posts[Math.floor(Math.random() * posts.length)];
      const randomUser = users[Math.floor(Math.random() * users.length)];
      const randomComment = sampleComments[Math.floor(Math.random() * sampleComments.length)];

      comments.push({
        id: randomUUID(),
        post_id: randomPost.id,
        user_id: randomUser.id,
        text: randomComment,
        created_at: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      });
    }

    await db.insertInto('comments').values(comments).execute();
    console.log(`✅ Created ${comments.length} sample comments`);

    console.log('🎉 Sample data seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`- ${users.length} users`);
    console.log(`- ${posts.length} posts`);
    console.log(`- ${mediaFiles.length} media files`);
    console.log(`- ${tags.length} tags`);
    console.log(`- ${postTags.length} post-tag associations`);
    console.log(`- ${analytics.length} analytics records`);
    console.log(`- ${likes.length} likes`);
    console.log(`- ${comments.length} comments`);
  } catch (error) {
    console.error('❌ Error seeding sample data:', error);
    throw error;
  } finally {
    await db.destroy();
  }
}

// Run the seeder
seedSampleData().catch(console.error);
