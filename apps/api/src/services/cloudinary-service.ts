import { v2 as cloudinary } from 'cloudinary';
import { randomUUID } from 'node:crypto';
import type { PostId, MediaId } from '@musio/shared';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  format: string;
  width?: number;
  height?: number;
  duration?: number;
  bytes: number;
}

export interface MediaUploadOptions {
  folder?: string;
  resource_type?: 'auto' | 'image' | 'video' | 'audio';
  transformation?: any[];
}

export class CloudinaryService {
  private static instance: CloudinaryService;

  public static getInstance(): CloudinaryService {
    if (!CloudinaryService.instance) {
      CloudinaryService.instance = new CloudinaryService();
    }
    return CloudinaryService.instance;
  }

  /**
   * Upload a file to Cloudinary
   */
  async uploadFile(
    filePath: string,
    options: MediaUploadOptions = {}
  ): Promise<CloudinaryUploadResult> {
    const defaultOptions = {
      folder: 'musio',
      resource_type: 'auto' as const,
      ...options,
    };

    try {
      const result = await cloudinary.uploader.upload(filePath, defaultOptions);
      
      return {
        public_id: result.public_id,
        secure_url: result.secure_url,
        format: result.format,
        width: result.width,
        height: result.height,
        duration: result.duration,
        bytes: result.bytes,
      };
    } catch (error) {
      console.error('[CloudinaryService] Upload failed:', error);
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload a file from a URL (e.g., YouTube thumbnail)
   */
  async uploadFromUrl(
    url: string,
    options: MediaUploadOptions = {}
  ): Promise<CloudinaryUploadResult> {
    const defaultOptions = {
      folder: 'musio',
      resource_type: 'auto' as const,
      ...options,
    };

    try {
      const result = await cloudinary.uploader.upload(url, defaultOptions);
      
      return {
        public_id: result.public_id,
        secure_url: result.secure_url,
        format: result.format,
        width: result.width,
        height: result.height,
        duration: result.duration,
        bytes: result.bytes,
      };
    } catch (error) {
      console.error('[CloudinaryService] URL upload failed:', error);
      throw new Error(`Failed to upload from URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload audio file with waveform generation
   */
  async uploadAudioWithWaveform(
    audioPath: string,
    postId: PostId
  ): Promise<{
    audio: CloudinaryUploadResult;
    waveform: CloudinaryUploadResult;
  }> {
    try {
      // Upload audio file
      const audioResult = await this.uploadFile(audioPath, {
        folder: `musio/audio/${postId}`,
        resource_type: 'audio',
        transformation: [
          { quality: 'auto:low' }, // Optimize for streaming
          { fetch_format: 'mp3' }, // Convert to MP3
        ],
      });

      // Generate waveform (Cloudinary can generate waveforms for audio)
      const waveformResult = await this.uploadFile(audioPath, {
        folder: `musio/waveforms/${postId}`,
        resource_type: 'audio',
        transformation: [
          { audio_codec: 'none' }, // Remove audio
          { video_codec: 'auto' }, // Generate video waveform
          { height: 100 }, // Set height
          { crop: 'scale' }, // Scale to fit
        ],
      });

      return {
        audio: audioResult,
        waveform: waveformResult,
      };
    } catch (error) {
      console.error('[CloudinaryService] Audio upload failed:', error);
      throw new Error(`Failed to upload audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload image with optimization
   */
  async uploadImage(
    imagePath: string,
    postId: PostId,
    type: 'cover' | 'thumbnail' = 'cover'
  ): Promise<CloudinaryUploadResult> {
    const transformations = type === 'cover' 
      ? [
          { quality: 'auto:good' },
          { fetch_format: 'auto' },
          { crop: 'fill' },
          { width: 800, height: 600 },
        ]
      : [
          { quality: 'auto:low' },
          { fetch_format: 'auto' },
          { crop: 'fill' },
          { width: 300, height: 200 },
        ];

    return this.uploadFile(imagePath, {
      folder: `musio/images/${postId}`,
      resource_type: 'image',
      transformation: transformations,
    });
  }

  /**
   * Delete a file from Cloudinary
   */
  async deleteFile(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
      console.log(`[CloudinaryService] Deleted file: ${publicId}`);
    } catch (error) {
      console.error('[CloudinaryService] Delete failed:', error);
      throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get a signed URL for secure access (if needed)
   */
  getSignedUrl(publicId: string, transformation?: any[]): string {
    const options = transformation ? { transformation } : {};
    return cloudinary.url(publicId, { secure: true, ...options });
  }

  /**
   * Get file information
   */
  async getFileInfo(publicId: string): Promise<any> {
    try {
      const result = await cloudinary.api.resource(publicId);
      return result;
    } catch (error) {
      console.error('[CloudinaryService] Get file info failed:', error);
      throw new Error(`Failed to get file info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const cloudinaryService = CloudinaryService.getInstance();
