// invisible-editor.js — Editor Handoff Fix (AD-H3)
// Goal: ALWAYS hand off generated template into editor.
// Strategy:
// 1) Persist last generated templates on render.
// 2) Before navigating to editor (via Open Editor button OR preview click),
//    select the intended template (best-effort) and store as templify_draft.
// 3) On editor load, attempt multiple injection paths + dispatch storage event.
// No UI / HTML / CSS changes.

(function () {
  // === Editor Working Canvas Normalization ===
  const EDITOR_CANVAS_W = 1200;
  const EDITOR_CANVAS_H = 800;

  if (window.__NEXORA_EDITOR_HANDOFF_H3__) return;
  window.__NEXORA_EDITOR_HANDOFF_H3__ = true;

  const KEY_LAST = "NEXORA_LAST_TEMPLATES";
  const KEY_SELECTED = "nexora_selected_template_v1";
  const KEY_DRAFT = "templify_draft";
  const KEY_SETTINGS = "nexora_last_settings_v1";

  function safeParse(s) { try { return JSON.parse(s); } catch { return null; } }
  function safeSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
  function safeGet(k) { try { return localStorage.getItem(k); } catch { return null; } }

  function uid() {
    return (globalThis.crypto?.randomUUID?.() ||
      ("id_" + Math.random().toString(16).slice(2) + Date.now().toString(16)));
  }

  // Convert generator template -> editor-friendly template (best effort).
  function toEditorTemplate(tpl) {
    if (!tpl) return null;
    if (Array.isArray(tpl.elements) && tpl.elements.some(e => e && typeof e.title === "string")) return tpl;

    const src = Array.isArray(tpl.elements) ? tpl.elements : [];
    if (!src.length) return null;

    const out = src.map(e => {
      const type = String(e?.type || "card").toLowerCase();
      const id = e?.id || uid();
      const x = Number(e?.x ?? 80), y = Number(e?.y ?? 80);
      const w = Number(e?.w ?? 320), h = Number(e?.h ?? 120);
      let kind = "card";
      let title = "", subtitle = "";
      let bg = e?.fill || e?.bg || e?.color || null;
      let stroke = e?.stroke || null;
      let radius = Number(e?.r ?? 24);
      let opacity = Number(e?.opacity ?? 1);

      if (type === "text") { kind = "text"; title = String(e?.text ?? ""); radius = 0; }
      else if (type === "badge" || type === "pill" || type === "chip") { kind = "badge"; title = String(e?.text ?? e?.title ?? "BADGE"); }
      else if (type === "button" || type === "cta") { kind = "button"; title = String(e?.text ?? e?.title ?? "CTA"); }
      else if (type === "image" || type === "photo") { kind = "image"; title = "IMAGE"; }
      else if (type === "bg") { kind = "bg"; bg = e?.fill || e?.color || bg; title = ""; subtitle = ""; }

      if (!title) title = String(e?.title ?? "");
      if (!subtitle) subtitle = String(e?.subtitle ?? "");

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
        fontSize: Number(e?.size ?? e?.fontSize ?? 22),
        weight: Number(e?.weight ?? 700),
        color: e?.color || "rgba(255,255,255,0.92)"
      };
    });

    
    const origCanvas = tpl.canvas || { w: 1080, h: 1080 };
    const sx = EDITOR_CANVAS_W / origCanvas.w;
    const sy = EDITOR_CANVAS_H / origCanvas.h;
    const scale = Math.min(sx, sy);

    out.forEach(e => {
      e.x *= scale; e.y *= scale;
      e.w *= scale; e.h *= scale;
    });

    return {
      title: tpl.title || tpl.headline || "Untitled",
      description: tpl.description || tpl.subtitle || "",
      bg: tpl.bg || null,
      canvas: { w: EDITOR_CANVAS_W, h: EDITOR_CANVAS_H },
      __origCanvas: origCanvas,
      __scale: scale,
      elements: out
    };

  }

  function currentSettings() {
    const q = (sel) => document.querySelector(sel);
    return {
      cat: q("#cat")?.value || q("[name=category]")?.value || null,
      style: q("#style")?.value || q("[name=style]")?.value || null,
      prompt: (q("#prompt")?.value || "").trim(),
      notes: (q("#notes")?.value || "").trim(),
      count: Number(q("#count")?.value || 0) || null
    };
  }

  function chooseFromText(el) {
    // Try to detect "Instagram Post #3" etc to select matching template
    try {
      const t = (el?.innerText || "").match(/#\s*(\d{1,3})/);
      if (!t) return null;
      const n = Math.max(1, Math.min(200, parseInt(t[1], 10)));
      const last = safeParse(safeGet(KEY_LAST) || "null");
      if (!Array.isArray(last) || !last.length) return null;
      return last[n - 1] || last[0] || null;
    } catch { return null; }
  }

  function persistSelectedTemplate(tpl, metaOverride) {
    const converted = toEditorTemplate(tpl);
    if (!converted || !Array.isArray(converted.elements) || !converted.elements.length) return false;

    const meta = Object.assign({}, currentSettings(), metaOverride || {});
    safeSet(KEY_SELECTED, converted);
    safeSet(KEY_SETTINGS, meta);
    safeSet(KEY_DRAFT, {
      meta,
      template: converted,
      createdAt: Date.now()
    });

    // Notify editor (some apps listen to storage event)
    try {
      window.dispatchEvent(new StorageEvent("storage", { key: KEY_DRAFT, newValue: safeGet(KEY_DRAFT) }));
    } catch {}
    return true;
  }

  // 1) Persist templates on render
  const originalRender = window.renderTemplates;
  if (typeof originalRender === "function") {
    window.renderTemplates = function (templates) {
      safeSet(KEY_LAST, templates || []);
      const res = originalRender.apply(this, arguments);
      // After DOM renders, attach best-effort click capture on preview tiles
      setTimeout(() => {
        try {
          const container = document.querySelector("#grid") || document.querySelector(".grid") || document.body;
          if (!container || container.__NEXORA_PREVIEW_WIRED__) return;
          container.__NEXORA_PREVIEW_WIRED__ = true;

          container.addEventListener("click", (ev) => {
            const target = ev.target;
            if (!target) return;

            // Find card-like wrapper
            const card =
              target.closest?.("[data-template-index]") ||
              target.closest?.("[data-idx]") ||
              target.closest?.(".card") ||
              target.closest?.(".tpl") ||
              target.closest?.(".template") ||
              target.closest?.(".preview") ||
              target.closest?.(".tile");

            if (!card) return;

            // Attempt selection by dataset index first
            let idx = null;
            const di = card.getAttribute?.("data-template-index") || card.getAttribute?.("data-idx");
            if (di && /^\d+$/.test(di)) idx = parseInt(di, 10);

            const last = safeParse(safeGet(KEY_LAST) || "null");
            if (Array.isArray(last) && last.length) {
              const chosen = (idx != null && last[idx]) ? last[idx] : chooseFromText(card) || last[0];
              persistSelectedTemplate(chosen, { i: idx != null ? (idx + 1) : null });
            }
          }, true); // capture phase so it runs before navigation
        } catch {}
      }, 0);
      return res;
    };
  }

  // 2) Patch openEditorWith / openEditor to ALWAYS store a draft, even if only settings are provided.
  function patchEditorOpen() {
    const patch = (name) => {
      const fn = window[name];
      if (typeof fn !== "function" || fn.__NEXORA_PATCHED__) return;

      function wrapped(payload) {
        try {
          const last = safeParse(safeGet(KEY_LAST) || "null");
          const hasLast = Array.isArray(last) && last.length;

          // If payload IS a template
          const isTemplate = payload && (Array.isArray(payload.elements) || payload.headline || payload.layoutHint);
          if (isTemplate) {
            persistSelectedTemplate(payload, { i: payload.i || null });
          } else if (hasLast) {
            // If payload is only settings, still hand off first template (or previously selected)
            const selected = safeParse(safeGet(KEY_SELECTED) || "null");
            const chosen = selected && selected.elements ? selected : last[0];
            persistSelectedTemplate(chosen, { reason: "openEditorWithoutTemplate" });
          }
        } catch {}
        return fn.apply(this, arguments);
      }
      wrapped.__NEXORA_PATCHED__ = true;
      window[name] = wrapped;
    };

    patch("openEditorWith");
    patch("openEditor");
  }

  patchEditorOpen();

  // Retry patching in case functions register later
  let tries = 0;
  const iv = setInterval(() => {
    patchEditorOpen();
    tries++;
    if (tries > 30) clearInterval(iv);
  }, 120);

  // 3) On editor page, force-load the draft if editor didn't load it.
  function forceInjectOnEditor() {
    try {
      const draft = safeParse(safeGet(KEY_DRAFT) || "null");
      const selected = safeParse(safeGet(KEY_SELECTED) || "null");
      const tpl = (draft?.template?.elements ? draft.template : (selected?.elements ? selected : null));
      if (!tpl || !Array.isArray(tpl.elements) || !tpl.elements.length) return;

      // If editor exposes loaders, use them
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

      // Fallback: try "setDoc"/"setDocument"/"importJSON" patterns if exist
      const candidates = ["setDoc", "setDocument", "importJSON", "importTemplate", "loadDoc"];
      for (const k of candidates) {
        if (typeof window[k] === "function") {
          window[k](tpl);
          window.__NEXORA_EDITOR_LOADED__ = true;
          return;
        }
      }

      // Last resort: expose pending
      window.__NEXORA_PENDING_TEMPLATE__ = tpl;
    } catch {}
  }

  if (location.pathname.includes("editor")) {
    window.addEventListener("load", forceInjectOnEditor);
    setTimeout(forceInjectOnEditor, 200);
    setTimeout(forceInjectOnEditor, 900);
    setTimeout(forceInjectOnEditor, 1800);
  }
})();
