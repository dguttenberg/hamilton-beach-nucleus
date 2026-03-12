"use client";

import { useState, useCallback, useRef } from "react";

// ============================================================================
// COMPONENT DEFINITIONS
// ============================================================================

const COMPONENTS = [
  {
    key: "THE_HUMAN",
    name: "THE HUMAN",
    summary:
      "Zillennials building their first real kitchens. Core buyers who have made it.",
  },
  {
    key: "THE_JOB",
    name: "THE JOB",
    summary:
      "Help real people feel capable in the kitchen they actually have.",
  },
  {
    key: "THE_PROOF",
    name: "THE PROOF",
    summary:
      "115 years. #1 unit share. The brand that has always been there.",
  },
  {
    key: "THE_ANCHORS",
    name: "THE ANCHORS",
    summary:
      "Real over perfect. Capable over impressive. Practical as pride.",
  },
  {
    key: "THE_FEEL",
    name: "THE FEEL",
    summary:
      "The friend who already figured it out. Warm, unpretentious, knowing.",
  },
  {
    key: "THE_STORY",
    name: "THE STORY",
    summary:
      "100 years being what the next generation needs. It just hasn't said so.",
  },
];

// ============================================================================
// PALETTE
// ============================================================================

const C = {
  bg: "#F7F5F0",
  green: "#2D6A2D",
  greenLight: "#E8F5E8",
  amber: "#D47A00",
  amberLight: "#FFF3E0",
  textPrimary: "#1A1A1A",
  textSecondary: "#555555",
  cardBg: "#FFFFFF",
  cardBorder: "#DDDDDD",
};

// ============================================================================
// STREAMING STATUS MESSAGES
// ============================================================================

const STREAM_PHASES = [
  { threshold: 0, text: "Activating brand knowledge..." },
  { threshold: 100, text: "Classifying intent..." },
  { threshold: 300, text: "Reading brand components..." },
  { threshold: 600, text: "Assembling context package..." },
  { threshold: 1200, text: "Grounding in brand truth..." },
];

function getStreamPhase(charCount) {
  let phase = STREAM_PHASES[0].text;
  for (const p of STREAM_PHASES) {
    if (charCount >= p.threshold) phase = p.text;
  }
  return phase;
}

// ============================================================================
// CONTEXT PACKAGE RENDERER
// ============================================================================

function ContextPackageDisplay({ pkg }) {
  if (!pkg) return null;

  return (
    <div style={styles.packageGrid}>
      {/* Objective */}
      <div style={{ ...styles.packageSection, gridColumn: "1 / -1" }}>
        <h3 style={styles.packageLabel}>OBJECTIVE</h3>
        <p style={styles.packageValue}>{pkg.objective}</p>
      </div>

      {/* Audience Context */}
      <div style={styles.packageSection}>
        <h3 style={styles.packageLabel}>AUDIENCE CONTEXT</h3>
        <div style={styles.subFields}>
          <div>
            <span style={styles.subLabel}>Who</span>
            <p style={styles.subValue}>{pkg.audience_context?.who}</p>
          </div>
          <div>
            <span style={styles.subLabel}>Mindset</span>
            <p style={styles.subValue}>{pkg.audience_context?.mindset}</p>
          </div>
          <div>
            <span style={styles.subLabel}>What they need</span>
            <p style={styles.subValue}>
              {pkg.audience_context?.what_they_need}
            </p>
          </div>
        </div>
      </div>

      {/* Tone Direction */}
      <div style={styles.packageSection}>
        <h3 style={styles.packageLabel}>TONE DIRECTION</h3>
        <div style={styles.subFields}>
          <div>
            <span style={styles.subLabel}>Lane</span>
            <p style={styles.subValue}>{pkg.tone_direction?.lane}</p>
          </div>
          <div>
            <span style={styles.subLabel}>Register</span>
            <p style={styles.subValue}>{pkg.tone_direction?.register}</p>
          </div>
          <div>
            <span style={styles.subLabel}>Sounds like</span>
            <p style={styles.subValue}>{pkg.tone_direction?.sounds_like}</p>
          </div>
          <div>
            <span style={styles.subLabel}>Does not sound like</span>
            <p style={styles.subValue}>
              {pkg.tone_direction?.does_not_sound_like}
            </p>
          </div>
        </div>
      </div>

      {/* Content Inputs */}
      <div style={{ ...styles.packageSection, gridColumn: "1 / -1" }}>
        <h3 style={styles.packageLabel}>CONTENT INPUTS</h3>
        <div style={styles.subFields}>
          <div>
            <span style={styles.subLabel}>Primary message</span>
            <p style={styles.subValue}>
              {pkg.content_inputs?.primary_message}
            </p>
          </div>
          <div>
            <span style={styles.subLabel}>Product context</span>
            <p style={styles.subValue}>
              {pkg.content_inputs?.product_context}
            </p>
          </div>
          {pkg.content_inputs?.use_cases?.length > 0 && (
            <div>
              <span style={styles.subLabel}>Use cases</span>
              <div style={styles.tagList}>
                {pkg.content_inputs.use_cases.map((uc, i) => (
                  <span key={i} style={styles.tagItem}>
                    {uc}
                  </span>
                ))}
              </div>
            </div>
          )}
          {pkg.content_inputs?.proof_points?.length > 0 && (
            <div>
              <span style={styles.subLabel}>Proof points</span>
              <div style={styles.tagList}>
                {pkg.content_inputs.proof_points.map((pp, i) => (
                  <span key={i} style={styles.tagItem}>
                    {pp}
                  </span>
                ))}
              </div>
            </div>
          )}
          {pkg.content_inputs?.anchors_to_apply?.length > 0 && (
            <div>
              <span style={styles.subLabel}>Anchors to apply</span>
              <div style={styles.tagList}>
                {pkg.content_inputs.anchors_to_apply.map((a, i) => (
                  <span key={i} style={{ ...styles.tagItem, ...styles.tagAnchor }}>
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Structural Rules + Avoid — side by side */}
      {pkg.structural_rules?.length > 0 && (
        <div style={styles.packageSection}>
          <h3 style={styles.packageLabel}>STRUCTURAL RULES</h3>
          <ul style={styles.ruleList}>
            {pkg.structural_rules.map((rule, i) => (
              <li key={i} style={styles.ruleItem}>
                {rule}
              </li>
            ))}
          </ul>
        </div>
      )}
      {pkg.avoid?.length > 0 && (
        <div style={styles.packageSection}>
          <h3 style={{ ...styles.packageLabel, color: "#9B2C2C" }}>AVOID</h3>
          <ul style={styles.ruleList}>
            {pkg.avoid.map((item, i) => (
              <li key={i} style={{ ...styles.ruleItem, color: "#9B2C2C" }}>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function NucleusDemo() {
  const [activeLane, setActiveLane] = useState("built_for_this");
  const [inputText, setInputText] = useState("");
  const [submittedText, setSubmittedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamStatus, setStreamStatus] = useState("");
  const [streamCharCount, setStreamCharCount] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const activeComponents = result?.intent?.activated_components || [];
  const activeComponentKeys = activeComponents.map((c) => c.component);

  const handleSubmit = useCallback(
    async (e) => {
      e?.preventDefault();
      if (loading || !inputText.trim()) return;

      setSubmittedText(inputText.trim());
      setLoading(true);
      setError(null);
      setResult(null);
      setStreamCharCount(0);
      setStreamStatus("Activating brand knowledge...");

      const payload = {
        request_text: inputText.trim(),
        platform_lane: activeLane,
      };

      // Abort controller for cancellation
      const abort = new AbortController();
      abortRef.current = abort;

      try {
        const res = await fetch("/api/nucleus", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: abort.signal,
        });

        if (!res.ok) {
          // Non-streaming error response
          const errData = await res.json();
          throw new Error(errData.detail || errData.error || "Request failed");
        }

        // Read the SSE stream
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let charCount = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE lines
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || ""; // Keep incomplete chunk in buffer

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6);

            try {
              const event = JSON.parse(jsonStr);

              if (event.type === "chunk") {
                charCount += event.text.length;
                setStreamCharCount(charCount);
                setStreamStatus(getStreamPhase(charCount));
              } else if (event.type === "done") {
                setResult(event.result);
              } else if (event.type === "error") {
                throw new Error(event.error);
              }
            } catch (parseErr) {
              // If it's a rethrown error from above, propagate it
              if (parseErr.message && !parseErr.message.includes("JSON")) {
                throw parseErr;
              }
              // Otherwise skip malformed SSE line
            }
          }
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message);
        }
      } finally {
        setLoading(false);
        abortRef.current = null;
      }
    },
    [activeLane, loading, inputText]
  );

  const laneLabel =
    activeLane === "yes_you_can_chef" ? "Yes You Can Chef" : "Built For This";
  const laneColor = activeLane === "yes_you_can_chef" ? C.green : C.amber;

  const pkg = result?.context_package;

  return (
    <div style={styles.page}>
      {/* ================================================================ */}
      {/* TOP BAR */}
      {/* ================================================================ */}
      <header style={styles.topBar}>
        <div style={styles.topBarInner}>
          <div style={styles.topBarLeft}>
            <span style={styles.brandName}>Hamilton Beach</span>
            <span style={styles.nucleusLabel}>Brand Nucleus</span>
          </div>
          <div style={styles.laneSelector}>
            <button
              onClick={() => setActiveLane("yes_you_can_chef")}
              style={{
                ...styles.laneButton,
                ...(activeLane === "yes_you_can_chef"
                  ? styles.laneButtonActiveGreen
                  : styles.laneButtonInactive),
                borderRadius: "4px 0 0 4px",
              }}
            >
              Yes You Can Chef
            </button>
            <button
              onClick={() => setActiveLane("built_for_this")}
              style={{
                ...styles.laneButton,
                ...(activeLane === "built_for_this"
                  ? styles.laneButtonActiveAmber
                  : styles.laneButtonInactive),
                borderRadius: "0 4px 4px 0",
              }}
            >
              Built For This
            </button>
          </div>
        </div>
      </header>

      {/* ================================================================ */}
      {/* MAIN CONTENT */}
      {/* ================================================================ */}
      <div style={styles.content}>
        {/* LEFT PANEL — Brand Center */}
        <aside style={styles.leftPanel}>
          <h2 style={styles.sectionLabel}>BRAND CENTER</h2>
          <div style={styles.componentStack}>
            {COMPONENTS.map((comp) => {
              const isActive = activeComponentKeys.includes(comp.key);
              const activeEntry = activeComponents.find(
                (c) => c.component === comp.key
              );
              return (
                <div
                  key={comp.key}
                  style={{
                    ...styles.componentCard,
                    ...(isActive ? styles.componentCardActive : {}),
                  }}
                >
                  <div style={styles.componentHeader}>
                    <span
                      style={{
                        ...styles.componentName,
                        color: isActive ? C.green : C.textPrimary,
                      }}
                    >
                      {comp.name}
                    </span>
                    {isActive && activeEntry && (
                      <span
                        style={{
                          ...styles.confidenceBadge,
                          background:
                            activeEntry.confidence === "high"
                              ? C.green
                              : activeEntry.confidence === "medium"
                              ? C.amber
                              : C.textSecondary,
                        }}
                      >
                        {activeEntry.confidence}
                      </span>
                    )}
                  </div>
                  <p style={styles.componentSummary}>{comp.summary}</p>
                </div>
              );
            })}
          </div>
        </aside>

        {/* RIGHT PANEL */}
        <main style={styles.mainPanel}>
          {/* INPUT SECTION */}
          <section style={styles.inputSection}>
            <h2 style={styles.sectionLabel}>REQUEST</h2>
            <form onSubmit={handleSubmit} style={styles.inputForm}>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Describe what you need — a Reddit post, a video brief, a social caption, or anything else. Include the audience, channel, and product if relevant."
                style={styles.textarea}
                rows={4}
                disabled={loading}
              />
              <div style={styles.inputControls}>
                <div style={styles.lanePillDisplay}>
                  <span
                    style={{
                      ...styles.pill,
                      background: laneColor,
                      color: "#fff",
                    }}
                  >
                    {laneLabel}
                  </span>
                </div>
                <button
                  type="submit"
                  disabled={loading || !inputText.trim()}
                  style={{
                    ...styles.submitButton,
                    opacity: loading || !inputText.trim() ? 0.5 : 1,
                  }}
                >
                  {loading ? "Processing..." : "Run through Nucleus"}
                </button>
              </div>
            </form>
          </section>

          {/* CONTEXT PACKAGE OUTPUT */}
          <section style={styles.outputSection}>
            <h2 style={styles.sectionLabel}>
              CONTEXT PACKAGE
              {result?.intent?.output_type && (
                <span style={styles.outputTypeLabel}>
                  {" "}
                  — {result.intent.output_type.replace(/_/g, " ").toUpperCase()}
                </span>
              )}
            </h2>
            <div style={styles.outputCard}>
              {loading ? (
                <div style={styles.loadingState}>
                  <div style={styles.streamProgress}>
                    <div
                      style={{
                        ...styles.streamBar,
                        width: `${Math.min((streamCharCount / 2000) * 100, 95)}%`,
                      }}
                    />
                  </div>
                  <p style={styles.loadingText}>{streamStatus}</p>
                </div>
              ) : error ? (
                <p style={styles.errorText}>{error}</p>
              ) : pkg ? (
                <ContextPackageDisplay pkg={pkg} />
              ) : (
                <p style={styles.placeholderMuted}>
                  Enter a request and run it through the Nucleus to see the
                  brand context package.
                </p>
              )}
            </div>
          </section>

          {/* REASONING TRACE SECTION */}
          <section style={styles.reasoningSection}>
            <h2 style={{ ...styles.sectionLabel, color: C.green }}>
              REASONING TRACE
            </h2>
            {pkg ? (
              <>
                <p style={styles.reasoningText}>{pkg.reasoning_trace}</p>
                <div style={styles.activatedChips}>
                  {activeComponents.map((c) => (
                    <span key={c.component} style={styles.chip}>
                      {c.component.replace("THE_", "")}
                      <span style={styles.chipConfidence}>{c.confidence}</span>
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <p style={styles.placeholderMuted}>
                Reasoning trace will appear here.
              </p>
            )}
          </section>
        </main>
      </div>

      {/* KEYFRAMES */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        @keyframes progressGlow {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
        textarea:focus {
          outline: none;
          border-color: ${C.green} !important;
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = {
  page: {
    fontFamily: '-apple-system, "Segoe UI", Arial, Helvetica, sans-serif',
    background: C.bg,
    minHeight: "100vh",
    color: C.textPrimary,
  },

  // TOP BAR
  topBar: {
    background: C.green,
    padding: "0 32px",
    height: 56,
    display: "flex",
    alignItems: "center",
  },
  topBarInner: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    maxWidth: 1400,
    margin: "0 auto",
  },
  topBarLeft: {
    display: "flex",
    alignItems: "baseline",
    gap: 12,
  },
  brandName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: "0.02em",
  },
  nucleusLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    fontWeight: 400,
  },
  laneSelector: {
    display: "flex",
  },
  laneButton: {
    padding: "8px 20px",
    fontSize: 13,
    fontWeight: 600,
    border: "2px solid rgba(255,255,255,0.4)",
    cursor: "pointer",
    transition: "all 0.2s",
    letterSpacing: "0.01em",
  },
  laneButtonActiveGreen: {
    background: "#fff",
    color: C.green,
    borderColor: "#fff",
  },
  laneButtonActiveAmber: {
    background: C.amber,
    color: "#fff",
    borderColor: C.amber,
  },
  laneButtonInactive: {
    background: "transparent",
    color: "rgba(255,255,255,0.8)",
    borderColor: "rgba(255,255,255,0.3)",
  },

  // CONTENT LAYOUT
  content: {
    display: "flex",
    maxWidth: 1400,
    margin: "0 auto",
    padding: "24px 32px",
    gap: 28,
    minHeight: "calc(100vh - 56px)",
  },

  // LEFT PANEL
  leftPanel: {
    width: "28%",
    minWidth: 260,
    flexShrink: 0,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.12em",
    color: C.textSecondary,
    margin: "0 0 14px 0",
    textTransform: "uppercase",
  },
  componentStack: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  componentCard: {
    background: C.cardBg,
    border: `1px solid ${C.cardBorder}`,
    borderRadius: 6,
    padding: "14px 16px",
    transition: "all 0.3s ease",
  },
  componentCardActive: {
    borderColor: C.green,
    background: C.greenLight,
    boxShadow: "0 2px 8px rgba(45, 106, 45, 0.12)",
  },
  componentHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  componentName: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.08em",
  },
  confidenceBadge: {
    fontSize: 10,
    fontWeight: 600,
    color: "#fff",
    padding: "2px 8px",
    borderRadius: 10,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  componentSummary: {
    fontSize: 13,
    lineHeight: 1.5,
    color: C.textSecondary,
    margin: 0,
  },

  // MAIN PANEL
  mainPanel: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },

  // INPUT
  inputSection: {
    background: C.cardBg,
    border: `1px solid ${C.cardBorder}`,
    borderRadius: 6,
    padding: "18px 22px",
  },
  inputForm: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  textarea: {
    width: "100%",
    padding: "12px 14px",
    fontSize: 15,
    lineHeight: 1.6,
    fontFamily: "inherit",
    color: C.textPrimary,
    background: C.bg,
    border: `1px solid ${C.cardBorder}`,
    borderRadius: 4,
    resize: "vertical",
    boxSizing: "border-box",
  },
  inputControls: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lanePillDisplay: {
    display: "flex",
    gap: 8,
    alignItems: "center",
  },
  submitButton: {
    padding: "10px 24px",
    fontSize: 13,
    fontWeight: 600,
    background: C.green,
    color: "#fff",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
    letterSpacing: "0.02em",
  },
  pill: {
    fontSize: 11,
    fontWeight: 600,
    padding: "4px 10px",
    borderRadius: 12,
    background: "#EEEDEA",
    color: C.textSecondary,
    letterSpacing: "0.02em",
  },

  // OUTPUT
  outputSection: {
    flex: 1,
  },
  outputTypeLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: C.textSecondary,
    letterSpacing: "0.08em",
  },
  outputCard: {
    background: C.cardBg,
    border: `1px solid ${C.cardBorder}`,
    borderRadius: 6,
    padding: "22px 26px",
    minHeight: 200,
  },
  loadingState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 180,
    gap: 16,
  },
  streamProgress: {
    width: "80%",
    maxWidth: 400,
    height: 4,
    background: "#EEEDEA",
    borderRadius: 2,
    overflow: "hidden",
  },
  streamBar: {
    height: "100%",
    background: C.green,
    borderRadius: 2,
    transition: "width 0.3s ease",
    animation: "progressGlow 2s ease-in-out infinite",
  },
  loadingText: {
    fontSize: 14,
    color: C.textSecondary,
    margin: 0,
    transition: "opacity 0.3s ease",
  },
  errorText: {
    fontSize: 14,
    color: "#c0392b",
    margin: 0,
  },
  placeholderMuted: {
    fontSize: 14,
    color: "#BBBBBB",
    margin: 0,
    fontStyle: "italic",
  },

  // CONTEXT PACKAGE
  packageGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
  },
  packageSection: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  packageLabel: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.12em",
    color: C.green,
    margin: 0,
    textTransform: "uppercase",
    paddingBottom: 4,
    borderBottom: `1px solid ${C.cardBorder}`,
  },
  packageValue: {
    fontSize: 14,
    lineHeight: 1.6,
    color: C.textPrimary,
    margin: 0,
  },
  subFields: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  subLabel: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.06em",
    color: C.textSecondary,
    textTransform: "uppercase",
    display: "block",
    marginBottom: 2,
  },
  subValue: {
    fontSize: 13,
    lineHeight: 1.55,
    color: C.textPrimary,
    margin: 0,
  },
  tagList: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  tagItem: {
    fontSize: 12,
    lineHeight: 1.5,
    color: C.textPrimary,
    padding: "6px 10px",
    background: C.bg,
    borderRadius: 4,
    border: `1px solid ${C.cardBorder}`,
  },
  tagAnchor: {
    borderLeft: `3px solid ${C.green}`,
    background: C.greenLight,
  },
  ruleList: {
    margin: 0,
    paddingLeft: 16,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  ruleItem: {
    fontSize: 12,
    lineHeight: 1.5,
    color: C.textPrimary,
  },

  // REASONING
  reasoningSection: {
    background: C.cardBg,
    border: `1px solid ${C.cardBorder}`,
    borderRadius: 6,
    padding: "18px 22px",
  },
  reasoningText: {
    fontSize: 13,
    lineHeight: 1.65,
    color: C.green,
    margin: "0 0 12px 0",
  },
  activatedChips: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 11,
    fontWeight: 600,
    padding: "4px 10px",
    borderRadius: 12,
    background: C.greenLight,
    color: C.green,
    letterSpacing: "0.04em",
  },
  chipConfidence: {
    fontSize: 9,
    fontWeight: 700,
    textTransform: "uppercase",
    opacity: 0.7,
  },
};
