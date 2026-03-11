# Hamilton Beach Brand Nucleus

Brand intelligence system. Two layers:

**Layer 1: `/api/nucleus`** — POST endpoint. Accepts a request, runs two sequential Anthropic API calls (classify → generate), returns grounded output + reasoning trace + activated components. This is the product. Every satellite calls this.

**Layer 2: `/`** — Demo interface. React frontend. Three pre-loaded requests, platform lane toggle, component activation display. First satellite.

## Deploy to Vercel

1. Push this repo to GitHub
2. Import in Vercel
3. Add environment variable: `ANTHROPIC_API_KEY` = your key
4. Deploy

The `vercel.json` sets 60s max duration for the API route (two sequential API calls).

## Local Dev

```
cp .env.example .env.local
# Add your ANTHROPIC_API_KEY to .env.local
npm install
npm run dev
```

## API Contract

```
POST /api/nucleus
Content-Type: application/json

{
  "request_text": "string (required)",
  "output_type": "reddit_post | video_brief | social_caption",
  "platform_lane": "yes_you_can_chef | built_for_this",
  "audience": "string",
  "channel": "string",
  "sku": "string"
}
```

Response:
```json
{
  "intent": {
    "output_type": "reddit_post",
    "platform_lane": "built_for_this",
    "audience": "refined audience string",
    "channel": "channel context",
    "sku": "slow_cooker",
    "activated_components": [
      { "component": "THE_HUMAN", "confidence": "high" },
      { "component": "THE_ANCHORS", "confidence": "high" }
    ],
    "activation_reasoning": "...",
    "lane_reasoning": "..."
  },
  "output": "The generated content",
  "reasoning_trace": "Explanation of what activated and why",
  "_metadata": { "nucleus_version": "1.0", ... }
}
```

## Wiring a New Satellite

Any satellite (Reddit bot, video brief tool, etc.) calls `POST /api/nucleus` with the request payload above. The endpoint handles classification, knowledge activation, and generation. The satellite handles delivery.

## File Structure

```
app/
  api/nucleus/route.js    ← The product (serverless function)
  lib/
    nucleus-knowledge.js  ← Brand knowledge (imported as JS module)
    nucleus-knowledge.md  ← Source markdown (reference copy)
  layout.js
  page.js                 ← Demo interface (first satellite)
```
