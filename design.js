
/*
 Phase I – Smart Visual Fill (Invisible, Fast)
 -------------------------------------------
 - Runs automatically after AI templates are generated
 - Fills image blocks silently (no editor UI)
 - Uses safe placeholder logic (no broken URLs)
*/

(function () {
  console.log("Phase I Smart Visual Fill loaded");

  function getPlaceholder(keyword) {
    const map = {
      default: "https://picsum.photos/600/400",
      business: "https://picsum.photos/seed/business/600/400",
      fitness: "https://picsum.photos/seed/fitness/600/400",
      travel: "https://picsum.photos/seed/travel/600/400",
      tech: "https://picsum.photos/seed/tech/600/400",
      lifestyle: "https://picsum.photos/seed/lifestyle/600/400"
    };
    return map[keyword] || map.default;
  }

  function autoFillImages(templates) {
    templates.forEach(t => {
      if (!t.image) {
        const key = (t.title || "").toLowerCase();
        if (key.includes("brand")) t.image = getPlaceholder("business");
        else if (key.includes("fitness")) t.image = getPlaceholder("fitness");
        else if (key.includes("travel")) t.image = getPlaceholder("travel");
        else if (key.includes("tech")) t.image = getPlaceholder("tech");
        else t.image = getPlaceholder("lifestyle");
      }
    });
    return templates;
  }

  window.__PHASE_I_VISUAL_FILL__ = autoFillImages;
})();
