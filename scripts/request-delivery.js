const form = document.getElementById("form");

const pickUpAddress = document.getElementById("pickup-address");
const pickUpAddressError = document.querySelector(".pick-up-address-error");

const dropOffAddress = document.getElementById("dropoff-address");
const dropOffAddressError = document.querySelector(".dropoff-address-error");

const dataTime = document.getElementById("date-time");
const dateTimeError = document.querySelector(".date-time-error");

const packageDetails = document.getElementById("package-details");
const packageDetailsError = document.querySelector(".package-details-error");

const toggleButton = document.getElementById("toggleBtn");

toggleButton.onclick = function () {
  document.body.classList.toggle("dark-mode");
  if (document.body.classList.contains("dark-mode")) {
    toggleButton.value = "🌞";
  } else {
    toggleButton.value = "🌙";
  }
};

form.addEventListener("submit", (e) => {
  e.preventDefault();

  let isValid = true;

  pickUpAddressError.textContent = "";
  dropOffAddressError.textContent = "";
  dateTimeError.textContent = "";
  packageDetailsError.textContent = "";

  const address = pickUpAddress.value.trim();
  const dropOff = dropOffAddress.value.trim();
  const dateTime = dataTime.value;
  const packageInfo = packageDetails.value.trim();

  if (address === "") {
    pickUpAddressError.textContent = `Please enter a pick-up address`;
    isValid = false;
  } else if (address.length < 5) {
    pickUpAddressError.textContent = `Address must be at least 5 characters long`;
    isValid = false;
  }
  if (!dropOff) {
    dropOffAddressError.textContent = `Please enter a drop-off address`;
    isValid = false;
  } else if (dropOff.length < 5) {
    dropOffAddressError.textContent = `Address must be at least 5 characters long`;
    isValid = false;
  }
  if (!dateTime) {
    dateTimeError.textContent = `You must choose a date and time for your delivery`;
    isValid = false;
  }
  if (!packageInfo) {
    packageDetailsError.textContent = `Please provide package details`;
    isValid = false;
  }

  if (isValid) {
    console.log("Form is valid. Ready to submit");
  }
});

function clearErrorOnInput(inputField, errorField) {
  inputField.addEventListener("input", () => {
    errorField.textContent = "";
  });
}

clearErrorOnInput(pickUpAddress, pickUpAddressError);
clearErrorOnInput(dropOffAddress, dropOffAddressError);
clearErrorOnInput(dataTime, dateTimeError);
clearErrorOnInput(packageDetails, packageDetailsError);
