const trackingForm = document.getElementById("trackingForm");
const trackingInput = document.getElementById("trackingNumber");
const trackButton = document.getElementById("trackButton");
const message = document.getElementById("message");
const result = document.getElementById("result");

// Prefill the tracking number when opened from My Deliveries.
const params = new URLSearchParams(window.location.search);
const suppliedTrackingNumber = params.get("trackingNumber");

if (suppliedTrackingNumber) {
  trackingInput.value = suppliedTrackingNumber.trim().toUpperCase();
}

function formatDate(value) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleString("en-NG");
}

function formatDistance(value) {
  if (value === undefined || value === null || value === "") {
    return "Not available";
  }

  return String(value) + " km";
}

function formatDuration(value) {
  if (value === undefined || value === null || value === "") {
    return "Not available";
  }

  return String(value) + " minutes";
}

trackingForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const trackingNumber = trackingInput.value.trim().toUpperCase();

  if (!/^PAU-[A-F0-9]{8}$/.test(trackingNumber)) {
    message.textContent =
      "Enter a valid tracking number, for example PAU-7A2C91BF.";
    result.hidden = true;
    return;
  }

  trackButton.disabled = true;
  trackButton.textContent = "Tracking...";
  message.textContent = "";
  result.hidden = true;

  try {
    const response = await fetch(
      "/api/track/" + encodeURIComponent(trackingNumber),
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to find this package.");
    }

    const tracking = data.tracking;

    document.getElementById("resultTrackingNumber").textContent =
      tracking.trackingNumber || trackingNumber;

    document.getElementById("resultStatus").textContent =
      tracking.status || "Not available";

    document.getElementById("resultCreatedAt").textContent = formatDate(
      tracking.createdAt,
    );

    document.getElementById("resultDistance").textContent = formatDistance(
      tracking.distanceKm,
    );

    document.getElementById("resultDuration").textContent = formatDuration(
      tracking.estimatedDurationMinutes,
    );

    document.getElementById("resultUpdatedAt").textContent = formatDate(
      tracking.updatedAt,
    );

    result.hidden = false;
    message.textContent = "Tracking information retrieved successfully.";
  } catch (error) {
    message.textContent =
      error.message ||
      "Unable to retrieve tracking information. Please try again.";
  } finally {
    trackButton.disabled = false;
    trackButton.textContent = "Track Package";
  }
});
