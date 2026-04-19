const savedTheme = localStorage.getItem("theme");

if (savedTheme === "blue") {
  document.documentElement.classList.add("theme-blue");
} else if (savedTheme === "paper") {
  document.documentElement.classList.add("theme-paper");
}
