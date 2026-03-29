const form = document.getElementById("form");

const pickUpAddress = document.getElementById("pickup-address");
const pickUpAddressError = document.querySelector(".pick-up-address-error");

const dropOffAddress = document.getElementById("dropoff-address");
const dropOffAddressError = document.querySelector(".dropoff-address-error");

const dateTimeInput = document.getElementById("date-time");
const dateTimeError = document.querySelector(".date-time-error");

const packageDetails = document.getElementById("package-details");
const packageDetailsError = document.querySelector(".package-details-error");

// Success Card Elements
const successCard = document.getElementById("success-card");
const successPickup = document.getElementById("success-pickup");
const successDropoff = document.getElementById("success-dropoff");
const successDatetime = document.getElementById("success-datetime");
const successPackage = document.getElementById("success-package");
const successCost = document.getElementById("success-cost");
const closeCard = document.getElementById("close-card");

// Simple delivery cost calculator
function estimateCost(pickup, dropoff) {
  return Math.floor(Math.random() * (5000 - 1500 + 1)) + 1500;
}

// ===================== FORM SUBMIT =====================
form.addEventListener("submit", (e) => {
  e.preventDefault();
  let isValid = true;

  // Clear previous errors
  pickUpAddressError.textContent = "";
  dropOffAddressError.textContent = "";
  dateTimeError.textContent = "";
  packageDetailsError.textContent = "";

  const addressValue = pickUpAddress.value.trim();
  const dropOffValue = dropOffAddress.value.trim();
  const dateTimeValue = dateTimeInput.value;
  const packageValue = packageDetails.value.trim();

  // Validate Pick-up Address
  if (!addressValue || addressValue.length < 5) {
    pickUpAddressError.textContent = !addressValue
      ? "Enter a pick-up address"
      : "Address must be at least 5 characters";
    isValid = false;
  }

  // Validate Drop-off Address
  if (!dropOffValue || dropOffValue.length < 5) {
    dropOffAddressError.textContent = !dropOffValue
      ? "Enter a drop-off address"
      : "Address must be at least 5 characters";
    isValid = false;
  }

  // Validate Date & Time
  if (!dateTimeValue) {
    dateTimeError.textContent = "Choose a date and time";
    isValid = false;
  } else if (new Date(dateTimeValue) < new Date()) {
    dateTimeError.textContent = "Delivery must be in the future";
    isValid = false;
  }

  // Validate Package Details
  if (!packageValue) {
    packageDetailsError.textContent = "Provide package details";
    isValid = false;
  }

  // If valid, show success card
  if (isValid) {
    successPickup.textContent = addressValue;
    successDropoff.textContent = dropOffValue;
    successDatetime.textContent = new Date(dateTimeValue).toLocaleString();
    successPackage.textContent = packageValue;
    successCost.textContent = estimateCost(addressValue, dropOffValue);

    successCard.classList.remove("hidden");
    form.reset();
  }
});

// Close success card
closeCard.addEventListener("click", () => {
  successCard.classList.add("hidden");
});

// Clear errors when typing
[pickUpAddress, dropOffAddress, dateTimeInput, packageDetails].forEach(
  (field, index) => {
    const errorField = [
      pickUpAddressError,
      dropOffAddressError,
      dateTimeError,
      packageDetailsError,
    ][index];
    field.addEventListener("input", () => (errorField.textContent = ""));
  },
);
