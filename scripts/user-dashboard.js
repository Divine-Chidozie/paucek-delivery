// Settings dropdown toggle
const settingsBtn = document.getElementById("settings-btn");
const settingsDropdown = document.getElementById("settings-dropdown");

const filterSelect = document.getElementById("status-filter");
const cards = document.querySelectorAll(".delivery-cards .card");

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
