// ================== RIDER DASHBOARD ==================

// ===== CURRENT USER (SAFE CHECK) =====
const currentUser = JSON.parse(localStorage.getItem("currentUser"));

if (!currentUser) {
  alert("Please login first");
  window.location.href = "/pages/login.html";
}

// ===== WALLET =====
let riderWallet = Number(localStorage.getItem("riderWallet")) || 0;
const walletBalance = document.getElementById("wallet-balance");

function updateWallet() {
  walletBalance.textContent = riderWallet;
}

updateWallet();

// ===== WITHDRAW =====
const withdrawBtn = document.getElementById("withdrawBtn");
const withdrawInput = document.getElementById("withdraw-amount");

withdrawBtn.addEventListener("click", () => {
  const amount = Number(withdrawInput.value);

  if (!amount || amount <= 0) {
    alert("Enter valid amount");
    return;
  }

  if (amount > riderWallet) {
    alert("Insufficient balance ❌");
    return;
  }

  // subtract money
  riderWallet -= amount;

  // save
  localStorage.setItem("riderWallet", riderWallet);

  updateWallet();

  withdrawInput.value = "";

  alert(`Withdrawal successful 💸 ₦${amount}`);
});

// ===== ONLINE / OFFLINE =====
const toggleStatus = document.getElementById("toggleStatus");

toggleStatus.addEventListener("click", () => {
  toggleStatus.classList.toggle("online");

  if (toggleStatus.classList.contains("online")) {
    toggleStatus.textContent = "🟢 Online";
  } else {
    toggleStatus.textContent = "🔴 Offline";
  }
});

// ===== DUMMY ORDERS =====
let orders = [
  {
    id: "001",
    pickup: "Victoria Island",
    dropoff: "Ikoyi",
    price: 1500,
    status: "pending",
  },
  {
    id: "002",
    pickup: "Ikeja",
    dropoff: "Surulere",
    price: 3000,
    status: "pending",
  },
  {
    id: "003",
    pickup: "Lekki",
    dropoff: "Ajah",
    price: 800,
    status: "pending",
  },
];

// ===== DOM =====
const tableBody = document.getElementById("orders-table");
const emptyState = document.getElementById("empty-state");

// ===== ACTIVE DELIVERY =====
const activeBox = document.getElementById("active-delivery");
const activePickup = document.getElementById("active-pickup");
const activeDropoff = document.getElementById("active-dropoff");
const activePrice = document.getElementById("active-price");

const startBtn = document.getElementById("startDelivery");
const completeBtn = document.getElementById("completeDelivery");

let currentOrder = null;

// ===== RENDER ORDERS =====
function renderOrders() {
  tableBody.innerHTML = "";

  const availableOrders = orders.filter((o) => o.status === "pending");

  if (availableOrders.length === 0) {
    emptyState.style.display = "block";
  } else {
    emptyState.style.display = "none";
  }

  availableOrders.forEach((order) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${order.id}</td>
      <td>${order.pickup}</td>
      <td>${order.dropoff}</td>
      <td>₦${order.price}</td>
      <td><button class="accept-btn">Accept</button></td>
    `;

    row.querySelector(".accept-btn").addEventListener("click", () => {
      acceptOrder(order.id);
    });

    tableBody.appendChild(row);
  });
}

// ===== ACCEPT ORDER =====
function acceptOrder(id) {
  const order = orders.find((o) => o.id === id);
  if (!order) return;

  order.status = "accepted";
  currentOrder = order;

  activePickup.textContent = order.pickup;
  activeDropoff.textContent = order.dropoff;
  activePrice.textContent = order.price;

  activeBox.classList.remove("hidden");

  renderOrders();
}

// ===== START DELIVERY =====
startBtn.addEventListener("click", () => {
  if (!currentOrder) return;

  currentOrder.status = "in-progress";

  startBtn.classList.add("hidden");
  completeBtn.classList.remove("hidden");
});

// ===== COMPLETE DELIVERY =====
completeBtn.addEventListener("click", () => {
  if (!currentOrder) return;

  currentOrder.status = "completed";

  riderWallet += currentOrder.price;
  localStorage.setItem("riderWallet", riderWallet);

  updateWallet();

  alert("Delivery completed 💰");

  // Reset UI
  currentOrder = null;
  activeBox.classList.add("hidden");

  startBtn.classList.remove("hidden");
  completeBtn.classList.add("hidden");
});

// ===== LOGOUT =====
document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("currentUser");
  window.location.href = "/pages/login.html";
});

// ===== INIT =====
renderOrders();
