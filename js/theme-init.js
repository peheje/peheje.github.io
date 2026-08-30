let savedTheme = "paper";
try {
  savedTheme = localStorage.getItem("theme") || "paper";
} catch {
  // storage disabled (private mode); fall back to default theme
}
const themeClasses = {
  warm: "theme-warm",
  blue: "theme-blue",
  forest: "theme-forest",
  dusk: "theme-dusk",
};

document.documentElement.classList.add("page-loading");

if (savedTheme && themeClasses[savedTheme]) {
  document.documentElement.classList.add(themeClasses[savedTheme]);
}
