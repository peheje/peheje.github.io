const savedTheme = localStorage.getItem("theme") || "paper";
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
