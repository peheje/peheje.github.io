const sites = [
  {
    url: "/compare.html",
    name: "Compare",
    about: "Compare two text lists and find shared and unique lines.",
  },
  {
    url: "/unique.html",
    name: "Unique",
    about: "Find unique values and duplicates in a text list.",
  },
  {
    url: "/alcohol.html",
    name: "Alcohol",
    about: "Calculate units and track drinks locally through the night.",
  },
  {
    url: "/heartbeat.html",
    name: "Heartbeat",
    about: "Estimate your heart rate by tapping your beats.",
  },
  {
    url: "/memory.html",
    name: "Memory",
    about: "Memorize a number, then type it back before time runs out.",
  },
  {
    url: "/babynames.html",
    name: "Babynames",
    about: "Pick, skip, and save baby names locally.",
  },
  {
    url: "/days.html",
    name: "Days",
    about: "Calculate days, weekends, months, and years between two dates.",
  },
  {
    url: "/equation.html",
    name: "Equation",
    about: "Generate random equations and solve for X.",
  },
  {
    url: "/poe.html",
    name: "Poe",
    about: "Parse Poe AI usage CSV files locally and inspect points, costs, and usage patterns.",
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
  let button = document.querySelector(".theme-toggle");

  if (!button) {
    button = document.createElement("button");
    button.type = "button";
    button.className = "theme-toggle";
    button.title = "Toggle theme";
    document.body.append(button);
  }

  function syncButton() {
    const activeTheme = getActiveTheme();
    button.textContent = activeTheme.label;
    button.title = `Switch theme (current: ${activeTheme.title})`;
  }

  syncButton();

  button.onclick = () => {
    const activeTheme = getActiveTheme();
    const currentIndex = themes.findIndex((theme) => theme.key === activeTheme.key);
    const nextTheme = themes[(currentIndex + 1) % themes.length];

    setSavedTheme(nextTheme.key);
    applyTheme();
    syncButton();
  };
}

function navigateWithTransition(url) {
  if (!url || document.body.classList.contains("page-leaving")) {
    return;
  }

  document.body.classList.add("page-leaving");
  window.setTimeout(() => {
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

export function mountSiteShell() {
  if (window.location.pathname === "/compare/compare.html") {
    window.setTimeout(() => {
      window.location.pathname = "/compare.html";
    }, 6000);
  }

  const site = sites.find((entry) => entry.url === window.location.pathname);

  if (!site) {
    throw new Error(`Unknown site for path ${window.location.pathname}`);
  }

  document.title = `${site.name} | peheje`;

  const menu = document.querySelector("#menu");

  if (menu) {
    const header = document.createElement("header");
    header.className = "site-head";

    const nav = document.createElement("nav");
    nav.className = "top-nav";
    sites.forEach((entry) => nav.append(buildNavLink(entry)));

    const intro = document.createElement("div");
    intro.className = "page-intro";

    const title = document.createElement("h1");
    title.id = "page-title";
    title.textContent = site.name;
    intro.append(title);

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
