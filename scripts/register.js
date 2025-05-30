const registrationForm = document.getElementById("registration-form");

const firstname = document.getElementById("firstname");
const firstnameError = document.getElementById("firstname-error");

const lastname = document.getElementById("lastname");
const lastnameError = document.getElementById("lastname-error");

const passwordInput = document.getElementById("password");
const passwordError = document.getElementById("error-password");

const email = document.getElementById("email");
const emailError = document.getElementById("email-error");

const accountType = document.getElementById("account-type");
const accountTypeError = document.getElementById("account-type-error");

const checkbox = document.getElementById("checkbox");
const checkboxError = document.getElementById("checkbox-error");

firstname.addEventListener("input", () => {
  firstnameError.textContent = "";
});

lastname.addEventListener("input", () => {
  lastnameError.textContent = "";
});

password.addEventListener("input", () => {
  passwordError.textContent = "";
});
lastname.addEventListener("input", () => {
  lastnameError.textContent = "";
});

email.addEventListener("input", function () {
  emailError.innerText = "";
});

accountType.addEventListener("input", function () {
  accountTypeError.innerText = "";
});
checkbox.addEventListener("change", function () {
  checkboxError.innerText = "";
});

registrationForm.addEventListener("submit", (e) => {
  e.preventDefault();

  firstnameError.textContent = "";
  lastnameError.textContent = "";
  passwordError.textContent = "";
  emailError.textContent = "";
  accountTypeError.textContent = "";
  checkboxError.textContent = "";

  let isValid = true;

  const password = passwordInput.value.trim();

  if (!firstname.value.trim()) {
    firstnameError.innerText = "First name is required *";
    isValid = false;
  }

  if (lastname.value.trim() === "") {
    lastnameError.innerText = "Last name is required*";
    isValid = false;
  } else if (lastname.value.trim() === firstname.value.trim()) {
    lastnameError.innerText = "Last name can not be the same *";
    isValid = false;
  }

  const passwordErrorMessage = "Password is required *";
  const pattern =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!password) {
    passwordError.innerText = passwordErrorMessage;
    isValid = false;
  } else if (password.length < 8) {
    passwordError.textContent = "password must be least 8 characters long *";
    isValid = false;
  } else if (password.length > 20) {
    passwordError.innerText = "password must not exceed 20 characters *";
  } else if (!pattern.test(password)) {
    passwordError.innerText =
      "Password must be at least 8 characters long, contain one uppercase letter, one lowercase letter, one number, and one special character *";
    isValid = false;
  }
  if (!email.value.trim()) {
    emailError.textContent = "Email is required *";
    isValid = false;
  }

  if (!accountType.value.trim()) {
    accountTypeError.textContent = "Please select an account type *";
    isValid = false;
  }
  if (!checkbox.checked) {
    checkboxError.textContent = "You must accept the terms & conditions *";
    isValid = false;
  }

  if (isValid) {
    const formData = {
      firstname: firstname,
      lastname: lastname,
      password: password,
      email: email,
      accountType: accountType,
      checkbox: checkbox,
    };

    fetch("/api/form/register", {
      method: "POST",
      headers: {
        "content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });
  }
});

// Object
const user = {
  name: "Harley",
  age: 20,
  isVerified: true, // boolean
};

// console.log(user);
