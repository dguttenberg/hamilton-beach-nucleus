import Anthropic from "@anthropic-ai/sdk";
import { NUCLEUS_KNOWLEDGE } from "../../lib/nucleus-knowledge.js";

/**
 * Robust JSON extraction from model output.
 * Handles: code blocks, trailing text, unescaped newlines in strings.
 */
function extractJSON(text) {
  let jsonStr = text;
  if (text.includes("```json")) {
    jsonStr = text.split("```json")[1].split("```")[0];
  } else if (text.includes("```")) {
    jsonStr = text.split("```")[1].split("```")[0];
  }
  jsonStr = jsonStr.trim();

  try {
    return JSON.parse(jsonStr);
  } catch (e) {}

  const firstBrace = jsonStr.indexOf("{");
  const lastBrace = jsonStr.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const extracted = jsonStr.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(extracted);
    } catch (e) {}
  }

  const repaired = jsonStr.replace(/"([^"]*?)"/gs, (match, content) => {
    const fixed = content
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/\t/g, "\\t");
    return `"${fixed}"`;
  });

  try {
    return JSON.parse(repaired);
  } catch (e) {}

  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const extracted = jsonStr.slice(firstBrace, lastBrace + 1);
    const repaired2 = extracted.replace(/"([^"]*?)"/gs, (match, content) => {
      const fixed = content
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "\\r")
        .replace(/\t/g, "\\t");
      return `"${fixed}"`;
    });
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
 * System prompt — separated for cache_control.
 */
const SYSTEM_PROMPT_TEXT = `You are the Hamilton Beach Brand Nucleus — a brand intelligence system that produces outputs grounded in encoded brand knowledge. You reason from the knowledge encoded below. You do not retrieve keywords. You apply brand logic the way a senior strategist who has lived on this account for years would — not by searching notes, but by having absorbed the brand's gravitational core.

The knowledge encoded below is structured in named slots. Each slot is a component of the brand's identity, behavior, or operational context. When processing a request, you activate the most relevant slots and use them to shape your output.

You never invent brand claims not present in the knowledge. You never use competitor names in outputs unless the request explicitly asks for a comparison. You never produce language that sounds like brand copy talking at a consumer — only language that sounds like someone who genuinely understands real kitchens and the people in them.

${NUCLEUS_KNOWLEDGE}`;

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

function buildUserPrompt(requestText, metadata) {
  const laneLabel =
    metadata.platform_lane === "yes_you_can_chef"
      ? "Yes You Can Chef"
      : "Built For This";

  return `Analyze this production request. You will do two things in a single pass:

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
    "copy_rules": [
      "Positive and encouraging without being cloying. Enthusiastic but not obnoxious...",
      "Specific to a food and an action. Copy should name what the person is making...",
      "Kitchen activities should be interesting and aspirational without feeling high-end..."
    ],
    "voice_calibration": "The voice addresses the cook directly with affirmation and specificity. It names a real food, a real action...",
    "format_spec": "The core format is the dual-use pairing: Built for [primary use case]. Also built for [real/adjacent use case]...",
    "art_direction": {
      "palette": "Orange/yellow palette",
      "in_frame": "Product and food both present — food as visual hero, product as enabler...",
      "never_in_frame": "Never showing too much kitchen or lifestyle context...",
      "emotional_reference": "A commercial for a capable truck or athletic shoe — confidence in what the thing can do...",
      "product_to_food": "Food as visual hero, product as enabler..."
    },
    "content_inputs": {
      "primary_message": "The core thing the output needs to communicate",
      "product_context": "What is true and relevant about this product — draw from THE_PROOF and product knowledge",
      "use_cases": ["Specific real-life use cases — draw from product knowledge and THE_JOB"],
      "proof_points": ["Specific facts, stats, or heritage points — only what is documented"],
      "anchors_to_apply": ["Which brand anchors from THE_ANCHORS should shape this output and how"]
    },
    "structural_rules": ["3-5 specific rules for output structure — draw from satellite spec for this output type"],
    "do_not": ["5-7 specific things the output must NOT do — draw from satellite spec 'what must never appear', THE_FEEL 'does not sound like', lane voice calibration out-of-lane signals, and brand anchors. Be concrete and actionable."],
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
- copy_rules: extract the 3 numbered operational tone rules from the active platform lane slot. Pass them through as actionable copywriting rules, not summaries. A copywriter should be able to apply each rule to a line of copy and determine pass/fail.
- voice_calibration: extract the "how to tell if copy is in-lane vs. out-of-lane" guidance from the active platform lane slot. This is the self-check a copywriter uses after writing.
- format_spec: extract the format structure from the active platform lane. For Built For This, this is the dual-use pairing format. For Yes You Can Chef, this is the affirmation + specificity format. Include enough structural detail that a writer can produce correct format without access to the knowledge file.
- art_direction: extract visual direction from the active platform lane — palette, what is in frame, what is never in frame, the emotional reference point, and the product-to-food visual relationship. A creative director or image generation tool should be able to use this to make visual decisions.
- content_inputs draws from THE_PROOF, THE_JOB, THE_ANCHORS, and product knowledge.
- structural_rules draws from the satellite spec for this output type.
- do_not: combine the satellite spec "what must never appear", THE_FEEL "does not sound like", and the out-of-lane signals from voice calibration into a single concrete list. Each item should be specific enough that a copywriter can check their work against it.
- Be specific and operational. A satellite tool or copywriting agent reading this package should be able to produce on-brand creative output without any other brand knowledge.
- CRITICAL: Never use the word "PLACEHOLDER" in any output field. Never say a field "has not been encoded" or is "pending creative input." The knowledge file contains all the information you need. Extract the real content from the active platform lane and return it directly. If the knowledge file contains the content, return it. If it genuinely does not exist, omit the field — do not fill it with a placeholder description.`;
}

/**
 * POST /api/nucleus
 * v1.2 — Single-call, prompt caching, streaming.
 *
 * The endpoint streams raw text chunks from Anthropic to the client via SSE.
 * Each chunk is a `data:` line with a JSON payload: { type, text, full_text }.
 * On completion, a final `data:` line sends { type: "done", result: { intent, context_package, _metadata } }.
 * On error, { type: "error", error: "..." }.
 *
 * Satellites that don't need streaming can still call this endpoint —
 * they just need to read the SSE stream and grab the "done" event.
 * For backwards compatibility, if the request includes `"stream": false`,
 * the endpoint returns a regular JSON response (non-streaming).
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

    const metadata = {
      output_type: output_type || "unknown",
      platform_lane: platform_lane || "built_for_this",
      audience: audience || "unspecified",
      channel: channel || "unspecified",
      sku: sku || "unspecified",
    };

    const client = getClient();
    const userPrompt = buildUserPrompt(request_text, metadata);

    // ================================================================
    // STREAMING PATH — opt-in via stream: true (demo frontend)
    // ================================================================
    if (body.stream === true) {
      const encoder = new TextEncoder();

      const readable = new ReadableStream({
        async start(controller) {
          let fullText = "";

          try {
            const stream = client.messages.stream({
              model: "claude-sonnet-4-6",
              max_tokens: 4000,
              system: [
                {
                  type: "text",
                  text: SYSTEM_PROMPT_TEXT,
                  cache_control: { type: "ephemeral" },
                },
              ],
              messages: [{ role: "user", content: userPrompt }],
            });

            stream.on("text", (text) => {
              fullText += text;
              const chunk = JSON.stringify({ type: "chunk", text, full_text: fullText });
              controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
            });

            // Wait for the stream to finish
            const finalMessage = await stream.finalMessage();

            // Parse the complete response
            const parsed = extractJSON(fullText);

            const result = {
              intent: parsed.intent,
              context_package: parsed.context_package,
              _metadata: {
                nucleus_version: "1.3",
                knowledge_version: "v1.0",
                processed_at: new Date().toISOString(),
                model: "claude-sonnet-4-6",
                architecture: "single_call_streaming",
                cache: {
                  input_tokens: finalMessage.usage?.input_tokens,
                  output_tokens: finalMessage.usage?.output_tokens,
                  cache_creation_input_tokens:
                    finalMessage.usage?.cache_creation_input_tokens || 0,
                  cache_read_input_tokens:
                    finalMessage.usage?.cache_read_input_tokens || 0,
                },
              },
            };

            const done = JSON.stringify({ type: "done", result });
            controller.enqueue(encoder.encode(`data: ${done}\n\n`));
          } catch (err) {
            const error = JSON.stringify({
              type: "error",
              error: err.message || "Nucleus processing failed",
            });
            controller.enqueue(encoder.encode(`data: ${error}\n\n`));
          } finally {
            controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // ================================================================
    // JSON PATH — default for satellites and external consumers
    // ================================================================
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
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

    return Response.json({
      intent: parsed.intent,
      context_package: parsed.context_package,
      _metadata: {
        nucleus_version: "1.3",
        knowledge_version: "v1.0",
        processed_at: new Date().toISOString(),
        model: "claude-sonnet-4-6",
        architecture: "single_call",
        cache: {
          input_tokens: response.usage?.input_tokens,
          output_tokens: response.usage?.output_tokens,
          cache_creation_input_tokens:
            response.usage?.cache_creation_input_tokens || 0,
          cache_read_input_tokens:
            response.usage?.cache_read_input_tokens || 0,
        },
      },
    });
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
