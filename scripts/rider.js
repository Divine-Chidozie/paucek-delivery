// ================== RIDER DASHBOARD JS ==================

// Dummy deliveries for testing
let deliveries = [
  {
    id: "001",
    pickup: "10 Ozumba Mbadiwe Avenue, Victoria Island",
    dropoff: "22 Bourdillon Road, Ikoyi",
    package: "Small Parcel",
    price: 1500, // Naira
    status: "Pending", // Pending, In Progress, Delivered, Declined
    assignedRider: null,
    riderEarningsAdded: false,
  },
  {
    id: "002",
    pickup: "25 Allen Avenue, Ikeja",
    dropoff: "8 Adeniran Ogunsanya Street, Surulere",
    package: "Envelope",
    price: 800,
    status: "Pending",
    assignedRider: null,
    riderEarningsAdded: false,
  },
];

// Dummy rider wallet
let riderWallet = 0;

// DOM references
const deliveryTableBody = document.querySelector(".delivery-list tbody");
const deliveryStateSection = document.querySelector(".delivery-state");
const walletDisplay = document.createElement("p");
walletDisplay.classList.add("wallet-display");
document.querySelector("main").prepend(walletDisplay);

// Function to render wallet
function updateWalletDisplay() {
  walletDisplay.textContent = `Wallet Balance: ₦${riderWallet}`;
}

// Function to render deliveries
function renderDeliveries() {
  deliveryTableBody.innerHTML = "";

  const activeDeliveries = deliveries.filter(
    (d) => d.status !== "Declined" && d.status !== "Delivered",
  );

  if (activeDeliveries.length === 0) {
    deliveryStateSection.style.display = "block";
    return;
  } else {
    deliveryStateSection.style.display = "none";
  }

  deliveries.forEach((delivery) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${delivery.id}</td>
      <td>${delivery.pickup}</td>
      <td>${delivery.dropoff}</td>
      <td>${delivery.package}</td>
      <td><span class="${delivery.status.toLowerCase().replace(" ", "-")}">${delivery.status}</span></td>
      <td>
        ${delivery.status === "Pending" ? `<button class="accept-btn">Accept</button> <button class="decline-btn">Decline</button>` : ""}
        ${delivery.status === "In Progress" ? `<button class="deliver-btn">Mark Delivered</button>` : ""}
        ${delivery.status === "Delivered" ? `Completed` : ""}
      </td>
    `;

    // Accept button
    const acceptBtn = tr.querySelector(".accept-btn");
    if (acceptBtn) {
      acceptBtn.addEventListener("click", () => {
        delivery.status = "In Progress";
        delivery.assignedRider = "CurrentRider"; // For simplicity
        renderDeliveries();
      });
    }

    // Decline button
    const declineBtn = tr.querySelector(".decline-btn");
    if (declineBtn) {
      declineBtn.addEventListener("click", () => {
        delivery.status = "Declined";
        renderDeliveries();
      });
    }

    // Mark Delivered button
    const deliverBtn = tr.querySelector(".deliver-btn");
    if (deliverBtn) {
      deliverBtn.addEventListener("click", () => {
        delivery.status = "Delivered";
        if (!delivery.riderEarningsAdded) {
          riderWallet += delivery.price;
          delivery.riderEarningsAdded = true;
        }
        renderDeliveries();
        updateWalletDisplay();
      });
    }

    deliveryTableBody.appendChild(tr);
  });
}

// Initialize
updateWalletDisplay();
renderDeliveries();
