// UI helpers for lightweight interactivity and the theme toggle.
const ui = {
  toggleTheme() {
    const root = document.documentElement;
    const currentTheme = root.getAttribute("data-bs-theme");
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    root.setAttribute("data-bs-theme", nextTheme);
    document.body.classList.toggle("light-mode", nextTheme === "light");
    const icon = document.querySelector(".theme-toggle i");
    if (icon) {
      icon.className = nextTheme === "dark" ? "bi bi-moon-stars" : "bi bi-sun";
    }
  }
};

function initializeUi() {
  document.getElementById("year")?.replaceChildren(document.createTextNode(new Date().getFullYear()));
  document.querySelector(".theme-toggle")?.addEventListener("click", ui.toggleTheme);
}

document.addEventListener("DOMContentLoaded", initializeUi);
