// Shared horizontal tab-bar behavior for compact, scrollable controls.
export function createScrollableTabBar(container, { onChange } = {}) {
  if (!container) {
    return {
      render() {},
      setActive() {},
      getActiveKey: () => null
    };
  }

  let items = [];
  let activeKey = null;

  function itemForButton(button) {
    return items.find(item => String(item.key) === button?.dataset.key);
  }

  function scrollActiveIntoView(button) {
    if (!button || typeof container.scrollTo !== "function") return;

    const containerWidth = container.clientWidth;
    const buttonLeft = button.offsetLeft;
    const buttonWidth = button.clientWidth;
    container.scrollTo({
      left: buttonLeft - (containerWidth / 2) + (buttonWidth / 2),
      behavior: "smooth"
    });
  }

  function setActive(key, { scroll = true } = {}) {
    activeKey = key == null ? null : String(key);
    const buttons = container.querySelectorAll(".curve-tab");
    buttons.forEach(button => {
      const isActive = button.dataset.key === activeKey;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-checked", String(isActive));
      button.tabIndex = isActive ? 0 : -1;
      if (isActive && scroll) {
        scrollActiveIntoView(button);
      }
    });
  }

  function activateButton(button, { focus = false } = {}) {
    const item = itemForButton(button);
    if (!item || button.disabled) return;

    setActive(item.key);
    if (focus) {
      button.focus({ preventScroll: true });
    }
    onChange?.(item);
  }

  function handleKeyDown(event) {
    const direction = {
      ArrowRight: 1,
      ArrowDown: 1,
      ArrowLeft: -1,
      ArrowUp: -1
    }[event.key];
    const isBoundaryKey = event.key === "Home" || event.key === "End";
    if (!direction && !isBoundaryKey) return;

    const buttons = Array.from(container.querySelectorAll(".curve-tab:not(:disabled)"));
    if (buttons.length === 0) return;

    event.preventDefault();
    const currentIndex = Math.max(0, buttons.indexOf(event.currentTarget));
    let nextIndex;
    if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = buttons.length - 1;
    } else {
      nextIndex = (currentIndex + direction + buttons.length) % buttons.length;
    }
    activateButton(buttons[nextIndex], { focus: true });
  }

  function render(nextItems, nextActiveKey = activeKey) {
    items = nextItems || [];
    activeKey = nextActiveKey == null ? null : String(nextActiveKey);
    container.innerHTML = "";

    items.forEach(item => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "curve-tab";
      if (item.className) {
        item.className.split(/\s+/).filter(Boolean).forEach(className => {
          button.classList.add(className);
        });
      }
      button.dataset.key = String(item.key);
      button.textContent = item.label;
      button.disabled = Boolean(item.disabled);
      button.setAttribute("role", "radio");
      button.setAttribute("aria-checked", String(String(item.key) === activeKey));
      if (item.disabled && item.disabledLabel) {
        button.title = item.disabledLabel;
      }

      button.addEventListener("click", () => {
        activateButton(button);
      });
      button.addEventListener("keydown", handleKeyDown);
      container.appendChild(button);
    });

    setActive(activeKey, { scroll: false });
    if (!container.querySelector(".curve-tab[tabindex='0']")) {
      const firstEnabled = container.querySelector(".curve-tab:not(:disabled)");
      if (firstEnabled) firstEnabled.tabIndex = 0;
    }
  }

  return {
    render,
    setActive,
    getActiveKey: () => activeKey,
    getItems: () => items
  };
}
