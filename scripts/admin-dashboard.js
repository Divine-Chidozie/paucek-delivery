// ==============================================
// Switch between sections based on sidebar click
// ==============================================
function showSection(sectionId) {
  const sections = document.querySelectorAll(".section");
  sections.forEach((section) => (section.style.display = "none"));

  document.getElementById(sectionId).style.display = "block";
}

// ==============================================
// Mark a delivery as completed
// ==============================================
function markDelivered(button) {
  const row = button.parentElement.parentElement;
  const statusCell = row.children[3];
  statusCell.textContent = "Completed"; // update text status
}

// ==============================================
// Cancel a delivery order with confirmation
// ==============================================
function cancelOrder(button) {
  if (confirm("Are you sure you want to cancel this order?")) {
    const row = button.parentElement.parentElement;
    const statusCell = row.children[3];
    statusCell.textContent = "Cancelled"; // update text cancel
  }
}

// ==============================================
// Search/filter deliveries by customer name or status
// ==============================================
function searchDeliveries() {
  const input = document
    .getElementById("deliverySearchInput")
    .value.toLowerCase();
  const rows = document.querySelectorAll("#deliveryTable tbody tr");

  rows.forEach((row) => {
    const customer = row.children[1].textContent.toLowerCase();
    const status = row.children[3].textContent.toLowerCase();
    row.style.display =
      customer.includes(input) || status.includes(input) ? "" : "none";
  });
}

console.log("Hello world");
