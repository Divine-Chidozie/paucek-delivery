"use strict";

// =====================================
// Paucek Deliveries - Vendor Profile
// =====================================

// Live Render backend API
const API_URL = "https://paucek-delivery.onrender.com/api/vendors/me";

// Keep login navigation on the Vercel frontend
const LOGIN_URL = "/pages/login.html";

const profileForm = document.getElementById("profileForm");
const firstNameInput = document.getElementById("firstName");
const lastNameInput = document.getElementById("lastName");
const emailInput = document.getElementById("email");

const profileDisplayName = document.getElementById("profileDisplayName");
const profileAvatar = document.getElementById("profileAvatar");
const topAvatar = document.getElementById("topAvatar");

const formMessage = document.getElementById("formMessage");
const saveButton = document.getElementById("saveButton");
const cancelButton = document.getElementById("cancelButton");
const logoutButton = document.getElementById("logoutButton");

const memberSince = document.getElementById("memberSince");
const menuToggle = document.getElementById("menuToggle");
const sidebar = document.getElementById("sidebar");

let originalProfile = null;

// =====================================
// Helpers
// =====================================

function getToken() {
  return localStorage.getItem("paucekToken");
}

function getSavedVendor() {
  try {
    const savedVendor = localStorage.getItem("paucekVendor");
    return savedVendor ? JSON.parse(savedVendor) : null;
  } catch {
    return null;
  }
}

function saveVendorLocally(vendor) {
  localStorage.setItem("paucekVendor", JSON.stringify(vendor));
}

function getInitials(firstName, lastName) {
  const first = firstName?.trim().charAt(0) || "";
  const last = lastName?.trim().charAt(0) || "";

  return (first + last).toUpperCase() || "--";
}

function displayName(firstName, lastName) {
  return [firstName, lastName].filter(Boolean).join(" ").trim();
}

function showMessage(message, type = "info") {
  formMessage.textContent = message;
  formMessage.className = `form-message ${type}`;
  formMessage.hidden = false;
}

function clearMessage() {
  formMessage.textContent = "";
  formMessage.className = "form-message";
  formMessage.hidden = true;
}

function setLoading(isLoading) {
  saveButton.disabled = isLoading;
  cancelButton.disabled = isLoading;
  firstNameInput.disabled = isLoading;
  lastNameInput.disabled = isLoading;

  saveButton.textContent = isLoading ? "Saving..." : "Save Changes";
}

function updateProfileDisplay(vendor) {
  const firstName = vendor.firstName || "";
  const lastName = vendor.lastName || "";
  const fullName = displayName(firstName, lastName);
  const initials = getInitials(firstName, lastName);

  firstNameInput.value = firstName;
  lastNameInput.value = lastName;
  emailInput.value = vendor.email || "";

  profileDisplayName.textContent = fullName || "Vendor";
  profileAvatar.textContent = initials;
  topAvatar.textContent = initials;

  if (vendor.createdAt) {
    const date = new Date(vendor.createdAt);

    memberSince.textContent = Number.isNaN(date.getTime())
      ? "Not available"
      : date.toLocaleDateString("en-GB", {
          month: "short",
          year: "numeric",
        });
  } else {
    memberSince.textContent = "Not available";
  }
}

function redirectToLogin(message) {
  localStorage.removeItem("paucekToken");
  localStorage.removeItem("paucekVendor");

  if (message) {
    alert(message);
  }

  window.location.replace(LOGIN_URL);
}

// =====================================
// Authenticated API request
// =====================================

async function apiRequest(url, options = {}) {
  const token = getToken();

  if (!token) {
    redirectToLogin("Please log in to access your profile.");
    throw new Error("Authentication required.");
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  const responseText = await response.text();

  let data = {};

  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      throw new Error("The server returned an invalid response.");
    }
  }

  if (response.status === 401 || response.status === 403) {
    redirectToLogin("Your session has expired. Please log in again.");

    throw new Error("Your session has expired.");
  }

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong. Please try again.");
  }

  return data;
}

// =====================================
// Load vendor profile
// =====================================

async function loadProfile() {
  clearMessage();

  const cachedVendor = getSavedVendor();

  if (cachedVendor) {
    updateProfileDisplay(cachedVendor);
  }

  try {
    const data = await apiRequest(API_URL);

    // Supports either { vendor: {...} } or a direct vendor object.
    const vendor = data.vendor || data;

    if (!vendor.firstName || !vendor.lastName || !vendor.email) {
      throw new Error("The server returned incomplete profile details.");
    }

    saveVendorLocally(vendor);
    updateProfileDisplay(vendor);

    originalProfile = {
      firstName: vendor.firstName,
      lastName: vendor.lastName,
    };
  } catch (error) {
    if (
      error.message === "Authentication required." ||
      error.message === "Your session has expired."
    ) {
      return;
    }

    console.error("Profile loading error:", error);

    showMessage(
      cachedVendor
        ? "Unable to refresh your profile from the server. Displaying your last saved details."
        : error.message || "Unable to load your profile.",
      "error",
    );
  }
}

// =====================================
// Save profile changes
// =====================================

profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessage();

  const firstName = firstNameInput.value.trim();
  const lastName = lastNameInput.value.trim();

  if (firstName.length < 2 || lastName.length < 2) {
    showMessage(
      "First name and last name must each contain at least two characters.",
      "error",
    );
    return;
  }

  if (firstName.length > 50 || lastName.length > 50) {
    showMessage("Names cannot be longer than 50 characters.", "error");
    return;
  }

  const currentVendor = getSavedVendor() || {};

  if (
    firstName === currentVendor.firstName &&
    lastName === currentVendor.lastName
  ) {
    showMessage("There are no changes to save.", "info");
    return;
  }

  setLoading(true);

  try {
    const data = await apiRequest(API_URL, {
      method: "PATCH",
      body: JSON.stringify({
        firstName,
        lastName,
      }),
    });

    const updatedVendor = data.vendor || {
      ...currentVendor,
      firstName,
      lastName,
    };

    // Keep the server response as the source of truth.
    saveVendorLocally(updatedVendor);
    updateProfileDisplay(updatedVendor);

    originalProfile = {
      firstName: updatedVendor.firstName,
      lastName: updatedVendor.lastName,
    };

    showMessage(
      data.message || "Your profile has been updated successfully.",
      "success",
    );
  } catch (error) {
    if (
      error.message === "Authentication required." ||
      error.message === "Your session has expired."
    ) {
      return;
    }

    console.error("Profile update error:", error);

    showMessage(
      error.message || "Unable to save your changes. Please try again.",
      "error",
    );
  } finally {
    setLoading(false);
  }
});

// =====================================
// Cancel unsaved changes
// =====================================

cancelButton.addEventListener("click", () => {
  clearMessage();

  if (originalProfile) {
    firstNameInput.value = originalProfile.firstName;
    lastNameInput.value = originalProfile.lastName;
  } else {
    profileForm.reset();
  }
});

// =====================================
// Log out
// =====================================

logoutButton.addEventListener("click", () => {
  const confirmed = window.confirm("Are you sure you want to log out?");

  if (!confirmed) return;

  localStorage.removeItem("paucekToken");
  localStorage.removeItem("paucekVendor");

  window.location.replace(LOGIN_URL);
});

// =====================================
// Mobile sidebar
// =====================================

menuToggle.addEventListener("click", () => {
  const isOpen = sidebar.classList.toggle("open");

  menuToggle.setAttribute("aria-expanded", String(isOpen));
});

document.addEventListener("click", (event) => {
  if (
    window.innerWidth <= 700 &&
    sidebar.classList.contains("open") &&
    !sidebar.contains(event.target) &&
    !menuToggle.contains(event.target)
  ) {
    sidebar.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
  }
});
r
// =====================================
// Footer year
// =====================================

document.getElementById("currentYear").textContent = new Date().getFullYear();

// =====================================
// Start the page
// =====================================

loadProfile();
