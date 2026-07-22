// Core app bootstrapping and data loading for the static marketplace.
const state = {
  apps: [],
  categories: ["AI", "Trading", "Network", "Security", "Utilities", "Productivity", "Tools"]
};

function initializeImageFallbacks() {
  document.querySelectorAll("img.auto-image").forEach((image) => {
    attachImageFallback(image, image.alt || image.dataset.fallbackLabel || "RS", image.dataset.fallbackSubtitle || "Preview unavailable");
  });
}

function attachImageFallback(imageElement, label = "RS", subtitle = "Preview unavailable") {
  if (!imageElement || imageElement.dataset.placeholderApplied === "true") return;

  const fallback = () => {
    if (imageElement.dataset.placeholderApplied === "true") return;
    imageElement.dataset.placeholderApplied = "true";
    const parent = imageElement.parentElement;
    if (!parent) return;

    const placeholder = document.createElement("div");
    placeholder.className = "image-placeholder";
    placeholder.innerHTML = `<span>${String(label).slice(0, 2).toUpperCase()}</span><small>${subtitle}</small>`;
    parent.replaceChild(placeholder, imageElement);
  };

  imageElement.addEventListener("error", fallback, { once: true });
  if (imageElement.complete && imageElement.naturalWidth === 0) {
    fallback();
  }
}

async function loadApps() {
  try {
    const response = await fetch("data/apps.json");
    if (!response.ok) throw new Error("Unable to load app data");
    state.apps = await response.json();
    initializeHomePage();
    initializeSearchPage();
    initializeDetailsPage();
  } catch (error) {
    console.error(error);
  }
}

function getAppById(id) {
  return state.apps.find((app) => app.id === id) || null;
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("en", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function renderAppCard(app, container) {
  const card = document.createElement("article");
  card.className = "card app-card";
  const imagePath = app.image || `images/screenshots/${app.id}.png`;
  const iconPath = app.icon || `images/apps/${app.id}.png`;
  card.innerHTML = `
    <div class="app-thumb">
      <img class="auto-image" src="${imagePath}" alt="${app.name} preview" loading="lazy" data-fallback-label="${app.name}" data-fallback-subtitle="${app.category}" />
    </div>
    <div class="app-header">
      <div class="d-flex align-items-center gap-2">
        <img class="app-icon auto-image" src="${iconPath}" alt="${app.name} icon" loading="lazy" data-fallback-label="${app.name}" data-fallback-subtitle="App icon" />
        <div>
          <h3>${app.name}</h3>
          <p class="meta-line">v${app.version} • ${app.category}</p>
        </div>
      </div>
      ${app.featured ? '<span class="badge bg-warning text-dark">Featured</span>' : ""}
    </div>
    <p class="meta-line">${app.description}</p>
    <div class="tag-row">
      ${app.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}
    </div>
    <div class="meta-line">Released ${formatDate(app.releaseDate)}</div>
    <div class="d-flex gap-2">
      <a class="btn btn-primary btn-sm" href="${app.downloadUrl}" target="_blank" rel="noreferrer">Download</a>
      <a class="btn btn-outline-light btn-sm" href="${app.detailsUrl}">Details</a>
    </div>
  `;
  container.appendChild(card);
  attachImageFallback(card.querySelector("img.auto-image"), app.name, app.category);
  card.querySelectorAll("img.auto-image").forEach((image) => attachImageFallback(image, app.name, app.category));
}

function initializeHomePage() {
  const featuredApps = document.getElementById("featuredApps");
  const newestApps = document.getElementById("newestApps");
  const categoriesGrid = document.getElementById("categoriesGrid");
  const homeSearch = document.querySelector(".hero-search");
  const homeSearchInput = document.getElementById("homeSearch");

  if (!featuredApps || !newestApps || !categoriesGrid) return;

  featuredApps.innerHTML = "";
  newestApps.innerHTML = "";
  categoriesGrid.innerHTML = "";

  state.categories.forEach((category) => {
    const categoryCard = document.createElement("div");
    categoryCard.className = "category-card";
    const iconMap = {
      AI: "bi-cpu",
      Trading: "bi-graph-up-arrow",
      Network: "bi-wifi",
      Security: "bi-shield-lock",
      Utilities: "bi-tools",
      Productivity: "bi-check2-square",
      Tools: "bi-box-seam"
    };
    categoryCard.innerHTML = `<i class="bi ${iconMap[category]}"></i><h3>${category}</h3><p>${state.apps.filter((app) => app.category === category).length} apps</p>`;
    categoriesGrid.appendChild(categoryCard);
  });

  const featured = [...state.apps].filter((app) => app.featured).slice(0, 4);
  const newest = [...state.apps].sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate)).slice(0, 4);

  featured.forEach((app) => renderAppCard(app, featuredApps));
  newest.forEach((app) => renderAppCard(app, newestApps));

  homeSearch?.addEventListener("submit", (event) => {
    event.preventDefault();
    const query = homeSearchInput?.value.trim() || "";
    window.location.href = `search.html?q=${encodeURIComponent(query)}`;
  });
}

function initializeSearchPage() {
  const searchResults = document.getElementById("searchResults");
  const categoryFilter = document.getElementById("categoryFilter");
  const tagFilter = document.getElementById("tagFilter");
  const searchForm = document.querySelector("[data-search-form]");
  const queryInput = document.getElementById("searchQuery");

  if (!searchResults || !searchForm || !categoryFilter || !tagFilter) return;

  const params = new URLSearchParams(window.location.search);
  const initialQuery = params.get("q") || "";
  queryInput.value = initialQuery;

  const categories = ["All", ...new Set(state.apps.map((app) => app.category))];
  categoryFilter.innerHTML = categories.map((cat) => `<option value="${cat}">${cat === "All" ? "All categories" : cat}</option>`).join("");
  const tags = ["All", ...new Set(state.apps.flatMap((app) => app.tags))];
  tagFilter.innerHTML = tags.map((tag) => `<option value="${tag}">${tag === "All" ? "All tags" : tag}</option>`).join("");

  function updateResults() {
    const query = queryInput.value.toLowerCase();
    const selectedCategory = categoryFilter.value;
    const selectedTag = tagFilter.value;
    const filtered = state.apps.filter((app) => {
      const matchesQuery = [app.name, app.category, app.description, ...app.tags].join(" ").toLowerCase().includes(query);
      const matchesCategory = selectedCategory === "All" || app.category === selectedCategory;
      const matchesTag = selectedTag === "All" || app.tags.includes(selectedTag);
      return matchesQuery && matchesCategory && matchesTag;
    });

    searchResults.innerHTML = "";
    if (!filtered.length) {
      searchResults.innerHTML = '<div class="card p-4">No apps matched your filters.</div>';
      return;
    }
    filtered.forEach((app) => renderAppCard(app, searchResults));
  }

  searchForm.addEventListener("input", updateResults);
  searchForm.addEventListener("change", updateResults);
  updateResults();
}

function initializeDetailsPage() {
  const detailImage = document.getElementById("detailImage");
  const detailMeta = document.getElementById("detailMeta");
  const detailDescription = document.getElementById("detailDescription");
  const featureList = document.getElementById("featureList");
  const requirementList = document.getElementById("requirementList");
  const detailFacts = document.getElementById("detailFacts");
  const downloadBtn = document.getElementById("downloadBtn");
  const shareBtn = document.getElementById("shareBtn");

  if (!detailMeta || !detailImage || !detailDescription || !featureList || !requirementList || !detailFacts) return;

  const params = new URLSearchParams(window.location.search);
  const app = getAppById(params.get("id"));

  if (!app) {
    detailMeta.innerHTML = '<h1>App not found</h1><p>The requested experience is not available.</p>';
    return;
  }

  const detailImagePath = app.image || `images/screenshots/${app.id}.png`;
  detailImage.src = detailImagePath;
  detailImage.alt = `${app.name} screenshot`;
  detailImage.dataset.fallbackLabel = app.name;
  detailImage.dataset.fallbackSubtitle = app.category;
  attachImageFallback(detailImage, app.name, app.category);
  detailMeta.innerHTML = `
    <span class="chip">${app.category}</span>
    <h1>${app.name}</h1>
    <p class="meta-line">Version ${app.version}</p>
    <p>${app.description}</p>
  `;
  detailDescription.textContent = `${app.description} Built for modern teams who want polished, reliable tools without friction.`;
  featureList.innerHTML = app.features.map((feature) => `<li>${feature}</li>`).join("");
  requirementList.innerHTML = app.requirements.map((requirement) => `<li>${requirement}</li>`).join("");
  detailFacts.innerHTML = `
    <li><strong>Release</strong><br>${formatDate(app.releaseDate)}</li>
    <li><strong>Version</strong><br>${app.version}</li>
    <li><strong>Category</strong><br>${app.category}</li>
    <li><strong>Tags</strong><br>${app.tags.join(", ")}</li>
  `;
  downloadBtn.href = app.downloadUrl;
  downloadBtn.textContent = `Download ${app.name}`;

  shareBtn?.addEventListener("click", async () => {
    if (navigator.share) {
      await navigator.share({ title: app.name, text: app.description, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      shareBtn.textContent = "Copied";
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initializeImageFallbacks();
  loadApps();
});
