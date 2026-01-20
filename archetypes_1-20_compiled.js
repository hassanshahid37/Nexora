// Nexora — Archetype Compilation (1–20)
// Purpose: single file containing ONLY archetype factories + zones + shared helpers.
// This file intentionally does NOT export a Next.js handler.
// Later you can merge these factories into your original generate.js safely.
//
// Archetype IDs included:
// 1 AGGRESSIVE_POWER
// 2 MINIMAL_CLEAN
// 3 CURIOSITY_MYSTERY
// 4 PRODUCT_FOCUS
// 5 TRUST_FRIENDLY
// 6 NEWS_URGENT
// 7 CINEMATIC_DARK
// 8 SPORTS_ACTION
// 9 MUSIC_ARTISTIC
// 10 COMPARISON_VS
// 11 BOLD_CLAIM
// 12 FACE_CLOSEUP
// 13 EDUCATIONAL_EXPLAINER
// 14 KIDS_PLAYFUL
// 15 LUXURY_PREMIUM
// 16 AUTHORITY_EXPERT
// 17 TECH_FUTURISTIC
// 18 RELIGION_CALM
// 19 FUN_PLAYFUL
// 20 EMOTIONAL_STORY

const ARCHETYPE_FACTORY_FNS = [
  AggressivePower,
  MinimalClean,
  CuriosityMystery,
  ProductFocus,
  TrustFriendly,
  NewsUrgent,
  CinematicDark,
  SportsAction,
  MusicArtistic,
  ComparisonVS,
  BoldClaim,
  FaceCloseup,
  EducationalExplainer,
  KidsPlayful,
  LuxuryPremium,
  AuthorityExpert,
  TechFuturistic,
  ReligionCalm,
  FunPlayful,
  EmotionalStory
];

// Convenience: build ready-to-use compilers (objects with {id, compile}).
function buildAllArchetypes() {
  return ARCHETYPE_FACTORY_FNS.map(fn => fn());
}

// Convenience: shared canvas resolver (union of categories seen across batches).
function resolveCanvas(category) {
  const CANVAS = {
    youtube: { w: 1280, h: 720, safe: 48 },
    instagram: { w: 1080, h: 1080, safe: 48 },
    story: { w: 1080, h: 1920, safe: 64 },
    flyer: { w: 1080, h: 1350, safe: 64 },
    poster: { w: 1080, h: 1620, safe: 64 },
    slide: { w: 1280, h: 720, safe: 48 },
    resume: { w: 1240, h: 1754, safe: 64 },
    businesscard: { w: 1050, h: 600, safe: 32 },
    logo: { w: 1080, h: 1080, safe: 48 }
  };
  return CANVAS[category] || CANVAS.youtube;
}

// Convenience: deterministic selection helpers (same semantics as batches).
function selectArchetype(list, requestedId, headline, subhead) {
  if (requestedId) {
    const hit = list.find(a => a.id === requestedId);
    if (hit) return hit;
  }
  const h = stableHash(`${headline || ""}||${subhead || ""}`);
  return list[h % list.length];
}

function nextArchetype(list, id) {
  const i = Math.max(0, list.findIndex(a => a.id === id));
  return list[(i + 1) % list.length];
}

// ======================================================
// ARCHETYPES + ZONES (verbatim bodies from your batches)
// ======================================================

function AggressivePower() {
  return {
    id: "AGGRESSIVE_POWER",
    compile(canvas, ctx) {
      requireImage(ctx);

      const z = zonesAggressive(canvas, ctx.faceDetected);

      const headline = normalizeHeadline(ctx.headline, { maxWords: 5, casing: "UPPER" });

      // Typography starts big, then auto-fits down deterministically.
      const textStyle = {
        family: "condensed",
        weight: 900,
        casing: "UPPER",
        letterSpacing: -1.5,
        fill: "#FFFFFF",
        stroke: { width: scale(canvas, 6), color: "rgba(0,0,0,0.85)" },
        shadow: { x: 0, y: scale(canvas, 6), blur: scale(canvas, 22), color: "rgba(0,0,0,0.65)" },
        maxLines: 2
      };

      const fitted = fitTextToZone(headline, z.text, {
        baseFontSize: scale(canvas, 98),
        minFontSize: scale(canvas, 54),
        lineHeight: 0.95,
        maxLines: textStyle.maxLines,
        letterSpacing: textStyle.letterSpacing
      });

      const blocks = [
        image("hero", z.image, { cropBias: ctx.faceDetected ? "eyes-center" : "center" }, 10),
        overlay("contrast", z.image, {
          type: "gradient",
          direction: "to-left",
          stops: [
            { at: 0.0, color: "rgba(0,0,0,0.65)" },
            { at: 0.5, color: "rgba(0,0,0,0.25)" },
            { at: 1.0, color: "rgba(0,0,0,0.00)" }
          ]
        }, 20),
        // Optional bottom kicker band for extra readability on tall canvases
        overlay("kickerBand", z.kicker, {
          type: "solid",
          color: "rgba(0,0,0,0.45)",
          radius: scale(canvas, 14)
        }, 25),
        text("headline", z.text, fitted.text, {
          ...textStyle,
          fontSize: fitted.fontSize,
          lineHeight: fitted.lineHeight,
          align: "center",
          padding: scale(canvas, 16)
        }, 30)
      ];

      validateNoOverlap(blocks, ["headline"], ["hero"]);
      return template(canvas, this.id, blocks);
    }
  };
}

function MinimalClean() {
  return {
    id: "MINIMAL_CLEAN",
    compile(canvas, ctx) {
      const z = zonesMinimal(canvas);

      const headline = normalizeHeadline(ctx.headline, { maxWords: 10, casing: "SENTENCE" });

      const style = {
        family: "sans",
        weight: 400,
        casing: "SENTENCE",
        letterSpacing: 0,
        fill: "#111111",
        maxLines: 2
      };

      const fitted = fitTextToZone(headline, z.title, {
        baseFontSize: scale(canvas, 64),
        minFontSize: scale(canvas, 36),
        lineHeight: 1.22,
        maxLines: style.maxLines,
        letterSpacing: style.letterSpacing
      });

      const blocks = [
        background("paper", z.full, { color: "#FFFFFF" }, 0),
        // subtle divider to make it feel designed, still minimal
        line("divider", z.divider, { color: "rgba(17,17,17,0.12)", thickness: Math.max(1, scale(canvas, 2)) }, 5),
        text("headline", z.title, fitted.text, {
          ...style,
          fontSize: fitted.fontSize,
          lineHeight: fitted.lineHeight,
          align: "left",
          padding: 0
        }, 10),
        // optional tiny subhead if provided
        ...(ctx.subhead ? [text("subhead", z.sub, normalizeHeadline(ctx.subhead, { maxWords: 18, casing: "SENTENCE" }), {
          family: "sans",
          weight: 300,
          casing: "SENTENCE",
          letterSpacing: 0,
          fill: "rgba(17,17,17,0.72)",
          fontSize: scale(canvas, 28),
          lineHeight: 1.25,
          align: "left",
          maxLines: 3,
          padding: 0
        }, 12)] : [])
      ];

      validateOnlyAllowedBlocks(blocks, ["background", "line", "text"]);
      return template(canvas, this.id, blocks);
    }
  };
}

function CuriosityMystery() {
  return {
    id: "CURIOSITY_MYSTERY",
    compile(canvas, ctx) {
      requireImage(ctx);
      requireFace(ctx);

      const z = zonesMystery(canvas);

      const headline = normalizeHeadline(ctx.headline, { maxWords: 6, casing: "TITLE" });

      const style = {
        family: "sans",
        weight: 750,
        casing: "TITLE",
        letterSpacing: -0.5,
        fill: "#FFFFFF",
        shadow: { x: 0, y: scale(canvas, 4), blur: scale(canvas, 14), color: "rgba(0,0,0,0.55)" },
        maxLines: 2
      };

      const fitted = fitTextToZone(headline, z.text, {
        baseFontSize: scale(canvas, 72),
        minFontSize: scale(canvas, 44),
        lineHeight: 1.04,
        maxLines: style.maxLines,
        letterSpacing: style.letterSpacing
      });

      const blocks = [
        image("hero", z.image, { cropBias: "eyes-center", zoom: 1.12 }, 10),
        overlay("fade", z.fade, {
          type: "gradient",
          direction: "to-top",
          stops: [
            { at: 0.0, color: "rgba(0,0,0,0.78)" },
            { at: 0.55, color: "rgba(0,0,0,0.18)" },
            { at: 1.0, color: "rgba(0,0,0,0.00)" }
          ]
        }, 20),
        text("headline", z.text, fitted.text, {
          ...style,
          fontSize: fitted.fontSize,
          lineHeight: fitted.lineHeight,
          align: "center",
          padding: scale(canvas, 16)
        }, 30),
        // tiny hint badge to increase curiosity (still subtle)
        badge("hint", z.badge, {
          label: "?",
          fill: "rgba(255,255,255,0.92)",
          textColor: "rgba(0,0,0,0.85)",
          radius: scale(canvas, 999),
          fontSize: scale(canvas, 26),
          weight: 800,
          paddingX: scale(canvas, 14),
          paddingY: scale(canvas, 8)
        }, 35)
      ];

      validateOnlyAllowedBlocks(blocks, ["image", "overlay", "text", "badge"]);
      validateNoOverlap(blocks, ["headline"], ["hint"]);
      return template(canvas, this.id, blocks);
    }
  };
}

function ProductFocus() {
  return {
    id: "PRODUCT_FOCUS",
    compile(canvas, ctx) {
      requireImage(ctx);

      const z = zonesProduct(canvas);

      const headline = normalizeHeadline(ctx.headline, { maxWords: 4, casing: "UPPER" });

      const fitted = fitTextToZone(headline, z.caption, {
        baseFontSize: scale(canvas, 42),
        minFontSize: scale(canvas, 26),
        lineHeight: 1.0,
        maxLines: 1,
        letterSpacing: -0.5
      });

      const blocks = [
        background("paper", z.full, { color: "#FFFFFF" }, 0),
        image("product", z.image, { cropBias: "center", zoom: 1.08 }, 10),
        text("caption", z.caption, fitted.text, {
          family: "sans",
          weight: 700,
          casing: "UPPER",
          fill: "#111111",
          fontSize: fitted.fontSize,
          lineHeight: fitted.lineHeight,
          letterSpacing: -0.5,
          align: "center"
        }, 20)
      ];

      validateOnlyAllowedBlocks(blocks, ["background", "image", "text"]);
      return template(canvas, this.id, blocks);
    }
  };
}

function TrustFriendly() {
  return {
    id: "TRUST_FRIENDLY",
    compile(canvas, ctx) {
      requireImage(ctx);

      const z = zonesTrust(canvas);

      const headline = normalizeHeadline(ctx.headline, { maxWords: 8, casing: "SENTENCE" });
      const sub = normalizeHeadline(ctx.subhead || "", { maxWords: 14, casing: "SENTENCE" });

      const hFit = fitTextToZone(headline, z.title, {
        baseFontSize: scale(canvas, 52),
        minFontSize: scale(canvas, 34),
        lineHeight: 1.18,
        maxLines: 2,
        letterSpacing: 0
      });

      const blocks = [
        background("soft", z.full, { color: "#F4F7F8" }, 0),
        image("portrait", z.image, { cropBias: "eyes-center", zoom: 1.04 }, 10),
        text("headline", z.title, hFit.text, {
          family: "sans",
          weight: 500,
          casing: "SENTENCE",
          fill: "#1A1A1A",
          fontSize: hFit.fontSize,
          lineHeight: hFit.lineHeight,
          align: "left"
        }, 20),
        ...(sub ? [text("subhead", z.sub, sub, {
          family: "sans",
          weight: 400,
          casing: "SENTENCE",
          fill: "rgba(26,26,26,0.75)",
          fontSize: scale(canvas, 28),
          lineHeight: 1.25,
          align: "left"
        }, 22)] : [])
      ];

      validateOnlyAllowedBlocks(blocks, ["background", "image", "text"]);
      return template(canvas, this.id, blocks);
    }
  };
}

function NewsUrgent() {
  return {
    id: "NEWS_URGENT",
    compile(canvas, ctx) {
      const z = zonesNews(canvas);

      const headline = normalizeHeadline(ctx.headline, { maxWords: 6, casing: "UPPER" });

      const fitted = fitTextToZone(headline, z.banner, {
        baseFontSize: scale(canvas, 58),
        minFontSize: scale(canvas, 38),
        lineHeight: 1.05,
        maxLines: 2,
        letterSpacing: -0.8
      });

      const blocks = [
        background("alert", z.banner, { color: "#C62828" }, 0),
        text("headline", z.banner, fitted.text, {
          family: "condensed",
          weight: 900,
          casing: "UPPER",
          fill: "#FFFFFF",
          fontSize: fitted.fontSize,
          lineHeight: fitted.lineHeight,
          align: "center"
        }, 10),
        line("rule", z.rule, { color: "#C62828", thickness: Math.max(2, scale(canvas, 3)) }, 12)
      ];

      validateOnlyAllowedBlocks(blocks, ["background", "text", "line"]);
      return template(canvas, this.id, blocks);
    }
  };
}

function CinematicDark() {
  return {
    id: "CINEMATIC_DARK",
    compile(canvas, ctx) {
      requireImage(ctx);
      const z = zonesCinematic(canvas);

      const title = normalize(ctx.headline, 5).toUpperCase();

      const fitted = fitTextToZone(title, z.text, {
        baseFontSize: scale(canvas, 64),
        minFontSize: scale(canvas, 40),
        maxLines: 2,
        lineHeight: 1.0,
        letterSpacing: -1
      });

      const blocks = [
        image("hero", z.image, { cropBias: "center" }, 10),
        overlay("vignette", z.image, {
          type: "radial",
          inner: "rgba(0,0,0,0.0)",
          outer: "rgba(0,0,0,0.7)"
        }, 20),
        text("headline", z.text, fitted.text, {
          family: "condensed",
          weight: 800,
          casing: "UPPER",
          fill: "#FFFFFF",
          fontSize: fitted.fontSize,
          lineHeight: fitted.lineHeight,
          letterSpacing: -1,
          shadow: { x: 0, y: 4, blur: 16, color: "rgba(0,0,0,0.6)" }
        }, 30)
      ];

      validateOnlyAllowedBlocks(blocks, ["image", "overlay", "text"]);
      return template(canvas, this.id, blocks);
    }
  };
}

function SportsAction() {
  return {
    id: "SPORTS_ACTION",
    compile(canvas, ctx) {
      requireImage(ctx);
      requireFace(ctx);

      const z = zonesSports(canvas);

      const title = normalize(ctx.headline, 4).toUpperCase();

      const fitted = fitTextToZone(title, z.text, {
        baseFontSize: scale(canvas, 72),
        minFontSize: scale(canvas, 44),
        maxLines: 1,
        lineHeight: 0.95,
        letterSpacing: -1.2
      });

      const blocks = [
        image("action", z.image, { cropBias: "eyes-center", zoom: 1.12 }, 10),
        overlay("motion", z.motion, {
          type: "diagonal",
          color: "rgba(255,255,255,0.15)"
        }, 20),
        text("headline", z.text, fitted.text, {
          family: "condensed",
          weight: 900,
          casing: "UPPER",
          fill: "#FFFFFF",
          fontSize: fitted.fontSize,
          lineHeight: fitted.lineHeight,
          letterSpacing: -1.2,
          stroke: { width: scale(canvas, 4), color: "rgba(0,0,0,0.9)" }
        }, 30)
      ];

      validateOnlyAllowedBlocks(blocks, ["image", "overlay", "text"]);
      return template(canvas, this.id, blocks);
    }
  };
}

function MusicArtistic() {
  return {
    id: "MUSIC_ARTISTIC",
    compile(canvas, ctx) {
      requireImage(ctx);

      const z = zonesMusic(canvas);

      const title = normalize(ctx.headline, 6);

      const fitted = fitTextToZone(title, z.text, {
        baseFontSize: scale(canvas, 56),
        minFontSize: scale(canvas, 36),
        maxLines: 2,
        lineHeight: 1.15,
        letterSpacing: -0.3
      });

      const blocks = [
        image("art", z.image, { cropBias: "center" }, 10),
        overlay("tint", z.image, {
          type: "solid",
          color: "rgba(0,0,0,0.25)"
        }, 20),
        text("headline", z.text, fitted.text, {
          family: "serif",
          weight: 600,
          casing: "SENTENCE",
          fill: "#FFFFFF",
          fontSize: fitted.fontSize,
          lineHeight: fitted.lineHeight,
          letterSpacing: -0.3,
          shadow: { x: 0, y: 2, blur: 10, color: "rgba(0,0,0,0.4)" }
        }, 30)
      ];

      validateOnlyAllowedBlocks(blocks, ["image", "overlay", "text"]);
      return template(canvas, this.id, blocks);
    }
  };
}

function ComparisonVS() {
  return {
    id: "COMPARISON_VS",
    compile(canvas, ctx) {
      requireImage(ctx);

      const z = zonesVS(canvas);
      const title = normalize(ctx.headline, 5).toUpperCase();

      const fitted = fitTextToZone(title, z.text, {
        baseFontSize: scale(canvas, 52),
        minFontSize: scale(canvas, 34),
        maxLines: 2,
        lineHeight: 1.05,
        letterSpacing: -0.8
      });

      const blocks = [
        image("left", z.left, { cropBias: "center" }, 10),
        image("right", z.right, { cropBias: "center" }, 10),
        badge("vs", z.badge, {
          label: "VS",
          fill: "#FFFFFF",
          textColor: "#111111",
          radius: scale(canvas, 999),
          fontSize: scale(canvas, 32),
          weight: 900,
          paddingX: scale(canvas, 20),
          paddingY: scale(canvas, 12)
        }, 20),
        text("headline", z.text, fitted.text, {
          family: "condensed",
          weight: 800,
          casing: "UPPER",
          fill: "#FFFFFF",
          fontSize: fitted.fontSize,
          lineHeight: fitted.lineHeight,
          align: "center",
          shadow: { x: 0, y: 3, blur: 12, color: "rgba(0,0,0,0.6)" }
        }, 30)
      ];

      validateOnlyAllowedBlocks(blocks, ["image", "badge", "text"]);
      return template(canvas, this.id, blocks);
    }
  };
}

function BoldClaim() {
  return {
    id: "BOLD_CLAIM",
    compile(canvas, ctx) {
      const z = zonesBold(canvas);
      const title = normalize(ctx.headline, 4).toUpperCase();

      const fitted = fitTextToZone(title, z.center, {
        baseFontSize: scale(canvas, 88),
        minFontSize: scale(canvas, 52),
        maxLines: 2,
        lineHeight: 0.95,
        letterSpacing: -1.5
      });

      const blocks = [
        background("solid", z.full, { color: "#000000" }, 0),
        text("headline", z.center, fitted.text, {
          family: "condensed",
          weight: 900,
          casing: "UPPER",
          fill: "#FFFFFF",
          fontSize: fitted.fontSize,
          lineHeight: fitted.lineHeight,
          align: "center",
          letterSpacing: -1.5
        }, 10)
      ];

      validateOnlyAllowedBlocks(blocks, ["background", "text"]);
      return template(canvas, this.id, blocks);
    }
  };
}

function FaceCloseup() {
  return {
    id: "FACE_CLOSEUP",
    compile(canvas, ctx) {
      requireImage(ctx);
      requireFace(ctx);

      const z = zonesFace(canvas);
      const title = normalize(ctx.headline, 5).toUpperCase();

      const fitted = fitTextToZone(title, z.text, {
        baseFontSize: scale(canvas, 60),
        minFontSize: scale(canvas, 40),
        maxLines: 2,
        lineHeight: 1.0,
        letterSpacing: -1
      });

      const blocks = [
        image("face", z.image, { cropBias: "eyes-center", zoom: 1.18 }, 10),
        overlay("shade", z.image, {
          type: "gradient",
          direction: "to-bottom",
          stops: [
            { at: 0.0, color: "rgba(0,0,0,0.0)" },
            { at: 1.0, color: "rgba(0,0,0,0.65)" }
          ]
        }, 20),
        text("headline", z.text, fitted.text, {
          family: "condensed",
          weight: 800,
          casing: "UPPER",
          fill: "#FFFFFF",
          fontSize: fitted.fontSize,
          lineHeight: fitted.lineHeight,
          align: "center",
          shadow: { x: 0, y: 3, blur: 14, color: "rgba(0,0,0,0.6)" }
        }, 30)
      ];

      validateOnlyAllowedBlocks(blocks, ["image", "overlay", "text"]);
      return template(canvas, this.id, blocks);
    }
  };
}

function EducationalExplainer() {
  return {
    id: "EDUCATIONAL_EXPLAINER",
    compile(canvas, ctx) {
      const z = zonesEdu(canvas);

      const title = normalize(ctx.headline, 8);
      const subtitle = normalize(ctx.subhead, 14);

      const titleFit = fitTextToZone(title, z.title, {
        baseFontSize: scale(canvas, 48),
        minFontSize: scale(canvas, 32),
        maxLines: 2,
        lineHeight: 1.2,
        letterSpacing: 0
      });

      const blocks = [
        background("paper", z.full, { color: "#FAFAFA" }, 0),
        ...(ctx.imageProvided ? [image("illustration", z.image, { cropBias: "center" }, 10)] : []),
        text("headline", z.title, titleFit.text, {
          family: "sans",
          weight: 600,
          casing: "SENTENCE",
          fill: "#111111",
          fontSize: titleFit.fontSize,
          lineHeight: titleFit.lineHeight,
          align: "left"
        }, 20),
        ...(subtitle ? [text("subhead", z.sub, subtitle, {
          family: "sans",
          weight: 400,
          casing: "SENTENCE",
          fill: "rgba(17,17,17,0.75)",
          fontSize: scale(canvas, 28),
          lineHeight: 1.3,
          align: "left"
        }, 22)] : [])
      ];

      validateOnlyAllowedBlocks(blocks, ["background", "image", "text"]);
      return template(canvas, this.id, blocks);
    }
  };
}

function KidsPlayful() {
  return {
    id: "KIDS_PLAYFUL",
    compile(canvas, ctx) {
      requireImage(ctx);
      requireFace(ctx);

      const z = zonesKids(canvas);
      const title = normalize(ctx.headline, 4).toUpperCase();

      const fit = fitTextToZone(title, z.text, {
        baseFontSize: scale(canvas, 64),
        minFontSize: scale(canvas, 40),
        maxLines: 2,
        lineHeight: 1.0,
        letterSpacing: -0.5
      });

      const blocks = [
        background("fun", z.full, { color: "#FFEB3B" }, 0),
        image("kid", z.image, { cropBias: "eyes-center", zoom: 1.1 }, 10),
        badge("sticker", z.sticker, {
          label: "FUN",
          fill: "#FF5722",
          textColor: "#FFFFFF",
          radius: scale(canvas, 999),
          fontSize: scale(canvas, 26),
          weight: 900,
          paddingX: scale(canvas, 18),
          paddingY: scale(canvas, 10)
        }, 15),
        text("headline", z.text, fit.text, {
          family: "rounded",
          weight: 900,
          casing: "UPPER",
          fill: "#111111",
          fontSize: fit.fontSize,
          lineHeight: fit.lineHeight,
          align: "center"
        }, 20)
      ];

      validateOnlyAllowedBlocks(blocks, ["background", "image", "badge", "text"]);
      return template(canvas, this.id, blocks);
    }
  };
}

function LuxuryPremium() {
  return {
    id: "LUXURY_PREMIUM",
    compile(canvas, ctx) {
      requireImage(ctx);

      const z = zonesLuxury(canvas);
      const title = normalize(ctx.headline, 6);

      const fit = fitTextToZone(title, z.text, {
        baseFontSize: scale(canvas, 46),
        minFontSize: scale(canvas, 30),
        maxLines: 2,
        lineHeight: 1.25,
        letterSpacing: 0.2
      });

      const blocks = [
        image("hero", z.image, { cropBias: "center" }, 10),
        overlay("fade", z.image, {
          type: "gradient",
          direction: "to-top",
          stops: [
            { at: 0.0, color: "rgba(0,0,0,0.65)" },
            { at: 1.0, color: "rgba(0,0,0,0.0)" }
          ]
        }, 20),
        text("headline", z.text, fit.text, {
          family: "serif",
          weight: 500,
          casing: "SENTENCE",
          fill: "#FFFFFF",
          fontSize: fit.fontSize,
          lineHeight: fit.lineHeight,
          align: "center",
          letterSpacing: 0.2
        }, 30)
      ];

      validateOnlyAllowedBlocks(blocks, ["image", "overlay", "text"]);
      return template(canvas, this.id, blocks);
    }
  };
}

function AuthorityExpert() {
  return {
    id: "AUTHORITY_EXPERT",
    compile(canvas, ctx) {
      const z = zonesAuthority(canvas);

      const title = normalize(ctx.headline, 8);
      const sub = normalize(ctx.subhead, 12);

      const titleFit = fitTextToZone(title, z.title, {
        baseFontSize: scale(canvas, 54),
        minFontSize: scale(canvas, 34),
        maxLines: 2,
        lineHeight: 1.2,
        letterSpacing: 0
      });

      const blocks = [
        background("paper", z.full, { color: "#FFFFFF" }, 0),
        ...(ctx.imageProvided ? [image("expert", z.image, { cropBias: ctx.faceDetected ? "eyes-center" : "center" }, 10)] : []),
        text("headline", z.title, titleFit.text, {
          family: "serif",
          weight: 600,
          casing: "SENTENCE",
          fill: "#111111",
          fontSize: titleFit.fontSize,
          lineHeight: titleFit.lineHeight,
          align: "left"
        }, 20),
        ...(sub ? [text("subhead", z.sub, sub, {
          family: "serif",
          weight: 400,
          casing: "SENTENCE",
          fill: "rgba(17,17,17,0.75)",
          fontSize: scale(canvas, 26),
          lineHeight: 1.3,
          align: "left"
        }, 22)] : [])
      ];

      validateOnlyAllowedBlocks(blocks, ["background", "image", "text"]);
      return template(canvas, this.id, blocks);
    }
  };
}

function TechFuturistic() {
  return {
    id: "TECH_FUTURISTIC",
    compile(canvas, ctx) {
      requireImage(ctx);

      const z = zonesTech(canvas);
      const title = normalize(ctx.headline, 6).toUpperCase();

      const fit = fitTextToZone(title, z.text, {
        baseFontSize: scale(canvas, 56),
        minFontSize: scale(canvas, 36),
        maxLines: 2,
        lineHeight: 1.0,
        letterSpacing: -0.8
      });

      const blocks = [
        image("tech", z.image, { cropBias: "center" }, 10),
        overlay("grid", z.image, {
          type: "pattern",
          opacity: 0.25
        }, 15),
        overlay("glow", z.text, {
          type: "glow",
          color: "#00E5FF",
          blur: scale(canvas, 20)
        }, 18),
        text("headline", z.text, fit.text, {
          family: "mono",
          weight: 700,
          casing: "UPPER",
          fill: "#00E5FF",
          fontSize: fit.fontSize,
          lineHeight: fit.lineHeight,
          letterSpacing: -0.8,
          shadow: { x: 0, y: 0, blur: scale(canvas, 12), color: "rgba(0,229,255,0.8)" }
        }, 20)
      ];

      validateOnlyAllowedBlocks(blocks, ["image", "overlay", "text"]);
      return template(canvas, this.id, blocks);
    }
  };
}

function ReligionCalm() {
  return {
    id: "RELIGION_CALM",
    compile(canvas, ctx) {
      const z = zonesReligion(canvas);

      const title = normalize(ctx.headline, 10);
      const sub = normalize(ctx.subhead, 16);

      const titleFit = fitTextToZone(title, z.title, {
        baseFontSize: scale(canvas, 48),
        minFontSize: scale(canvas, 32),
        maxLines: 2,
        lineHeight: 1.3,
        letterSpacing: 0
      });

      const blocks = [
        background("calm", z.full, { color: "#F8F8F5" }, 0),
        text("headline", z.title, titleFit.text, {
          family: "serif",
          weight: 500,
          casing: "SENTENCE",
          fill: "#333333",
          fontSize: titleFit.fontSize,
          lineHeight: titleFit.lineHeight,
          align: "center"
        }, 10),
        ...(sub ? [text("subhead", z.sub, sub, {
          family: "serif",
          weight: 400,
          casing: "SENTENCE",
          fill: "rgba(51,51,51,0.7)",
          fontSize: scale(canvas, 26),
          lineHeight: 1.4,
          align: "center"
        }, 12)] : [])
      ];

      validateOnlyAllowedBlocks(blocks, ["background", "text"]);
      return template(canvas, this.id, blocks);
    }
  };
}

function FunPlayful() {
  return {
    id: "FUN_PLAYFUL",
    compile(canvas, ctx) {
      requireImage(ctx);
      requireFace(ctx);

      const z = zonesFun(canvas);
      const title = normalize(ctx.headline, 4).toUpperCase();

      const fit = fitTextToZone(title, z.text, {
        baseFontSize: scale(canvas, 60),
        minFontSize: scale(canvas, 40),
        maxLines: 2,
        lineHeight: 1.0,
        letterSpacing: -0.5
      });

      const blocks = [
        background("play", z.full, { color: "#FFCDD2" }, 0),
        image("face", z.image, { cropBias: "eyes-center", zoom: 1.12 }, 10),
        badge("emoji", z.emoji, {
          label: "😊",
          fill: "#FFFFFF",
          textColor: "#111111",
          radius: scale(canvas, 999),
          fontSize: scale(canvas, 28),
          weight: 800,
          paddingX: scale(canvas, 14),
          paddingY: scale(canvas, 8)
        }, 15),
        text("headline", z.text, fit.text, {
          family: "rounded",
          weight: 900,
          casing: "UPPER",
          fill: "#111111",
          fontSize: fit.fontSize,
          lineHeight: fit.lineHeight,
          align: "center"
        }, 20)
      ];

      validateOnlyAllowedBlocks(blocks, ["background", "image", "badge", "text"]);
      return template(canvas, this.id, blocks);
    }
  };
}

function EmotionalStory() {
  return {
    id: "EMOTIONAL_STORY",
    compile(canvas, ctx) {
      requireImage(ctx);
      requireFace(ctx);

      const z = zonesEmotion(canvas);
      const title = normalize(ctx.headline, 6);

      const fit = fitTextToZone(title, z.text, {
        baseFontSize: scale(canvas, 58),
        minFontSize: scale(canvas, 36),
        maxLines: 2,
        lineHeight: 1.1,
        letterSpacing: -0.3
      });

      const blocks = [
        image("hero", z.image, { cropBias: "eyes-center" }, 10),
        overlay("fade", z.fade, {
          type: "gradient",
          direction: "to-top",
          stops: [
            { at: 0.0, color: "rgba(0,0,0,0.75)" },
            { at: 1.0, color: "rgba(0,0,0,0.0)" }
          ]
        }, 20),
        text("headline", z.text, fit.text, {
          family: "serif",
          weight: 600,
          casing: "SENTENCE",
          fill: "#FFFFFF",
          fontSize: fit.fontSize,
          lineHeight: fit.lineHeight,
          align: "center",
          shadow: { x: 0, y: 4, blur: 14, color: "rgba(0,0,0,0.6)" }
        }, 30)
      ];

      validateOnlyAllowedBlocks(blocks, ["image", "overlay", "text"]);
      return template(canvas, this.id, blocks);
    }
  };
}

function zonesAggressive(c, faceDetected) {
  const s = c.safe;
  const W = c.w - s * 2;
  const H = c.h - s * 2;

  // If face detected, bias image to left and text to right (avoid face overlap).
  // If no face, allow more centered image and bottom text.
  const image = faceDetected
    ? { x: s, y: s, w: W * 0.72, h: H }
    : { x: s, y: s, w: W, h: H };

  const text = faceDetected
    ? { x: s + W * 0.72, y: s, w: W * 0.28, h: H }
    : { x: s + W * 0.10, y: s + H * 0.68, w: W * 0.80, h: H * 0.26 };

  const kicker = faceDetected
    ? { x: text.x, y: text.y + text.h * 0.58, w: text.w, h: text.h * 0.42 }
    : { x: text.x, y: text.y, w: text.w, h: text.h };

  return { image, text, kicker };
}

function zonesAuthority(c) {
  const s=c.safe,W=c.w-2*s,H=c.h-2*s;
  return {
    full:{x:s,y:s,w:W,h:H},
    image:{x:s,y:s,w:W*0.4,h:H},
    title:{x:s+W*0.45,y:s+H*0.25,w:W*0.5,h:H*0.25},
    sub:{x:s+W*0.45,y:s+H*0.55,w:W*0.5,h:H*0.3}
  };
}

function zonesBold(c) {
  const s=c.safe,W=c.w-2*s,H=c.h-2*s;
  return {
    full:{x:s,y:s,w:W,h:H},
    center:{x:s+W*0.1,y:s+H*0.3,w:W*0.8,h:H*0.4}
  };
}

function zonesCinematic(c) {
  const s=c.safe,W=c.w-2*s,H=c.h-2*s;
  return {
    image:{x:s,y:s,w:W,h:H},
    text:{x:s+W*0.15,y:s+H*0.7,w:W*0.7,h:H*0.25}
  };
}

function zonesEdu(c) {
  const s=c.safe,W=c.w-2*s,H=c.h-2*s;
  return {
    full:{x:s,y:s,w:W,h:H},
    image:{x:s,y:s,w:W*0.45,h:H},
    title:{x:s+W*0.5,y:s+H*0.2,w:W*0.45,h:H*0.25},
    sub:{x:s+W*0.5,y:s+H*0.5,w:W*0.45,h:H*0.3}
  };
}

function zonesEmotion(c) {
  const s=c.safe,W=c.w-2*s,H=c.h-2*s;
  return {
    image:{x:s,y:s,w:W,h:H},
    fade:{x:s,y:s+H*0.55,w:W,h:H*0.45},
    text:{x:s+W*0.15,y:s+H*0.65,w:W*0.7,h:H*0.25}
  };
}

function zonesFace(c) {
  const s=c.safe,W=c.w-2*s,H=c.h-2*s;
  return {
    image:{x:s,y:s,w:W,h:H},
    text:{x:s+W*0.15,y:s+H*0.7,w:W*0.7,h:H*0.22}
  };
}

function zonesFun(c) {
  const s=c.safe,W=c.w-2*s,H=c.h-2*s;
  return {
    full:{x:s,y:s,w:W,h:H},
    image:{x:s+W*0.15,y:s+H*0.1,w:W*0.7,h:H*0.55},
    text:{x:s+W*0.2,y:s+H*0.7,w:W*0.6,h:H*0.2},
    emoji:{x:s+W*0.05,y:s+H*0.05,w:W*0.15,h:H*0.15}
  };
}

function zonesKids(c) {
  const s=c.safe,W=c.w-2*s,H=c.h-2*s;
  return {
    full:{x:s,y:s,w:W,h:H},
    image:{x:s+W*0.1,y:s+H*0.1,w:W*0.8,h:H*0.55},
    text:{x:s+W*0.15,y:s+H*0.7,w:W*0.7,h:H*0.2},
    sticker:{x:s+W*0.05,y:s+H*0.05,w:W*0.2,h:H*0.15}
  };
}

function zonesLuxury(c) {
  const s=c.safe,W=c.w-2*s,H=c.h-2*s;
  return {
    image:{x:s,y:s,w:W,h:H},
    text:{x:s+W*0.15,y:s+H*0.65,w:W*0.7,h:H*0.25}
  };
}

function zonesMinimal(c) {
  const s = c.safe;
  const W = c.w - s * 2;
  const H = c.h - s * 2;

  return {
    full: { x: s, y: s, w: W, h: H },
    title: { x: s, y: s + H * 0.30, w: W, h: H * 0.22 },
    divider: { x: s, y: s + H * 0.56, w: W * 0.42, h: 0 },
    sub: { x: s, y: s + H * 0.60, w: W * 0.72, h: H * 0.25 }
  };
}

function zonesMusic(c) {
  const s=c.safe,W=c.w-2*s,H=c.h-2*s;
  return {
    image:{x:s,y:s,w:W,h:H},
    text:{x:s+W*0.2,y:s+H*0.35,w:W*0.6,h:H*0.3}
  };
}

function zonesMystery(c) {
  const s = c.safe;
  const W = c.w - s * 2;
  const H = c.h - s * 2;

  return {
    image: { x: s, y: s, w: W, h: H },
    fade: { x: s, y: s + H * 0.55, w: W, h: H * 0.45 },
    text: { x: s + W * 0.08, y: s + H * 0.66, w: W * 0.84, h: H * 0.22 },
    badge: { x: s + W * 0.88, y: s + H * 0.58, w: W * 0.08, h: H * 0.08 }
  };
}

function zonesNews(c) {
  const s = c.safe, W = c.w - s * 2, H = c.h - s * 2;
  return {
    banner: { x: s, y: s + H * 0.35, w: W, h: H * 0.3 },
    rule: { x: s, y: s + H * 0.67, w: W, h: 0 }
  };
}

function zonesProduct(c) {
  const s = c.safe, W = c.w - s * 2, H = c.h - s * 2;
  return {
    full: { x: s, y: s, w: W, h: H },
    image: { x: s + W * 0.1, y: s + H * 0.08, w: W * 0.8, h: H * 0.7 },
    caption: { x: s, y: s + H * 0.82, w: W, h: H * 0.16 }
  };
}

function zonesReligion(c) {
  const s=c.safe,W=c.w-2*s,H=c.h-2*s;
  return {
    full:{x:s,y:s,w:W,h:H},
    title:{x:s+W*0.1,y:s+H*0.35,w:W*0.8,h:H*0.2},
    sub:{x:s+W*0.1,y:s+H*0.58,w:W*0.8,h:H*0.25}
  };
}

function zonesSports(c) {
  const s=c.safe,W=c.w-2*s,H=c.h-2*s;
  return {
    image:{x:s,y:s,w:W,h:H},
    motion:{x:s,y:s+H*0.15,w:W,h:H*0.2},
    text:{x:s+W*0.1,y:s+H*0.05,w:W*0.8,h:H*0.2}
  };
}

function zonesTech(c) {
  const s=c.safe,W=c.w-2*s,H=c.h-2*s;
  return {
    image:{x:s,y:s,w:W,h:H},
    text:{x:s+W*0.15,y:s+H*0.4,w:W*0.7,h:H*0.25}
  };
}

function zonesTrust(c) {
  const s = c.safe, W = c.w - s * 2, H = c.h - s * 2;
  return {
    full: { x: s, y: s, w: W, h: H },
    image: { x: s, y: s, w: W * 0.45, h: H },
    title: { x: s + W * 0.5, y: s + H * 0.25, w: W * 0.45, h: H * 0.25 },
    sub: { x: s + W * 0.5, y: s + H * 0.52, w: W * 0.45, h: H * 0.28 }
  };
}

function zonesVS(c) {
  const s=c.safe,W=c.w-2*s,H=c.h-2*s;
  return {
    left:{x:s,y:s,w:W*0.45,h:H},
    right:{x:s+W*0.55,y:s,w:W*0.45,h:H},
    badge:{x:s+W*0.45,y:s+H*0.42,w:W*0.10,h:H*0.16},
    text:{x:s+W*0.15,y:s+H*0.82,w:W*0.7,h:H*0.15}
  };
}


// ======================================================
// SHARED HELPERS (single canonical copy; supports all archetypes)
// ======================================================

function template(canvas, archetypeId, blocks) {
  return {
    canvas,
    archetypeId,
    blocks
  };
}

// Stable 32-bit hash (FNV-1a) — deterministic selection + ids.
function stableHash(s) {
  let h = 2166136261;
  const str = String(s ?? "");
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0);
}

// Scale typography/metrics based on YouTube base width (1280).
function scale(canvas, v) {
  const baseW = 1280;
  const w = (canvas && canvas.w) ? canvas.w : baseW;
  const k = w / baseW;
  return Math.round(v * k);
}

// Round zone geometry to integers (pixel-aligned).
function roundZone(z) {
  if (!z) return z;
  return {
    x: Math.round(z.x || 0),
    y: Math.round(z.y || 0),
    w: Math.round(z.w || 0),
    h: Math.round(z.h || 0)
  };
}
// Some batches call round(), others roundZone().
function round(z) { return roundZone(z); }

// Block builders (some archetypes expect ids; some don't — we include ids safely).
function uid(seed) {
  return `${seed}-${Math.abs(stableHash(seed)).toString(16).slice(0, 6)}`;
}

function image(role, zone, style, z) {
  return { id: uid(role), type: "image", role, zone: roundZone(zone), style: style || {}, z };
}
function text(role, zone, value, style, z) {
  return { id: uid(role), type: "text", role, zone: roundZone(zone), value, style: style || {}, z };
}
function overlay(role, zone, style, z) {
  return { id: uid(role), type: "overlay", role, zone: roundZone(zone), style: style || {}, z };
}
function background(role, zone, style, z) {
  return { id: uid(role), type: "background", role, zone: roundZone(zone), style: style || {}, z };
}
function badge(role, zone, style, z) {
  return { id: uid(role), type: "badge", role, zone: roundZone(zone), style: style || {}, z };
}
function line(role, zone, style, z) {
  return { id: uid(role), type: "line", role, zone: roundZone(zone), style: style || {}, z };
}

// Validation helpers
function requireImage(ctx) {
  if (!ctx || !ctx.imageProvided) throw new Error("Image required");
}
function requireFace(ctx) {
  if (!ctx || !ctx.faceDetected) throw new Error("Face required");
}

function validateOnlyAllowedBlocks(blocks, allowedTypes) {
  for (const b of blocks || []) {
    if (!allowedTypes.includes(b.type)) throw new Error(`Disallowed block type: ${b.type}`);
  }
}

function validateNoOverlap(blocks, textRoles, otherRoles) {
  const byRole = new Map((blocks || []).map(b => [b.role, b]));
  for (const tr of (textRoles || [])) {
    const t = byRole.get(tr);
    if (!t) continue;
    for (const or of (otherRoles || [])) {
      const o = byRole.get(or);
      if (!o) continue;
      if (rectsOverlap(t.zone, o.zone)) throw new Error("Block overlap");
    }
  }
}

function rectsOverlap(a, b) {
  return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
}

// Text normalization helpers used by different batches
function sentenceCase(s) {
  const t = String(s || "").trim();
  if (!t) return "";
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

function titleCase(s) {
  return String(s || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

// normalize() exists in several batches with a simple "first N words" behavior.
function normalize(t, maxWords) {
  return String(t || "").trim().split(/\s+/).filter(Boolean).slice(0, maxWords).join(" ");
}

// normalizeHeadline() supports casing controls used in archetypes 1–6.
function normalizeHeadline(headline, opts) {
  const maxWords = opts?.maxWords ?? 8;
  const casing = opts?.casing ?? "SENTENCE";
  let t = normalize(headline, maxWords);

  if (casing === "UPPER") t = t.toUpperCase();
  else if (casing === "TITLE") t = titleCase(t);
  else if (casing === "SENTENCE") t = sentenceCase(t);

  return t;
}

// Fit text deterministically by shrinking font size until it fits constraints.
// Uses a simple width heuristic (good enough for compile-time layout spec).
function fitTextToZone(textValue, zone, opts) {
  let fontSize = opts.baseFontSize;
  const min = opts.minFontSize;
  const maxLines = opts.maxLines;
  const lineHeight = opts.lineHeight;

  const clean = String(textValue || "").trim();
  if (!clean) return { text: "", fontSize, lineHeight };

  while (fontSize >= min) {
    const lines = estimateLines(clean, zone.w, fontSize, opts.letterSpacing);
    if (lines <= maxLines) return { text: clean, fontSize, lineHeight };
    fontSize = Math.max(min, Math.floor(fontSize * 0.92));
    if (fontSize === min) break;
  }

  const finalLines = estimateLines(clean, zone.w, min, opts.letterSpacing);
  if (finalLines > maxLines) throw new Error("Text cannot fit");
  return { text: clean, fontSize: min, lineHeight };
}

function estimateLines(text, widthPx, fontSizePx, letterSpacing) {
  // Approx average character width:
  // - condensed fonts are narrower, serif slightly wider; we don't know family here,
  //   so we use a stable heuristic and let fitTextToZone shrink if needed.
  const ls = Number.isFinite(letterSpacing) ? letterSpacing : 0;
  const avgCharW = Math.max(1, (fontSizePx * 0.55) + (ls * 0.25));
  const charsPerLine = Math.max(1, Math.floor(widthPx / avgCharW));
  return Math.ceil(text.length / charsPerLine);
}


// UMD exports (Node + Browser)
try {
  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      ARCHETYPE_FACTORY_FNS,
      buildAllArchetypes,
      resolveCanvas,
      selectArchetype,
      nextArchetype
    };
  }
} catch (_) {}
try {
  if (typeof window !== "undefined") {
    window.NexoraArchetypesLib = window.NexoraArchetypesLib || {
      ARCHETYPE_FACTORY_FNS,
      buildAllArchetypes,
      resolveCanvas,
      selectArchetype,
      nextArchetype
    };
  }
} catch (_) {}
