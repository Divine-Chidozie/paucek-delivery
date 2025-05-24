const loginForm = document.getElementById("login");
const registerForm = document.getElementById("register");
const chatLogo = document.getElementById("chat-icon-logo");
const requestPickUp = document.getElementById("request-pickup");

loginForm.addEventListener("click", function () {
  alert("Login functionality is still in progress. Please check back later.");
});

registerForm.addEventListener("click", function () {
  alert(
    "Register functionality is still in progress. Please check back later."
  );
});

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
