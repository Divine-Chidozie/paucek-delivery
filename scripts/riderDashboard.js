"use strict";

// Paucek Deliveries — Rider Dashboard
const API_BASE_URL = "https://paucek-delivery.onrender.com/api";
const DASHBOARD_URL = "/dashboard/riderDashboard.html";

let riderToken = localStorage.getItem("paucekRiderToken");
let riderProfile = null;

let isUpdatingLocation = false;
let isUpdatingAvailability = false;
let isRefreshing = false;

let availableDeliveries = [];
let assignedDeliveries = [];
let deliveryHistory = [];
let lastNearbyDiagnostics = null;

const $ = (id) => document.getElementById(id);

const elements = {
  welcomeMessage: $("welcome-message"),
  approvalStatus: $("approval-status"),
  riderName: $("rider-name"),
  riderEmail: $("rider-email"),
  riderPhone: $("rider-phone"),
  profileStatus: $("profile-status"),
  profileCardName: $("profile-card-name"),
  sidebarRiderName: $("sidebar-rider-name"),
  sidebarRiderStatus: $("sidebar-rider-status"),
  headerAvatar: $("header-avatar"),
  sidebarAvatar: $("sidebar-avatar"),
  profileAvatar: $("profile-avatar"),

  logoutButton: $("logout-button"),
  refreshButton: $("refresh-dashboard-button"),
  refreshAvailableButton: $("refresh-available-button"),
  updateLocationButton: $("update-location-button"),
  availabilityToggle: $("availability-toggle"),

  availabilityHeading: $("availability-heading"),
  availabilityDescription: $("availability-description"),
  availabilityStatus: $("availability-status"),
  locationStatus: $("location-status"),
  actionFeedback: $("rider-action-feedback"),

  availableList: $("available-deliveries"),
  assignedList: $("my-deliveries-list"),

  availableCount: $("available-count"),
  sidebarAvailableCount: $("sidebar-available-count"),
  activeCount: $("active-count"),
  completedCount: $("completed-count"),
  totalEarnings: $("total-earnings"),
  earningsTotal: $("earnings-total"),
};

// ========================================
// UTILITIES
// ========================================

function escapeHTML(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character],
  );
}

function formatCurrency(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) return "₦0.00";

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(value) {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return date.toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getFullName(profile = riderProfile) {
  if (!profile) return "Rider";

  return (
    [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim() ||
    profile.fullName ||
    profile.name ||
    "Rider"
  );
}

function getInitial(profile = riderProfile) {
  return getFullName(profile).charAt(0).toUpperCase() || "R";
}

function getDeliveryId(delivery) {
  return delivery?._id || delivery?.id || delivery?.deliveryId || "";
}

function getPickupAddress(delivery) {
  return (
    delivery?.pickupAddress ||
    delivery?.pickupLocation?.address ||
    delivery?.pickup?.address ||
    (typeof delivery?.pickup === "string" ? delivery.pickup : "") ||
    "Pickup address unavailable"
  );
}

function getDestinationAddress(delivery) {
  return (
    delivery?.destinationAddress ||
    delivery?.deliveryAddress ||
    delivery?.destinationLocation?.address ||
    delivery?.dropoffAddress ||
    delivery?.destination?.address ||
    (typeof delivery?.destination === "string" ? delivery.destination : "") ||
    "Destination address unavailable"
  );
}

function getDeliveryFee(delivery) {
  return (
    delivery?.riderEarnings ??
    delivery?.riderFee ??
    delivery?.deliveryFee ??
    delivery?.estimatedFee ??
    delivery?.fee ??
    delivery?.price ??
    0
  );
}

function getDeliveryStatus(delivery) {
  return String(delivery?.status || "Pending").trim();
}

function normalizeStatus(status) {
  return String(status || "")
    .toLowerCase()
    .replace(/[_\s]+/g, "-");
}

function isRiderVerified(profile = riderProfile) {
  if (!profile) return false;

  return (
    String(profile.onboardingStatus || "").toLowerCase() === "verified" ||
    String(profile.approvalStatus || "").toLowerCase() === "approved"
  );
}

function isRiderRejected(profile = riderProfile) {
  if (!profile) return false;

  return (
    String(profile.onboardingStatus || "").toLowerCase() === "rejected" ||
    String(profile.approvalStatus || "").toLowerCase() === "rejected"
  );
}

function isRiderOnline(profile = riderProfile) {
  return profile?.isAvailable === true;
}

function setText(element, value) {
  if (element) element.textContent = value ?? "";
}

function setFeedback(message, type = "") {
  if (!elements.actionFeedback) return;

  elements.actionFeedback.textContent = message;
  elements.actionFeedback.className = "action-feedback";

  if (type) elements.actionFeedback.classList.add(type);
}

function setButtonBusy(button, busy, busyText = "Please wait...") {
  if (!button) return;

  if (busy) {
    if (!button.dataset.originalHtml) {
      button.dataset.originalHtml = button.innerHTML;
    }

    button.disabled = true;
    button.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> ${escapeHTML(busyText)}`;
  } else {
    if (button.dataset.originalHtml) {
      button.innerHTML = button.dataset.originalHtml;
      delete button.dataset.originalHtml;
    }

    button.disabled = false;
  }
}

function showSessionMessage(message) {
  setFeedback(message, "error");

  if (elements.availableList) {
    elements.availableList.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-lock"></i>
        <strong>Rider session required</strong>
        <p>${escapeHTML(message)}</p>
        <p>Open the existing rider login page to sign in again.</p>
      </div>
    `;
  }

  if (elements.assignedList) {
    elements.assignedList.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-lock"></i>
        <strong>Sign-in required</strong>
        <p>${escapeHTML(message)}</p>
      </div>
    `;
  }

  if (elements.availabilityToggle) {
    elements.availabilityToggle.disabled = true;
  }
}

function clearRiderSession(message) {
  localStorage.removeItem("paucekRiderToken");
  riderToken = null;
  showSessionMessage(message);
}

// ========================================
// API REQUESTS
// ========================================

async function apiRequest(endpoint, options = {}) {
  if (!riderToken) {
    throw new Error(
      "Your rider session is missing. Sign in through the existing rider login page.",
    );
  }

  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${riderToken}`,
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {}),
  };

  let response;

  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error(
      "Unable to connect to Paucek. Make sure the backend is running.",
    );
  }

  let data = {};

  try {
    data = await response.json();
  } catch {
    // The response may not contain JSON.
  }

  if (response.status === 401) {
    clearRiderSession(
      "Your rider session has expired. Sign in again using your existing rider login page.",
    );

    const error = new Error("Your rider session has expired.");
    error.status = 401;
    throw error;
  }

  if (!response.ok) {
    const error = new Error(
      data.message ||
        data.error ||
        `Request failed with status ${response.status}.`,
    );

    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

function getArrayResponse(data, keys = []) {
  if (Array.isArray(data)) return data;

  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }

  return [];
}

// ========================================
// VERIFICATION AND PROFILE
// ========================================

function renderApprovalStatus() {
  const verified = isRiderVerified();
  const rejected = isRiderRejected();

  let label = "Verification pending";
  let className = "pending";

  if (verified) {
    label = "Rider verified";
    className = "approved";
  } else if (rejected) {
    label = "Verification rejected";
    className = "rejected";
  }

  if (elements.approvalStatus) {
    elements.approvalStatus.className = `approval-pill ${className}`;
    elements.approvalStatus.innerHTML = `<span class="status-dot"></span>${escapeHTML(label)}`;
  }

  if (elements.profileStatus) {
    elements.profileStatus.textContent = label;
    elements.profileStatus.className = `profile-status-badge ${verified ? "verified" : className}`;
  }
}

function renderProfile() {
  if (!riderProfile) return;

  const name = getFullName();
  const initial = getInitial();

  setText(elements.welcomeMessage, `Welcome back, ${name.split(" ")[0]}`);
  setText(elements.riderName, name);
  setText(elements.riderEmail, riderProfile.email || "Not provided");
  setText(elements.riderPhone, riderProfile.phone || "Not provided");
  setText(elements.profileCardName, name);
  setText(elements.sidebarRiderName, name);

  [
    elements.headerAvatar,
    elements.sidebarAvatar,
    elements.profileAvatar,
  ].forEach((element) => setText(element, initial));

  const verified = isRiderVerified();
  const rejected = isRiderRejected();

  setText(
    elements.sidebarRiderStatus,
    rejected
      ? "Verification rejected"
      : !verified
        ? "Awaiting verification"
        : isRiderOnline()
          ? "Online and verified"
          : "Verified rider",
  );

  renderApprovalStatus();
  renderAvailability();
}

function renderAvailability() {
  const online = isRiderOnline();
  const verified = isRiderVerified();
  const rejected = isRiderRejected();

  setText(
    elements.availabilityHeading,
    rejected
      ? "Your rider application was rejected"
      : online
        ? "You're online and ready"
        : "You're currently offline",
  );

  setText(
    elements.availabilityDescription,
    rejected
      ? "Contact Paucek support if you believe this decision was made in error."
      : !verified
        ? "Your account is awaiting verification. You can update your GPS location, but you cannot go online or accept deliveries yet."
        : online
          ? "You're marked as available. Keep your location current to receive nearby requests."
          : "Update your location and go online when you're ready to receive delivery requests.",
  );

  if (elements.availabilityStatus) {
    elements.availabilityStatus.textContent = online ? "ONLINE" : "OFFLINE";
    elements.availabilityStatus.className = `availability-status ${online ? "online" : "offline"}`;
  }

  if (elements.availabilityToggle) {
    elements.availabilityToggle.innerHTML = online
      ? '<i class="fa-solid fa-power-off"></i> Go offline'
      : '<i class="fa-solid fa-power-off"></i> Go online';

    elements.availabilityToggle.disabled =
      !verified || rejected || isUpdatingAvailability;
  }

  const locationUpdated = riderProfile?.locationUpdatedAt;
  const coordinates = riderProfile?.currentLocation?.coordinates;
  const hasCoordinates =
    Array.isArray(coordinates) &&
    coordinates.length === 2 &&
    coordinates.every((value) => Number.isFinite(Number(value)));

  if (elements.locationStatus) {
    elements.locationStatus.textContent = locationUpdated
      ? `Location updated ${formatDate(locationUpdated)}`
      : hasCoordinates
        ? "Location saved"
        : "Location not updated";
  }
}

async function loadRiderProfile() {
  const data = await apiRequest("/riders/me");
  riderProfile = data.rider || data.profile || data.data || data;
  renderProfile();
  return riderProfile;
}

// ========================================
// GEOLOCATION
// ========================================

function getBrowserPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("This browser does not support location services."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          longitude: position.coords.longitude,
          latitude: position.coords.latitude,
        });
      },
      (error) => {
        const messages = {
          1: "Location permission was denied. Allow location access in your browser settings.",
          2: "Your current location could not be determined. Try again.",
          3: "Location request timed out. Please try again.",
        };

        reject(
          new Error(messages[error.code] || "Unable to obtain your location."),
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      },
    );
  });
}

async function updateRiderLocation({ showMessage = true } = {}) {
  if (isUpdatingLocation) return false;

  isUpdatingLocation = true;
  setButtonBusy(elements.updateLocationButton, true, "Getting location...");

  if (showMessage) setFeedback("Requesting your current location...");

  try {
    const coordinates = await getBrowserPosition();

    await apiRequest("/riders/location", {
      method: "PATCH",
      body: JSON.stringify(coordinates),
    });

    await loadRiderProfile();

    if (showMessage) {
      setFeedback("Your location has been updated.", "success");
    }

    return true;
  } catch (error) {
    if (showMessage) setFeedback(error.message, "error");
    throw error;
  } finally {
    isUpdatingLocation = false;
    setButtonBusy(elements.updateLocationButton, false);
    renderAvailability();
  }
}

// ========================================
// VERIFICATION-PENDING STATES
// ========================================

function renderVerificationNotice() {
  const rejected = isRiderRejected();

  const title = rejected
    ? "Rider verification rejected"
    : "Verification required";

  const description = rejected
    ? "Your account is not approved for delivery operations. Please contact Paucek support."
    : "Your rider account is awaiting approval. You can update your location and review your profile while you wait. Nearby jobs, assigned deliveries, and earnings will become available after verification.";

  const notice = (sectionName) => `
    <div class="empty-state verification-notice">
      <i class="fa-solid ${rejected ? "fa-circle-xmark" : "fa-shield-halved"}"></i>
      <strong>${escapeHTML(title)}</strong>
      <p>${escapeHTML(description)}</p>
      <p class="verification-section-note">
        ${escapeHTML(sectionName)} will be available once your account is approved.
      </p>
    </div>
  `;

  if (elements.availableList) {
    elements.availableList.innerHTML = notice("Nearby deliveries");
  }

  if (elements.assignedList) {
    elements.assignedList.innerHTML = notice("My deliveries");
  }

  availableDeliveries = [];
  assignedDeliveries = [];
  deliveryHistory = [];
  lastNearbyDiagnostics = null;

  setText(elements.availableCount, "0");
  setText(elements.sidebarAvailableCount, "0");
  setText(elements.activeCount, "0");
  setText(elements.completedCount, "—");
  setText(elements.totalEarnings, "—");
  setText(elements.earningsTotal, "—");
}

// ========================================
// NEARBY DELIVERY DIAGNOSTICS
// ========================================

function renderOnlineEmptyState(data = {}) {
  if (!elements.availableList) return;

  const diagnostics = data.diagnostics || lastNearbyDiagnostics || {};
  const reason = diagnostics.reason || "";
  const radiusKm = Number(data.radiusMeters) / 1000;

  let title = "No nearby deliveries right now";
  let description =
    data.message ||
    "No matching requests are available at the moment. Refresh to check again.";

  let extraDetails = "";

  switch (reason) {
    case "RIDER_OFFLINE":
      title = "You're currently offline";
      description = "Go online to receive nearby delivery requests.";
      break;

    case "GPS_MISSING_OR_OUTDATED":
      title = "Your GPS location needs updating";
      description =
        "Your saved location is missing or older than two minutes. Update your location and go online again.";
      break;

    case "NO_PENDING_UNASSIGNED_DELIVERIES":
      title = "No delivery requests are available";
      description =
        "There are currently no pending, unassigned deliveries in the database. A vendor needs to create a delivery before one can appear here.";
      break;

    case "NO_USABLE_PICKUP_COORDINATES":
      title = "Delivery pickup coordinates are missing";
      description =
        "Pending deliveries exist, but none has usable pickup GPS coordinates. Make sure the vendor's delivery form saves pickupLocation as a GeoJSON Point.";
      break;

    case "NO_DELIVERIES_WITHIN_RADIUS":
      title = "No deliveries within your area";
      description =
        "Pending deliveries with pickup coordinates exist, but none is close enough to your current location.";
      if (Number.isFinite(radiusKm) && radiusKm > 0) {
        extraDetails = `Your current dispatch radius is ${radiusKm} km.`;
      }
      break;

    case "DELIVERIES_FOUND":
      title = "No nearby deliveries right now";
      description = "Refresh to check for new requests.";
      break;
  }

  const diagnosticCounts =
    Number.isFinite(diagnostics.eligiblePendingDeliveries) &&
    Number.isFinite(diagnostics.eligibleDeliveriesWithPickupCoordinates)
      ? `
        <p class="diagnostic-details">
          Pending and unassigned: ${diagnostics.eligiblePendingDeliveries}<br>
          With pickup coordinates: ${diagnostics.eligibleDeliveriesWithPickupCoordinates}
        </p>
      `
      : "";

  elements.availableList.innerHTML = `
    <div class="empty-state">
      <i class="fa-solid fa-location-dot"></i>
      <strong>${escapeHTML(title)}</strong>
      <p>${escapeHTML(description)}</p>
      ${extraDetails ? `<p>${escapeHTML(extraDetails)}</p>` : ""}
      ${diagnosticCounts}
      <button class="button button-orange button-small"
        type="button"
        data-action="refresh-nearby">
        <i class="fa-solid fa-rotate"></i> Check again
      </button>
    </div>
  `;
}

// ========================================
// DELIVERY CARD RENDERING
// ========================================

function renderRouteStop(label, address) {
  return `
    <div class="route-stop">
      <span class="route-marker"></span>
      <div>
        <p class="route-stop-label">${escapeHTML(label)}</p>
        <p class="route-stop-address">${escapeHTML(address)}</p>
      </div>
    </div>
  `;
}

function renderDeliveryDetails(delivery) {
  const customerName =
    delivery?.customerName ||
    delivery?.customer?.name ||
    delivery?.recipientName ||
    "Customer details unavailable";

  const phone =
    delivery?.customerPhone ||
    delivery?.customer?.phone ||
    delivery?.recipientPhone ||
    "";

  const packageType =
    delivery?.packageDescription ||
    delivery?.packageType ||
    delivery?.itemDescription ||
    delivery?.description ||
    "Delivery package";

  return `
    <div class="delivery-details">
      <div class="delivery-detail">
        <i class="fa-solid fa-user"></i>
        <div>Customer<strong>${escapeHTML(customerName)}</strong></div>
      </div>
      <div class="delivery-detail">
        <i class="fa-solid fa-box"></i>
        <div>Package<strong>${escapeHTML(packageType)}</strong></div>
      </div>
      ${
        phone
          ? `<div class="delivery-detail">
              <i class="fa-solid fa-phone"></i>
              <div>Contact<strong>${escapeHTML(phone)}</strong></div>
            </div>`
          : ""
      }
    </div>
  `;
}

function renderDeliveryCard(delivery, mode = "available") {
  const id = getDeliveryId(delivery);
  const status = getDeliveryStatus(delivery);
  const normalizedStatus = normalizeStatus(status);
  const fee = formatCurrency(getDeliveryFee(delivery));
  const date = formatDate(delivery?.createdAt || delivery?.requestedAt);

  let actionButtons = "";

  if (mode === "available") {
    actionButtons = `
      <button class="button button-orange button-small"
        type="button"
        data-action="accept"
        data-id="${escapeHTML(id)}"
        ${!id || !isRiderVerified() || !isRiderOnline() ? "disabled" : ""}>
        <i class="fa-solid fa-check"></i> Accept delivery
      </button>
    `;
  } else {
    const nextAction = {
      assigned: { status: "Picked Up", label: "Mark as picked up" },
      "picked-up": { status: "In Transit", label: "Start transit" },
      "in-transit": { status: "Delivered", label: "Mark as delivered" },
    }[normalizedStatus];

    if (nextAction) {
      actionButtons = `
        <button class="button button-orange button-small"
          type="button"
          data-action="status"
          data-status="${escapeHTML(nextAction.status)}"
          data-id="${escapeHTML(id)}"
          ${!id ? "disabled" : ""}>
          <i class="fa-solid fa-arrow-right"></i>
          ${escapeHTML(nextAction.label)}
        </button>
      `;
    }
  }

  const statusClass =
    {
      assigned: "assigned",
      "picked-up": "picked-up",
      "in-transit": "in-transit",
      delivered: "delivered",
      completed: "completed",
      cancelled: "cancelled",
      failed: "failed",
    }[normalizedStatus] || "";

  return `
    <article class="delivery-card" data-delivery-id="${escapeHTML(id)}">
      <div class="delivery-card-header">
        <div>
          <h3 class="delivery-reference">
            Delivery #${escapeHTML(String(id).slice(-8) || "Pending")}
          </h3>
          <p class="delivery-date">${escapeHTML(date)}</p>
        </div>
        <div class="delivery-fee">${escapeHTML(fee)}</div>
      </div>
      <div class="delivery-body">
        <div class="route-list">
          ${renderRouteStop("Pickup location", getPickupAddress(delivery))}
          ${renderRouteStop("Delivery destination", getDestinationAddress(delivery))}
        </div>
        ${renderDeliveryDetails(delivery)}
      </div>
      <div class="delivery-card-footer">
        <span class="delivery-status ${statusClass}">
          ${escapeHTML(status)}
        </span>
        <div class="delivery-actions">${actionButtons}</div>
      </div>
    </article>
  `;
}

function renderEmptyState(icon, title, description) {
  return `
    <div class="empty-state">
      <i class="${escapeHTML(icon)}"></i>
      <strong>${escapeHTML(title)}</strong>
      <p>${escapeHTML(description)}</p>
    </div>
  `;
}

function renderErrorState(message) {
  return `
    <div class="error-state">
      <i class="fa-solid fa-triangle-exclamation"></i>
      <strong>Couldn't load this section</strong>
      <p>${escapeHTML(message)}</p>
    </div>
  `;
}

// ========================================
// LOAD NEARBY DELIVERIES
// ========================================

async function loadAvailableDeliveries() {
  if (!isRiderVerified()) {
    availableDeliveries = [];
    lastNearbyDiagnostics = null;

    setText(elements.availableCount, "0");
    setText(elements.sidebarAvailableCount, "0");

    if (elements.availableList) {
      elements.availableList.innerHTML = `
        <div class="empty-state verification-notice">
          <i class="fa-solid fa-shield-halved"></i>
          <strong>${isRiderRejected() ? "Verification rejected" : "Verification required"}</strong>
          <p>Nearby deliveries will appear here after your rider account is approved.</p>
        </div>
      `;
    }

    return;
  }

  if (elements.availableList) {
    elements.availableList.innerHTML =
      '<div class="loading-state"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading nearby deliveries...</div>';
  }

  try {
    const data = await apiRequest("/riders/deliveries/available");

    lastNearbyDiagnostics = data.diagnostics || null;
    availableDeliveries = getArrayResponse(data, [
      "deliveries",
      "data",
      "results",
    ]);

    setText(elements.availableCount, availableDeliveries.length);
    setText(elements.sidebarAvailableCount, availableDeliveries.length);

    if (!elements.availableList) return;

    if (!availableDeliveries.length) {
      renderOnlineEmptyState(data);
      return;
    }

    elements.availableList.innerHTML = availableDeliveries
      .map((delivery) => renderDeliveryCard(delivery, "available"))
      .join("");
  } catch (error) {
    if (elements.availableList) {
      elements.availableList.innerHTML = renderErrorState(error.message);
    }
  }
}

// ========================================
// LOAD ASSIGNED DELIVERIES
// ========================================

async function loadAssignedDeliveries() {
  if (!isRiderVerified()) {
    assignedDeliveries = [];
    setText(elements.activeCount, "0");

    if (elements.assignedList) {
      elements.assignedList.innerHTML = `
        <div class="empty-state verification-notice">
          <i class="fa-solid fa-shield-halved"></i>
          <strong>${isRiderRejected() ? "Verification rejected" : "Verification required"}</strong>
          <p>Your active deliveries will appear here after your rider account is approved.</p>
        </div>
      `;
    }

    return;
  }

  if (elements.assignedList) {
    elements.assignedList.innerHTML =
      '<div class="loading-state"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading your deliveries...</div>';
  }

  try {
    const data = await apiRequest("/riders/deliveries/assigned");
    assignedDeliveries = getArrayResponse(data, [
      "deliveries",
      "data",
      "results",
    ]);

    setText(elements.activeCount, assignedDeliveries.length);

    if (!elements.assignedList) return;

    if (!assignedDeliveries.length) {
      elements.assignedList.innerHTML = renderEmptyState(
        "fa-solid fa-box-open",
        "No active deliveries",
        "When you accept a delivery, it will appear here so you can manage its progress.",
      );
      return;
    }

    elements.assignedList.innerHTML = assignedDeliveries
      .map((delivery) => renderDeliveryCard(delivery, "assigned"))
      .join("");
  } catch (error) {
    if (elements.assignedList) {
      elements.assignedList.innerHTML = renderErrorState(error.message);
    }
  }
}

// ========================================
// LOAD EARNINGS AND HISTORY
// ========================================

async function loadDeliveryHistory() {
  if (!isRiderVerified()) {
    deliveryHistory = [];
    setText(elements.completedCount, "—");
    setText(elements.totalEarnings, "—");
    setText(elements.earningsTotal, "—");
    return;
  }

  try {
    const data = await apiRequest("/riders/deliveries/history");
    deliveryHistory = getArrayResponse(data, [
      "deliveries",
      "history",
      "data",
      "results",
    ]);

    const completed = deliveryHistory.filter((delivery) => {
      const status = normalizeStatus(getDeliveryStatus(delivery));
      return status === "delivered" || status === "completed";
    });

    setText(elements.completedCount, completed.length);

    const total = completed.reduce((sum, delivery) => {
      const amount = Number(getDeliveryFee(delivery));
      return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0);

    setText(elements.totalEarnings, formatCurrency(total));
    setText(elements.earningsTotal, formatCurrency(total));
  } catch (error) {
    console.error("Could not load rider delivery history:", error.message);
    setText(elements.completedCount, "—");
    setText(elements.totalEarnings, "—");
    setText(elements.earningsTotal, "—");
  }
}

// ========================================
// ACCEPT DELIVERY
// ========================================

async function acceptDelivery(deliveryId, button) {
  if (!deliveryId) {
    setFeedback("This delivery has no valid ID.", "error");
    return;
  }

  if (!isRiderVerified()) {
    setFeedback("Your rider account must be verified first.", "error");
    return;
  }

  if (!isRiderOnline()) {
    setFeedback("Go online before accepting a delivery.", "error");
    return;
  }

  if (!window.confirm("Do you want to accept this delivery?")) return;

  setButtonBusy(button, true, "Accepting...");

  try {
    await apiRequest(
      `/riders/deliveries/${encodeURIComponent(deliveryId)}/accept`,
      { method: "PATCH" },
    );

    setFeedback("Delivery accepted successfully.", "success");

    await Promise.allSettled([
      loadAvailableDeliveries(),
      loadAssignedDeliveries(),
      loadDeliveryHistory(),
    ]);
  } catch (error) {
    setFeedback(error.message, "error");
  } finally {
    setButtonBusy(button, false);
  }
}

// ========================================
// UPDATE DELIVERY STATUS
// ========================================

async function updateDeliveryStatus(deliveryId, status, button) {
  if (!deliveryId || !status) {
    setFeedback("Missing delivery information.", "error");
    return;
  }

  const prompts = {
    "Picked Up": "Confirm that you have picked up the package?",
    "In Transit": "Confirm that you are now on the way to the destination?",
    Delivered: "Confirm that this package has been delivered?",
  };

  if (!window.confirm(prompts[status] || `Change status to ${status}?`)) return;

  setButtonBusy(button, true, "Updating...");

  try {
    await apiRequest(
      `/riders/deliveries/${encodeURIComponent(deliveryId)}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ status }),
      },
    );

    setFeedback(`Delivery status updated to ${status}.`, "success");

    await Promise.allSettled([
      loadAvailableDeliveries(),
      loadAssignedDeliveries(),
      loadDeliveryHistory(),
    ]);
  } catch (error) {
    setFeedback(error.message, "error");
  } finally {
    setButtonBusy(button, false);
  }
}

// ========================================
// AVAILABILITY
// ========================================

async function toggleAvailability() {
  if (isUpdatingAvailability || !riderProfile) return;

  if (!isRiderVerified()) {
    setFeedback(
      "Your rider account must be verified before you can go online.",
      "error",
    );
    return;
  }

  const wasOnline = isRiderOnline();

  isUpdatingAvailability = true;
  setButtonBusy(elements.availabilityToggle, true, "Updating status...");
  renderAvailability();

  try {
    if (!wasOnline) {
      await updateRiderLocation({ showMessage: false });
    }

    await apiRequest("/riders/availability", {
      method: "PATCH",
      body: JSON.stringify({ isAvailable: !wasOnline }),
    });

    await loadRiderProfile();

    setFeedback(
      isRiderOnline()
        ? "You're online. Checking for nearby deliveries..."
        : "You're now offline.",
      "success",
    );

    await Promise.allSettled([
      loadAvailableDeliveries(),
      loadAssignedDeliveries(),
      loadDeliveryHistory(),
    ]);
  } catch (error) {
    setFeedback(error.message, "error");

    try {
      await loadRiderProfile();
    } catch {
      // Preserve the original action error.
    }
  } finally {
    isUpdatingAvailability = false;
    setButtonBusy(elements.availabilityToggle, false);
    renderAvailability();
  }
}

// ========================================
// DASHBOARD REFRESH
// ========================================

async function refreshDashboard() {
  if (isRefreshing) return;

  isRefreshing = true;
  setButtonBusy(elements.refreshButton, true, "Refreshing...");

  try {
    await loadRiderProfile();

    if (isRiderVerified()) {
      await Promise.allSettled([
        loadAvailableDeliveries(),
        loadAssignedDeliveries(),
        loadDeliveryHistory(),
      ]);
    } else {
      renderVerificationNotice();
    }
  } catch (error) {
    setFeedback(error.message, "error");
  } finally {
    isRefreshing = false;
    setButtonBusy(elements.refreshButton, false);
  }
}

// ========================================
// EVENTS
// ========================================

function bindDeliveryActions(container) {
  if (!container) return;

  container.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button || button.disabled) return;

    const { action, id, status } = button.dataset;

    if (action === "accept") {
      await acceptDelivery(id, button);
    } else if (action === "status") {
      await updateDeliveryStatus(id, status, button);
    } else if (action === "refresh-nearby") {
      setButtonBusy(button, true, "Checking...");
      try {
        await loadAvailableDeliveries();
      } finally {
        setButtonBusy(button, false);
      }
    }
  });
}

function bindNavigation() {
  const links = document.querySelectorAll(".nav-link");

  links.forEach((link) => {
    link.addEventListener("click", () => {
      links.forEach((item) => item.classList.remove("active"));
      link.classList.add("active");
    });
  });

  const sections = document.querySelectorAll(
    "#overview, #available, #my-deliveries, #earnings, #profile",
  );

  if (!("IntersectionObserver" in window)) return;

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (!visible) return;

      links.forEach((link) => {
        link.classList.toggle(
          "active",
          link.getAttribute("href") === `#${visible.target.id}`,
        );
      });
    },
    {
      rootMargin: "-20% 0px -65% 0px",
      threshold: [0, 0.2, 0.5],
    },
  );

  sections.forEach((section) => observer.observe(section));
}

function bindEvents() {
  elements.logoutButton?.addEventListener("click", () => {
    if (!window.confirm("Are you sure you want to log out?")) return;

    localStorage.removeItem("paucekRiderToken");
    riderToken = null;
    showSessionMessage("You have been logged out.");
  });

  elements.refreshButton?.addEventListener("click", refreshDashboard);

  elements.refreshAvailableButton?.addEventListener("click", async () => {
    setButtonBusy(elements.refreshAvailableButton, true, "Refreshing...");
    try {
      await loadAvailableDeliveries();
    } finally {
      setButtonBusy(elements.refreshAvailableButton, false);
    }
  });

  elements.updateLocationButton?.addEventListener("click", async () => {
    try {
      const updated = await updateRiderLocation();

      if (updated && isRiderVerified()) {
        await loadAvailableDeliveries();
      }
    } catch {
      // The location function already displays the error.
    }
  });

  elements.availabilityToggle?.addEventListener("click", toggleAvailability);

  bindDeliveryActions(elements.availableList);
  bindDeliveryActions(elements.assignedList);
  bindNavigation();
}

// ========================================
// INITIALIZATION
// ========================================

async function initializeDashboard() {
  bindEvents();

  if (!riderToken) {
    showSessionMessage(
      "No rider session was found in this browser. Sign in through your existing rider login page, then return to this dashboard.",
    );
    return;
  }

  try {
    await loadRiderProfile();

    if (isRiderVerified()) {
      await Promise.allSettled([
        loadAvailableDeliveries(),
        loadAssignedDeliveries(),
        loadDeliveryHistory(),
      ]);
    } else {
      renderVerificationNotice();
    }
  } catch (error) {
    console.error("Rider dashboard initialization failed:", error);
    setFeedback(error.message, "error");

    if (error.status === 401) return;

    if (elements.availableList) {
      elements.availableList.innerHTML = renderErrorState(error.message);
    }

    if (elements.assignedList) {
      elements.assignedList.innerHTML = renderErrorState(error.message);
    }
  }
}

document.addEventListener("DOMContentLoaded", initializeDashboard);
