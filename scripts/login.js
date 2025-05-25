const myForm = document.getElementById("my-form");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");

myForm.addEventListener("submit", (e) => {
  e.preventDefault();

  let isValid = true;
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  if (!username) {
    document.getElementById("username-error").textContent =
      "please enter your username";
    isValid = false;
  }
  if (!password) {
    document.getElementById("password-error").textContent =
      "please enter your password";
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
        "content-type": "application/json",
      },
      body: JSON.stringify(formData),
    })
      .then((res) => res.json())
      .then((data) => {
        console.log(data);
      })
      .catch((error) => {
        console.log(error);
      });
  }
});
