// const registerForm = document.getElementById("register");
const chatLogo = document.getElementById("chat-icon-logo");
const requestPickUp = document.getElementById("request-pickup");

requestPickUp.addEventListener("click", () => {
  alert("Pick up location processing. Please check back later...");
});

chatLogo.addEventListener("click", () => {
  alert(
    "Support System currently unavailable. Please check back in few minutes..."
  );
});

const riderDispatch = document
  .getElementById("rider-dispatch")
  .addEventListener("click", function () {
    alert("Rider not Availabe...");
  });
