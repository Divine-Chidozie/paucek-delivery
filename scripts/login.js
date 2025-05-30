const myForm = document.getElementById("my-form");
const userName = document.getElementById("username");
const passWord = document.getElementById("password");

myForm.addEventListener("submit", (e) => {
  e.preventDefault();

  // Clear previous errors
  const usernameError = document.getElementById("username-error");
  usernameError.textContent = "";
  const passwordError = document.getElementById("password-error");
  passwordError.textContent = "";

  // Clear errors on input
  userName.addEventListener("input", () => {
    usernameError.textContent = "";
  });
  passWord.addEventListener("input", () => {
    passwordError.textContent = "";
  });

  const username = userName.value.trim();
  const password = passWord.value.trim();

  let isValid = true;

  if (!username) {
    usernameError.textContent = "Username is required";
    isValid = false;
  }

  if (!password) {
    passwordError.textContent = "Please enter your password";
    isValid = false;
  }

  if (isValid) {
    const formData = {
      username: username,
      password: password,
    };

    fetch("/api/form/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });
  }
});
