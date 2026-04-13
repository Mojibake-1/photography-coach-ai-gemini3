# DEPLOYMENT.md

## Production Deployment Guide

This guide covers deploying Photography Coach AI to production environments.

---

## Table of Contents

1. [Local Development](#local-development)
2. [Docker Deployment](#docker-deployment)
3. [Vercel (Recommended)](#vercel-recommended)
4. [Google Cloud Run](#google-cloud-run)
5. [Environment Variables](#environment-variables)
6. [Production Checklist](#production-checklist)

---

## Local Development

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Git

### Setup

```bash
# Clone repository
git clone https://github.com/prasadt1/photography-coach-ai.git
cd photography-coach-ai

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Add your Gemini API key
echo "VITE_GEMINI_API_KEY=your_key_here" >> .env.local

# Start development server
npm run dev
```

Visit `http://localhost:5173`

### Development Commands

```bash
npm run dev       # Start dev server
npm run build     # Build for production
npm run preview   # Preview production build
npm run lint      # Lint code
npm run type-check # Check TypeScript
```

---

## Docker Deployment

### Build Image

```bash
# Build Docker image
docker build -t photography-coach-ai:latest .

# Or with build args
docker build \
  --build-arg VITE_GEMINI_API_KEY=your_key \
  -t photography-coach-ai:latest .
```

### Run Container

```bash
# Run with environment variable
docker run \
  -p 8501:5173 \
  -e VITE_GEMINI_API_KEY=your_key \
  photography-coach-ai:latest

# Or mount .env.local file
docker run \
  -p 8501:5173 \
  --env-file .env.local \
  photography-coach-ai:latest
```

Access at `http://localhost:8501`

### Docker Compose (Optional)

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "8501:5173"
    environment:
      VITE_GEMINI_API_KEY: ${GEMINI_API_KEY}
    restart: always
```

Run with:
```bash
docker-compose up -d
```

---

## Vercel (Recommended)

### Prerequisites

- Vercel account (free tier available)
- GitHub account
- GitHub repository

### Deployment Steps

1. **Connect Repository**
   - Go to [vercel.com](https://vercel.com)
   - Click "Import Project"
   - Select your GitHub repository
   - Click "Import"

2. **Configure Environment**
   - Set Project Name: `photography-coach-ai`
   - Select Framework: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`

3. **Add Environment Variables**
   - Click "Environment Variables"
   - Add `VITE_GEMINI_API_KEY` → Your API key
   - Click "Deploy"

4. **Domain Setup (Optional)**
   - After deployment, add custom domain
   - Configure DNS records
   - Enable HTTPS (automatic)

### Muxing Bridge Deployment Notes

This project is not just a standalone Vite app. In production it is also embedded under the Muxing main site and receives runtime API config from the parent shell.

For embedded mode to be reliable, keep these assumptions true:

1. **Tool routes must accept runtime config from the request**
- The API handlers read `runtimeConfig`, `muxingConfig`, or `apiConfig` from the request body
- They also support `x-muxing-*` headers as a fallback path

2. **Tool routes should prefer the main-site proxy for upstream model calls**
- Current implementation lives in [`api/_lib/runtimeConfig.js`](C:\Users\admin\Desktop\Photography-Coach-AI-Handover\api\_lib\runtimeConfig.js)
- The helper prefers `https://001027.xyz/api/proxy`
- This avoids upstream providers that challenge or block the tool deployment's own egress
- You can override the origin with `MUXING_PROXY_ORIGIN` or `AI_PROXY_ORIGIN`
- You can disable proxy usage with `MUXING_PROXY_ENABLED=0`

3. **Do not put Chinese or other non-ASCII values into response headers**
- Vercel/Node can reject them and fail the function
- Keep user-facing names in JSON
- Keep headers ASCII-safe only

4. **When validating a node, compare transport before comparing tool health**
- If one tool is green and another is red, verify whether both are using the same egress path
- Look for `transport: "muxing-proxy"` in the route JSON when debugging

### Recommended Environment Variables for Embedded Deployments

```env
# Optional but recommended when embedded under 001027 main site
MUXING_PROXY_ORIGIN=https://001027.xyz

# Leave enabled unless you intentionally need direct upstream fetch
MUXING_PROXY_ENABLED=1
```

### Auto-Deployment

After initial setup, any push to main branch automatically deploys:

```bash
git add .
git commit -m "Update features"
git push origin main
# Automatic deployment starts
```

Check deployment status: [vercel.com/dashboard](https://vercel.com/dashboard)

---

## Google Cloud Run

### Prerequisites

- Google Cloud Project
- gcloud CLI installed
- Docker configured

### Deployment Steps

1. **Authenticate**
```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

2. **Build & Push Image**
```bash
# Build image
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/photography-coach-ai

# Or use Docker directly
docker tag photography-coach-ai:latest gcr.io/YOUR_PROJECT_ID/photography-coach-ai
docker push gcr.io/YOUR_PROJECT_ID/photography-coach-ai
```

3. **Deploy to Cloud Run**
```bash
gcloud run deploy photography-coach-ai \
  --image gcr.io/YOUR_PROJECT_ID/photography-coach-ai \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars VITE_GEMINI_API_KEY=your_key \
  --memory 512Mi \
  --cpu 1
```

4. **Access Application**
- Cloud Run will provide a URL (e.g., `https://photography-coach-ai-xxxxx.run.app`)
- Application is now live

### Update Deployment

```bash
# After code changes
git add .
git commit -m "Update features"
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/photography-coach-ai
gcloud run deploy photography-coach-ai --image gcr.io/YOUR_PROJECT_ID/photography-coach-ai --region us-central1
```

### Monitor Logs

```bash
gcloud run logs read photography-coach-ai --limit 50 --follow
```

---

## Environment Variables

### Required Variables

| Variable | Type | Description |
|----------|------|-------------|
| `VITE_GEMINI_API_KEY` | string | Google Gemini API key (get at [ai.google.dev](https://ai.google.dev)) |

### Optional Variables

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `VITE_API_TIMEOUT` | number | 30000 | Request timeout in ms |
| `VITE_MAX_IMAGE_SIZE` | number | 10485760 | Max upload size in bytes (10MB) |
| `VITE_ENVIRONMENT` | string | production | Environment name |

### Example `.env.local`

```env
# Required
VITE_GEMINI_API_KEY=sk-1234567890abcdef

# Optional
VITE_API_TIMEOUT=30000
VITE_MAX_IMAGE_SIZE=10485760
VITE_ENVIRONMENT=production
```

---

## Production Checklist

Before deploying to production:

### Security
- [ ] API key is securely stored (never in git)
- [ ] HTTPS/SSL is enabled
- [ ] CORS is configured correctly

### Muxing Integration
- [ ] `/api/analyze/status` returns JSON successfully for a Chinese node name
- [ ] `/api/analyze/status` returns the expected `configSource`
- [ ] Problem nodes are checked for `transport: "muxing-proxy"` before judging availability
- [ ] A plain text status probe is verified before testing image analysis
- [ ] Sensitive logs are disabled
- [ ] Rate limiting is implemented

### Performance
- [ ] Build is minified (`npm run build`)
- [ ] Source maps are disabled
- [ ] Images are optimized
- [ ] Code splitting is working
- [ ] Cache headers are set

### Monitoring
- [ ] Error logging is configured
- [ ] Performance metrics tracked
- [ ] Uptime monitoring enabled
- [ ] Daily backups configured

### Testing
- [ ] All features tested in production environment
- [ ] Cross-browser testing completed
- [ ] Mobile responsiveness verified
- [ ] API rate limits tested
- [ ] Error states handled gracefully

### Documentation
- [ ] README updated with deployment link
- [ ] API documentation current
- [ ] Known issues documented
- [ ] Support contacts listed

---

## Troubleshooting

### Common Issues

**1. API Key Not Working**
```bash
# Verify key is set
echo $VITE_GEMINI_API_KEY

# Test API directly
curl -X GET "https://generativelanguage.googleapis.com/v1beta/models?key=$VITE_GEMINI_API_KEY"
```

**2. CORS Errors**
- Ensure API key is public (not restricted)
- Check domain is allowed in Cloud Console
- Verify browser is not blocking requests

**3. Large Image Uploads Fail**
- Increase `VITE_MAX_IMAGE_SIZE`
- Check server file upload limits
- Verify client-side compression

**4. Rate Limiting Issues**
- Implement request queuing
- Add exponential backoff retry logic
- Contact Google for quota increase

### Debug Mode

```bash
# Enable debug logging
VITE_DEBUG=true npm run dev

# Check network tab in browser DevTools
# Look for API response details
```

---

## Performance Optimization

### Build Optimization

```bash
# Analyze bundle size
npm run build -- --analyze

# Reduce bundle size
npm install -D webpack-bundle-analyzer

# Check what's taking space
du -sh dist/
```

### Runtime Optimization

1. **Enable Context Caching** (Gemini API)
   - Reduces token costs by ~75%
   - Automatically enabled for cached prompts

2. **Image Optimization**
   - Compress images before upload
   - Use WebP format where supported
   - Lazy load images

3. **Code Splitting**
   - Already configured in Vite
   - Components loaded on demand
   - Check DevTools Network tab

---

## Scaling Considerations

### For 10,000+ Monthly Users

1. **API Rate Limiting**
   - Implement request queue
   - Add user-based rate limits
   - Monitor quota usage

2. **Caching Strategy**
   - Cache analysis results
   - Store previous conversations
   - Reduce redundant API calls

3. **Load Balancing**
   - Deploy multiple instances
   - Use CDN for static assets
   - Implement auto-scaling

4. **Database**
   - Store user sessions
   - Archive analysis history
   - Track usage metrics

---

## Rollback Procedure

### Vercel
```bash
# Revert to previous deployment
# Via dashboard: Deployments → Select version → Promote to Production
```

### Cloud Run
```bash
# Rollback to previous version
gcloud run services update-traffic photography-coach-ai --to-revisions PREVIOUS_REVISION_ID=100
```

### Docker
```bash
# Stop current container
docker stop container_name

# Run previous image version
docker run -p 8501:5173 photography-coach-ai:v1.0.0
```

---

## Support & Resources

- **Gemini API Docs:** [ai.google.dev/docs](https://ai.google.dev/docs)
- **Vercel Docs:** [vercel.com/docs](https://vercel.com/docs)
- **Cloud Run Docs:** [cloud.google.com/run/docs](https://cloud.google.com/run/docs)
- **Issue Tracker:** [GitHub Issues](https://github.com/prasadt1/photography-coach-ai/issues)

---

**Last Updated:** December 2025  
**Maintained By:** Prasad T
