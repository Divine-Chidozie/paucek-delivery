const requestPickup = document.getElementById("request-pickup");

const riderDispatch = document.getElementById("rider-dispatch");
riderDispatch.addEventListener("submit", (event) => {
  event.preventDefault();
});

requestPickup.addEventListener("click", () => {
  alert(
    "Dispatch on it's way.. you’ll get updates as soon as your order is picked up and on the way."
  );
});

document.getElementById("chat-icon-logo").onclick = function () {
  alert("Hi there! 👋 A support agent will be with you shortly.");
};
