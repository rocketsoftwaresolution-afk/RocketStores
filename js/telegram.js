// Telegram Web App integration for static deployments.
function initializeTelegram() {
  if (window.Telegram && window.Telegram.WebApp) {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();

    tg.onEvent("themeChanged", function () {
      document.documentElement.setAttribute("data-bs-theme", tg.colorScheme === "dark" ? "dark" : "light");
    });
    tg.onEvent("viewportChanged", function () {
      document.body.style.setProperty("--vh", `${tg.viewportHeight}px`);
    });

    if (tg.BackButton) {
      tg.BackButton.show();
      tg.BackButton.onClick(function () {
        window.history.back();
      });
    }

    if (tg.MainButton) {
      tg.MainButton.setText("Open store");
      tg.MainButton.show();
      tg.MainButton.onClick(function () {
        window.location.href = "search.html";
      });
    }
  }
}

document.addEventListener("DOMContentLoaded", initializeTelegram);
