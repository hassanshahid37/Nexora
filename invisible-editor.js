// invisible-editor.js — Editor Handoff Fix (AD-H2)
// Robustly bridges generated templates -> Manual Editor via localStorage
// No UI / HTML / CSS changes

(function () {
  if (window.__NEXORA_EDITOR_HANDOFF_H2__) return;
  window.__NEXORA_EDITOR_HANDOFF_H2__ = true;

  const KEY_LAST = "NEXORA_LAST_TEMPLATES";
  const KEY_SELECTED = "nexora_selected_template_v1";
  const KEY_DRAFT = "templify_draft";
  const KEY_SETTINGS = "nexora_last_settings_v1";

  function safeJSONParse(s) {
    try { return JSON.parse(s); } catch { return null; }
  }
  function safeJSONSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  }

  // Convert design.js-style elements into editor-native elements.
  function toEditorTemplateH2(tpl) {
    if (!tpl) return null;

    // Already in editor format (title/subtitle fields exist on elements)
    if (Array.isArray(tpl.elements) && tpl.elements.some(e => e && typeof e.title === "string")) {
      return tpl;
    }

    const src = Array.isArray(tpl.elements) ? tpl.elements : [];
    if (!src.length) return null;

    const uid = () =>
      (globalThis.crypto?.randomUUID?.() ||
        ("id_" + Math.random().toString(16).slice(2) + Date.now().toString(16)));

    const outEls = src.map((e) => {
      const type = String(e?.type || "card").toLowerCase();
      const id = e?.id || uid();
      const x = Number(e?.x ?? 80), y = Number(e?.y ?? 80);
      const w = Number(e?.w ?? 320), h = Number(e?.h ?? 120);

      let kind = "card";
      let title = "";
      let subtitle = "";
      let bg = null;
      let stroke = null;
      let radius = Number(e?.r ?? 24);
      let opacity = Number(e?.opacity ?? 1);

      if (type === "text") {
        kind = "text";
        title = String(e?.text ?? "");
        radius = 0;
      } else if (type === "photo" || type === "image") {
        kind = "image";
        title = "IMAGE";
      } else if (type === "badge" || type === "pill" || type === "chip") {
        kind = "badge";
        title = String(e?.text ?? e?.title ?? "BADGE");
      } else if (type === "button" || type === "cta") {
        kind = "button";
        title = String(e?.text ?? e?.title ?? "CTA");
      } else {
        kind = "card";
        title = String(e?.title ?? e?.text ?? "");
        subtitle = String(e?.subtitle ?? "");
      }

      if (type === "bg") {
        kind = "bg";
        bg = e?.fill || e?.color || null;
      } else {
        bg = e?.fill || e?.color || e?.bg || null;
        stroke = e?.stroke || null;
      }

      const fontSize = Number(e?.size ?? e?.fontSize ?? 22);
      const weight = Number(e?.weight ?? 700);
      const color = e?.color || "rgba(255,255,255,0.92)";

      return {
        id,
        type: kind,
        x, y, w, h,
        title,
        subtitle,
        bg,
        stroke,
        radius,
        opacity,
        fontSize,
        weight,
        color,
      };
    });

    return {
      title: tpl.title || "Untitled",
      description: tpl.description || tpl.subtitle || "",
      bg: tpl.bg || null,
      canvas: tpl.canvas || { w: 980, h: 620 },
      elements: outEls,
    };
  }

  // 1) Capture templates when they render on index page
  const originalRender = window.renderTemplates;
  if (typeof originalRender === "function") {
    window.renderTemplates = function (templates) {
      safeJSONSet(KEY_LAST, templates || []);
      return originalRender.apply(this, arguments);
    };
  }

  // 2) Patch openEditorWith so tile click always stores a REAL draft
  function patchOpenEditorWith() {
    const fn = window.openEditorWith;
    if (typeof fn !== "function" || fn.__NEXORA_PATCHED__) return;

    function wrapped(payload) {
      try {
        const isTemplate = payload && (Array.isArray(payload.elements) || payload.headline || payload.layoutHint);
        if (isTemplate) {
          const converted = toEditorTemplateH2(payload);
          if (converted && converted.elements && converted.elements.length) {
            safeJSONSet(KEY_SELECTED, converted);

            const cat = payload.category || payload.cat || document.querySelector("#cat")?.value;
            const style = payload.style || document.querySelector("#style")?.value;

            safeJSONSet(KEY_SETTINGS, {
              cat,
              style,
              prompt: document.querySelector("#prompt")?.value?.trim?.() || "",
              notes: document.querySelector("#notes")?.value?.trim?.() || "",
              count: Number(document.querySelector("#count")?.value || 24),
            });

            safeJSONSet(KEY_DRAFT, {
              meta: {
                cat,
                style,
                i: payload.i || 1,
                prompt: document.querySelector("#prompt")?.value?.trim?.() || "",
                notes: document.querySelector("#notes")?.value?.trim?.() || "",
                title: converted.title || null,
                description: converted.description || null,
              },
              template: converted,
              createdAt: Date.now(),
            });
          }
        }
      } catch {}

      return fn.apply(this, arguments);
    }
    wrapped.__NEXORA_PATCHED__ = true;
    window.openEditorWith = wrapped;
  }

  // 3) On editor page, auto-inject draft (if editor didn't load it)
  function ensureEditorLoaded() {
    try {
      const draft = safeJSONParse(localStorage.getItem(KEY_DRAFT) || "null") ||
                    safeJSONParse(localStorage.getItem(KEY_SELECTED) || "null");

      const tpl = draft?.template?.elements ? draft.template : (draft?.elements ? draft : null);
      if (!tpl || !Array.isArray(tpl.elements) || !tpl.elements.length) return;

      if (window.__NEXORA_EDITOR_LOADED__) return;

      if (typeof window.loadTemplate === "function") {
        window.loadTemplate(tpl);
        window.__NEXORA_EDITOR_LOADED__ = true;
        return;
      }
      if (typeof window.setCanvasFromTemplate === "function") {
        window.setCanvasFromTemplate(tpl);
        window.__NEXORA_EDITOR_LOADED__ = true;
        return;
      }

      window.__NEXORA_PENDING_TEMPLATE__ = tpl;
    } catch {}
  }

  patchOpenEditorWith();

  let tries = 0;
  const iv = setInterval(() => {
    patchOpenEditorWith();
    tries++;
    if (tries > 20) clearInterval(iv);
  }, 150);

  if (location.pathname.includes("editor")) {
    window.addEventListener("load", ensureEditorLoaded);
    setTimeout(ensureEditorLoaded, 400);
    setTimeout(ensureEditorLoaded, 1200);
  }
})();
