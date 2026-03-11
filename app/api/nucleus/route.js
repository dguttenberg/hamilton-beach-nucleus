import Anthropic from "@anthropic-ai/sdk";
import { NUCLEUS_KNOWLEDGE } from "../../lib/nucleus-knowledge.js";

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

  // Parse JSON from response — handle markdown code blocks
  let jsonStr = text;
  if (text.includes("```json")) {
    jsonStr = text.split("```json")[1].split("```")[0];
  } else if (text.includes("```")) {
    jsonStr = text.split("```")[1].split("```")[0];
  }

  return JSON.parse(jsonStr.trim());
}

/**
 * Call 2: Grounded Output Generation
 * Takes intent object, produces the actual content + reasoning trace
 */
async function generateOutput(client, intentObject, requestText) {
  const componentList = intentObject.activated_components
    .map((c) => `${c.component} (${c.confidence})`)
    .join(", ");

  // Build satellite-specific instructions based on output type
  let satelliteInstructions = "";

  switch (intentObject.output_type) {
    case "reddit_post":
      satelliteInstructions = `OUTPUT FORMAT: Reddit Post
Follow the SATELLITE SPEC — REDDIT POST rules from the knowledge exactly:
- Free-form conversational. No branded header. Must read as organic.
- 150-300 words for organic-style posts.
- Open with the real situation, not the product.
- Include at least one specific real-use detail.
- Close with something that invites engagement or acknowledges trade-offs.
- First person, specific, practical. Honest about limitations.
- NO brand adjectives. NO promotional language. NO hashtags.
- Refer to the product naturally ("my slow cooker", "the HB one").
- Never start with "Hamilton Beach is..." or any brand announcement.`;
      break;

    case "video_brief":
      satelliteInstructions = `OUTPUT FORMAT: :15 Video Brief
Follow the SATELLITE SPEC — :15 VIDEO BRIEF rules from the knowledge exactly:
- Beat structure: 0-3s establish, 3-8s hero, 8-13s reveal, 13-15s lockup.
- "Built for [X]. Also built for [Y]." — the dual-use format IS the structure.
- Real kitchen environments. Food as visual hero. Product as enabler.
- Person present but not performing.
- [Y] should be the more relatable or surprising moment.
- Include: visual description, copy/VO for each beat, tone notes, CTA if applicable.`;
      break;

    case "social_caption":
      satelliteInstructions = `OUTPUT FORMAT: Instagram/TikTok Caption
Follow the SATELLITE SPEC — SOCIAL BRIEF rules from the knowledge exactly:
- 1-3 sentences max. Hook in first line (Instagram cuts at ~125 chars).
- Lead with the real moment, not the product.
- Second sentence introduces product naturally.
- Third sentence: invitation to engage, question, or simple CTA.
- 3-5 hashtags: #madewithhamiltonbeach as anchor + community hashtags.
- Yes You Can Chef voice: warm, encouraging, permission-giving.
- Built For This voice: matter-of-fact, specific, practical.`;
      break;
  }

  const laneLabel =
    intentObject.platform_lane === "yes_you_can_chef"
      ? "Yes You Can Chef"
      : "Built For This";

  const userPrompt = `Generate the output for this classified request.

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

${satelliteInstructions}

PLATFORM LANE APPLICATION:
You are writing in the "${laneLabel}" lane. Apply the lane's voice, tone, and strategic approach as encoded in the knowledge. ${
    intentObject.platform_lane === "yes_you_can_chef"
      ? "Lead with permission and encouragement. The emotional moment is before — the hesitation, the doubt."
      : 'Lead with the product proving itself in a real situation. Declarative, grounded, matter-of-fact. The dual-use structure "Built for X. Also built for Y" is the format.'
  }

Return your response as JSON with exactly two fields:
{
  "output": "The complete generated content — the Reddit post, video brief, or caption. Write it as a finished piece ready to use, not as a description of what it would be.",
  "reasoning_trace": "2-3 sentences explaining what you drew from the activated knowledge components and how the platform lane shaped your specific word choices, structure, and tone. Be concrete — reference specific anchors, specific audience insights, specific tone decisions."
}

Rules:
- The output must be grounded in the encoded knowledge — every choice should trace back to something in the Brand Center
- The output must sound like a real person, not a brand
- The reasoning trace must be honest and specific, not boilerplate
- Never use competitor brand names in the output
- Never invent product claims not in the knowledge`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = response.content[0].text;

  let jsonStr = text;
  if (text.includes("```json")) {
    jsonStr = text.split("```json")[1].split("```")[0];
  } else if (text.includes("```")) {
    jsonStr = text.split("```")[1].split("```")[0];
  }

  return JSON.parse(jsonStr.trim());
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

    // Call 2: Grounded Output Generation
    const generatedOutput = await generateOutput(
      client,
      intentObject,
      request_text
    );

    // Assemble full response
    const response = {
      intent: intentObject,
      output: generatedOutput.output,
      reasoning_trace: generatedOutput.reasoning_trace,
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
