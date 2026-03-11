"use client";

import { useState, useCallback } from "react";

// ============================================================================
// DEMO REQUESTS — exactly as specced
// ============================================================================

const DEMO_REQUESTS = [
  {
    id: 1,
    label: "Request 1",
    subtitle: "Reddit Post — Built For This",
    output_type: "reddit_post",
    platform_lane: "built_for_this",
    audience: "Zillennial, 27, research phase, first real apartment",
    channel: "Reddit — r/MealPrepSunday or r/Frugal",
    sku: "slow_cooker",
    request_text:
      "Write a Reddit post for someone in a cooking or frugal-living subreddit who is trying to figure out if a Hamilton Beach slow cooker is worth buying. They are 27, living in their first real apartment, trying to do more meal prep, budget-conscious, and not sure if they'll actually use it.",
  },
  {
    id: 2,
    label: "Request 2",
    subtitle: "Video Brief — Built For This",
    output_type: "video_brief",
    platform_lane: "built_for_this",
    audience: "Zillennial, any stage",
    channel: "Instagram / TikTok",
    sku: "slow_cooker",
    request_text:
      "Generate a :15 video brief for the Hamilton Beach slow cooker. Built For This format. Primary use: Sunday meal prep. Secondary use: unexpected guests Thursday night.",
  },
  {
    id: 3,
    label: "Request 3",
    subtitle: "Instagram Caption — Yes You Can Chef",
    output_type: "social_caption",
    platform_lane: "yes_you_can_chef",
    audience: "Zillennial, first-use / post-purchase",
    channel: "Instagram",
    sku: "slow_cooker",
    request_text:
      "Write an Instagram caption for someone making their first slow cooker meal. They are nervous, it turned out better than expected, and they want to share it. Yes You Can Chef lane.",
  },
];

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
  textPrimary: "#1A1A1A",
  textSecondary: "#555555",
  cardBg: "#FFFFFF",
  cardBorder: "#DDDDDD",
};

// ============================================================================
// OUTPUT TYPE LABELS
// ============================================================================

const OUTPUT_LABELS = {
  reddit_post: "REDDIT POST",
  video_brief: ":15 VIDEO BRIEF",
  social_caption: "INSTAGRAM CAPTION",
};

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function NucleusDemo() {
  const [activeLane, setActiveLane] = useState("built_for_this");
  const [activeRequestId, setActiveRequestId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const activeComponents = result?.intent?.activated_components || [];
  const activeComponentKeys = activeComponents.map((c) => c.component);

  const handleRequestClick = useCallback(
    async (req) => {
      if (loading) return;

      setActiveRequestId(req.id);
      setLoading(true);
      setError(null);
      setResult(null);

      // Use the toggle's current lane, not the request's default
      const payload = {
        request_text: req.request_text,
        output_type: req.output_type,
        platform_lane: activeLane,
        audience: req.audience,
        channel: req.channel,
        sku: req.sku,
      };

      try {
        const res = await fetch("/api/nucleus", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.detail || errData.error || "Request failed");
        }

        const data = await res.json();
        setResult(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [activeLane, loading]
  );

  const activeRequest = DEMO_REQUESTS.find((r) => r.id === activeRequestId);
  const laneLabel =
    activeLane === "yes_you_can_chef" ? "Yes You Can Chef" : "Built For This";
  const laneColor =
    activeLane === "yes_you_can_chef" ? C.green : C.amber;

  return (
    <div style={{ ...styles.page }}>
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

        {/* RIGHT PANEL — Request, Output, Reasoning */}
        <main style={styles.mainPanel}>
          {/* REQUEST SECTION */}
          <section style={styles.requestSection}>
            <h2 style={styles.sectionLabel}>REQUEST</h2>
            {activeRequest ? (
              <>
                <p style={styles.requestText}>{activeRequest.request_text}</p>
                <div style={styles.metadataPills}>
                  <span style={styles.pill}>
                    {OUTPUT_LABELS[activeRequest.output_type] ||
                      activeRequest.output_type}
                  </span>
                  <span
                    style={{
                      ...styles.pill,
                      background: laneColor,
                      color: "#fff",
                    }}
                  >
                    {laneLabel}
                  </span>
                  <span style={styles.pill}>{activeRequest.channel}</span>
                  <span style={styles.pill}>{activeRequest.sku}</span>
                </div>
              </>
            ) : (
              <p style={styles.placeholder}>
                Select a request below to activate the Nucleus.
              </p>
            )}
          </section>

          {/* OUTPUT SECTION */}
          <section style={styles.outputSection}>
            <h2 style={styles.sectionLabel}>
              OUTPUT
              {result && (
                <span style={styles.outputTypeLabel}>
                  {" "}
                  — {OUTPUT_LABELS[result.intent?.output_type] || ""}
                </span>
              )}
            </h2>
            <div style={styles.outputCard}>
              {loading ? (
                <div style={styles.loadingState}>
                  <div style={styles.loadingDots}>
                    <span style={styles.dot}>●</span>
                    <span style={{ ...styles.dot, animationDelay: "0.2s" }}>
                      ●
                    </span>
                    <span style={{ ...styles.dot, animationDelay: "0.4s" }}>
                      ●
                    </span>
                  </div>
                  <p style={styles.loadingText}>
                    Activating brand knowledge...
                  </p>
                </div>
              ) : error ? (
                <p style={styles.errorText}>{error}</p>
              ) : result ? (
                <div style={styles.outputContent}>
                  {result.output.split("\n").map((line, i) => (
                    <p key={i} style={styles.outputLine}>
                      {line || "\u00A0"}
                    </p>
                  ))}
                </div>
              ) : (
                <p style={styles.placeholderMuted}>
                  Output will appear here.
                </p>
              )}
            </div>
          </section>

          {/* REASONING TRACE SECTION */}
          <section style={styles.reasoningSection}>
            <h2 style={{ ...styles.sectionLabel, color: C.green }}>
              REASONING TRACE
            </h2>
            {result ? (
              <>
                <p style={styles.reasoningText}>{result.reasoning_trace}</p>
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

          {/* DEMO CONTROLS */}
          <div style={styles.demoControls}>
            {DEMO_REQUESTS.map((req) => (
              <button
                key={req.id}
                onClick={() => handleRequestClick(req)}
                disabled={loading}
                style={{
                  ...styles.requestButton,
                  ...(activeRequestId === req.id
                    ? styles.requestButtonActive
                    : {}),
                  opacity: loading ? 0.6 : 1,
                }}
              >
                <span style={styles.requestButtonLabel}>{req.label}</span>
                <span style={styles.requestButtonSub}>{req.subtitle}</span>
              </button>
            ))}
          </div>
        </main>
      </div>

      {/* KEYFRAMES for loading animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
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
    fontFamily:
      '-apple-system, "Segoe UI", Arial, Helvetica, sans-serif',
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

  // REQUEST
  requestSection: {
    background: C.cardBg,
    border: `1px solid ${C.cardBorder}`,
    borderRadius: 6,
    padding: "18px 22px",
  },
  requestText: {
    fontSize: 15,
    lineHeight: 1.6,
    color: C.textPrimary,
    margin: "0 0 12px 0",
  },
  metadataPills: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
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
  placeholder: {
    fontSize: 14,
    color: C.textSecondary,
    margin: 0,
    fontStyle: "italic",
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
  outputContent: {},
  outputLine: {
    fontSize: 15,
    lineHeight: 1.7,
    color: C.textPrimary,
    margin: "0 0 4px 0",
  },
  loadingState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 180,
    gap: 12,
  },
  loadingDots: {
    display: "flex",
    gap: 6,
  },
  dot: {
    fontSize: 18,
    color: C.green,
    animation: "pulse 1.2s ease-in-out infinite",
  },
  loadingText: {
    fontSize: 14,
    color: C.textSecondary,
    margin: 0,
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

  // DEMO CONTROLS
  demoControls: {
    display: "flex",
    gap: 12,
    paddingTop: 8,
  },
  requestButton: {
    flex: 1,
    padding: "14px 16px",
    background: C.cardBg,
    border: `1px solid ${C.cardBorder}`,
    borderRadius: 6,
    cursor: "pointer",
    textAlign: "left",
    transition: "all 0.2s",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  requestButtonActive: {
    borderColor: C.green,
    background: C.greenLight,
  },
  requestButtonLabel: {
    fontSize: 13,
    fontWeight: 700,
    color: C.textPrimary,
  },
  requestButtonSub: {
    fontSize: 11,
    color: C.textSecondary,
    fontWeight: 400,
  },
};
