// Settings dropdown toggle
const settingsBtn = document.getElementById("settings-btn");
const settingsDropdown = document.getElementById("settings-dropdown");

const filterSelect = document.getElementById("status-filter");
const cards = document.querySelectorAll(".delivery-cards .card");

const viewReceiptBtn = document.getElementById("receipt-btn");
const deliveryBtn = document.getElementById("delivery-btn");
// const cancelBtn = document.getElementById("cancel-btn"); // Uncomment incase of use

settingsBtn.addEventListener("click", () => {
  settingsDropdown.classList.toggle("show");
});

// Close dropdown if clicked outside
window.addEventListener("click", (e) => {
  if (!settingsBtn.contains(e.target) && !settingsDropdown.contains(e.target)) {
    settingsDropdown.classList.remove("show");
  }
});

filterSelect.addEventListener("change", () => {
  const selectedStatus = filterSelect.value;

  cards.forEach((card) => {
    card.style.display = "block"; // show all by default
    if (selectedStatus !== "all") {
      if (!card.classList.contains(selectedStatus)) {
        card.style.display = "none"; // hide non-matching cards
      }
    }
  });
});

document.getElementById("track-delivery-link").onclick = function (e) {
  e.preventDefault();
  alert("We are working on this feature");
};

viewReceiptBtn.addEventListener("click", function (event) {
  event.preventDefault();
  window.alert(
    "We are working hard to bring this feature online. stay turned.",
  );
});

deliveryBtn.addEventListener("click", (e) => {
  e.preventDefault();
  window.alert(
    "This feature is still in development, please subscribe to stay updated.",
  );
});

// Setting List
const profile = document.getElementById("profile");
const notification = document.getElementById("notification");
document.getElementById("support").onclick = support;

profile.addEventListener("click", (e) => {
  e.preventDefault();
  window.alert("We are still working on the feature.");
});

notification.addEventListener("click", (e) => {
  e.preventDefault();

  window.alert("Notification still in development, please check back soon.");
});

function support(e) {
  e.preventDefault();
  alert("We are working hard to bring this feature online..");
}

const logOut = document.getElementById("logout");
logOut.addEventListener("click", () => {
  const confirmLogout = confirm("Are you sure you want to log out");

  if (confirmLogout) {
    localStorage.removeItem("currentUser");
    window.location.href = "/pages/login.html";
  } else {
    window.location.href = "/pages/user-dashboard.html";
  }
});
