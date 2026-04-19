const savedTheme = localStorage.getItem("theme");

document.documentElement.classList.add("page-loading");

if (savedTheme === "blue") {
  document.documentElement.classList.add("theme-blue");
} else if (savedTheme === "paper") {
  document.documentElement.classList.add("theme-paper");
}
