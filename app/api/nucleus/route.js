import Anthropic from "@anthropic-ai/sdk";
import { NUCLEUS_KNOWLEDGE } from "../../lib/nucleus-knowledge.js";

/**
 * Robust JSON extraction from model output.
 * Handles: code blocks, trailing text, unescaped newlines in strings.
 */
function extractJSON(text) {
  // Strip markdown code blocks
  let jsonStr = text;
  if (text.includes("```json")) {
    jsonStr = text.split("```json")[1].split("```")[0];
  } else if (text.includes("```")) {
    jsonStr = text.split("```")[1].split("```")[0];
  }
  jsonStr = jsonStr.trim();

  // First try: direct parse
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    // Fall through to repair
  }

  // Second try: find the outermost { } and parse just that
  const firstBrace = jsonStr.indexOf("{");
  const lastBrace = jsonStr.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const extracted = jsonStr.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(extracted);
    } catch (e) {
      // Fall through to repair
    }
  }

  // Third try: fix unescaped newlines inside string values
  const repaired = jsonStr.replace(
    /"([^"]*?)"/gs,
    (match, content) => {
      const fixed = content
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "\\r")
        .replace(/\t/g, "\\t");
      return `"${fixed}"`;
    }
  );

  try {
    return JSON.parse(repaired);
  } catch (e) {
    // Fall through
  }

  // Fourth try: same repair on the extracted braces version
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const extracted = jsonStr.slice(firstBrace, lastBrace + 1);
    const repaired2 = extracted.replace(
      /"([^"]*?)"/gs,
      (match, content) => {
        const fixed = content
          .replace(/\n/g, "\\n")
          .replace(/\r/g, "\\r")
          .replace(/\t/g, "\\t");
        return `"${fixed}"`;
      }
    );
    try {
      return JSON.parse(repaired2);
    } catch (e) {
      throw new Error(
        `JSON parse failed after repair attempts. First 500 chars: ${jsonStr.slice(0, 500)}`
      );
    }
  }

  throw new Error(
    `No valid JSON found in response. First 500 chars: ${text.slice(0, 500)}`
  );
}

/**
 * System prompt text — separated so we can apply cache_control to it.
 * The knowledge file is static across all requests, making it ideal for prompt caching.
 */
const SYSTEM_PROMPT_TEXT = `You are the Hamilton Beach Brand Nucleus — a brand intelligence system that produces outputs grounded in encoded brand knowledge. You reason from the knowledge encoded below. You do not retrieve keywords. You apply brand logic the way a senior strategist who has lived on this account for years would — not by searching notes, but by having absorbed the brand's gravitational core.

The knowledge encoded below is structured in named slots. Each slot is a component of the brand's identity, behavior, or operational context. When processing a request, you activate the most relevant slots and use them to shape your output.

You never invent brand claims not present in the knowledge. You never use competitor names in outputs unless the request explicitly asks for a comparison. You never produce language that sounds like brand copy talking at a consumer — only language that sounds like someone who genuinely understands real kitchens and the people in them.

${NUCLEUS_KNOWLEDGE}`;

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

/**
 * Single unified call: Intent Classification + Brand Context Package
 *
 * Previous architecture used two sequential calls (classify → build package).
 * Merged into one call to cut response time roughly in half.
 * The model classifies intent and builds the context package in a single pass.
 *
 * Prompt caching is enabled on the system prompt via cache_control.
 * The 544-line knowledge file is identical across all requests — on cache hit,
 * the system prompt processing is near-instant.
 */
async function processRequest(client, requestText, metadata) {
  const laneLabel =
    metadata.platform_lane === "yes_you_can_chef"
      ? "Yes You Can Chef"
      : "Built For This";

  const userPrompt = `Analyze this production request. You will do two things in a single pass:

PART 1 — INTENT CLASSIFICATION: Classify the request and identify which brand components to activate.
PART 2 — CONTEXT PACKAGE: Using those activated components, assemble a structured brand context package for a downstream satellite tool.

REQUEST TEXT:
${requestText}

DECLARED METADATA:
- Output type: ${metadata.output_type}
- Platform lane: ${metadata.platform_lane} (${laneLabel})
- Audience: ${metadata.audience}
- Channel: ${metadata.channel}
- SKU: ${metadata.sku}

Return ONLY valid JSON matching this exact schema:

{
  "intent": {
    "output_type": "reddit_post | video_brief | social_caption | creative_brief",
    "platform_lane": "yes_you_can_chef | built_for_this",
    "audience": "string — refined audience description based on request text",
    "channel": "string — specific channel context",
    "sku": "string",
    "activated_components": [
      { "component": "THE_HUMAN", "confidence": "high | medium | low" },
      { "component": "THE_ANCHORS", "confidence": "high | medium | low" }
    ],
    "activation_reasoning": "2-3 sentences explaining why these specific components activated. Reference specific elements from both the request AND the encoded knowledge.",
    "lane_reasoning": "1-2 sentences explaining how the platform lane shapes the output approach."
  },
  "context_package": {
    "satellite_type": "string — the output_type from intent",
    "objective": "One sentence: what should the final output accomplish for this specific audience in this specific channel?",
    "audience_context": {
      "who": "Specific description of the person this is for — draw from THE_HUMAN",
      "mindset": "What they are thinking/feeling right now — draw from the consumer behavior phase that matches",
      "what_they_need": "What this person needs to hear or feel — not what the brand wants to say"
    },
    "tone_direction": {
      "lane": "${laneLabel}",
      "register": "2-3 adjectives for the specific emotional register",
      "sounds_like": "One sentence — what the voice should sound like, be specific",
      "does_not_sound_like": "One sentence — what to avoid, specific to this lane and channel"
    },
    "content_inputs": {
      "primary_message": "The core thing the output needs to communicate",
      "product_context": "What is true and relevant about this product — draw from THE_PROOF and product knowledge",
      "use_cases": ["Specific real-life use cases — draw from product knowledge and THE_JOB"],
      "proof_points": ["Specific facts, stats, or heritage points — only what is documented"],
      "anchors_to_apply": ["Which brand anchors from THE_ANCHORS should shape this output and how"]
    },
    "structural_rules": ["3-5 specific rules for output structure — draw from satellite spec for this output type"],
    "avoid": ["3-5 specific things the output must NOT do — draw from satellite spec, lane rules, and brand anchors"],
    "reasoning_trace": "2-3 sentences explaining how you assembled this package — what you drew from which components and why."
  }
}

INTENT RULES:
- activated_components: 2-4 entries, ordered by relevance. Only activate what this request genuinely needs.
- confidence reflects how central each component is to THIS specific request.
- activation_reasoning must reference specific elements from both the request AND the encoded knowledge.

CONTEXT PACKAGE RULES:
- Every field must trace back to something in the encoded knowledge. Do not invent.
- audience_context draws from THE_HUMAN and the relevant consumer behavior phase.
- tone_direction draws from THE_FEEL and the specific platform lane.
- content_inputs draws from THE_PROOF, THE_JOB, THE_ANCHORS, and product knowledge.
- structural_rules draws from the satellite spec for this output type.
- avoid draws from the satellite spec "what must never appear" and THE_FEEL "does not sound like."
- Be specific and operational. A satellite tool reading this should know exactly what to do and what not to do.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 3000,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT_TEXT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = response.content[0].text;
  const parsed = extractJSON(text);

  // Return the parsed object along with cache performance info
  const cacheInfo = {
    input_tokens: response.usage?.input_tokens,
    output_tokens: response.usage?.output_tokens,
    cache_creation_input_tokens: response.usage?.cache_creation_input_tokens || 0,
    cache_read_input_tokens: response.usage?.cache_read_input_tokens || 0,
  };

  return { parsed, cacheInfo };
}

/**
 * POST /api/nucleus
 * The product endpoint. Every satellite calls this.
 *
 * v1.1 — Single-call architecture with prompt caching.
 * Previously two sequential Anthropic calls (~30s). Now one call (~15s).
 * Prompt caching on the 544-line knowledge file saves additional time on cache hits.
 */
export async function POST(request) {
  try {
    const body = await request.json();

    const { request_text, output_type, platform_lane, audience, channel, sku } =
      body;

    if (!request_text) {
      return Response.json(
        { error: "request_text is required" },
        { status: 400 }
      );
    }

    const client = getClient();

    const { parsed, cacheInfo } = await processRequest(client, request_text, {
      output_type: output_type || "unknown",
      platform_lane: platform_lane || "built_for_this",
      audience: audience || "unspecified",
      channel: channel || "unspecified",
      sku: sku || "unspecified",
    });

    // Assemble full response — same shape as before so satellites don't break
    const response = {
      intent: parsed.intent,
      context_package: parsed.context_package,
      _metadata: {
        nucleus_version: "1.1",
        knowledge_version: "v1.0",
        processed_at: new Date().toISOString(),
        model: "claude-sonnet-4-6",
        architecture: "single_call",
        cache: cacheInfo,
      },
    };

    return Response.json(response);
  } catch (error) {
    console.error("Nucleus error:", error);
    return Response.json(
      {
        error: "Nucleus processing failed",
        detail: error.message,
      },
      { status: 500 }
    );
  }
}
