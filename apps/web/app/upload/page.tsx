'use client';
import { useState } from 'react';

export default function UploadPage() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [artistName, setArtistName] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  async function uploadFile(file: File, type: 'audio' | 'video' | 'cover'): Promise<string | null> {
    const token = localStorage.getItem('jwt_token');
    if (!token) throw new Error('No auth token');

    setMessage(`Requesting ${type} upload URL...`);
    const presign = await fetch(`${base}/api/media/presign`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({
        fileName: file.name,
        contentType: file.type || 'application/octet-stream',
      }),
    });

    if (!presign.ok) throw new Error(`Failed to presign ${type}`);

    const { uploadUrl, fileKey } = await presign.json();
    setMessage(`Uploading ${type}...`);

    const put = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: { 'content-type': file.type || 'application/octet-stream' },
    });

    if (!put.ok) throw new Error(`${type} upload failed`);

    return fileKey;
  }

  async function onUpload() {
    if ((!audioFile && !videoFile) || !title) {
      setMessage('Select at least an audio or video file and enter a title');
      return;
    }

    const token = localStorage.getItem('jwt_token');
    if (!token) {
      setMessage('Please login');
      return;
    }

    try {
      setMessage('Starting upload...');
      const uploadedFiles: { [key: string]: string } = {};

      // Upload audio file
      if (audioFile) {
        const audioKey = await uploadFile(audioFile, 'audio');
        if (audioKey) uploadedFiles.audioKey = audioKey;
      }

      // Upload video file
      if (videoFile) {
        const videoKey = await uploadFile(videoFile, 'video');
        if (videoKey) uploadedFiles.videoKey = videoKey;
      }

      // Upload cover file
      if (coverFile) {
        const coverKey = await uploadFile(coverFile, 'cover');
        if (coverKey) uploadedFiles.coverKey = coverKey;
      }

      setMessage('Creating post...');
      const res = await fetch(`${base}/api/posts/enhanced`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title,
          caption,
          artistName: artistName || null,
          ...uploadedFiles,
          audioMime: audioFile?.type,
          videoMime: videoFile?.type,
          coverMime: coverFile?.type,
          audioSize: audioFile?.size,
          videoSize: videoFile?.size,
          coverSize: coverFile?.size,
        }),
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(`Failed to create post: ${error}`);
      }

      const data = await res.json();
      setMessage(`Created post ${data.id} (${data.status})`);

      // Reset form
      setAudioFile(null);
      setVideoFile(null);
      setCoverFile(null);
      setTitle('');
      setCaption('');
      setArtistName('');
    } catch (error) {
      console.error('Upload error:', error);
      setMessage(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return (
    <main className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-center">Upload Your Sample</h1>

      <div className="bg-neutral-900 rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-semibold mb-4">Media Files</h2>

        {/* Audio File */}
        <div>
          <label className="block text-sm font-medium mb-2">Audio File *</label>
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
            className="w-full p-3 rounded bg-neutral-800 border border-neutral-700 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700"
          />
          {audioFile && <p className="text-sm text-green-400 mt-1">✓ {audioFile.name}</p>}
        </div>

        {/* Video File (Optional) */}
        <div>
          <label className="block text-sm font-medium mb-2">Video File (Optional)</label>
          <input
            type="file"
            accept="video/*"
            onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
            className="w-full p-3 rounded bg-neutral-800 border border-neutral-700 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-purple-600 file:text-white hover:file:bg-purple-700"
          />
          {videoFile && <p className="text-sm text-green-400 mt-1">✓ {videoFile.name}</p>}
        </div>

        {/* Cover Art (Optional) */}
        <div>
          <label className="block text-sm font-medium mb-2">Cover Art (Optional)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
            className="w-full p-3 rounded bg-neutral-800 border border-neutral-700 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-orange-600 file:text-white hover:file:bg-orange-700"
          />
          {coverFile && <p className="text-sm text-green-400 mt-1">✓ {coverFile.name}</p>}
        </div>
      </div>

      <div className="bg-neutral-900 rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-semibold mb-4">Track Information</h2>

        <div>
          <label className="block text-sm font-medium mb-2">Title *</label>
          <input
            className="w-full p-3 rounded bg-neutral-800 border border-neutral-700 focus:border-blue-500 focus:outline-none"
            placeholder="Enter track title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Artist Name</label>
          <input
            className="w-full p-3 rounded bg-neutral-800 border border-neutral-700 focus:border-blue-500 focus:outline-none"
            placeholder="Enter artist or producer name"
            value={artistName}
            onChange={(e) => setArtistName(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Caption</label>
          <textarea
            className="w-full p-3 rounded bg-neutral-800 border border-neutral-700 focus:border-blue-500 focus:outline-none resize-none"
            placeholder="Describe your sample..."
            rows={3}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-4">
        <button
          className="flex-1 p-3 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
          onClick={onUpload}
          disabled={(!audioFile && !videoFile) || !title}
        >
          Upload Sample
        </button>
        <button
          className="px-6 py-3 rounded-lg bg-neutral-700 hover:bg-neutral-600 transition-colors"
          onClick={() => {
            setAudioFile(null);
            setVideoFile(null);
            setCoverFile(null);
            setTitle('');
            setCaption('');
            setArtistName('');
            setMessage(null);
          }}
        >
          Clear
        </button>
      </div>

      {message && (
        <div className="p-4 rounded-lg bg-neutral-800 border-l-4 border-blue-500">
          <div className="text-sm text-neutral-300">{message}</div>
        </div>
      )}

      <div className="text-sm text-neutral-400 text-center">
        You must sign up or log in first. Upload audio files, optional video, and cover art for the
        best TikTok-style experience!
      </div>
    </main>
  );
}
