const toggleButton = document.getElementById("toggleBtn");
const supportAssistainceLink = document.getElementById(
  "support-assitance-link",
);

toggleButton.onclick = function () {
  document.body.classList.toggle("dark-mode");
  if (document.body.classList.contains("dark-mode")) {
    toggleButton.value = "🌞";
  } else {
    toggleButton.value = "🌙";
  }
};

// Load saved mode
if (localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark-mode");
  toggleButton.textContent = "🌞";
}

toggleButton.onclick = function () {
  document.body.classList.toggle("dark-mode");

  if (document.body.classList.contains("dark-mode")) {
    toggleButton.textContent = "🌞";
    localStorage.setItem("theme", "dark");
  } else {
    toggleButton.textContent = "🌙";
    localStorage.setItem("theme", "light");
  }
};

const riderDispatch = document.getElementById("rider-dispatch");
riderDispatch.addEventListener("click", (event) => {
  // event.preventDefault();
});

// CHAT ELEMENTS
const chatIcon = document.getElementById("chat-icon-logo");
const chatbox = document.getElementById("chatbox");
const closeChat = document.getElementById("closeChat");
const sendBtn = document.getElementById("sendMessage");
const input = document.getElementById("chatInput");
const messages = document.getElementById("chatMessages");

supportAssistainceLink.addEventListener("click", function (e) {
  e.preventDefault();
});
// OPEN CHAT
chatIcon.onclick = () => {
  chatbox.classList.toggle("hidden");
};

// SEND MESSAGE
sendBtn.onclick = sendMessage;

input.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

function sendMessage() {
  const text = input.value.trim();
  if (!text) return;

  addMessage(text, "user");
  input.value = "";

  // Fake reply
  setTimeout(() => {
    addMessage("Typing...", "bot");

    setTimeout(() => {
      messages.lastChild.textContent = `Thanks! we'll get back to you shortly.`;
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
}

// CLOSE CHAT
chatIcon.onclick = () => {
  chatbox.classList.toggle("hidden");
  input.focus();
};

document.addEventListener("click", (e) => {
  if (!chatbox.contains(e.target) && !chatIcon.contains(e.target)) {
    chatbox.classList.add("hidden");
  }
});
