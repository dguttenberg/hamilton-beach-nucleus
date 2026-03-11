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
  // Replace actual newlines between quotes with \\n
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
      // Give up with useful error
      throw new Error(
        `JSON parse failed after repair attempts. First 500 chars: ${jsonStr.slice(0, 500)}`
      );
    }
  }

  throw new Error(
    `No valid JSON found in response. First 500 chars: ${text.slice(0, 500)}`
  );
}

const SYSTEM_PROMPT = `You are the Hamilton Beach Brand Nucleus — a brand intelligence system that produces outputs grounded in encoded brand knowledge. You reason from the knowledge encoded below. You do not retrieve keywords. You apply brand logic the way a senior strategist who has lived on this account for years would — not by searching notes, but by having absorbed the brand's gravitational core.

The knowledge encoded below is structured in named slots. Each slot is a component of the brand's identity, behavior, or operational context. When processing a request, you activate the most relevant slots and use them to shape your output.

You never invent brand claims not present in the knowledge. You never use competitor names in outputs unless the request explicitly asks for a comparison. You never produce language that sounds like brand copy talking at a consumer — only language that sounds like someone who genuinely understands real kitchens and the people in them.

${NUCLEUS_KNOWLEDGE}`;

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

/**
 * Call 1: Intent Classification
 * Takes raw request + metadata, returns structured intent object
 */
async function classifyIntent(client, requestText, metadata) {
  const userPrompt = `Analyze this production request and return a structured intent classification as JSON.

REQUEST TEXT:
${requestText}

DECLARED METADATA:
- Output type: ${metadata.output_type}
- Platform lane: ${metadata.platform_lane}
- Audience: ${metadata.audience}
- Channel: ${metadata.channel}
- SKU: ${metadata.sku}

Your task:
1. Confirm or refine the declared metadata based on the request text
2. Identify which of the six Brand Center components (THE_HUMAN, THE_JOB, THE_PROOF, THE_ANCHORS, THE_FEEL, THE_STORY) are most relevant to this specific request — activate 2-4 components, not all six
3. Explain WHY those components activated — what in the request triggered them
4. Explain how the declared platform lane shapes this specific output

Return ONLY valid JSON matching this exact schema:
{
  "output_type": "reddit_post | video_brief | social_caption",
  "platform_lane": "yes_you_can_chef | built_for_this",
  "audience": "string — refined audience description",
  "channel": "string — specific channel context",
  "sku": "string",
  "activated_components": [
    { "component": "THE_HUMAN", "confidence": "high | medium | low" },
    { "component": "THE_ANCHORS", "confidence": "high | medium | low" }
  ],
  "activation_reasoning": "string — 2-3 sentences explaining why these specific components activated for this request. Be specific about what in the request maps to what in the knowledge.",
  "lane_reasoning": "string — 1-2 sentences explaining how the platform lane shapes the output approach for this specific request."
}

Rules:
- activated_components should contain 2-4 entries, ordered by relevance
- confidence should reflect how central each component is to THIS specific request
- activation_reasoning must reference specific elements from both the request AND the encoded knowledge
- Do not activate components just because they exist — only activate what this request genuinely needs`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = response.content[0].text;
  return extractJSON(text);
}

/**
 * Call 2: Brand Context Package
 * Takes intent object, produces a structured context package that a downstream
 * satellite tool would consume to do its specific job (write copy, build a brief, etc.)
 * The Nucleus is the intelligence layer, not the copywriter.
 */
async function buildContextPackage(client, intentObject, requestText) {
  const componentList = intentObject.activated_components
    .map((c) => `${c.component} (${c.confidence})`)
    .join(", ");

  const laneLabel =
    intentObject.platform_lane === "yes_you_can_chef"
      ? "Yes You Can Chef"
      : "Built For This";

  const userPrompt = `You are producing a brand context package for a downstream satellite tool. You are NOT writing the final content. You are assembling the brand intelligence, audience context, tone direction, and structural guidance that a satellite tool needs to do its job well.

ORIGINAL REQUEST:
${requestText}

INTENT CLASSIFICATION:
- Output type: ${intentObject.output_type}
- Platform lane: ${laneLabel}
- Audience: ${intentObject.audience}
- Channel: ${intentObject.channel}
- SKU: ${intentObject.sku}
- Activated components: ${componentList}
- Activation reasoning: ${intentObject.activation_reasoning}
- Lane reasoning: ${intentObject.lane_reasoning}

Your task: Read the activated components from the encoded knowledge and produce a structured context package. Extract the specific knowledge a satellite needs — not everything, just what is relevant to THIS request. Be concrete and operational, not abstract.

Return ONLY valid JSON matching this schema:
{
  "satellite_type": "${intentObject.output_type}",
  "objective": "One sentence: what should the final output accomplish for this specific audience in this specific channel?",
  "audience_context": {
    "who": "Specific description of the person this is for, drawn from THE_HUMAN",
    "mindset": "What they are thinking/feeling right now in their journey — draw from the consumer behavior phase that matches",
    "what_they_need": "What this person needs to hear or feel from this content — not what the brand wants to say"
  },
  "tone_direction": {
    "lane": "${laneLabel}",
    "register": "2-3 adjectives that describe the specific emotional register for this output",
    "sounds_like": "One sentence describing what the voice should sound like — be specific",
    "does_not_sound_like": "One sentence describing what to avoid — be specific to this lane and channel"
  },
  "content_inputs": {
    "primary_message": "The core thing the output needs to communicate",
    "product_context": "What is true and relevant about this product for this request — draw from THE_PROOF and product knowledge",
    "use_cases": ["Specific real-life use cases relevant to this request — draw from product knowledge and THE_JOB"],
    "proof_points": ["Specific facts, stats, or heritage points to ground the output — only what is documented"],
    "anchors_to_apply": ["Which brand anchors from THE_ANCHORS should shape this specific output and how"]
  },
  "structural_rules": ["3-5 specific rules for how the output should be structured — draw from the satellite spec for this output type in the knowledge file"],
  "avoid": ["3-5 specific things the output must NOT do — draw from the satellite spec, lane rules, and brand anchors"],
  "reasoning_trace": "2-3 sentences explaining how you assembled this package — what you drew from which components and why. Be concrete."
}

Rules:
- Every field must trace back to something in the encoded knowledge. Do not invent.
- audience_context should draw from THE_HUMAN and the relevant consumer behavior phase.
- tone_direction should draw from THE_FEEL and the specific platform lane.
- content_inputs should draw from THE_PROOF, THE_JOB, THE_ANCHORS, and product knowledge.
- structural_rules should draw from the satellite spec for this output type.
- avoid should draw from the satellite spec "what must never appear" and THE_FEEL "does not sound like."
- Be specific and operational. A satellite tool reading this should know exactly what to do and what not to do.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2500,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = response.content[0].text;
  return extractJSON(text);
}

/**
 * POST /api/nucleus
 * The product endpoint. Every satellite calls this.
 */
export async function POST(request) {
  try {
    const body = await request.json();

    // Validate required fields
    const { request_text, output_type, platform_lane, audience, channel, sku } =
      body;

    if (!request_text) {
      return Response.json(
        { error: "request_text is required" },
        { status: 400 }
      );
    }

    const client = getClient();

    // Call 1: Intent Classification
    const intentObject = await classifyIntent(client, request_text, {
      output_type: output_type || "unknown",
      platform_lane: platform_lane || "built_for_this",
      audience: audience || "unspecified",
      channel: channel || "unspecified",
      sku: sku || "unspecified",
    });

    // Call 2: Brand Context Package
    const contextPackage = await buildContextPackage(
      client,
      intentObject,
      request_text
    );

    // Assemble full response
    const response = {
      intent: intentObject,
      context_package: contextPackage,
      _metadata: {
        nucleus_version: "1.0",
        knowledge_version: "v1.0",
        processed_at: new Date().toISOString(),
        model: "claude-sonnet-4-6",
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
