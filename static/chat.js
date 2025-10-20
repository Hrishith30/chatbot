const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");

let conversation = [];

// Scroll smoothly to bottom
function scrollToBottom() {
    chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: "smooth" });
}

// Auto-resize textarea
userInput.addEventListener("input", () => {
    userInput.style.height = "auto";
    let newHeight = userInput.scrollHeight;
    const maxHeight = 200; // Matches CSS
    
    if (newHeight > maxHeight) {
        userInput.style.height = maxHeight + "px";
        userInput.style.overflowY = "auto";
    } else {
        userInput.style.height = newHeight + "px";
        userInput.style.overflowY = "hidden";
    }
});

// Append a message to chat (ChatGPT-style structure)
function appendMessage(role, text) {
    const msgWrapper = document.createElement("div");
    msgWrapper.classList.add("message-wrapper", role);

    const img = document.createElement("img");
    img.src = role === "user" ? "/static/images/user.png" : "/static/images/bot.png";
    img.alt = role;
    img.classList.add("avatar");

    const msgContent = document.createElement("div");
    msgContent.classList.add("message-content");

    const author = document.createElement("strong");
    author.textContent = role === "user" ? "You" : "Bot";

    const msgText = document.createElement("p");
    msgText.innerHTML = text; // Use innerHTML to render line breaks

    msgContent.appendChild(author);
    msgContent.appendChild(msgText);
    msgWrapper.appendChild(img);
    msgWrapper.appendChild(msgContent);

    chatBox.appendChild(msgWrapper);
    scrollToBottom();
}

// Show bot typing animation (ChatGPT-style structure)
function showBotTyping() {
    const msgWrapper = document.createElement("div");
    msgWrapper.classList.add("message-wrapper", "bot", "typing-indicator");

    const img = document.createElement("img");
    img.src = "/static/images/bot.png";
    img.alt = "bot";
    img.classList.add("avatar");

    const msgContent = document.createElement("div");
    msgContent.classList.add("message-content");

    const author = document.createElement("strong");
    author.textContent = "Bot";

    const typingDots = document.createElement("div");
    typingDots.classList.add("typing");
    for (let i = 0; i < 3; i++) {
        const dot = document.createElement("span");
        typingDots.appendChild(dot);
    }

    msgContent.appendChild(author);
    msgContent.appendChild(typingDots);
    msgWrapper.appendChild(img);
    msgWrapper.appendChild(msgContent);
    
    chatBox.appendChild(msgWrapper);
    scrollToBottom();

    return msgWrapper; // Return the typing indicator element
}

// Remove bot typing animation
function removeBotTyping() {
    const typingIndicator = chatBox.querySelector(".typing-indicator");
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// Send message
async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    // Show user message immediately
    // Basic HTML escaping
    const safeText = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    appendMessage("user", safeText);
    conversation.push({ role: "user", content: text });
    
    // Reset textarea
    userInput.value = "";
    userInput.style.height = "auto";
    userInput.style.overflowY = "hidden";


    // Show bot typing
    const typingDiv = showBotTyping();

    try {
        const res = await fetch("/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ conversation }),
        });

        const data = await res.json();
        removeBotTyping(); // Remove typing animation
        
        // Convert newlines from model response to <br> tags
        const botResponse = data.bot_response.replace(/\n/g, '<br>');
        
        appendMessage("bot", botResponse);
        conversation.push({ role: "bot", content: data.bot_response });
    } catch (err) {
        removeBotTyping();
        appendMessage("bot", "⚠️ Server error. Please try again.");
        console.error(err);
    }
}

// Event listeners
sendBtn.addEventListener("click", sendMessage);

userInput.addEventListener("keypress", (e) => {
    // Send on Enter, but allow new line with Shift+Enter
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault(); // Prevent new line
        sendMessage();
    }
});