# TROUBLESHOOTING.md

## Common Issues & Solutions

Help for troubleshooting Photography Coach AI.

---

## Table of Contents

1. [Getting Started Issues](#getting-started-issues)
2. [API Integration Problems](#api-integration-problems)
3. [Image Upload Issues](#image-upload-issues)
4. [Analysis & Chat Problems](#analysis--chat-problems)
5. [Performance Issues](#performance-issues)
6. [Deployment Issues](#deployment-issues)

---

## Getting Started Issues

### Issue: "API Key not found"

**Symptom:** Error message appears when trying to analyze photo

**Causes:**
- `.env.local` file missing
- Key not correctly set
- Key has expired

**Solution:**

1. Create `.env.local` in project root:
```bash
touch .env.local
```

2. Add your key:
```env
VITE_GEMINI_API_KEY=your_key_here
```

3. Restart development server:
```bash
npm run dev
```

4. Clear browser cache (Ctrl+Shift+Del or Cmd+Shift+Del)

5. If still not working, regenerate key:
   - Go to [ai.google.dev/app/apikey](https://ai.google.dev/app/apikey)
   - Click "Delete" on existing key
   - Click "Create API Key"
   - Copy new key to `.env.local`

---

### Issue: "Cannot find module" errors

**Symptom:** Build fails with import errors

**Causes:**
- Missing dependencies
- Incorrect import paths
- TypeScript configuration issue

**Solution:**

1. Reinstall dependencies:
```bash
rm -rf node_modules package-lock.json
npm install
```

2. Check import paths are correct:
```typescript
// ✅ Correct
import { analyzeImage } from './services/geminiService'

// ❌ Wrong
import { analyzeImage } from '../geminiService'
```

3. Verify tsconfig.json paths:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

---

## API Integration Problems

### Issue: Same node works in Rufus, but Photography Coach shows API unavailable

**Symptom:**
- Main site binds the same node/model to both tools
- `Rufus` shows green
- Photography Coach shows `API unavailable`, `API checking`, or fails before real image analysis starts

**What this usually means:**
- This is often **not** a model-capability issue
- The first thing to check is whether the tool is reaching the upstream through the same network path
- A node can be healthy through one egress path and blocked through another

**Real case we hit on 2026-04-13:**
- `ark | bytedance-seed/dola-seed-2.0-pro | https://windhub.cc`
- Rufus route stayed healthy
- Photography Coach route failed even for a plain text probe
- Root cause: Photography Coach was using its own Vercel serverless `fetch(node.url, ...)`, while the stable path was the main-site proxy
- `windhub.cc` returned a Cloudflare challenge page to the tool-side serverless egress, so the tool looked "red" before image analysis even began

**Current fix in this repo:**
- `api/analyze/status.js` and `api/analyze.js` now call the shared transport helper in [`api/_lib/runtimeConfig.js`](C:\Users\admin\Desktop\Photography-Coach-AI-Handover\api\_lib\runtimeConfig.js)
- That helper prefers `https://001027.xyz/api/proxy?url=...`
- If the proxy itself returns a retryable transport error, the route falls back to direct fetch
- Successful proxy use is returned in the JSON payload as `transport: "muxing-proxy"`

**How to verify quickly:**

1. Call the Photography Coach route directly:
```bash
curl -X POST "https://picture.001027.xyz/api/analyze/status" \
  -H "Content-Type: application/json" \
  -d '{"runtimeConfig":{"nodeName":"ark","baseUrl":"https://windhub.cc","apiKey":"***","model":"bytedance-seed/dola-seed-2.0-pro"}}'
```

2. Check the response body:
- If `transport` is `muxing-proxy`, the route is using the stable proxy path
- If the error body is now a real upstream JSON error such as `401 invalid token`, the old "egress blocked by challenge page" problem is already removed
- If the response still contains HTML like `Just a moment...`, you are still hitting an upstream challenge page somewhere in the chain

3. Compare with Rufus only after confirming transport:
- Do not assume a green Rufus result means the Photography Coach route is already testing the same path
- The key question is whether both tools are using the same egress path, not just the same node config

**Important debugging rule:**
- `Rufus green + Photography Coach red` does **not** automatically mean "vision model unsupported"
- If the Photography Coach plain text status probe fails first, debug transport and auth before debugging image capability

---

### Issue: Chinese node names crash the route with `FUNCTION_INVOCATION_FAILED`

**Symptom:**
- Tool route returns `500`
- Vercel may show `FUNCTION_INVOCATION_FAILED`
- This can happen only on nodes with Chinese names such as `云雾`

**Root cause:**
- Node/Vercel response headers reject non-ASCII values
- Earlier versions wrote the active node name directly into `X-Active-Node`
- A Chinese node name could crash the function before the real API result was returned

**Current fix in this repo:**
- [`api/_lib/runtimeConfig.js`](C:\Users\admin\Desktop\Photography-Coach-AI-Handover\api\_lib\runtimeConfig.js) now sanitizes route headers
- Only ASCII-safe values are written to `X-Active-Node`, `X-Active-Model`, `X-Config-Source`, and `X-Api-Status`
- The full human-readable node name still remains available in the JSON response body

**How to verify quickly:**
- Bind a node with a Chinese display name
- Call `/api/analyze/status`
- The route should return JSON instead of crashing, even if the upstream API itself is unhealthy

---

### Issue: "PERMISSION_DENIED" Error

**Symptom:** 
```
Error: PERMISSION_DENIED: Could not verify the provided API key
```

**Causes:**
- Invalid API key
- API key from wrong project
- API not enabled
- Key restricted to specific domains

**Solution:**

1. Verify key format:
```bash
echo $VITE_GEMINI_API_KEY  # Should output: sk-...
```

2. Test key directly:
```bash
curl -X GET "https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_KEY"
# Should return list of available models
```

3. Check in Google AI Studio:
   - Go to [ai.google.dev/app/apikey](https://ai.google.dev/app/apikey)
   - Verify key shows as "Active"
   - Check restrictions are not set

4. Regenerate key if needed:
   - Delete old key
   - Create new key
   - Copy to `.env.local`
   - Restart app

**Muxing-specific note:**
- If a proxied route now returns a clean upstream `401` or `403` JSON error, treat that as a real credential problem
- Before 2026-04-13, some node failures were masked by egress-block pages; after the proxy-aware transport fix, auth errors are more trustworthy

---

### Issue: "RESOURCE_EXHAUSTED" Error

**Symptom:**
```
Error: RESOURCE_EXHAUSTED: Quota exceeded for quota metric 'requests-per-minute'
```

**Causes:**
- Too many requests too quickly
- API quota limit reached
- Rate limit exceeded

**Solution:**

1. **Implement retry with backoff:**
```typescript
async function withExponentialBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 5
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error: any) {
      if (error.message.includes('RESOURCE_EXHAUSTED')) {
        const delay = Math.pow(2, i) * 1000 // 1s, 2s, 4s, 8s, 16s
        console.log(`Retrying in ${delay}ms...`)
        await new Promise(r => setTimeout(r, delay))
      } else {
        throw error
      }
    }
  }
  throw new Error('Max retries exceeded')
}
```

2. **Upgrade API plan:**
   - Go to [console.cloud.google.com](https://console.cloud.google.com)
   - Navigate to Billing
   - Upgrade from free to paid tier
   - No credit card required for initial free credits

3. **Check current quotas:**
```bash
gcloud compute project-info describe --project=YOUR_PROJECT
```

---

### Issue: "Invalid Image Format"

**Symptom:**
```
Error: INVALID_ARGUMENT: Image format not supported
```

**Causes:**
- Unsupported file type (GIF, BMP, SVG)
- Corrupted image file
- Image too large

**Solution:**

1. **Check file format:**
```typescript
const supportedFormats = ['image/jpeg', 'image/png', 'image/webp']
const file = document.querySelector('input[type="file"]').files[0]

if (!supportedFormats.includes(file.type)) {
  console.error(`Unsupported format: ${file.type}`)
  // Convert or reject
}
```

2. **Convert image to JPEG:**
```bash
# macOS/Linux
ffmpeg -i image.gif -f image2 -c:v mjpeg output.jpg

# Or online: https://convertio.co/image-converter/
```

3. **Compress image size:**
```typescript
async function compressImage(file: File): Promise<File> {
  const canvas = await new Promise<HTMLCanvasElement>(resolve => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 1024
      canvas.height = 768
      canvas.getContext('2d')?.drawImage(img, 0, 0, 1024, 768)
      resolve(canvas)
    }
    img.src = URL.createObjectURL(file)
  })

  return new Promise<File>(resolve => {
    canvas.toBlob(blob => {
      resolve(new File([blob!], file.name, { type: 'image/jpeg' }))
    }, 'image/jpeg', 0.8)
  })
}
```

---

## Image Upload Issues

### Issue: "File too large" Error

**Symptom:**
```
Error: File size exceeds maximum allowed size (10MB)
```

**Causes:**
- Image file > 10MB
- Need to compress

**Solution:**

1. **Reduce file size:**
```bash
# macOS/Linux
sips -Z 1024 image.jpg  # Resize to max 1024px

# Or use online tool
# https://tinyjpg.com/
# https://imageoptimizer.net/
```

2. **Use built-in compression:**
```typescript
const maxSize = 10 * 1024 * 1024 // 10MB

if (file.size > maxSize) {
  const compressed = await compressImage(file)
  return compressed
}
```

---

### Issue: "Drag-drop not working"

**Symptom:**
- Files don't upload when dragging to upload area
- Drop zone doesn't highlight

**Causes:**
- Event handlers not attached
- Browser permissions issue
- File type restricted

**Solution:**

1. **Check event listeners:**
```typescript
// Ensure these event handlers exist
element.addEventListener('dragover', (e) => {
  e.preventDefault()
  element.style.background = '#f0f0f0'
})

element.addEventListener('drop', (e) => {
  e.preventDefault()
  const files = e.dataTransfer?.files
  if (files) handleFiles(files)
})
```

2. **Test with file input:**
```html
<input type="file" accept="image/*" />
```

3. **Check browser console for errors:**
```bash
# Press F12 in browser
# Check Console tab for error messages
```

---

## Analysis & Chat Problems

### Issue: "Analysis takes too long"

**Symptom:**
- Photo loading indicator spins for >10 seconds
- "Thinking" process never completes

**Causes:**
- Network latency
- Large image size
- API processing delay
- Browser timeout

**Solution:**

1. **Increase timeout:**
```typescript
const timeout = 30000 // 30 seconds

const controller = new AbortController()
const timeoutId = setTimeout(() => controller.abort(), timeout)

try {
  const response = await fetch(url, { signal: controller.signal })
  clearTimeout(timeoutId)
  return response
} catch (error) {
  if (error.name === 'AbortError') {
    console.error('Request timeout')
  }
}
```

2. **Compress image before upload:**
```typescript
const compressed = await compressImage(file)
const result = await analyzeImage(compressed, skillLevel)
```

3. **Check network:**
   - Open DevTools (F12)
   - Go to Network tab
   - Analyze request times
   - Check if image upload is slow

---

### Issue: "Chat response empty or incomplete"

**Symptom:**
- Mentor chat returns blank response
- Response cuts off mid-sentence

**Causes:**
- Token limit reached
- API error not caught
- Conversation history too long
- Network interrupted

**Solution:**

1. **Clear conversation history:**
```typescript
// In browser console
localStorage.removeItem('conversation')
location.reload()
```

2. **Check conversation length:**
```typescript
const tokenEstimate = conversation.reduce((sum, msg) => {
  return sum + (msg.content.length / 4) // Rough estimate
}, 0)

if (tokenEstimate > 8000) {
  // Conversation too long, clear it
  conversation = []
}
```

3. **Implement streaming response:**
```typescript
const response = await fetch(url, {
  headers: { 'Accept': 'text/event-stream' }
})

// Handle streaming response chunks
```

---

## Performance Issues

### Issue: "App feels slow" or "Laggy"

**Symptom:**
- UI freezes during analysis
- Tabs slow to switch
- Chat response time > 5s

**Causes:**
- Large re-renders
- Unoptimized components
- Memory leaks
- Too many listeners

**Solution:**

1. **Enable Performance monitoring:**
```typescript
// Add to geminiService.ts
const startTime = performance.now()
const result = await analyzeImage(photo, skillLevel)
const endTime = performance.now()

console.log(`Analysis time: ${endTime - startTime}ms`)
```

2. **Optimize components with memo:**
```typescript
const SpatialOverlay = React.memo(SpatialOverlayComponent, (prev, next) => {
  return prev.analysis === next.analysis
})
```

3. **Check DevTools Performance tab:**
   - F12 → Performance tab
   - Click Record
   - Interact with app
   - Click Stop
   - Analyze flame chart

4. **Reduce unnecessary re-renders:**
```typescript
// ✅ Good: Memoize props
const Component = React.memo(({ analysis }) => {
  return <div>{analysis.critique}</div>
})

// ❌ Bad: Creates new object each render
export function Parent() {
  const analysis = { scores: { composition: 8 } } // New object each render
  return <Component analysis={analysis} />
}
```

---

## Deployment Issues

### Issue: "App won't deploy to Vercel"

**Symptom:**
- Build fails on Vercel
- "Command failed" error
- Deployment canceled

**Causes:**
- Environment variable missing
- Build configuration wrong
- Node version mismatch

**Solution:**

1. **Add environment variable:**
   - Vercel Dashboard → Settings → Environment Variables
   - Add: `VITE_GEMINI_API_KEY` = `your_key`
   - Redeploy

2. **Check build logs:**
   - Click deployment in Vercel
   - Go to Logs tab
   - Read error message
   - Fix indicated issue

3. **Verify build locally:**
```bash
npm run build
npm run preview
# Should work without errors
```

---

### Issue: "App deployed but API key not working"

**Symptom:**
- App works locally
- 404 or "PERMISSION_DENIED" on production

**Causes:**
- Environment variable not set in production
- API key format wrong
- CORS issue

**Solution:**

1. **Verify env var in production:**
```typescript
// In app.tsx
console.log('VITE_GEMINI_API_KEY:', import.meta.env.VITE_GEMINI_API_KEY)

// Should not be empty
```

2. **Check Vercel environment:**
   - Dashboard → Settings → Environment Variables
   - Confirm `VITE_GEMINI_API_KEY` is set
   - Click "Redeploy" to apply changes

3. **Test API key:**
```bash
curl "https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_KEY"
```

---

### Issue: "CORS error in production"

**Symptom:**
```
Access to XMLHttpRequest blocked by CORS policy
```

**Causes:**
- API key not public
- Wrong origin

**Solution:**

1. **Make API key public (safe for browser):**
   - [ai.google.dev/app/apikey](https://ai.google.dev/app/apikey)
   - Click on key
   - In restrictions, select "None" or "HTTP referrers"
   - Save

2. **Check CORS headers:**
   - Browser DevTools → Network tab
   - Click failed request
   - Check Response Headers
   - Should have `Access-Control-Allow-Origin: *`

---

## General Debugging

### Enable Debug Logging

```typescript
// Add to geminiService.ts
const DEBUG = true

function debug(message: string, data?: any) {
  if (DEBUG) {
    console.log(`[Photography Coach] ${message}`, data || '')
  }
}

// Usage:
debug('Starting analysis', { skillLevel })
```

### Browser DevTools

1. **Console:**
   - F12 → Console tab
   - Look for error messages
   - Copy full error text for research

2. **Network:**
   - F12 → Network tab
   - Perform action
   - Analyze request/response
   - Check status code, headers, body

3. **Application:**
   - F12 → Application tab
   - Check localStorage/sessionStorage
   - Clear cache if needed

4. **Performance:**
   - F12 → Performance tab
   - Record interaction
   - Analyze flame chart
   - Identify slow components

---

## Still Need Help?

1. **Check existing issues:** [GitHub Issues](https://github.com/prasadt1/photography-coach-ai/issues)

2. **Search this doc:** Ctrl+F (or Cmd+F) to search keywords

3. **Read related files:**
   - `API_REFERENCE.md` – API integration details
   - `ARCHITECTURE.md` – System design
   - `DEPLOYMENT.md` – Deployment options

4. **Create new issue:**
   - Go to [GitHub Issues](https://github.com/prasadt1/photography-coach-ai/issues)
   - Click "New Issue"
   - Describe problem with:
     - Steps to reproduce
     - Error message (full text)
     - Browser/OS version
     - Screenshots if helpful

---

**Last Updated:** December 2025  
**Maintained By:** Prasad T
