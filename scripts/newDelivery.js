document.addEventListener("DOMContentLoaded", () => {
  // Form elements
  const deliveryForm = document.getElementById("delivery-form");
  const formMessage = document.getElementById("form-message");
  const quoteMessage = document.getElementById("quote-message");
  const quoteSection = document.getElementById("quote-section");

  const confirmButton = document.getElementById("confirm-delivery-btn");
  const editButton = document.getElementById("edit-delivery-btn");
  const submitButton = document.getElementById("create-delivery-btn");

  const pickupAddressInput = document.getElementById("pickup-address");
  const deliveryAddressInput = document.getElementById("delivery-address");

  // Backend configuration
  const API_URL = "/api/deliveries";
  const LOGIN_URL = "/pages/login.html";
  const TOKEN_KEY = "paucekToken";

  // Google Maps configuration
  const GOOGLE_MAPS_API_KEY = "AIzaSyDKIOYAWY1j7NtPJmFrBspEZO5WgQpgWgI";

  // Temporary test prices — not Paucek's final rates.
  const BASE_FEE = 1000;
  const RATE_PER_KM = 200;
  const MINIMUM_FEE = 1500;

  let pickupPlace = null;
  let destinationPlace = null;
  let quoteData = null;
  let mapsInitializationPromise = null;
  let isSaving = false;

  if (!deliveryForm) {
    console.error("Delivery form not found.");
    return;
  }

  if (
    !formMessage ||
    !quoteMessage ||
    !quoteSection ||
    !confirmButton ||
    !editButton ||
    !submitButton ||
    !pickupAddressInput ||
    !deliveryAddressInput
  ) {
    console.error("One or more delivery form elements are missing.");
    return;
  }

  const currencyFormatter = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  });

  function showFormMessage(message) {
    formMessage.textContent = message;
  }

  function showQuoteMessage(message) {
    quoteMessage.textContent = message;
  }

  function setQuoteButtonLoading(isLoading) {
    submitButton.disabled = isLoading;
    submitButton.textContent = isLoading
      ? "Calculating quote..."
      : "Calculate Delivery Quote";
  }

  function setConfirmButtonLoading(isLoading) {
    confirmButton.disabled = isLoading;
    confirmButton.textContent = isLoading
      ? "Saving delivery..."
      : "Confirm Delivery";
  }

  // Load Google Maps JavaScript API.
  async function loadGoogleMaps() {
    if (
      !GOOGLE_MAPS_API_KEY ||
      GOOGLE_MAPS_API_KEY === "YOUR_RESTRICTED_GOOGLE_MAPS_API_KEY"
    ) {
      throw new Error(
        "Add your restricted Google Maps API key in scripts/newDelivery.js.",
      );
    }

    if (window.google?.maps?.importLibrary) {
      return;
    }

    if (mapsInitializationPromise) {
      return mapsInitializationPromise;
    }

    mapsInitializationPromise = new Promise((resolve, reject) => {
      const callbackName = "__paucekGoogleMapsReady";

      const existingScript = document.querySelector(
        'script[src*="maps.googleapis.com/maps/api/js"]',
      );

      if (existingScript) {
        reject(
          new Error(
            "Google Maps is already loading. Refresh the page and try again.",
          ),
        );
        return;
      }

      window[callbackName] = () => {
        delete window[callbackName];

        if (window.google?.maps?.importLibrary) {
          resolve();
        } else {
          reject(
            new Error("Google Maps loaded, but importLibrary is unavailable."),
          );
        }
      };

      const script = document.createElement("script");

      script.src =
        "https://maps.googleapis.com/maps/api/js" +
        `?key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}` +
        "&v=weekly&loading=async" +
        `&callback=${callbackName}`;

      script.async = true;

      script.onerror = () => {
        delete window[callbackName];

        reject(
          new Error(
            "Google Maps failed to load. Check your API key, billing, API restrictions, and internet connection.",
          ),
        );
      };

      document.head.appendChild(script);
    });

    return mapsInitializationPromise;
  }

  // Create Google's address-search component.
  function createAutocomplete(PlaceAutocompleteElement, containerId, type) {
    const container = document.getElementById(containerId);

    if (!container) {
      throw new Error(`Autocomplete container not found: ${containerId}`);
    }

    const autocomplete = new PlaceAutocompleteElement();

    autocomplete.placeholder =
      type === "pickup"
        ? "Search pickup location in Nigeria"
        : "Search delivery location in Nigeria";

    autocomplete.includedRegionCodes = ["ng"];
    container.replaceChildren(autocomplete);

    autocomplete.addEventListener("gmp-select", async (event) => {
      try {
        const prediction = event.placePrediction;

        if (!prediction) {
          throw new Error("Please select an address from the suggestions.");
        }

        const place = prediction.toPlace();

        await place.fetchFields({
          fields: ["formattedAddress", "location"],
        });

        if (!place.location || !place.formattedAddress) {
          throw new Error(
            "Please select a valid address from the search suggestions.",
          );
        }

        if (type === "pickup") {
          pickupPlace = place;
          pickupAddressInput.value = place.formattedAddress;
        } else {
          destinationPlace = place;
          deliveryAddressInput.value = place.formattedAddress;
        }

        // A changed address invalidates the previous quote.
        quoteData = null;
        quoteSection.hidden = true;

        showFormMessage("");
        showQuoteMessage("");
      } catch (error) {
        console.error("Address selection failed:", error);

        if (type === "pickup") {
          pickupPlace = null;
          pickupAddressInput.value = "";
        } else {
          destinationPlace = null;
          deliveryAddressInput.value = "";
        }

        quoteData = null;
        quoteSection.hidden = true;

        showFormMessage(
          error.message ||
            "We couldn't confirm that address. Please select it again.",
        );
      }
    });
  }

  // Initialize Google Maps and address search.
  async function initializeGoogleMaps() {
    try {
      await loadGoogleMaps();

      const { PlaceAutocompleteElement } =
        await window.google.maps.importLibrary("places");

      await window.google.maps.importLibrary("routes");

      createAutocomplete(
        PlaceAutocompleteElement,
        "pickup-autocomplete",
        "pickup",
      );

      createAutocomplete(
        PlaceAutocompleteElement,
        "delivery-autocomplete",
        "destination",
      );

      console.log("Google Maps and address search initialized.");
    } catch (error) {
      console.error("Google Maps setup failed:", error);

      showFormMessage(
        `Google Maps error: ${
          error.message || "Check the browser console for details."
        }`,
      );
    }
  }

  // Calculate the driving route and temporary delivery quote.
  async function calculateQuote() {
    if (!window.google?.maps?.importLibrary) {
      throw new Error("Google Maps is not ready. Refresh and try again.");
    }

    const { Route } = await window.google.maps.importLibrary("routes");

    const result = await Route.computeRoutes({
      origin: pickupPlace,
      destination: destinationPlace,
      travelMode: "DRIVING",
      fields: ["distanceMeters", "durationMillis"],
    });

    const route = result.routes?.[0];

    if (
      !route ||
      typeof route.distanceMeters !== "number" ||
      typeof route.durationMillis !== "number"
    ) {
      throw new Error("No driving route was found for these addresses.");
    }

    const distanceKm = route.distanceMeters / 1000;
    const durationMinutes = Math.ceil(route.durationMillis / 60000);

    const calculatedFee = BASE_FEE + Math.ceil(distanceKm) * RATE_PER_KM;

    const estimatedFee = Math.max(MINIMUM_FEE, calculatedFee);

    return {
      distanceKm,
      durationMinutes,
      estimatedFee,
    };
  }

  // Display the calculated quote.
  function displayQuote(quote) {
    document.getElementById("quote-distance").textContent =
      `${quote.distanceKm.toFixed(1)} km`;

    document.getElementById("quote-duration").textContent =
      `${quote.durationMinutes} minutes`;

    document.getElementById("quote-fee").textContent = currencyFormatter.format(
      quote.estimatedFee,
    );

    quoteSection.hidden = false;

    quoteSection.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  // STEP 1: Calculate the delivery quote.
  deliveryForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    showFormMessage("");
    showQuoteMessage("");

    if (!deliveryForm.reportValidity()) {
      return;
    }

    if (!pickupPlace || !pickupAddressInput.value) {
      showFormMessage("Please select a pickup address from the suggestions.");

      document.getElementById("pickup-autocomplete").scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      return;
    }

    if (!destinationPlace || !deliveryAddressInput.value) {
      showFormMessage("Please select a delivery address from the suggestions.");

      document.getElementById("delivery-autocomplete").scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      return;
    }

    setQuoteButtonLoading(true);

    try {
      quoteData = await calculateQuote();
      displayQuote(quoteData);
    } catch (error) {
      console.error("Quote calculation failed:", error);

      showFormMessage(
        error.message ||
          "We couldn't calculate the route. Please check the addresses and try again.",
      );

      quoteData = null;
      quoteSection.hidden = true;
    } finally {
      setQuoteButtonLoading(false);
    }
  });

  // STEP 2: Save the confirmed delivery through the backend.
  confirmButton.addEventListener("click", async () => {
    if (isSaving) {
      return;
    }

    showQuoteMessage("");

    if (!quoteData || !pickupPlace || !destinationPlace) {
      showQuoteMessage("Please calculate your quote again.");
      return;
    }

    if (!deliveryForm.reportValidity()) {
      showQuoteMessage("Please complete all required delivery details.");
      return;
    }

    // Check that the vendor is logged in.
    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) {
      showQuoteMessage("Please log in before confirming your delivery.");

      window.location.href = LOGIN_URL;
      return;
    }

    const formData = new FormData(deliveryForm);

    // Extract and validate GPS coordinates from Google Maps.
    const pickupLatitude = pickupPlace.location?.lat?.();
    const pickupLongitude = pickupPlace.location?.lng?.();

    const destinationLatitude = destinationPlace.location?.lat?.();
    const destinationLongitude = destinationPlace.location?.lng?.();

    const validCoordinate = (value) =>
      typeof value === "number" && Number.isFinite(value);

    if (
      !validCoordinate(pickupLatitude) ||
      !validCoordinate(pickupLongitude) ||
      !validCoordinate(destinationLatitude) ||
      !validCoordinate(destinationLongitude)
    ) {
      showQuoteMessage(
        "The selected addresses do not have valid GPS coordinates. Please select both addresses again.",
      );

      return;
    }

    // Complete delivery payload.
    const delivery = {
      recipientName: formData.get("recipientName")?.trim(),
      recipientPhone: formData.get("recipientPhone")?.trim(),

      pickupContactName: formData.get("pickupContactName")?.trim(),
      pickupPhone: formData.get("pickupPhone")?.trim(),

      pickupAddress: pickupAddressInput.value,
      deliveryAddress: deliveryAddressInput.value,

      // Pickup GPS coordinates.
      // GeoJSON order: [longitude, latitude].
      pickupLocation: {
        type: "Point",
        coordinates: [pickupLongitude, pickupLatitude],
      },

      // Destination GPS coordinates.
      // GeoJSON order: [longitude, latitude].
      destinationLocation: {
        type: "Point",
        coordinates: [destinationLongitude, destinationLatitude],
      },

      additionalDirections: formData.get("additionalDirections")?.trim() || "",

      packageDescription: formData.get("packageDescription")?.trim(),
      packageSize: formData.get("packageSize"),

      specialInstructions: formData.get("specialInstructions")?.trim() || "",

      distanceKm: Number(quoteData.distanceKm.toFixed(2)),
      estimatedDurationMinutes: quoteData.durationMinutes,
      estimatedFee: quoteData.estimatedFee,
    };

    isSaving = true;
    setConfirmButtonLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(delivery),
      });

      const result = await response.json().catch(() => ({}));

      if (response.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem("paucekVendor");

        throw new Error("Your session has expired. Please log in again.");
      }

      if (!response.ok) {
        throw new Error(result.message || "We couldn't save your delivery.");
      }

      if (!result.delivery) {
        throw new Error(
          "The server response was unexpected. Check My Deliveries before retrying.",
        );
      }

      // The backend has confirmed the delivery was saved.
      alert(
        `Delivery request saved successfully!\nReference: ${
          result.delivery._id
        }`,
      );

      window.location.href = "/pages/my-deliveries.html";
    } catch (error) {
      console.error("Delivery save failed:", error);

      showQuoteMessage(
        error.message ||
          "Unable to save your delivery. Please check your connection and try again.",
      );
    } finally {
      isSaving = false;
      setConfirmButtonLoading(false);
    }
  });

  // Allow the vendor to edit delivery details.
  editButton.addEventListener("click", () => {
    quoteSection.hidden = true;
    quoteData = null;

    showQuoteMessage("");

    deliveryForm.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });

  initializeGoogleMaps();
});
