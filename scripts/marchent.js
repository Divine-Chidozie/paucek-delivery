const newProduct = document.getElementById("new-product");
const editBtn = document.getElementById("edit-button");
const deleteBtn = document.getElementById("delete-button");

const acceptOrderBtn = document.getElementById("accept-order-btn");
const rejectOrderBtn = document.getElementById("reject-order-btn");
const markReadyBtn = document.getElementById("mark-ready-btn");

const productBtnId = [newProduct, editBtn, deleteBtn];
const productIdMessage =
  "This feature is not yet availabe, kindly check back soon.";

productBtnId.forEach((element) => {
  element.addEventListener("click", function (e) {
    e.preventDefault();
    window.alert(productIdMessage);
  });
});

const orderBtnId = [acceptOrderBtn, rejectOrderBtn, markReadyBtn];
const orderIdMessage =
  "Ooops! this feature is under maintaince 🚦, please check back later.";

orderBtnId.forEach(function (element) {
  element.onclick = function () {
    window.alert(orderIdMessage);
  };
});

const logoutContainer = document.getElementById("logout-container");

const logoutBtnYes = document.getElementById("logout-btn-yes");
const logoutBtnNo = document.getElementById("logout-btn-no");

logoutBtnYes.addEventListener("click", function () {
  console.log("Logged out successfully");
});

const logOut = document.getElementById("logoutBtn");

logOut.addEventListener("click", () => {
  console.log(logoutContainer);

  logoutContainer.classList.toggle(".show-logout-container");
});
