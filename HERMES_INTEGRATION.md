# Hermes Report Link Integration

This project now exposes a minimal backend flow for Hermes:

1. Hermes receives an image from a colleague.
2. Hermes runs its own prompt / skill and produces structured JSON.
3. Hermes posts that JSON to this backend.
4. The backend returns a public website link that opens the existing app result UI.
5. Hermes sends the link back to the colleague.

## Endpoints

### `POST /api/hermes/report-link`

Creates a self-contained report link.

Auth:

- Recommended: `Authorization: Bearer $HERMES_REPORT_SECRET`
- Also accepted: `x-hermes-secret: $HERMES_REPORT_SECRET`

If `HERMES_REPORT_SECRET` is not configured, the route is open. Do not leave it open in production.

### `GET /api/hermes/report?payload=...`

Compatibility route. It redirects to the main site with shared-report query params so the user lands in the same result UI as the normal website.

### `GET /api/hermes/report?payload=...&format=json`

Returns the decoded JSON payload for debugging.

## Recommended Environment Variables

```env
HERMES_REPORT_SECRET=replace-with-long-random-string
HERMES_REPORT_PUBLIC_BASE_URL=https://your-domain.example.com
```

Optional limits:

```env
HERMES_REPORT_MAX_JSON_BYTES=24576
HERMES_REPORT_MAX_TOKEN_LENGTH=6000
```

## Request Body

Minimum payload:

```json
{
  "title": "A+ hero image review",
  "analysis": {
    "scores": {
      "composition": 8.4,
      "lighting": 7.9,
      "creativity": 7.6,
      "technique": 8.1,
      "subjectImpact": 8.8
    },
    "critique": {
      "composition": "Layout space is intentional and commercially useful.",
      "lighting": "Specular highlights are clean but slightly uneven on the cap.",
      "technique": "Edges are clean and the cutout is believable.",
      "overall": "This asset is commercially strong with two fixable distractions."
    },
    "strengths": [
      "Strong mobile readability",
      "Clear premium material definition"
    ],
    "improvements": [
      "Reduce highlight spill on the right edge",
      "Add more grounding shadow under the product"
    ],
    "learningPath": [
      "Study high-key bottle lighting",
      "Practice shelf-impact thumbnail reviews"
    ],
    "settingsEstimate": {
      "focalLength": "85mm",
      "aperture": "f/11",
      "shutterSpeed": "1/160",
      "iso": "100"
    },
    "thinking": {
      "observations": [
        "Headline space is preserved",
        "The bottle outline reads clearly"
      ],
      "reasoningSteps": [
        "Checked thumbnail readability first",
        "Then evaluated material and shadow realism"
      ],
      "priorityFixes": [
        "Tighten the right-edge highlight",
        "Strengthen base contact shadow"
      ]
    }
  }
}
```

Optional fields:

```json
{
  "createdAt": "2026-04-16T14:32:00+08:00",
  "previewUrl": "https://cdn.example.com/path/to/preview.jpg",
  "source": {
    "agent": "Hermes",
    "channel": "Feishu",
    "sender": "Jojo",
    "fileName": "hero-shot-01.jpg",
    "threadId": "oc_xxx",
    "promptName": "amazon-visual-critic",
    "promptVersion": "2026-04-16",
    "workflow": "feishu-image-review"
  },
  "metadata": {
    "requestId": "req_123",
    "skill": "amazon-visual-critic",
    "schemaVersion": "1"
  }
}
```

## Example `curl`

```bash
curl -X POST "https://your-domain.example.com/api/hermes/report-link" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $HERMES_REPORT_SECRET" \
  -d @payload.json
```

Success response:

```json
{
  "success": true,
  "reportId": "3e26f9d347d6c875",
  "reportUrl": "https://your-domain.example.com/api/hermes/report?payload=gz1....",
  "stats": {
    "jsonBytes": 2148,
    "gzipBytes": 842,
    "tokenLength": 1128
  }
}
```

Validation failure response:

```json
{
  "success": false,
  "error": "Analysis text is missing or corrupted. Do not create a share link for this payload."
}
```

The route returns `422` for low-information or obviously corrupted analysis text. Hermes should treat that as a content-quality failure, not a transport failure.

## Hermes-Side Workflow Notes

- Keep Hermes output structured and concise. Do not include raw OCR dumps or base64 image blobs in the analysis JSON.
- If you already have a public image CDN URL, pass it as `previewUrl`.
- If the link payload grows too large, trim verbose fields first:
  - reduce long reasoning chains
  - reduce duplicate summaries
  - omit raw tool traces
- If the backend returns `422`, do not send a share link:
  - retry the upstream analysis step, or
  - fall back to the normal text reply path

## Why This Design

This flow intentionally avoids adding a database just to return a link.

Advantages:

- deploys on the current Vercel layout
- no extra storage dependency
- deterministic share links
- public report page can be opened directly in Feishu / Telegram

Tradeoff:

- the report link is self-contained, not a persistent server-side record

If later you want permanent report history, replace the compressed URL payload with Blob / KV / database storage behind the same `POST /api/hermes/report-link` contract.

## Important for Visual Parity

If you want the Hermes link to look like the normal analysis page, include a public image URL:

```json
{
  "previewUrl": "https://your-cdn.example.com/path/to/image.jpg"
}
```

Without `previewUrl`, the site can still render the shared result view, but it will show a generated placeholder instead of the original image.
