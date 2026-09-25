// Core app bootstrapping and data loading for the static marketplace.
const state = {
  apps: [],
  categories: ["AI", "Trading", "Network", "Security", "Utilities", "Productivity", "Tools"]
};
const apiBaseUrl = window.RocketStoresConfig?.apiBaseUrl || "";
const checkoutState = { attempts: 0, maxAttempts: 24, timer: null };

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
    const labelElement = document.createElement("span");
    labelElement.textContent = String(label).slice(0, 2).toUpperCase();
    const subtitleElement = document.createElement("small");
    subtitleElement.textContent = subtitle;
    placeholder.append(labelElement, subtitleElement);
    parent.replaceChild(placeholder, imageElement);
  };

  imageElement.addEventListener("error", fallback, { once: true });
  if (imageElement.complete && imageElement.naturalWidth === 0) {
    fallback();
  }
}

async function loadApps() {
  try {
    const presentationResponse = await fetch("data/apps.json");
    const presentationApps = presentationResponse.ok ? await presentationResponse.json() : [];
    const response = await fetch(`${apiBaseUrl}/api/products?isActive=true&page=1&pageSize=200`);
    if (!response.ok) throw new Error("Unable to load catalog");
    const products = await response.json();
    const catalogApps = await Promise.all(products.items.map(async (product) => {
      const [versionsResponse, plansResponse] = await Promise.all([
        fetch(`${apiBaseUrl}/api/products/${product.productId}/versions?isPublished=true&page=1&pageSize=1`),
        fetch(`${apiBaseUrl}/api/products/${product.productId}/plans?isActive=true`)
      ]);
      const versions = versionsResponse.ok ? await versionsResponse.json() : { items: [] };
      const plans = plansResponse.ok ? await plansResponse.json() : [];
      const presentation = presentationApps.find((item) => item.slug === product.slug || item.id === product.slug || item.id === product.productId) || {};
      const version = versions.items?.[0] || {};
      return { ...presentation, id: product.productId, slug: product.slug, name: product.name, category: presentation.category || "Software", tags: Array.isArray(presentation.tags) ? presentation.tags : [], features: Array.isArray(presentation.features) ? presentation.features : [], requirements: Array.isArray(presentation.requirements) ? presentation.requirements : [], version: version.versionString || "Unpublished", description: product.description || presentation.description || "", detailsUrl: `details.html?id=${encodeURIComponent(product.productId)}`, releaseDate: version.publishedAt || product.updatedAt, productId: product.productId, versionId: version.productVersionId || null, plans };
    }));
    state.apps = catalogApps.filter((app) => app.plans.length > 0);
    initializeHomePage();
    initializeSearchPage();
    initializeDetailsPage();
  } catch (error) {
    const message = document.getElementById("catalogError");
    if (message) message.textContent = "The catalog is temporarily unavailable.";
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
  const thumbnail = document.createElement("div");
  thumbnail.className = "app-thumb";
  const image = document.createElement("img");
  image.className = "auto-image";
  image.src = imagePath;
  image.alt = `${app.name} preview`;
  image.loading = "lazy";
  image.dataset.fallbackLabel = app.name;
  image.dataset.fallbackSubtitle = app.category;
  thumbnail.append(image);

  const header = document.createElement("div");
  header.className = "app-header";
  const identity = document.createElement("div");
  identity.className = "d-flex align-items-center gap-2";
  const icon = document.createElement("img");
  icon.className = "app-icon auto-image";
  icon.src = iconPath;
  icon.alt = `${app.name} icon`;
  icon.loading = "lazy";
  icon.dataset.fallbackLabel = app.name;
  icon.dataset.fallbackSubtitle = "App icon";
  const titleGroup = document.createElement("div");
  const title = document.createElement("h3");
  title.textContent = app.name;
  const version = document.createElement("p");
  version.className = "meta-line";
  version.textContent = `v${app.version} • ${app.category}`;
  titleGroup.append(title, version);
  identity.append(icon, titleGroup);
  header.append(identity);
  if (app.featured) {
    const featured = document.createElement("span");
    featured.className = "badge bg-warning text-dark";
    featured.textContent = "Featured";
    header.append(featured);
  }

  const description = document.createElement("p");
  description.className = "meta-line";
  description.textContent = app.description;
  const tags = document.createElement("div");
  tags.className = "tag-row";
  app.tags.forEach((tag) => {
    const tagElement = document.createElement("span");
    tagElement.className = "tag";
    tagElement.textContent = tag;
    tags.append(tagElement);
  });
  const release = document.createElement("div");
  release.className = "meta-line";
  release.textContent = `Released ${formatDate(app.releaseDate)}`;
  const actions = document.createElement("div");
  actions.className = "d-flex gap-2";
  [ ["btn btn-primary btn-sm", "Purchase"], ["btn btn-outline-light btn-sm", "Details"] ].forEach(([className, label]) => {
    const link = document.createElement("a");
    link.className = className;
    link.href = app.detailsUrl;
    link.textContent = label;
    actions.append(link);
  });
  card.append(thumbnail, header, description, tags, release, actions);
  container.appendChild(card);
  card.querySelectorAll("img.auto-image").forEach((image) => attachImageFallback(image, app.name, app.category));
}

function initializeHomePage() {
  const featuredApps = document.getElementById("featuredApps");
  const newestApps = document.getElementById("newestApps");
  const categoriesGrid = document.getElementById("categoriesGrid");
  const homeSearch = document.querySelector(".hero-search");
  const homeSearchInput = document.getElementById("homeSearch");

  if (!featuredApps || !newestApps || !categoriesGrid) return;

  featuredApps.replaceChildren();
  newestApps.replaceChildren();
  categoriesGrid.replaceChildren();

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
    const icon = document.createElement("i");
    icon.className = `bi ${iconMap[category]}`;
    const heading = document.createElement("h3");
    heading.textContent = category;
    const count = document.createElement("p");
    count.textContent = `${state.apps.filter((app) => app.category === category).length} apps`;
    categoryCard.append(icon, heading, count);
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
  categoryFilter.replaceChildren(...categories.map((cat) => {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat === "All" ? "All categories" : cat;
    return option;
  }));
  const tags = ["All", ...new Set(state.apps.flatMap((app) => app.tags))];
  tagFilter.replaceChildren(...tags.map((tag) => {
    const option = document.createElement("option");
    option.value = tag;
    option.textContent = tag === "All" ? "All tags" : tag;
    return option;
  }));

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

    searchResults.replaceChildren();
    if (!filtered.length) {
      const empty = document.createElement("div");
      empty.className = "card p-4";
      empty.textContent = "No apps matched your filters.";
      searchResults.append(empty);
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
  const productDownloadBtn = document.getElementById("productDownloadBtn");
  const planSelect = document.getElementById("planSelect");
  const purchaseBtn = document.getElementById("purchaseBtn");
  const purchaseStatus = document.getElementById("purchaseStatus");
  const licenseOutput = document.getElementById("licenseOutput");
  const licenseDetails = document.getElementById("licenseDetails");
  const copyLicenseBtn = document.getElementById("copyLicenseBtn");
  const shareBtn = document.getElementById("shareBtn");

  if (!detailMeta || !detailImage || !detailDescription || !featureList || !requirementList || !detailFacts) return;

  const params = new URLSearchParams(window.location.search);
  const app = getAppById(params.get("id"));

  if (!app) {
    const heading = document.createElement("h1");
    heading.textContent = "App not found";
    const message = document.createElement("p");
    message.textContent = "The requested experience is not available.";
    detailMeta.replaceChildren(heading, message);
    return;
  }

  const detailImagePath = app.image || `images/screenshots/${app.id}.png`;
  detailImage.src = detailImagePath;
  detailImage.alt = `${app.name} screenshot`;
  detailImage.dataset.fallbackLabel = app.name;
  detailImage.dataset.fallbackSubtitle = app.category;
  attachImageFallback(detailImage, app.name, app.category);
  const category = document.createElement("span");
  category.className = "chip";
  category.textContent = app.category;
  const heading = document.createElement("h1");
  heading.textContent = app.name;
  const version = document.createElement("p");
  version.className = "meta-line";
  version.textContent = `Version ${app.version}`;
  const description = document.createElement("p");
  description.textContent = app.description;
  detailMeta.replaceChildren(category, heading, version, description);
  detailDescription.textContent = `${app.description} Built for modern teams who want polished, reliable tools without friction.`;
  featureList.replaceChildren(...app.features.map((feature) => {
    const item = document.createElement("li");
    item.textContent = feature;
    return item;
  }));
  requirementList.replaceChildren(...app.requirements.map((requirement) => {
    const item = document.createElement("li");
    item.textContent = requirement;
    return item;
  }));
  detailFacts.replaceChildren(...[
    ["Release", formatDate(app.releaseDate)],
    ["Version", app.version],
    ["Category", app.category],
    ["Tags", app.tags.join(", ")]
  ].map(([label, value]) => {
    const item = document.createElement("li");
    const strong = document.createElement("strong");
    strong.textContent = label;
    const valueElement = document.createElement("span");
    valueElement.textContent = value;
    item.append(strong, document.createElement("br"), valueElement);
    return item;
  }));
  downloadBtn.href = "#purchase";
  downloadBtn.textContent = `Purchase ${app.name}`;
  if (productDownloadBtn && app.versionId) {
    productDownloadBtn.href = `${apiBaseUrl}/api/products/${encodeURIComponent(app.productId)}/versions/${encodeURIComponent(app.versionId)}/download`;
    productDownloadBtn.hidden = false;
  }
  if (planSelect && purchaseBtn && purchaseStatus && licenseOutput && licenseDetails && copyLicenseBtn) {
    planSelect.replaceChildren(...app.plans.map((plan) => {
      const option = document.createElement("option");
      option.value = plan.licensePlanId;
      option.textContent = `${plan.name} - ${plan.price} ${plan.currency}`;
      return option;
    }));
    purchaseBtn.addEventListener("click", () => startCheckout(app, planSelect.value, purchaseBtn, purchaseStatus, licenseOutput, licenseDetails, copyLicenseBtn));
    copyLicenseBtn.addEventListener("click", () => copyLicenseKey(licenseOutput, purchaseStatus));
    restoreOrderState(app, purchaseBtn, purchaseStatus, licenseOutput, licenseDetails, copyLicenseBtn);
  }

  shareBtn?.addEventListener("click", async () => {
    if (navigator.share) {
      await navigator.share({ title: app.name, text: app.description, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      shareBtn.textContent = "Copied";
    }
  });
}

async function startCheckout(app, licensePlanId, purchaseButton, statusElement, licenseOutput, licenseDetails, copyLicenseBtn) {
  purchaseButton.disabled = true;
  setCheckoutState(statusElement, "CHECKOUT_CREATED", "Creating checkout...");
  try {
    const response = await fetchWithTimeout(`${apiBaseUrl}/api/v1/commerce/checkout`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: app.productId, licensePlanId }) }, 10000);
    if (!response.ok) throw new Error(getHttpErrorMessage(response.status));
    const checkout = await response.json();
    sessionStorage.setItem("rocketCheckoutToken", checkout.checkoutAccessToken);
    sessionStorage.setItem("rocketOrderNumber", checkout.orderNumber);
    sessionStorage.setItem("rocketCheckoutProductId", app.productId);
    sessionStorage.setItem("rocketCheckoutPlanId", licensePlanId);
    setCheckoutState(statusElement, "PAYMENT_PENDING", "Payment pending. Complete payment, then return here.");
    window.open(checkout.session.checkoutUrl, "_blank", "noopener,noreferrer");
    checkoutState.attempts = 0;
    pollOrder(checkout.orderNumber, purchaseButton, statusElement, licenseOutput, licenseDetails, copyLicenseBtn);
  } catch (error) {
    purchaseButton.disabled = false;
    setCheckoutState(statusElement, "ERROR", "Checkout could not be created. Please try again.");
  }
}

function restoreOrderState(app, purchaseButton, statusElement, licenseOutput, licenseDetails, copyLicenseBtn) {
  const orderNumber = sessionStorage.getItem("rocketOrderNumber");
  const token = sessionStorage.getItem("rocketCheckoutToken");
  const productId = sessionStorage.getItem("rocketCheckoutProductId");
  if (orderNumber && token && productId === app.productId) {
    purchaseButton.disabled = true;
    setCheckoutState(statusElement, "PAYMENT_PENDING", "Resuming your checkout...");
    checkoutState.attempts = 0;
    pollOrder(orderNumber, purchaseButton, statusElement, licenseOutput, licenseDetails, copyLicenseBtn);
  }
}

async function pollOrder(orderNumber, purchaseButton, statusElement, licenseOutput, licenseDetails, copyLicenseBtn) {
  const token = sessionStorage.getItem("rocketCheckoutToken");
  if (!token) return;
  if (checkoutState.attempts >= checkoutState.maxAttempts) {
    purchaseButton.disabled = false;
    setCheckoutState(statusElement, "ERROR", "This checkout is taking longer than expected. Refresh to try again.");
    return;
  }
  checkoutState.attempts += 1;
  try {
    const response = await fetchWithTimeout(`${apiBaseUrl}/api/v1/commerce/orders/${encodeURIComponent(orderNumber)}`, { headers: { Authorization: `Bearer ${token}` } }, 8000);
    if (!response.ok) throw new Error(getHttpErrorMessage(response.status));
    const order = await response.json();
    if (["Failed", "Cancelled", "Expired"].includes(order.orderStatus) || ["Failed", "Refunded", "Disputed"].includes(order.paymentStatus)) {
      purchaseButton.disabled = false;
      setCheckoutState(statusElement, "ERROR", "This payment cannot be completed. Start a new checkout to try again.");
      return;
    }
    if (order.licenseAvailable) {
      setCheckoutState(statusElement, "LICENSE_READY", "Your license is ready.");
      licenseDetails.textContent = `${order.productName} - ${order.licensePlanName} - ${order.orderNumber}`;
      const licenseResponse = await fetchWithTimeout(`${apiBaseUrl}/api/v1/commerce/orders/${encodeURIComponent(orderNumber)}/license`, { headers: { Authorization: `Bearer ${token}` } }, 8000);
      if (licenseResponse.ok) {
        licenseOutput.textContent = (await licenseResponse.json()).licenseKey;
        licenseOutput.hidden = false;
        copyLicenseBtn.hidden = false;
        return;
      }
      if (licenseResponse.status !== 409) throw new Error(getHttpErrorMessage(licenseResponse.status));
      setCheckoutState(statusElement, "LICENSE_PENDING", "Payment confirmed. Your license is being prepared...");
    } else if (order.paymentStatus === "Confirmed") {
      setCheckoutState(statusElement, "LICENSE_PENDING", "Payment confirmed. Your license is being prepared...");
    } else {
      setCheckoutState(statusElement, "PAYMENT_PENDING", "Payment pending. Complete payment, then return here.");
    }
    checkoutState.timer = window.setTimeout(() => pollOrder(orderNumber, purchaseButton, statusElement, licenseOutput, licenseDetails, copyLicenseBtn), 5000);
  } catch (error) {
    if (checkoutState.attempts >= checkoutState.maxAttempts) {
      purchaseButton.disabled = false;
      setCheckoutState(statusElement, "ERROR", "We could not reach the order service. Refresh to try again.");
      return;
    }
    setCheckoutState(statusElement, "ERROR", "Order status is temporarily unavailable. Retrying...");
    checkoutState.timer = window.setTimeout(() => pollOrder(orderNumber, purchaseButton, statusElement, licenseOutput, licenseDetails, copyLicenseBtn), 5000);
  }
}

function setCheckoutState(element, stateName, message) {
  element.dataset.checkoutState = stateName;
  element.textContent = message;
}

function getHttpErrorMessage(status) {
  return { 400: "Please check the selected product and plan.", 401: "Your checkout session is not authorized.", 403: "This checkout is not authorized.", 404: "The checkout could not be found.", 409: "Your license is still being prepared.", 429: "Too many requests. Please wait and try again.", 500: "The service is temporarily unavailable.", 502: "The payment service is temporarily unavailable.", 503: "The service is temporarily unavailable." }[status] || "The request could not be completed.";
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetch(url, { ...options, signal: controller.signal }); }
  finally { window.clearTimeout(timer); }
}

async function copyLicenseKey(licenseOutput, statusElement) {
  try {
    await navigator.clipboard.writeText(licenseOutput.textContent);
    statusElement.textContent = "License key copied.";
  } catch {
    statusElement.textContent = "Copy is unavailable. Select the license key to copy it manually.";
  }
}

window.addEventListener("pagehide", () => {
  if (checkoutState.timer) window.clearTimeout(checkoutState.timer);
});

document.addEventListener("DOMContentLoaded", () => {
  initializeImageFallbacks();
  loadApps();
});
