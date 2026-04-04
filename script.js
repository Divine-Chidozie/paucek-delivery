// DARK MODE TOGGLE
const toggleButton = document.getElementById("toggleBtn");

function setDarkMode(mode) {
  if (mode === "dark") {
    document.body.classList.add("dark-mode");
    toggleButton.value = "🌞";
  } else {
    document.body.classList.remove("dark-mode");
    toggleButton.value = "🌙";
  }
  localStorage.setItem("theme", mode);
}

// Load saved theme
setDarkMode(localStorage.getItem("theme") || "light");

// Toggle on click
toggleButton.addEventListener("click", () => {
  const mode = document.body.classList.contains("dark-mode") ? "light" : "dark";
  setDarkMode(mode);
});

document
  .getElementById("support-assitance-link")
  .addEventListener("click", (event) => {
    event.preventDefault();
  });

const riderDispatch = document.getElementById("rider-dispatch");
riderDispatch.onclick = function (event) {
  event.preventDefault();
  alert("Please login first");

  const windowLocation = `pages/login.html`;
  window.location.href = `${windowLocation}`;
};

// CHAT FUNCTIONALITY
const chatIcon = document.getElementById("chat-icon-logo");
const chatbox = document.getElementById("chatbox");
const closeChat = document.getElementById("closeChat");
const sendBtn = document.getElementById("sendMessage");
const input = document.getElementById("chatInput");
const messages = document.getElementById("chatMessages");

// Open/close chat
chatIcon.addEventListener("click", () => {
  chatbox.classList.toggle("hidden");
  input.focus();
});
closeChat.addEventListener("click", () => chatbox.classList.add("hidden"));

// Send message
sendBtn.addEventListener("click", sendMessage);
input.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

function sendMessage() {
  const text = input.value.trim();
  if (!text) return;

  addMessage(text, "user");
  input.value = "";

  // Fake reply
  const reply = setTimeout(() => {
    const fakeMessage = `Thanks! We'll get back to you shortly.`;

    const typingMsg = addMessage("Typing...", "bot");
    setTimeout(() => {
      typingMsg.textContent = `${fakeMessage}`;
    }, 1000);
  }, 500);
}

function addMessage(text, type) {
  const msg = document.createElement("div");
  msg.classList.add("message", type);
  msg.textContent = text;
  messages.appendChild(msg);
  messages.scrollTop = messages.scrollHeight;

  const time = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  msg.innerHTML = `${text} <span style="font-size:10px; opacity:0.6;">${time}</span>`;
  return msg;
}

// Close chat if clicked outside
document.addEventListener("click", (e) => {
  if (!chatbox.contains(e.target) && !chatIcon.contains(e.target)) {
    chatbox.classList.add("hidden");
  }
});
