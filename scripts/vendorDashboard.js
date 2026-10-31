document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("paucekToken");
  const vendorData = localStorage.getItem("paucekVendor");

  // Require a saved login session.
  if (!token || !vendorData) {
    window.location.replace("/pages/login.html");
    return;
  }

  let vendor;

  try {
    vendor = JSON.parse(vendorData);
  } catch {
    localStorage.removeItem("paucekToken");
    localStorage.removeItem("paucekVendor");
    window.location.replace("/pages/login.html");
    return;
  }

  // Personalise the greeting.
  const greeting = document.querySelector(".vendor-greeting");
  const hour = new Date().getHours();

  const timeGreeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  greeting.textContent = `${timeGreeting}, ${vendor.firstName || "Vendor"}!`;

  // Load existing browser-saved delivery records.
  let deliveries = [];

  try {
    const savedDeliveries = JSON.parse(
      localStorage.getItem("paucekDeliveries") || "[]",
    );

    if (Array.isArray(savedDeliveries)) {
      deliveries = savedDeliveries;
    }
  } catch (error) {
    console.error("Unable to read delivery records:", error);
  }

  function getStatus(delivery) {
    return String(delivery.status || "Pending")
      .trim()
      .toLowerCase()
      .replace(/[_-]+/g, " ");
  }

  // Update the summary cards.
  document.getElementById("total-count").textContent = deliveries.length;

  document.getElementById("transit-count").textContent = deliveries.filter(
    (delivery) => getStatus(delivery) === "in transit",
  ).length;

  document.getElementById("delivered-count").textContent = deliveries.filter(
    (delivery) => getStatus(delivery) === "delivered",
  ).length;

  document.getElementById("pending-count").textContent = deliveries.filter(
    (delivery) => getStatus(delivery) === "pending",
  ).length;

  // Safely create text elements without injecting HTML from stored data.
  function addText(parent, tag, className, value) {
    const element = document.createElement(tag);

    if (className) {
      element.className = className;
    }

    element.textContent = value;
    parent.appendChild(element);

    return element;
  }

  function getFirstValue(delivery, keys, fallback) {
    for (const key of keys) {
      if (typeof delivery[key] === "string" && delivery[key].trim()) {
        return delivery[key].trim();
      }
    }

    return fallback;
  }

  function getStatusClass(status) {
    if (status === "delivered") return "del-delivered";
    if (status === "in transit") return "del-transit";
    if (status === "pending") return "del-pending";
    return "";
  }

  function titleCase(value) {
    return value.replace(/\b\w/g, (character) => character.toUpperCase());
  }

  const recentContainer = document.getElementById("recent-deliveries");

  if (deliveries.length === 0) {
    addText(
      recentContainer,
      "p",
      "recent-deliveries-description",
      "No deliveries yet. Create your first delivery to get started.",
    );
  } else {
    // Show the newest three records first.
    deliveries
      .slice()
      .reverse()
      .slice(0, 3)
      .forEach((delivery, index) => {
        const card = document.createElement("article");
        card.className = "delivery-card";

        const cardTop = document.createElement("div");
        cardTop.className = "delivery-card-top";

        const details = document.createElement("div");

        const deliveryId = getFirstValue(
          delivery,
          ["deliveryId", "trackingNumber", "id", "_id"],
          `Delivery ${deliveries.length - index}`,
        );

        addText(details, "p", "delivery-id", deliveryId);

        addText(
          details,
          "h3",
          "customer-name",
          getFirstValue(
            delivery,
            ["recipientName", "customerName", "receiverName"],
            "Delivery recipient",
          ),
        );

        cardTop.appendChild(details);

        const status = getStatus(delivery);

        const statusBadge = addText(
          cardTop,
          "span",
          `delivery-status ${getStatusClass(status)}`.trim(),
          titleCase(status),
        );

        card.appendChild(cardTop);

        const route = document.createElement("div");
        route.className = "delivery-route";

        addText(route, "span", "route-icon", "●");

        addText(
          route,
          "span",
          "",
          getFirstValue(
            delivery,
            ["pickupAddress", "pickupLocation", "pickup"],
            "Pickup address unavailable",
          ),
        );

        addText(route, "span", "route-line", "");

        addText(route, "span", "route-icon destination", "●");

        addText(
          route,
          "span",
          "",
          getFirstValue(
            delivery,
            [
              "destinationAddress",
              "deliveryAddress",
              "destination",
              "dropoffAddress",
            ],
            "Destination unavailable",
          ),
        );

        card.appendChild(route);
        recentContainer.appendChild(card);
      });
  }

  // Notifications are not connected yet.
  document
    .getElementById("notificationButton")
    .addEventListener("click", () => {
      alert("Notifications are not available yet.");
    });
});
