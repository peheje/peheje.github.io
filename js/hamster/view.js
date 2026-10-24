const revealTransitionMs = 260;
const cameoDurationMs = 7200;
const quietPauseMs = 1800;

// What the hamster is doing between conversations. Picked at random per visit.
const quietActivities = {
  morning: { activity: "sorting", lines: [
    "Sorting seeds.", "Arranging breakfast by size.", "Darning a sock with great seriousness.",
    "Counting the crumbs. Twice.", "Folding the map the wrong way, again.",
  ] },
  day: { activity: "sorting", lines: [
    "Sorting seeds.", "Polishing a sword that does not need it.", "Sweeping one corner very thoroughly.",
    "Weighing two acorns against each other.", "Mending the strap of a very small pack.",
  ] },
  evening: { activity: "listening", lines: [
    "Listening for footsteps.", "Watching the lamp decide whether to stay lit.",
    "Reading the same page of a very small book.", "Warming both paws on the kettle.",
  ] },
  done: { activity: "sorting", lines: [
    "That is all I have for now. Come back after the kettle.",
    "I have run out of things worth saying. A rare state.",
    "No more for now. I am saving the rest for later.",
  ] },
  night: { activity: "sleeping", lines: [
    "Asleep beneath a handkerchief.", "Asleep, one ear still on duty.",
    "Asleep with the map for a blanket.", "Snoring, politely.",
  ] },
};

export function createHamsterView({ document, window }) {
  let trigger = null;
  let panel = null;
  let cleanupPanel = null;
  let dismissTimer = null;
  let pendingTimer = null;
  let pendingCleanup = null;
  const pending = [];

  function isEditing() {
    const active = document.activeElement;
    if (!active) return false;
    if (active.matches("textarea, [role='textbox']") || active.closest("[contenteditable='true'], [contenteditable='']")) return true;
    return active.matches("input") && !["button", "submit", "reset", "checkbox", "radio", "range", "color", "file", "image", "hidden"].includes(active.type);
  }

  function hasModal() {
    return Boolean(document.querySelector("dialog[open], [aria-modal='true'], .tool-picker-backdrop.tool-picker-open"));
  }

  function schedulePending() {
    window.clearTimeout(pendingTimer);
    pendingTimer = null;
    if (!pending.length || document.hidden || isEditing() || panel) return;
    pendingTimer = window.setTimeout(() => {
      pendingTimer = null;
      if (document.hidden || isEditing() || panel) return;
      if (hasModal()) { schedulePending(); return; }
      const next = pending.shift();
      if (!pending.length) { pendingCleanup?.(); pendingCleanup = null; }
      show(next.encounter, next.options);
    }, quietPauseMs);
  }

  function queueCameo(encounter, options) {
    if (!pending.some(item => item.encounter.id === encounter.id)) pending.push({ encounter, options });
    if (!pendingCleanup) {
      const afterFocus = () => window.queueMicrotask(schedulePending);
      document.addEventListener("input", schedulePending);
      document.addEventListener("focusout", afterFocus);
      document.addEventListener("visibilitychange", schedulePending);
      pendingCleanup = () => {
        document.removeEventListener("input", schedulePending);
        document.removeEventListener("focusout", afterFocus);
        document.removeEventListener("visibilitychange", schedulePending);
      };
    }
    schedulePending();
  }

  function positionPanel(element, isCameo) {
    for (const property of ["top", "left", "right", "bottom", "maxWidth"]) element.style[property] = "";
    const copy = element.querySelector(".hamster-reveal-copy");
    copy.style.maxHeight = "";
    copy.style.overflowY = "";
    if (!isCameo) {
      const header = document.querySelector(".site-head");
      if (header) element.style.top = `${Math.max(12, Math.min(header.getBoundingClientRect().bottom + 12, window.innerHeight - element.offsetHeight - 14))}px`;
      return;
    }
    if (window.innerWidth > 640) return;
    const viewport = window.visualViewport;
    const width = viewport?.width || window.innerWidth;
    const height = viewport?.height || window.innerHeight;
    const offsetX = viewport?.offsetLeft || 0;
    const offsetY = viewport?.offsetTop || 0;
    element.style.maxWidth = `${Math.max(0, width - 24)}px`;
    copy.style.maxHeight = `${Math.max(44, height - 24)}px`;
    if (copy.scrollHeight > height - 24) copy.style.overflowY = "auto";
    const rect = { width: element.offsetWidth, height: element.offsetHeight };
    // Use the CSS safe-area inset for the bottom candidate, including phones
    // whose home indicator occupies more than the ordinary margin.
    const bottomInset = Math.max(14, parseFloat(window.getComputedStyle(element).bottom) || 0);
    const top = Math.max(offsetY + 12, Math.min(
      (document.querySelector(".site-head")?.getBoundingClientRect().bottom || 72) + 12,
      offsetY + height - rect.height - bottomInset,
    ));
    const bottom = Math.max(offsetY + 12, offsetY + height - rect.height - bottomInset);
    const right = Math.max(offsetX + 12, offsetX + width - rect.width - 12);
    const candidates = [
      { x: right, y: bottom }, { x: right, y: top },
      { x: offsetX + 12, y: bottom }, { x: offsetX + 12, y: top },
    ];
    const controls = [...document.querySelectorAll("main button, main input, main textarea, main select, main [contenteditable], main [role='button']")]
      .filter(control => !control.disabled && !control.hidden)
      .map(control => ({
        rect: control.getBoundingClientRect(),
        weight: control.matches("button, [role='button'], input[type='submit'], input[type='button']") ? 4 : 1,
      }))
      .filter(control => control.rect.width > 0 && control.rect.height > 0);
    const overlap = candidate => controls.reduce((score, { rect: control, weight }) => score + weight *
      Math.max(0, Math.min(candidate.x + rect.width, control.right + 8) - Math.max(candidate.x, control.left - 8)) *
      Math.max(0, Math.min(candidate.y + rect.height, control.bottom + 8) - Math.max(candidate.y, control.top - 8)), 0);
    const best = candidates.reduce((best, candidate) => overlap(candidate) < overlap(best) ? candidate : best);
    element.style.top = `${best.y}px`;
    element.style.left = `${best.x}px`;
    element.style.right = "auto";
    element.style.bottom = "auto";
  }

  function close() {
    if (!panel || panel.dataset.closing === "true") return;

    panel.dataset.closing = "true";
    panel.classList.remove("is-visible");
    trigger?.setAttribute("aria-expanded", "false");
    window.clearTimeout(dismissTimer);

    const panelToRemove = panel;
    const cleanup = cleanupPanel;
    if (panelToRemove.contains(document.activeElement)) trigger?.focus();
    cleanup?.();
    panel = null;
    cleanupPanel = null;
    dismissTimer = null;
    schedulePending();

    window.setTimeout(() => {
      panelToRemove.remove();
    }, revealTransitionMs);
  }

  function show(encounter, { sourceElement = null, keepsakes = {}, onRead = null, onRecall = null, onMore = null, choice = null, debug = false } = {}) {
    const options = { sourceElement, keepsakes, onRead, onRecall, onMore, choice, debug };
    const isCameo = encounter.presentation === "cameo";
    if (isCameo && !debug && (document.hidden || isEditing() || panel || hasModal())) {
      queueCameo(encounter, options);
      return;
    }
    // A deliberate recall consumes its queued automatic presentation too.
    const queuedIndex = pending.findIndex(item => item.encounter.id === encounter.id);
    if (queuedIndex >= 0) pending.splice(queuedIndex, 1);
    if (!pending.length) {
      window.clearTimeout(pendingTimer);
      pendingCleanup?.();
      pendingCleanup = null;
    }
    close();

    const nextPanel = document.createElement("aside");
    nextPanel.className = `hamster-reveal${isCameo ? " hamster-reveal-cameo" : ""}`;
    nextPanel.setAttribute("role", isCameo ? "status" : "dialog");
    nextPanel.setAttribute("aria-label", "The hamster");
    if (isCameo) nextPanel.setAttribute("aria-atomic", "true");
    nextPanel.dataset.encounterId = encounter.id;
    if (encounter.activity) nextPanel.dataset.activity = encounter.activity;

    const visitor = document.createElement("div");
    visitor.className = "hamster-visitor";
    const image = document.createElement("img");
    image.src = "/hamster-knight.webp";
    image.alt = "A weary hamster knight carrying a battered sword";
    visitor.append(image);
    if (keepsakes["rain-darkened-cloak"] || keepsakes["sun-warmed-cloak"]) {
      const cloak = document.createElement("span");
      cloak.className = "hamster-visitor-cloak";
      cloak.classList.toggle("is-wet", Boolean(keepsakes["rain-darkened-cloak"]));
      cloak.setAttribute("aria-hidden", "true");
      visitor.append(cloak);
    }
    if (keepsakes["brass-button"]) {
      const button = document.createElement("span");
      button.className = "hamster-visitor-button";
      button.setAttribute("aria-hidden", "true");
      visitor.append(button);
    }
    if (encounter.activity === "sorting" || keepsakes["black-seed"]) {
      const seed = document.createElement("span");
      seed.className = "hamster-visitor-seed";
      seed.classList.toggle("is-black", Boolean(keepsakes["black-seed"]));
      seed.setAttribute("aria-hidden", "true");
      visitor.append(seed);
    }

    const copy = document.createElement("div");
    copy.className = "hamster-reveal-copy";

    const quote = document.createElement("p");
    quote.className = encounter.activity ? "hamster-activity" : "hamster-reveal-quote";
    quote.textContent = encounter.text;

    copy.append(quote);
    if (choice) {
      const showReply = picked => {
        const answer = document.createElement("p");
        answer.className = "hamster-reveal-answer";
        answer.textContent = `You: ${picked.label}`;
        const reply = document.createElement("p");
        reply.className = "hamster-reveal-quote hamster-reveal-reply";
        reply.textContent = picked.reply;
        return [answer, reply];
      };
      if (choice.chosen) {
        copy.append(...showReply(choice.chosen));
      } else {
        const choices = document.createElement("div");
        choices.className = "hamster-reveal-choices";
        choice.options.forEach((label, index) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "hamster-reveal-choice";
          button.textContent = label;
          button.addEventListener("click", event => {
            onRead?.();
            const picked = choice.onChoose(index);
            if (!picked) return;
            const [answer, reply] = showReply(picked);
            choices.replaceWith(answer, reply);
            // Keyboard answers keep focus in the bubble; taps should not draw a focus ring.
            if (event.detail === 0) nextPanel.querySelector(".hamster-reveal-close")?.focus();
          });
          choices.append(button);
        });
        copy.append(choices);
      }
    }
    if (onMore) {
      const more = document.createElement("button");
      more.type = "button";
      more.className = "hamster-reveal-recall";
      more.textContent = "Go on";
      more.addEventListener("click", onMore);
      copy.append(more);
    }
    if (onRecall) {
      const recall = document.createElement("button");
      recall.type = "button";
      recall.className = "hamster-reveal-recall";
      recall.textContent = "Last words";
      recall.addEventListener("click", onRecall);
      copy.append(recall);
    }

    const dismiss = document.createElement("button");
    dismiss.type = "button";
    dismiss.className = "hamster-reveal-close";
    dismiss.textContent = "Dismiss";
    dismiss.addEventListener("click", close);
    copy.append(dismiss);

    nextPanel.append(visitor, copy);
    document.body.append(nextPanel);
    panel = nextPanel;
    trigger?.setAttribute("aria-expanded", "true");

    const closeOnEscape = (event) => {
      if (event.key === "Escape") close();
    };
    const closeOnOutside = (event) => {
      // composedPath keeps the click inside even when its button was just replaced.
      const inside = event.composedPath?.().includes(nextPanel) || nextPanel.contains(event.target);
      if (panel === nextPanel && !inside && event.target !== sourceElement) {
        close();
      }
    };

    document.addEventListener("keydown", closeOnEscape);
    let outsideTimer = null;
    if (!isCameo) {
      outsideTimer = window.setTimeout(() => {
        if (panel === nextPanel) document.addEventListener("click", closeOnOutside);
      }, 0);
    }

    // Give longer lines time to be read; hovering, focus, and a hidden tab
    // hold the cameo open without moving focus away from the current tool.
    const readingDurationMs = Math.max(cameoDurationMs, encounter.text.split(/\s+/).length * 320 + 1200);
    let hovered = false;
    const scheduleDismiss = () => {
      window.clearTimeout(dismissTimer);
      if (!isCameo || panel !== nextPanel || hovered || document.hidden || nextPanel.contains(document.activeElement)) return;
      dismissTimer = window.setTimeout(() => {
        if (panel === nextPanel) close();
      }, readingDurationMs);
    };
    nextPanel.addEventListener("pointerenter", () => {
      onRead?.();
      hovered = true;
      scheduleDismiss();
    });
    nextPanel.addEventListener("pointerleave", () => {
      hovered = false;
      scheduleDismiss();
    });
    nextPanel.addEventListener("focusin", () => {
      onRead?.();
      scheduleDismiss();
    });
    nextPanel.addEventListener("pointerdown", () => onRead?.());
    nextPanel.addEventListener("focusout", () => window.queueMicrotask(scheduleDismiss));
    if (isCameo) document.addEventListener("visibilitychange", scheduleDismiss);
    cleanupPanel = () => {
      window.clearTimeout(outsideTimer);
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("click", closeOnOutside);
      document.removeEventListener("visibilitychange", scheduleDismiss);
      window.removeEventListener("resize", reposition);
      window.visualViewport?.removeEventListener("resize", reposition);
      window.visualViewport?.removeEventListener("scroll", reposition);
    };

    const reposition = () => {
      if (panel === nextPanel) positionPanel(nextPanel, isCameo);
    };
    window.addEventListener("resize", reposition);
    window.visualViewport?.addEventListener("resize", reposition);
    window.visualViewport?.addEventListener("scroll", reposition);

    window.requestAnimationFrame(() => {
      if (panel === nextPanel) {
        nextPanel.classList.add("is-visible");
        reposition();
      }
    });
    scheduleDismiss();
  }

  function showQuiet(options = {}) {
    const band = quietActivities[options.timeBand] ? options.timeBand : "day";
    const { activity, lines } = quietActivities[band];
    const pick = Math.min(lines.length - 1, Math.floor(Math.max(0, (options.random || Math.random)()) * lines.length));
    show({ id: "quiet-visit", activity, text: lines[pick] }, options);
  }

  function mountTrigger(parent, onReveal) {
    if (!parent || trigger) return trigger;

    trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "hamster-secret";
    trigger.setAttribute("aria-label", "Visit the hamster");
    trigger.setAttribute("aria-expanded", "false");
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (panel) {
        close();
      } else {
        onReveal({ sourceElement: trigger });
      }
    });
    parent.append(trigger);
    return trigger;
  }

  function destroy() {
    pending.length = 0;
    window.clearTimeout(pendingTimer);
    pendingCleanup?.();
    pendingCleanup = null;
    close();
  }

  return { close, destroy, mountTrigger, show, showQuiet };
}
