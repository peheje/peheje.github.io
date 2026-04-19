const savedTheme = localStorage.getItem("theme");
const themeClasses = {
  blue: "theme-blue",
  paper: "theme-paper",
  forest: "theme-forest",
  dusk: "theme-dusk",
};

document.documentElement.classList.add("page-loading");

if (savedTheme && themeClasses[savedTheme]) {
  document.documentElement.classList.add(themeClasses[savedTheme]);
}
