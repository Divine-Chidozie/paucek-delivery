document.addEventListener("DOMContentLoaded", () => {
  const API_URL = "/api/addresses";
  const TOKEN_KEY = "paucekToken";

  const form = document.getElementById("address-form");
  const formPanel = document.getElementById("address-form-panel");
  const formTitle = document.getElementById("form-title");
  const saveButton = document.getElementById("save-button");
  const labelSelect = document.getElementById("label");
  const customLabelField = document.getElementById("custom-label-field");
  const customLabelInput = document.getElementById("customLabel");

  const addressesGrid = document.getElementById("addresses-grid");
  const addressCount = document.getElementById("address-count");
  const loadingState = document.getElementById("loading-state");
  const emptyState = document.getElementById("empty-state");
  const feedbackMessage = document.getElementById("feedback-message");

  const deleteModal = document.getElementById("delete-modal");
  const confirmDeleteButton = document.getElementById("confirm-delete-button");

  let addresses = [];
  let editingId = null;
  let deletingId = null;
  let loading = false;
  let saving = false;
  let deleting = false;
  let feedbackTimer = null;

  document.getElementById("current-year").textContent =
    new Date().getFullYear();

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };

      return entities[character];
    });
  }

  function showFeedback(message, type = "success") {
    clearTimeout(feedbackTimer);

    feedbackMessage.textContent = message;
    feedbackMessage.className = `feedback ${type}`;
    feedbackMessage.hidden = false;

    feedbackTimer = setTimeout(() => {
      feedbackMessage.hidden = true;
    }, 6000);

    feedbackMessage.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }

  function getLabel(address) {
    return address.label === "Custom"
      ? address.customLabel || "Custom"
      : address.label;
  }

  function getLabelIcon(label) {
    const icons = {
      Home: "⌂",
      Office: "▤",
      Warehouse: "▦",
      Custom: "⌖",
    };

    return icons[label] || "⌖";
  }

  async function apiRequest(url, options = {}) {
    const token = getToken();

    if (!token) {
      localStorage.removeItem("paucekVendor");
      window.location.href = "/pages/login.html";
      throw new Error("Your session has expired. Please log in again.");
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });

    let data = {};

    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem("paucekVendor");
      window.location.href = "/pages/login.html";

      throw new Error("Your session has expired. Please log in again.");
    }

    if (!response.ok) {
      throw new Error(data.message || "The request could not be completed.");
    }

    return data;
  }

  function setLoading(isLoading) {
    loading = isLoading;
    loadingState.hidden = !isLoading;

    document.getElementById("refresh-button").disabled = isLoading;
  }

  function renderAddresses() {
    addressCount.textContent = String(addresses.length);
    addressesGrid.replaceChildren();

    emptyState.hidden = loading || addresses.length > 0;
    addressesGrid.hidden = addresses.length === 0;

    addresses.forEach((address) => {
      const card = document.createElement("article");
      card.className = "address-card";

      const displayLabel = getLabel(address);
      const icon = getLabelIcon(address.label);
      const date = address.updatedAt
        ? new Date(address.updatedAt).toLocaleDateString()
        : "";

      card.innerHTML = `
        <div class="address-card-top">
          <span class="address-label">
            <span>${icon}</span>
            ${escapeHTML(displayLabel)}
          </span>
          <span class="address-date">
            ${date ? `Updated ${escapeHTML(date)}` : ""}
          </span>
        </div>

        <h3 class="address-contact">
          ${escapeHTML(address.contactName)}
        </h3>

        <p class="address-phone">
          ${escapeHTML(address.phone)}
        </p>

        <p class="address-location">
          ${escapeHTML(address.address)}
        </p>

        ${
          address.additionalDirections
            ? `<div class="address-directions">
                <strong>Directions:</strong>
                ${escapeHTML(address.additionalDirections)}
              </div>`
            : ""
        }

        <div class="address-card-actions">
          <button type="button" data-action="edit" data-id="${escapeHTML(address._id)}">
            Edit address
          </button>
          <button type="button" class="delete-address" data-action="delete" data-id="${escapeHTML(address._id)}">
            Delete
          </button>
        </div>
      `;

      addressesGrid.appendChild(card);
    });
  }

  async function loadAddresses() {
    if (loading) return;

    setLoading(true);

    try {
      const data = await apiRequest(API_URL);

      addresses = Array.isArray(data.addresses) ? data.addresses : [];

      renderAddresses();
    } catch (error) {
      if (getToken()) {
        showFeedback(
          error.message || "Could not load saved addresses.",
          "error",
        );
      }
    } finally {
      setLoading(false);
      renderAddresses();
    }
  }

  function openForm(address = null) {
    editingId = address?._id || null;

    form.reset();

    labelSelect.value = address?.label || "Home";
    document.getElementById("contactName").value = address?.contactName || "";
    document.getElementById("phone").value = address?.phone || "";
    document.getElementById("address").value = address?.address || "";
    customLabelInput.value = address?.customLabel || "";
    document.getElementById("additionalDirections").value =
      address?.additionalDirections || "";

    updateCustomLabelField();

    formTitle.textContent = editingId
      ? "Edit saved address"
      : "Add a saved address";

    saveButton.textContent = editingId ? "Update address" : "Save address";

    formPanel.hidden = false;

    formPanel.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    document.getElementById("contactName").focus({
      preventScroll: true,
    });
  }

  function closeForm() {
    if (saving) return;

    formPanel.hidden = true;
    form.reset();
    editingId = null;
    updateCustomLabelField();
  }

  function updateCustomLabelField() {
    const isCustom = labelSelect.value === "Custom";

    customLabelField.hidden = !isCustom;
    customLabelInput.required = isCustom;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (saving) return;

    if (!form.reportValidity()) return;

    const payload = {
      label: labelSelect.value,
      customLabel:
        labelSelect.value === "Custom" ? customLabelInput.value.trim() : "",
      contactName: document.getElementById("contactName").value.trim(),
      phone: document.getElementById("phone").value.trim(),
      address: document.getElementById("address").value.trim(),
      additionalDirections: document
        .getElementById("additionalDirections")
        .value.trim(),
    };

    saving = true;
    saveButton.disabled = true;
    saveButton.textContent = editingId ? "Updating..." : "Saving...";

    try {
      if (editingId) {
        await apiRequest(`${API_URL}/${encodeURIComponent(editingId)}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });

        showFeedback("Saved address updated successfully.");
      } else {
        await apiRequest(API_URL, {
          method: "POST",
          body: JSON.stringify(payload),
        });

        showFeedback("Address saved successfully.");
      }

      formPanel.hidden = true;
      form.reset();
      editingId = null;
      updateCustomLabelField();

      await loadAddresses();
    } catch (error) {
      showFeedback(error.message || "Unable to save the address.", "error");
    } finally {
      saving = false;
      saveButton.disabled = false;
      saveButton.textContent = editingId ? "Update address" : "Save address";
    }
  }

  function openDeleteModal(id) {
    const address = addresses.find((item) => item._id === id);

    if (!address) return;

    deletingId = id;
    deleteModal.hidden = false;
    confirmDeleteButton.disabled = false;
    confirmDeleteButton.textContent = "Delete address";
  }

  function closeDeleteModal() {
    if (deleting) return;

    deleteModal.hidden = true;
    deletingId = null;
  }

  async function confirmDelete() {
    if (!deletingId || deleting) return;

    deleting = true;
    confirmDeleteButton.disabled = true;
    confirmDeleteButton.textContent = "Deleting...";

    try {
      await apiRequest(`${API_URL}/${encodeURIComponent(deletingId)}`, {
        method: "DELETE",
      });

      deleteModal.hidden = true;
      deletingId = null;

      showFeedback("Address deleted successfully.");

      await loadAddresses();
    } catch (error) {
      showFeedback(error.message || "Unable to delete this address.", "error");
    } finally {
      deleting = false;
      confirmDeleteButton.disabled = false;
      confirmDeleteButton.textContent = "Delete address";
    }
  }

  function updateAccount() {
    const vendor = localStorage.getItem("paucekVendor");

    if (!vendor) return;

    try {
      const account = JSON.parse(vendor);
      const name = [account.firstName, account.lastName]
        .filter(Boolean)
        .join(" ");

      if (name) {
        document.getElementById("account-name").textContent = name;
        document.getElementById("account-avatar").textContent = name
          .charAt(0)
          .toUpperCase();
      }
    } catch {
      // Keep the default account display if the stored profile is invalid.
    }
  }

  document
    .getElementById("add-address-button")
    .addEventListener("click", () => {
      openForm();
    });

  document.getElementById("empty-add-button").addEventListener("click", () => {
    openForm();
  });

  document
    .getElementById("close-form-button")
    .addEventListener("click", closeForm);
  document.getElementById("cancel-button").addEventListener("click", closeForm);

  labelSelect.addEventListener("change", updateCustomLabelField);
  form.addEventListener("submit", handleSubmit);

  document
    .getElementById("refresh-button")
    .addEventListener("click", loadAddresses);

  addressesGrid.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");

    if (!button) return;

    const { action, id } = button.dataset;

    if (action === "edit") {
      const address = addresses.find((item) => item._id === id);

      if (address) openForm(address);
    }

    if (action === "delete") {
      openDeleteModal(id);
    }
  });

  confirmDeleteButton.addEventListener("click", confirmDelete);

  document
    .getElementById("cancel-delete-button")
    .addEventListener("click", closeDeleteModal);

  deleteModal.addEventListener("click", (event) => {
    if (event.target === deleteModal) {
      closeDeleteModal();
    }
  });

  document.getElementById("menu-button").addEventListener("click", () => {
    const sidebar = document.getElementById("sidebar");
    const isOpen = sidebar.classList.toggle("open");

    document
      .getElementById("menu-button")
      .setAttribute("aria-expanded", String(isOpen));
  });

  document.getElementById("logout-button").addEventListener("click", () => {
    localStorage.removeItem("paucekToken");
    localStorage.removeItem("paucekVendor");
    window.location.href = "/pages/login.html";
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (!deleteModal.hidden) {
        closeDeleteModal();
      } else if (!formPanel.hidden) {
        closeForm();
      }
    }
  });

  updateAccount();
  updateCustomLabelField();
  loadAddresses();
});
