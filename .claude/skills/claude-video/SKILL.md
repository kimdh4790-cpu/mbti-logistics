---
name: claude-video
description: Lets Claude review video output by extracting frames and analyzing them. Use when you need Claude to verify video quality, check animation timing, or review rendered output files.
metadata:
  origin: bradautomates/claude-video
---

# Claude Video Review

Extract frames from video files and analyze them so Claude can assess quality, timing, and content.

## When to Activate

- After generating a video (Remotion, Playwright, FFmpeg, Runway)
- User asks "does it look good?", "check the video", "review output"
- Verifying animation before upload

## How to Review a Video

### Extract frames with FFmpeg

```bash
# Extract 1 frame per second
ffmpeg -i output/<product>-promo.mp4 -vf fps=1 /tmp/frames/frame_%03d.png

# Extract specific frames (e.g., frame at 2s, 5s, 10s)  
ffmpeg -i output/<product>-promo.mp4 -ss 2 -frames:v 1 /tmp/frame_2s.png
ffmpeg -i output/<product>-promo.mp4 -ss 5 -frames:v 1 /tmp/frame_5s.png
```

### Read and analyze

Use the Read tool to view PNG frames visually, then assess:
- Text legibility and Korean font rendering
- Layout alignment and spacing
- Animation progress (early/mid/late frame comparison)
- Color accuracy (navy #08101f + gold #c9a84c)
- 720×1280 aspect ratio correct

### Checklist for social media video

- [ ] 720×1280 (9:16 vertical for Reels/Shorts)
- [ ] Text readable on mobile (min 14px equivalent)
- [ ] Brand colors visible
- [ ] No blank frames at start/end
- [ ] Under 60s for YouTube Shorts / under 90s for Reels

## For This Project

Products: filo, dine, donway, yongcha, inflearn, mbtico
Output dir: `/home/user/mbti-logistics/output/`
