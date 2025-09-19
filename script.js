const toggleButton = document.getElementById("toggleBtn");

toggleButton.onclick = function () {
  document.body.classList.toggle("dark-mode");
  if (document.body.classList.contains("dark-mode")) {
    toggleButton.value = "🌞";
  } else {
    toggleButton.value = "🌙";
  }
};

const riderDispatch = document.getElementById("rider-dispatch");
riderDispatch.addEventListener("submit", (event) => {
  event.preventDefault();
});

document.getElementById("chat-icon-logo").onclick = function () {
  alert("Hi there! 👋 A support agent will be with you shortly.");
};
