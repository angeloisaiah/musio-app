# 🚂 Railway Deployment Guide for Mus.io API

## 🚨 Current Issue

Your Vercel frontend can't connect to the Railway backend API. This guide will fix the connection issue.

## 🔧 Step-by-Step Fix

### 1. Add PostgreSQL Database to Railway

1. **Go to your Railway dashboard** (railway.app)
2. **Click on your "musio-app" project**
3. **Click "New" → "Database" → "PostgreSQL"**
4. **Wait for provisioning** (1-2 minutes)
5. **Copy the connection string** from the database tab

### 2. Set Environment Variables

In your **musio-app project** (not the database), go to "Variables" and add:

#### Required Variables:

```
DATABASE_URL=your_railway_postgres_connection_string_here
JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random
NODE_ENV=production
PORT=3001
HOST=0.0.0.0
CORS_ORIGINS=https://musio-web.vercel.app,https://musio-bn0oq5vqj-angeloisaiahs-projects.vercel.app,http://localhost:3000,http://localhost:3001
```

#### Optional Variables (for full functionality):

```
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
DISCOGS_TOKEN=your_discogs_token
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
YOUTUBE_API_KEY=your_youtube_api_key
```

### 3. Deploy and Test

1. **Railway will auto-redeploy** when you add variables
2. **Wait for deployment to complete**
3. **Test the API endpoints:**

#### Test Basic API:

```
https://musio-app-production-fbf6.up.railway.app/
```

#### Test Health Check:

```
https://musio-app-production-fbf6.up.railway.app/health
```

#### Test Debug Endpoint:

```
https://musio-app-production-fbf6.up.railway.app/test
```

### 4. Verify Database Connection

The health check should show:

```json
{
  "status": "ok",
  "database": {
    "connected": true
  }
}
```

If `"connected": false`, check your `DATABASE_URL` variable.

### 5. Test Feed Endpoint

Once database is connected:

```
https://musio-app-production-fbf6.up.railway.app/api/feed
```

## 🔍 Troubleshooting

### Database Connection Fails:

- ✅ Check `DATABASE_URL` is set correctly
- ✅ Ensure PostgreSQL is running in Railway
- ✅ Verify SSL settings (Railway handles this automatically)

### CORS Issues:

- ✅ Check `CORS_ORIGINS` includes your Vercel domain
- ✅ Ensure no trailing slashes in URLs

### API Not Responding:

- ✅ Check Railway logs for errors
- ✅ Verify environment variables are set
- ✅ Check if the service is running

## 📱 Frontend Integration

Your Vercel frontend should now work because:

- ✅ API is accessible at Railway URL
- ✅ CORS is configured for Vercel domain
- ✅ Database is connected and responding
- ✅ All endpoints are working

## 🎯 Expected Result

After following this guide:

1. **Railway API responds** to health checks
2. **Database connection** is established
3. **Feed endpoint** returns data (or empty array if no posts)
4. **Vercel frontend** loads without connection errors

## 🆘 Still Having Issues?

1. **Check Railway logs** for specific error messages
2. **Verify all environment variables** are set correctly
3. **Test API endpoints directly** in browser
4. **Check Railway service status** in dashboard
