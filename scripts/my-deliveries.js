document.addEventListener("DOMContentLoaded", () => {
  const API_URL = "/api/deliveries";
  const PAGE_SIZE = 6;
  const TOKEN_KEY = "paucekToken";

  const deliveriesList = document.getElementById("deliveries-list");
  const emptyState = document.getElementById("empty-state");
  const emptyTitle = document.getElementById("empty-title");
  const emptyDescription = document.getElementById("empty-description");
  const searchInput = document.getElementById("delivery-search");
  const statusFilter = document.getElementById("status-filter");
  const dateFilter = document.getElementById("date-filter");
  const refreshButton = document.getElementById("refresh-button");
  const feedbackMessage = document.getElementById("feedback-message");
  const pagination = document.getElementById("pagination");
  const paginationSummary = document.getElementById("pagination-summary");

  const counts = {
    total: document.getElementById("total-count"),
    delivered: document.getElementById("delivered-count"),
    transit: document.getElementById("transit-count"),
    cancelled: document.getElementById("cancelled-count"),
  };

  let deliveries = [];
  let currentPage = 1;
  let loading = false;

  const requiredElements = [
    deliveriesList,
    emptyState,
    emptyTitle,
    emptyDescription,
    searchInput,
    statusFilter,
    dateFilter,
    refreshButton,
    feedbackMessage,
    pagination,
    paginationSummary,
    counts.total,
    counts.delivered,
    counts.transit,
    counts.cancelled,
  ];

  if (requiredElements.some((element) => !element)) {
    console.error("My Deliveries: required HTML elements are missing.");
    return;
  }

  function showMessage(message, type = "error") {
    feedbackMessage.textContent = message;
    feedbackMessage.dataset.type = type;
    feedbackMessage.hidden = !message;
  }

  function getStatus(delivery) {
    return typeof delivery.status === "string" && delivery.status.trim()
      ? delivery.status.trim()
      : "Pending";
  }

  function statusClass(status) {
    const classes = {
      Pending: "status-pending",
      Assigned: "status-assigned",
      "Picked Up": "status-picked-up",
      "In Transit": "status-in-transit",
      Delivered: "status-delivered",
      Failed: "status-failed",
      Cancelled: "status-cancelled",
    };

    return classes[status] || "status-pending";
  }

  function dateValue(value) {
    if (!value) return null;

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  function formatDate(value) {
    const date = dateValue(value);

    if (!date) {
      return { day: "Date unavailable", time: "" };
    }

    return {
      day: date.toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      time: date.toLocaleTimeString("en-NG", {
        hour: "numeric",
        minute: "2-digit",
      }),
    };
  }

  function make(tag, className, text) {
    const element = document.createElement(tag);

    if (className) {
      element.className = className;
    }

    if (text !== undefined && text !== null) {
      element.textContent = String(text);
    }

    return element;
  }

  function getTrackingNumber(delivery) {
    return typeof delivery.trackingNumber === "string"
      ? delivery.trackingNumber.trim().toUpperCase()
      : "";
  }

  function formatMoney(value) {
    if (value === undefined || value === null || value === "") {
      return "Not available";
    }

    const amount = Number(value);

    if (!Number.isFinite(amount)) {
      return "Not available";
    }

    return (
      "₦" +
      amount.toLocaleString("en-NG", {
        maximumFractionDigits: 2,
      })
    );
  }

  function formatDistance(value) {
    if (value === undefined || value === null || value === "") {
      return "Not available";
    }

    const distance = Number(value);

    if (!Number.isFinite(distance)) {
      return "Not available";
    }

    return (
      distance.toLocaleString("en-NG", {
        maximumFractionDigits: 2,
      }) + " km"
    );
  }

  function formatDuration(value) {
    if (value === undefined || value === null || value === "") {
      return "Not available";
    }

    return String(value) + " minutes";
  }

  async function copyTrackingNumber(trackingNumber, button) {
    try {
      if (!navigator.clipboard || !window.isSecureContext) {
        throw new Error("Clipboard unavailable");
      }

      await navigator.clipboard.writeText(trackingNumber);

      const previousText = button.textContent;
      button.textContent = "Copied!";

      showMessage("Tracking number copied: " + trackingNumber, "success");

      setTimeout(() => {
        button.textContent = previousText;
      }, 1500);
    } catch {
      showMessage(
        "Copy failed. Copy this tracking number manually: " + trackingNumber,
      );
    }
  }

  function createTrackingCell(delivery) {
    const cell = make("td", "tracking-cell");
    const trackingNumber = getTrackingNumber(delivery);

    if (!trackingNumber) {
      cell.append(
        make("span", "tracking-number-missing", "Not assigned"),
        make("small", "tracking-help", "Tracking number unavailable"),
      );

      return cell;
    }

    const number = make("strong", "tracking-number", trackingNumber);

    const actions = make("div", "tracking-actions");

    const copyButton = make("button", "tracking-copy-button", "Copy");

    copyButton.type = "button";
    copyButton.setAttribute(
      "aria-label",
      "Copy tracking number " + trackingNumber,
    );

    copyButton.addEventListener("click", () => {
      copyTrackingNumber(trackingNumber, copyButton);
    });

    const trackLink = make("a", "tracking-open-link", "Track package");

    trackLink.href =
      "/pages/track-package.html?trackingNumber=" +
      encodeURIComponent(trackingNumber);

    actions.append(copyButton, trackLink);
    cell.append(number, actions);

    return cell;
  }

  function createDetailsRow(delivery) {
    const row = make("tr", "details-row");
    const cell = make("td");

    cell.colSpan = 6;

    const grid = make("div", "details-content");

    const fields = [
      ["Tracking number", getTrackingNumber(delivery) || "Not assigned"],
      ["Recipient", delivery.recipientName],
      ["Recipient phone", delivery.recipientPhone],
      ["Pickup contact", delivery.pickupContactName],
      ["Pickup phone", delivery.pickupPhone],
      ["Pickup address", delivery.pickupAddress],
      ["Delivery address", delivery.deliveryAddress],
      ["Package description", delivery.packageDescription],
      ["Package size", delivery.packageSize],
      ["Distance", formatDistance(delivery.distanceKm)],
      [
        "Estimated driving time",
        formatDuration(delivery.estimatedDurationMinutes),
      ],
      [
        "Estimated fee",
        formatMoney(
          delivery.estimatedFee ??
            delivery.deliveryFee ??
            delivery.fee ??
            delivery.totalFee,
        ),
      ],
      ["Additional directions", delivery.additionalDirections],
      ["Special instructions", delivery.specialInstructions],
    ];

    fields.forEach(([label, value]) => {
      const item = make("div", "detail-item");

      item.append(
        make("span", "detail-label", label.toUpperCase()),
        make("div", "detail-value", value || "Not provided"),
      );

      grid.append(item);
    });

    cell.append(grid);
    row.append(cell);

    return row;
  }

  function createDeliveryRows(delivery) {
    const row = make("tr", "delivery-row");

    const trackingCell = createTrackingCell(delivery);

    const recipientCell = make("td");

    recipientCell.append(
      make(
        "span",
        "recipient-name",
        delivery.recipientName || "Recipient not provided",
      ),
    );

    if (delivery.recipientPhone) {
      recipientCell.append(
        make("span", "recipient-phone", delivery.recipientPhone),
      );
    }

    const destinationCell = make("td", "destination-cell");

    destinationCell.append(
      make("span", "destination-pin", "●"),
      document.createTextNode(
        delivery.deliveryAddress || "Address not provided",
      ),
    );

    const status = getStatus(delivery);
    const statusCell = make("td");

    statusCell.append(
      make("span", "status-badge " + statusClass(status), status),
    );

    const date = formatDate(
      delivery.createdAt || delivery.created_at || delivery.date,
    );

    const dateCell = make("td", "date-cell");

    dateCell.append(make("span", "", date.day));

    if (date.time) {
      dateCell.append(
        document.createElement("br"),
        make("span", "", date.time),
      );
    }

    const actionCell = make("td", "action-cell");
    const actionButton = make("button", "row-action", "View");

    actionButton.type = "button";
    actionButton.setAttribute("aria-expanded", "false");
    actionButton.setAttribute(
      "aria-label",
      "View details for " + (getTrackingNumber(delivery) || "this delivery"),
    );

    actionCell.append(actionButton);

    row.append(
      trackingCell,
      recipientCell,
      destinationCell,
      statusCell,
      dateCell,
      actionCell,
    );

    const detailsRow = createDetailsRow(delivery);
    detailsRow.hidden = true;

    actionButton.addEventListener("click", () => {
      const opening = detailsRow.hidden;

      detailsRow.hidden = !opening;
      actionButton.setAttribute("aria-expanded", String(opening));
      actionButton.textContent = opening ? "Hide" : "View";
    });

    return [row, detailsRow];
  }

  async function readDeliveries() {
    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) {
      deliveries = [];
      updateSummary();
      renderDeliveries();

      showMessage("Your session has expired. Please log in again.");
      window.location.href = "/pages/login.html";

      return false;
    }

    try {
      showMessage("");
      refreshButton.disabled = true;

      const response = await fetch(API_URL, {
        method: "GET",
        headers: {
          Authorization: "Bearer " + token,
          Accept: "application/json",
        },
      });

      let result;

      try {
        result = await response.json();
      } catch {
        throw new Error("The server returned an invalid response.");
      }

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("paucekToken");
        localStorage.removeItem("paucekVendor");

        deliveries = [];
        updateSummary();
        renderDeliveries();

        showMessage("Your session has expired. Please log in again.");
        window.location.href = "/pages/login.html";

        return false;
      }

      if (!response.ok) {
        throw new Error(result.message || "Unable to load your deliveries.");
      }

      const records = Array.isArray(result) ? result : result.deliveries;

      if (!Array.isArray(records)) {
        throw new Error("The server did not return a valid deliveries list.");
      }

      deliveries = records.filter(
        (item) => item && typeof item === "object" && !Array.isArray(item),
      );

      updateSummary();
      currentPage = 1;
      renderDeliveries();

      const withoutTracking = deliveries.filter(
        (delivery) => !getTrackingNumber(delivery),
      ).length;

      if (withoutTracking > 0) {
        showMessage(
          withoutTracking +
            " delivery record(s) do not have a tracking number yet.",
          "info",
        );
      }

      return true;
    } catch (error) {
      console.error("Could not load deliveries:", error);

      deliveries = [];
      updateSummary();
      renderDeliveries();

      showMessage(
        error.message === "Failed to fetch"
          ? "Could not connect to Paucek. Check that the server is running and MongoDB is connected."
          : error.message || "Could not load deliveries. Please try again.",
      );

      return false;
    } finally {
      refreshButton.disabled = false;
    }
  }

  function updateSummary() {
    counts.total.textContent = deliveries.length;

    counts.delivered.textContent = deliveries.filter(
      (delivery) => getStatus(delivery) === "Delivered",
    ).length;

    counts.transit.textContent = deliveries.filter((delivery) =>
      ["Picked Up", "In Transit"].includes(getStatus(delivery)),
    ).length;

    counts.cancelled.textContent = deliveries.filter(
      (delivery) => getStatus(delivery) === "Cancelled",
    ).length;
  }

  function filteredDeliveries() {
    const term = searchInput.value.trim().toLowerCase();
    const chosenStatus = statusFilter.value;

    const days = dateFilter.value === "all" ? null : Number(dateFilter.value);

    const cutoff = days ? new Date(Date.now() - days * 86400000) : null;

    return deliveries.filter((delivery) => {
      const fields = [
        delivery._id,
        delivery.id,
        delivery.trackingNumber,
        delivery.recipientName,
        delivery.recipientPhone,
        delivery.pickupContactName,
        delivery.pickupPhone,
        delivery.pickupAddress,
        delivery.deliveryAddress,
        delivery.packageDescription,
        delivery.status,
      ];

      const matchesTerm = fields.some((field) =>
        String(field || "")
          .toLowerCase()
          .includes(term),
      );

      const matchesStatus =
        chosenStatus === "all" || getStatus(delivery) === chosenStatus;

      const date = dateValue(
        delivery.createdAt || delivery.created_at || delivery.date,
      );

      const matchesDate = !cutoff || (date && date >= cutoff);

      return matchesTerm && matchesStatus && matchesDate;
    });
  }

  function renderPagination(totalPages) {
    pagination.replaceChildren();

    if (totalPages <= 1) return;

    function addButton(label, page, disabled, active, ariaLabel) {
      const button = make(
        "button",
        "page-button" + (active ? " active" : ""),
        label,
      );

      button.type = "button";
      button.disabled = disabled;
      button.setAttribute("aria-label", ariaLabel || label);

      if (active) {
        button.setAttribute("aria-current", "page");
      }

      button.addEventListener("click", () => {
        currentPage = page;
        renderDeliveries();
      });

      pagination.append(button);
    }

    addButton(
      "‹",
      Math.max(1, currentPage - 1),
      currentPage === 1,
      false,
      "Previous page",
    );

    const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));

    const end = Math.min(totalPages, Math.max(5, currentPage + 2));

    for (let page = start; page <= end; page++) {
      addButton(
        String(page),
        page,
        false,
        page === currentPage,
        "Page " + page,
      );
    }

    addButton(
      "›",
      Math.min(totalPages, currentPage + 1),
      currentPage === totalPages,
      false,
      "Next page",
    );
  }

  function renderDeliveries() {
    deliveriesList.replaceChildren();
    pagination.replaceChildren();

    const filtered = filteredDeliveries();

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

    currentPage = Math.min(currentPage, totalPages);

    if (filtered.length === 0) {
      emptyState.hidden = false;

      emptyTitle.textContent = deliveries.length
        ? "No matching deliveries"
        : "No deliveries yet";

      emptyDescription.textContent = deliveries.length
        ? "Try another search term, status, or date range."
        : "Your delivery requests will appear here once you create your first delivery.";

      paginationSummary.textContent = "Showing 0 deliveries";
      return;
    }

    emptyState.hidden = true;

    const start = (currentPage - 1) * PAGE_SIZE;
    const visible = filtered.slice(start, start + PAGE_SIZE);

    visible.forEach((delivery) => {
      createDeliveryRows(delivery).forEach((row) => {
        deliveriesList.append(row);
      });
    });

    paginationSummary.textContent =
      "Showing " +
      (start + 1) +
      "–" +
      Math.min(start + PAGE_SIZE, filtered.length) +
      " of " +
      filtered.length +
      " deliveries";

    renderPagination(totalPages);
  }

  function updateAccount() {
    try {
      const vendor = JSON.parse(localStorage.getItem("paucekVendor") || "null");

      if (!vendor) return;

      const name =
        vendor.name ||
        vendor.fullName ||
        [vendor.firstName, vendor.lastName].filter(Boolean).join(" ") ||
        vendor.businessName ||
        vendor.email;

      const accountName = document.getElementById("account-name");
      const accountAvatar = document.getElementById("account-avatar");

      if (name && accountName) {
        accountName.textContent = name;
      }

      if (name && accountAvatar) {
        accountAvatar.textContent =
          name
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part[0])
            .join("")
            .toUpperCase() || "V";
      }
    } catch (error) {
      console.warn("Could not read vendor profile:", error);
    }
  }

  async function refreshPage() {
    if (loading) return;

    loading = true;
    refreshButton.disabled = true;

    try {
      updateAccount();
      await readDeliveries();
    } finally {
      loading = false;
      refreshButton.disabled = false;
    }
  }

  searchInput.addEventListener("input", () => {
    currentPage = 1;
    renderDeliveries();
  });

  statusFilter.addEventListener("change", () => {
    currentPage = 1;
    renderDeliveries();
  });

  dateFilter.addEventListener("change", () => {
    currentPage = 1;
    renderDeliveries();
  });

  refreshButton.addEventListener("click", refreshPage);
  window.addEventListener("focus", refreshPage);

  const menuButton = document.getElementById("menu-button");
  const sidebar = document.querySelector(".sidebar");

  if (menuButton && sidebar) {
    menuButton.addEventListener("click", () => {
      sidebar.classList.toggle("sidebar-open");
    });
  }

  updateAccount();
  refreshPage();
});
