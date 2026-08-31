const revealTransitionMs = 260;
const cameoDurationMs = 7200;

export function createHamsterView({ document, window }) {
  let trigger = null;
  let panel = null;
  let cleanupPanel = null;
  let dismissTimer = null;

  function close() {
    if (!panel || panel.dataset.closing === "true") return;

    panel.dataset.closing = "true";
    panel.classList.remove("is-visible");
    trigger?.setAttribute("aria-expanded", "false");
    window.clearTimeout(dismissTimer);

    const panelToRemove = panel;
    const cleanup = cleanupPanel;
    panel = null;
    cleanupPanel = null;
    dismissTimer = null;

    window.setTimeout(() => {
      cleanup?.();
      panelToRemove.remove();
    }, revealTransitionMs);
  }

  function show(encounter, { sourceElement = null } = {}) {
    close();

    const isCameo = encounter.presentation === "cameo";
    const nextPanel = document.createElement("aside");
    nextPanel.className = `hamster-reveal${isCameo ? " hamster-reveal-cameo" : ""}`;
    nextPanel.setAttribute("role", isCameo ? "status" : "dialog");
    nextPanel.setAttribute("aria-label", "The hamster");
    nextPanel.dataset.encounterId = encounter.id;

    const image = document.createElement("img");
    image.src = "/hamster.png";
    image.alt = "A tiny hamster silhouette";

    const copy = document.createElement("div");
    copy.className = "hamster-reveal-copy";

    const kicker = document.createElement("p");
    kicker.className = "hamster-reveal-kicker";
    kicker.textContent = encounter.kicker || "";

    const quote = document.createElement("p");
    quote.className = "hamster-reveal-quote";
    quote.textContent = encounter.text;

    if (encounter.kicker) copy.append(kicker);
    copy.append(quote);

    if (!isCameo) {
      const dismiss = document.createElement("button");
      dismiss.type = "button";
      dismiss.className = "hamster-reveal-close";
      dismiss.textContent = "Dismiss";
      dismiss.addEventListener("click", close);
      copy.append(dismiss);
    }

    nextPanel.append(image, copy);
    document.body.append(nextPanel);
    panel = nextPanel;
    trigger?.setAttribute("aria-expanded", "true");

    const closeOnEscape = (event) => {
      if (event.key === "Escape") close();
    };
    const closeOnOutside = (event) => {
      if (panel === nextPanel && !nextPanel.contains(event.target) && event.target !== sourceElement) {
        close();
      }
    };

    document.addEventListener("keydown", closeOnEscape);
    if (!isCameo) {
      window.setTimeout(() => document.addEventListener("click", closeOnOutside), 0);
    }
    cleanupPanel = () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("click", closeOnOutside);
    };

    window.requestAnimationFrame(() => nextPanel.classList.add("is-visible"));
    if (isCameo) dismissTimer = window.setTimeout(close, cameoDurationMs);
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

  return { close, mountTrigger, show };
}
