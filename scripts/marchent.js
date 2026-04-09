const addNewProduct = document.getElementById("new-product");
document.getElementById("edit-button").onclick = editProductBtn;
const deleteProductBtn = document.getElementById("delete-button");

addNewProduct.onclick = function () {
  window.location.href = "/pages/request-delivery.html";
};

function editProductBtn() {
  setTimeout(() => {
    alert("Sorry, can't edit produt details, feature not available!");
  }, 1000);
}

deleteProductBtn.addEventListener("click", () => {
  const confirmDeleteProduct = confirm(
    "Are you sure you want to delete product!",
  );

  if (confirmDeleteProduct === true) {
    // console.log("Product deleted");
    // deleteProductBtn.classList.add("delete");
    addNewProduct.style.backgroundColor = "blue";
    addNewProduct.style.color = "white";
    addNewProduct.style.focus = "ON";
  } else {
    deleteProductBtn.classList.remove("delete");
  }
});

const acceptOrderButton = document.getElementById("accept-order-button");
const rejectOrderButton = document.getElementById("reject-order-button");

acceptOrderButton.addEventListener("click", function (e) {
  alert("Your order has been accepted");
});

function order(newOrder) {
  rejectOrderButton.onclick = function () {
    alert(newOrder);
    console.error(newOrder);
  };
}

order("Your order was rejected...");

// ===== LOGOUT =====
const logOut = document.getElementById("logoutBtn");
logOut.addEventListener("click", () => {
  const confirmLogout = confirm("Are you sure you want to log out");

  if (confirmLogout) {
    localStorage.removeItem("currentUser");
    // setTimeout(() => {
    window.location.href = "/pages/login.html";
    // }, 1000);
  } else {
    window.location.href = "pages/merchant-dashboard.html";
  }
});
