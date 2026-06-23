const sites = [
  {
    url: "/compare.html",
    name: "Compare",
    about: "Compare two text lists and find shared and unique lines.",
    category: "Text",
  },
  {
    url: "/unique.html",
    name: "Unique",
    about: "Find unique values and duplicates in a text list.",
    category: "Text",
  },
  {
    url: "/alcohol.html",
    name: "Alcohol",
    about: "Calculate units and track drinks locally through the night.",
    category: "Health",
  },
  {
    url: "/heartbeat.html",
    name: "Heartbeat",
    about: "Estimate your heart rate by tapping your beats.",
    category: "Health",
  },
  {
    url: "/weather.html",
    name: "Weather",
    about: "Check local weather and track UV index curve throughout the day.",
    category: "Health",
  },
  {
    url: "/memory.html",
    name: "Memory",
    about: "Memorize a number, then type it back before time runs out.",
    category: "Kids",
  },
  {
    url: "/babynames.html",
    name: "Babynames",
    about: "Pick, skip, and save baby names locally.",
    category: "Kids",
  },
  {
    url: "/days.html",
    name: "Days",
    about: "Calculate days, weekends, months, and years between two dates.",
    category: "Time",
  },
  {
    url: "/equation.html",
    name: "Equation",
    about: "Generate random equations and solve for X.",
    category: "Kids",
  },
  {
    url: "/timer.html",
    name: "Timer",
    about: "A simple visual countdown timer for kids and everyday transitions.",
    category: "Time",
  },
  {
    url: "/neck.html",
    name: "Neck",
    about: "Run a local repeating reminder timer for neck rolls during the workday.",
    category: "Health",
  },
  {
    url: "/poe.html",
    name: "Poe",
    about: "Parse Poe AI usage CSV files locally and inspect points, costs, and usage patterns.",
    category: "AI/Data",
  },
  {
    url: "/images.html",
    name: "Images",
    about: "Convert images to JPEG and clean image metadata locally in your browser.",
    category: "Images",
  },
  {
    url: "https://twitter.com/peheje",
    name: "Contact",
    about: "",
  },
];

const internalSites = sites.filter((site) => site.url.startsWith("/"));
const themes = [
  { key: "warm", className: "", label: "W", title: "Warm theme" },
  { key: "blue", className: "theme-blue", label: "B", title: "Blue theme" },
  { key: "paper", className: "theme-paper", label: "P", title: "Paper theme" },
  { key: "forest", className: "theme-forest", label: "F", title: "Forest theme" },
  { key: "dusk", className: "theme-dusk", label: "D", title: "Dusk theme" },
];
const pageTransitionDurationMs = 220;
window.__suppressActivePageBeforeUnload = false;

// ---- Favorites helpers ----

const favoritesKey = "site-favorite-tools";

const defaultFavorites = [
  "/compare.html",
  "/images.html",
  "/timer.html",
  "/poe.html",
];

function getInternalSites() {
  return internalSites;
}

function getFavoriteUrls() {
  try {
    const raw = localStorage.getItem(favoritesKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Filter out URLs that no longer exist in sites
        const validUrls = new Set(internalSites.map((s) => s.url));
        return parsed.filter((url) => validUrls.has(url));
      }
    }
  } catch (_) {
    // malformed JSON, fall through to defaults
  }
  return [...defaultFavorites];
}

function setFavoriteUrls(urls) {
  localStorage.setItem(favoritesKey, JSON.stringify(urls));
}

function toggleFavorite(url) {
  const current = getFavoriteUrls();
  const index = current.indexOf(url);
  if (index === -1) {
    current.push(url);
  } else {
    current.splice(index, 1);
  }
  setFavoriteUrls(current);
  return current;
}

function isFavorite(url) {
  return getFavoriteUrls().includes(url);
}

function getFavoriteSites() {
  const urls = getFavoriteUrls();
  return internalSites.filter((site) => urls.includes(site.url));
}

function getCurrentSite() {
  return internalSites.find((site) => site.url === window.location.pathname) || null;
}

// ---- Theme ----

function getNavigationGuardMessage() {
  if (typeof window.__activePageGuardMessage === "string" && window.__activePageGuardMessage.trim()) {
    return window.__activePageGuardMessage.trim();
  }

  if (window.__neckReminderGuardActive) {
    return "A neck reminder is still active. Leave this page anyway?";
  }

  return "";
}

function getThemeDefinition(themeKey) {
  return themes.find((theme) => theme.key === themeKey) || themes[0];
}

function getActiveTheme() {
  return getThemeDefinition(getSavedTheme());
}

function getSavedTheme() {
  return localStorage.getItem("theme") || "";
}

function setSavedTheme(theme) {
  localStorage.setItem("theme", theme);
}

function applyTheme() {
  const activeTheme = getActiveTheme();

  themes.forEach((theme) => {
    if (!theme.className) {
      return;
    }

    document.documentElement.classList.toggle(theme.className, theme.key === activeTheme.key);
    document.body.classList.toggle(theme.className, theme.key === activeTheme.key);
  });
}

function renderThemeToggle() {
  const nav = document.querySelector(".top-nav");
  if (!nav) return;

  let button = nav.querySelector(".theme-toggle");

  if (!button) {
    button = document.createElement("button");
    button.type = "button";
    button.className = "theme-toggle";
    button.title = "Toggle theme";
    
    nav.append(button);
  }

  function syncButton() {
    const activeTheme = getActiveTheme();
    button.textContent = activeTheme.label;
    button.title = `Switch theme (current: ${activeTheme.title})`;
  }

  syncButton();

  button.onclick = (e) => {
    e.preventDefault();
    const activeTheme = getActiveTheme();
    const currentIndex = themes.findIndex((theme) => theme.key === activeTheme.key);
    const nextTheme = themes[(currentIndex + 1) % themes.length];

    setSavedTheme(nextTheme.key);
    applyTheme();
    syncButton();
  };
}

// ---- Navigation ----

function navigateWithTransition(url) {
  if (!url || document.body.classList.contains("page-leaving")) {
    return;
  }

  const guardMessage = getNavigationGuardMessage();

  if (guardMessage) {
    const confirmed = window.confirm(guardMessage);

    if (!confirmed) {
      return;
    }
  }

  document.body.classList.add("page-leaving");
  window.setTimeout(() => {
    window.__suppressActivePageBeforeUnload = true;
    window.location.href = url;
  }, pageTransitionDurationMs);
}

function switchToRelativeSite(direction) {
  const currentIndex = internalSites.findIndex((site) => site.url === window.location.pathname);

  if (currentIndex === -1) {
    return;
  }

  const nextIndex = (currentIndex + direction + internalSites.length) % internalSites.length;
  navigateWithTransition(internalSites[nextIndex].url);
}

function initPageTransitions() {
  document.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0) {
      return;
    }

    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    const link = target.closest("a[href]");

    if (!link) {
      return;
    }

    if (link.hasAttribute("download") || link.target === "_blank") {
      return;
    }

    const destination = new URL(link.href, window.location.href);

    if (destination.origin !== window.location.origin) {
      return;
    }

    if (destination.pathname === window.location.pathname && destination.search === window.location.search && destination.hash === window.location.hash) {
      return;
    }

    event.preventDefault();
    navigateWithTransition(destination.href);
  });
}

function revealPage() {
  const finishReveal = () => {
    document.documentElement.classList.remove("page-loading");
    document.body.classList.add("page-loaded");
  };

  if (document.readyState === "interactive" || document.readyState === "complete") {
    finishReveal();
    return;
  }

  document.addEventListener("DOMContentLoaded", finishReveal, { once: true });
}

function initGlobalKeyboardShortcuts() {
  document.addEventListener("keydown", (event) => {
    const target = event.target;
    const isTypingTarget =
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      target instanceof HTMLButtonElement ||
      target?.isContentEditable;

    if (!event.ctrlKey || isTypingTarget) {
      return;
    }

    const key = event.key.toLowerCase();

    if (key === "arrowright") {
      event.preventDefault();
      switchToRelativeSite(1);
    } else if (key === "arrowleft") {
      event.preventDefault();
      switchToRelativeSite(-1);
    }
  });
}

// ---- Menu rendering ----

function buildNavLink(site) {
  const link = document.createElement("a");
  link.href = site.url;
  link.textContent = site.name;
  link.title = site.about;

  if (site.url === window.location.pathname) {
    link.classList.add("active");
  }

  return link;
}

function buildFavStar(site, { small } = {}) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "fav-star" + (small ? " fav-star-small" : "");
  const fav = isFavorite(site.url);
  btn.textContent = fav ? "★" : "☆";
  btn.title = fav ? "Remove from favorites" : "Add to favorites";
  btn.setAttribute("aria-pressed", String(fav));
  btn.setAttribute("aria-label", fav ? "Remove from favorites" : "Add to favorites");

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(site.url);
    refreshAllFavUI();
  });

  return btn;
}

function buildToolPickerRow(site) {
  const row = document.createElement("div");
  row.className = "tool-picker-row";
  row.setAttribute("role", "option");
  row.tabIndex = 0;

  const info = document.createElement("div");
  info.className = "tool-picker-info";

  const name = document.createElement("span");
  name.className = "tool-picker-name";
  name.textContent = site.name;

  const about = document.createElement("span");
  about.className = "tool-picker-about";
  about.textContent = site.about;

  info.append(name, about);

  const star = buildFavStar(site, { small: true });

  row.append(info, star);

  row.addEventListener("click", (e) => {
    // Don't navigate if they clicked the star
    if (e.target.closest(".fav-star")) {
      return;
    }
    navigateWithTransition(site.url);
    closeToolPicker();
  });

  row.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (e.target.closest(".fav-star")) {
        return;
      }
      navigateWithTransition(site.url);
      closeToolPicker();
    }
  });

  return row;
}

function buildToolPicker() {
  // Remove existing picker if any
  const existing = document.querySelector(".tool-picker-backdrop");
  if (existing) {
    existing.remove();
  }

  const backdrop = document.createElement("div");
  backdrop.className = "tool-picker-backdrop";
  backdrop.setAttribute("role", "dialog");
  backdrop.setAttribute("aria-label", "Tools");

  const card = document.createElement("div");
  card.className = "tool-picker-card";

  const search = document.createElement("input");
  search.type = "text";
  search.className = "tool-picker-search";
  search.placeholder = "Search tools…";
  search.setAttribute("aria-label", "Search tools");

  const list = document.createElement("div");
  list.className = "tool-picker-list";
  list.setAttribute("role", "listbox");

  // Populate all internal sites
  internalSites.forEach((site) => {
    list.append(buildToolPickerRow(site));
  });

  // External contact link at bottom
  const contactSite = sites.find((s) => !s.url.startsWith("/"));
  if (contactSite) {
    const contactRow = document.createElement("a");
    contactRow.className = "tool-picker-row tool-picker-external";
    contactRow.href = contactSite.url;
    contactRow.target = "_blank";
    contactRow.rel = "noopener noreferrer";

    const contactInfo = document.createElement("div");
    contactInfo.className = "tool-picker-info";

    const contactName = document.createElement("span");
    contactName.className = "tool-picker-name";
    contactName.textContent = contactSite.name;

    const contactAbout = document.createElement("span");
    contactAbout.className = "tool-picker-about";
    contactAbout.textContent = "External link";

    contactInfo.append(contactName, contactAbout);
    contactRow.append(contactInfo);

    list.append(contactRow);
  }

  // Search filter
  search.addEventListener("input", () => {
    const query = search.value.toLowerCase().trim();
    const rows = list.querySelectorAll(".tool-picker-row");
    rows.forEach((row) => {
      const name = row.querySelector(".tool-picker-name")?.textContent.toLowerCase() || "";
      const about = row.querySelector(".tool-picker-about")?.textContent.toLowerCase() || "";
      const site = internalSites.find((s) =>
        s.name.toLowerCase() === name ||
        (row.querySelector(".tool-picker-name")?.textContent || "").toLowerCase() === s.name.toLowerCase()
      );
      const category = (site && site.category ? site.category.toLowerCase() : "");
      const matches = !query || name.includes(query) || about.includes(query) || category.includes(query);
      row.classList.toggle("display-none", !matches);
    });
  });

  card.append(search, list);
  backdrop.append(card);
  document.body.append(backdrop);

  // Close on backdrop click
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) {
      closeToolPicker();
    }
  });

  return backdrop;
}

function openToolPicker() {
  const backdrop = buildToolPicker();
  backdrop.classList.add("tool-picker-open");
  document.documentElement.classList.add("tool-picker-active");
  document.body.classList.add("tool-picker-active");
  // Re-attach ESC handler
  backdrop._closeOnEsc = (e) => {
    if (e.key === "Escape") {
      closeToolPicker();
    }
  };
  document.addEventListener("keydown", backdrop._closeOnEsc);
}

function closeToolPicker() {
  const backdrop = document.querySelector(".tool-picker-backdrop");
  if (!backdrop) return;

  if (backdrop._closeOnEsc) {
    document.removeEventListener("keydown", backdrop._closeOnEsc);
  }

  backdrop.classList.remove("tool-picker-open");
  backdrop.classList.add("tool-picker-closing");
  document.documentElement.classList.remove("tool-picker-active");
  document.body.classList.remove("tool-picker-active");
  backdrop.addEventListener("animationend", () => {
    backdrop.remove();
  }, { once: true });

  // Also remove after a safety timeout
  setTimeout(() => {
    if (backdrop.parentNode) {
      backdrop.remove();
    }
  }, 300);
}

function refreshAllFavUI() {
  // Update stars in the tool picker
  document.querySelectorAll(".tool-picker-row .fav-star").forEach((star) => {
    const row = star.closest(".tool-picker-row");
    const nameEl = row?.querySelector(".tool-picker-name");
    if (!nameEl) return;
    const site = internalSites.find((s) => s.name === nameEl.textContent);
    if (!site) return;
    const fav = isFavorite(site.url);
    star.textContent = fav ? "★" : "☆";
    star.title = fav ? "Remove from favorites" : "Add to favorites";
    star.setAttribute("aria-pressed", String(fav));
    star.setAttribute("aria-label", fav ? "Remove from favorites" : "Add to favorites");
  });

  // Update the page header star
  const headerStar = document.querySelector(".page-fav-star");
  if (headerStar) {
    const currentSite = getCurrentSite();
    if (currentSite) {
      const fav = isFavorite(currentSite.url);
      headerStar.textContent = fav ? "★" : "☆";
      headerStar.title = fav ? "Remove from favorites" : "Add to favorites";
      headerStar.setAttribute("aria-pressed", String(fav));
      headerStar.setAttribute("aria-label", fav ? "Remove from favorites" : "Add to favorites");
    }
  }

  // Rebuild the favorites nav
  const favNav = document.querySelector(".fav-nav");
  if (favNav) {
    rebuildFavoritesNav(favNav);
  }
}

function rebuildFavoritesNav(container) {
  container.innerHTML = "";
  const favs = getFavoriteSites();
  favs.forEach((site) => {
    container.append(buildNavLink(site));
  });

  const currentSite = getCurrentSite();
  if (currentSite && !favs.some((site) => site.url === currentSite.url)) {
    container.append(buildNavLink(currentSite));
  }
}

export function mountSiteShell() {
  const site = sites.find((entry) => entry.url === window.location.pathname);

  if (!site) {
    throw new Error(`Unknown site for path ${window.location.pathname}`);
  }

  document.title = `${site.name} | peheje`;

  const menu = document.querySelector("#menu");

  if (menu) {
    const header = document.createElement("header");
    header.className = "site-head";

    // ---- Top nav row: favorites + Tools button ----
    const nav = document.createElement("nav");
    nav.className = "top-nav";

    // Favorites section
    const favContainer = document.createElement("span");
    favContainer.className = "fav-nav";
    rebuildFavoritesNav(favContainer);
    nav.append(favContainer);

    // Tools button
    const toolsBtn = document.createElement("button");
    toolsBtn.type = "button";
    toolsBtn.className = "tools-btn";
    toolsBtn.textContent = "Tools";
    toolsBtn.title = "Browse all tools";
    toolsBtn.addEventListener("click", (e) => {
      e.preventDefault();
      openToolPicker();
    });
    nav.append(toolsBtn);

    // External links (Contact)
    const externalSites = sites.filter((s) => !s.url.startsWith("/"));
    externalSites.forEach((extSite) => {
      const link = document.createElement("a");
      link.href = extSite.url;
      link.textContent = extSite.name;
      link.title = extSite.about || "External link";
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.className = "nav-external";
      nav.append(link);
    });

    // ---- Page intro ----
    const intro = document.createElement("div");
    intro.className = "page-intro";

    const titleRow = document.createElement("div");
    titleRow.className = "page-title-row";

    const title = document.createElement("h1");
    title.id = "page-title";
    title.textContent = site.name;

    titleRow.append(title);

    // Favorite star for current page (only for internal pages)
    const currentSite = getCurrentSite();
    if (currentSite) {
      const star = buildFavStar(currentSite);
      star.classList.add("page-fav-star");
      titleRow.append(star);
    }

    intro.append(titleRow);

    if (site.about) {
      const about = document.createElement("p");
      about.id = "about";
      about.textContent = site.about;
      intro.append(about);
    }

    header.append(nav, intro);
    menu.replaceChildren(header);
  }

  applyTheme();
  renderThemeToggle();
  initGlobalKeyboardShortcuts();
  initPageTransitions();
  revealPage();

  return site;
}
