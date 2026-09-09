---
name: google-youtube
description: YouTube Data API v3 patterns for this project. Use when working on YouTube upload, video metadata, thumbnails, or quota management.
metadata:
  origin: google/skills (adapted)
---

# YouTube Data API v3 — Project Patterns

## Setup
- Quota: 10,000 units/day (free)
- Upload cost: 1,600 units per video
- Max videos/day: ~6 uploads on free quota
- Script: `scripts/upload/upload-youtube-api.js`

## Auth Flow (OAuth2 Refresh Token)
```js
// Exchange refresh token for access token
const res = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    client_id:     process.env.YOUTUBE_CLIENT_ID,
    client_secret: process.env.YOUTUBE_CLIENT_SECRET,
    refresh_token: process.env.YOUTUBE_REFRESH_TOKEN,
    grant_type:    'refresh_token',
  }),
})
const { access_token } = await res.json()
```

## Upload Video (resumable upload)
```js
// Step 1: Initialize upload session
const init = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'X-Upload-Content-Type': 'video/mp4',
  },
  body: JSON.stringify({
    snippet: { title, description, tags, categoryId: '22' },
    status: { privacyStatus: 'public' },
  }),
})
const uploadUrl = init.headers.get('location')

// Step 2: Upload file
const videoData = fs.readFileSync(videoPath)
await fetch(uploadUrl, {
  method: 'PUT',
  headers: { 'Content-Type': 'video/mp4', 'Content-Length': videoData.length },
  body: videoData,
})
```

## Set Thumbnail
```js
await fetch(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${videoId}&uploadType=media`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'image/jpeg' },
  body: fs.readFileSync(thumbnailPath),
})
```

## Environment Variables (GitHub Secrets)
- `YOUTUBE_CLIENT_ID`
- `YOUTUBE_CLIENT_SECRET`  
- `YOUTUBE_REFRESH_TOKEN`

## Quota Management
- Check remaining: `youtube.quota.units_remaining` (via Analytics API)
- If quota exceeded: skip YouTube upload, continue Instagram
- `continue-on-error: true` in social-media.yml prevents full pipeline failure
