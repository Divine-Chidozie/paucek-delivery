"use strict";

// ========================================
// DARK MODE TOGGLE
// ========================================

const toggleButton = document.getElementById("toggleBtn");

function setDarkMode(mode) {
  const isDark = mode === "dark";

  document.body.classList.toggle("dark-mode", isDark);

  if (toggleButton) {
    const icon = toggleButton.querySelector("span");

    if (icon) {
      icon.textContent = isDark ? "☀" : "☾";
    }

    toggleButton.setAttribute("aria-pressed", String(isDark));
  }

  try {
    localStorage.setItem("theme", isDark ? "dark" : "light");
  } catch (error) {
    // The theme still works for this page if storage is unavailable.
  }
}

// Load the saved theme.
let savedTheme = "light";

try {
  savedTheme = localStorage.getItem("theme") || "light";
} catch (error) {
  // Use light mode if browser storage is unavailable.
}

setDarkMode(savedTheme);

// Toggle theme when clicked.
if (toggleButton) {
  toggleButton.addEventListener("click", () => {
    const nextTheme = document.body.classList.contains("dark-mode")
      ? "light"
      : "dark";

    setDarkMode(nextTheme);
  });
}

// ========================================
// SUPPORT ASSISTANCE LINK
// ========================================

const supportLink = document.getElementById("support-assitance-link");

if (supportLink) {
  supportLink.addEventListener("click", (event) => {
    event.preventDefault();
  });
}

// ========================================
// RIDER REDIRECTION
// ========================================

const riderDispatch = document.getElementById("rider-dispatch");
const riderSectionButton = document.querySelector(
  '#become-a-rider a[href="pages/auth-choice.html"]',
);

const riderButton = riderDispatch || riderSectionButton;

if (riderButton) {
  riderButton.addEventListener("click", (event) => {
    event.preventDefault();

    // Change this destination when the rider registration flow is ready.
    window.location.href = "pages/login.html";
  });
}

// ========================================
// CHAT WIDGET
// ========================================

const chatToggle = document.getElementById("chatToggle");
const chatPanel = document.getElementById("chatPanel");
const chatClose = document.getElementById("chatClose");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatMessage");

function openChat() {
  if (!chatPanel || !chatToggle) return;

  chatPanel.classList.add("is-open");
  chatToggle.setAttribute("aria-expanded", "true");

  if (chatInput) {
    chatInput.focus();
  }
}

function closeChatPanel() {
  if (!chatPanel || !chatToggle) return;

  chatPanel.classList.remove("is-open");
  chatToggle.setAttribute("aria-expanded", "false");
}

if (chatToggle) {
  chatToggle.addEventListener("click", () => {
    const isOpen = chatPanel?.classList.contains("is-open");

    if (isOpen) {
      closeChatPanel();
    } else {
      openChat();
    }
  });
}

if (chatClose) {
  chatClose.addEventListener("click", closeChatPanel);
}

// ========================================
// CHAT MESSAGES
// ========================================

function addChatMessage(text, type) {
  if (!chatPanel) return null;

  const chatBody = chatPanel.querySelector(".chat-body");

  if (!chatBody) return null;

  const message = document.createElement("div");
  message.classList.add("chat-message", type);

  // Use textContent so message text is not interpreted as HTML.
  const messageText = document.createElement("span");
  messageText.textContent = text;

  const timestamp = document.createElement("span");
  timestamp.classList.add("chat-timestamp");
  timestamp.textContent = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  message.append(messageText, timestamp);
  chatBody.appendChild(message);
  chatBody.scrollTop = chatBody.scrollHeight;

  return message;
}

function sendChatMessage() {
  if (!chatInput) return;

  const messageText = chatInput.value.trim();

  if (!messageText) return;

  addChatMessage(messageText, "user");
  chatInput.value = "";

  // Simulated reply only. This does not contact a real support agent.
  const typingMessage = addChatMessage("Typing...", "bot");

  setTimeout(() => {
    if (typingMessage) {
      const text = typingMessage.querySelector("span");

      if (text) {
        text.textContent =
          "Thanks for reaching out! Our support messaging is not connected yet.";
      }
    }
  }, 1000);
}

if (chatForm) {
  chatForm.addEventListener("submit", (event) => {
    event.preventDefault();
    sendChatMessage();
  });
}

// ========================================
// CLOSE CHAT WHEN CLICKING OUTSIDE
// ========================================

document.addEventListener("click", (event) => {
  if (!chatPanel || !chatToggle) return;

  const clickedInsideChat = chatPanel.contains(event.target);
  const clickedToggle = chatToggle.contains(event.target);

  if (!clickedInsideChat && !clickedToggle) {
    closeChatPanel();
  }
});

// ========================================
// CURRENT YEAR
// ========================================

const currentYear = document.getElementById("currentYear");

if (currentYear) {
  currentYear.textContent = new Date().getFullYear();
}
