const registerForm = document.getElementById("registration-form");

registerForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const firstname = document.getElementById("firstname").value.trim();
  const lastname = document.getElementById("lastname").value.trim();
  const password = document.getElementById("password").value.trim();
  const email = document.getElementById("email").value.trim();
  const accountType = document.getElementById("account-type").value;
  const checkbox = document.getElementById("checkbox").checked;

  if (
    !firstname ||
    !lastname ||
    !password ||
    !email ||
    !accountType ||
    !checkbox
  ) {
    alert("Please fill all fields correctly");
    return;
  }

  const newUser = {
    firstname,
    lastname,
    email,
    password,
    accountType,
  };

  const users = JSON.parse(localStorage.getItem("users")) || [];

  const exists = users.find((u) => u.email === email);

  if (exists) {
    alert("User already exists");
    return;
  }

  users.push(newUser);
  localStorage.setItem("users", JSON.stringify(users));

  // ✅ SAVE CURRENT USER
  localStorage.setItem("currentUser", JSON.stringify(newUser));

  alert("Registration successful");

  // ✅ REDIRECT
  if (accountType === "user") {
    window.location.href = "/pages/user-dashboard.html";
  } else if (accountType === "rider") {
    window.location.href = "/pages/rider-dashboard.html";
  } else if (accountType === "merchant") {
    window.location.href = "/pages/merchant-dashboard.html";
  }
});
