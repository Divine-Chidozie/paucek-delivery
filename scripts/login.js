const loginForm = document.getElementById("my-form");
const togglePassword = document.getElementById("togglePassword");
const passwordInput = document.getElementById("password");

loginForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = passwordInput.value.trim();
  const accountType = document.getElementById("account-type").value;

  const users = JSON.parse(localStorage.getItem("users")) || [];

  const foundUser = users.find(
    (user) =>
      user.email === username &&
      user.password === password &&
      user.accountType === accountType,
  );

  if (!foundUser) {
    alert("Invalid login details or wrong account type");
    return;
  }

  // ✅ SAVE CURRENT USER
  localStorage.setItem("currentUser", JSON.stringify(foundUser));

  // ✅ REDIRECT
  if (accountType === "user") {
    window.location.href = "/pages/user-dashboard.html";
  } else if (accountType === "rider") {
    window.location.href = "/pages/rider-dashboard.html";
  } else if (accountType === "merchant") {
    window.location.href = "/pages/marchent-dashboard.html";
  }
});

// Toggle password
togglePassword.addEventListener("click", () => {
  passwordInput.type = passwordInput.type === "password" ? "text" : "password";
});

// Account card selection
const cards = document.querySelectorAll(".account-card");
const hiddenInput = document.getElementById("account-type");

cards.forEach((card) => {
  card.addEventListener("click", () => {
    cards.forEach((c) => c.classList.remove("active"));
    card.classList.add("active");
    hiddenInput.value = card.dataset.value;
  });
});
