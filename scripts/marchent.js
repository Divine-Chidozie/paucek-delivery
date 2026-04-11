const addNewProduct = document.getElementById("new-product");
document.getElementById("edit-button").onclick = editProductBtn;
const deleteProductBtn = document.getElementById("delete-button");
const markReadyBtn = document.getElementById("mark-ready-btn");

addNewProduct.onclick = function () {
  // window.location.href = "/pages/request-delivery.html";

  const newProduct = "We are working on this feature.. stay turned!";
  window.alert(`${newProduct}`);
};

function editProductBtn() {
  let editProduct = "Sorry, product not available, please check back!";
  setTimeout(() => {
    alert(`${editProduct}`);
  }, 1000);
}

deleteProductBtn.addEventListener("click", () => {
  // const confirmDeleteProduct = confirm(
  //   "Are you sure you want to delete product!",
  // );
  // if (confirmDeleteProduct === true) {
  //   addNewProduct.style.backgroundColor = "blue";
  //   addNewProduct.style.color = "white";
  //   addNewProduct.style.focus = "ON";
  // } else {
  //   deleteProductBtn.classList.remove("delete");
  // }
  const trueDelete = "Error... try again later";
  const returnDelete = "Cancelled!";

  const confirmDeleteProduct = confirm(
    "Are you sure you want to delete this product.",
  );

  if (confirmDeleteProduct) {
    setTimeout(() => {
      window.alert(trueDelete);
    }, 1000);
  } else {
    setTimeout(() => {
      window.alert(returnDelete);
    }, 1000);
  }
});

const acceptOrderButton = document.getElementById("accept-order-button");
const rejectOrderButton = document.getElementById("reject-order-button");

acceptOrderButton.addEventListener("click", function (e) {
  window.alert("We are working to bring this feature live");
});

function order(newOrder) {
  rejectOrderButton.onclick = function () {
    alert(newOrder);
    console.error(newOrder);
  };
}
order("We are working to bring this feature live.");

markReadyBtn.addEventListener("click", function () {
  alert("This feature is still in development, please check back later..");
});

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
    window.location.href;
  }
});
