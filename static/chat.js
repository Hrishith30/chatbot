const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const suggestionArea = document.getElementById("suggestion-area");

let conversation = [];
let currentSuggestions = []; // --- NEW: Global variable to store suggestions

// --- NEW: Initialize the Markdown converter ---
const converter = new showdown.Converter();
// Optional: Tell it to handle lists without messing up
converter.setOption('simpleLineBreaks', true); 
converter.setOption('definitionLists', true); // --- MODIFIED: Enable definition lists ---


// --- NEW: Reusable function to load and show suggestions ---
async function loadAndDisplaySuggestions() {
    // Clear any old suggestions and reset padding
    removeSuggestions(); 
    suggestionArea.style.paddingBottom = "0.75rem"; // Restore padding

    try {
        // --- MODIFIED: Only fetch if suggestions aren't already loaded ---
        if (currentSuggestions.length === 0) {
            const res = await fetch("/get-suggestions");
            const data = await res.json();
            currentSuggestions = data.suggestions || []; // Store them
        }
        // --- End of modification ---
        
        if (currentSuggestions.length > 0) {
            const container = document.createElement("div");
            container.classList.add("suggestion-container");

            // Create the first set of blocks
            currentSuggestions.forEach(text => {
                const block = document.createElement("button"); 
                block.classList.add("suggestion-block");
                block.textContent = text;
                block.onclick = () => handleSuggestionClick(text); 
                container.appendChild(block);
            });
            
            // Clone the blocks for a seamless loop
            currentSuggestions.forEach(text => {
                const block = document.createElement("button"); 
                block.classList.add("suggestion-block");
                block.textContent = text;
                block.onclick = () => handleSuggestionClick(text); 
                container.appendChild(block);
            });

            // Add the container to the dedicated suggestion-area
            suggestionArea.appendChild(container);

            // Set animation speed based on content (1 second per suggestion)
            const duration = currentSuggestions.length * 1.0; 
            container.style.animationDuration = `${duration}s`;
        }
    } catch (err) {
        console.error("Failed to fetch suggestions:", err);
        currentSuggestions = []; // Reset on error
    }
}


// Function to display the initial welcome message AND suggestions
async function setupInitialUI() {
    // 1. Show the welcome message in the chat box
    const welcomeText = "Hello! I'm your Medical Chatbot. How can I help you today?<br><br><span class=\"disclaimer\"><strong>Disclaimer:</strong> I am an AI assistant and not a substitute for professional medical advice. Please consult a healthcare professional for any medical concerns.</span>";
    
    appendMessage("bot", welcomeText);
    
    // Add this message to the conversation history
    const historyText = "Hello! I'm your Medical Chatbot. How can I help you today?\n\nDisclaimer: I am an AI assistant and not a substitute for professional medical advice. Please consult a healthcare professional for any medical concerns.";
    conversation.push({ role: "bot", content: historyText });

    // 2. Create and add suggestion blocks to the suggestion area
    // --- MODIFIED: Call the new reusable function ---
    await loadAndDisplaySuggestions();
    // --- End of modification ---
}

// Wait for the DOM to be fully loaded before setting up
document.addEventListener("DOMContentLoaded", () => {
    setupInitialUI(); // Call the async function
});

// Helper function to remove suggestion blocks
function removeSuggestions() {
    suggestionArea.innerHTML = '';
    suggestionArea.style.paddingBottom = "0";
}

// Helper function to handle clicking a suggestion
function handleSuggestionClick(text) {
    userInput.value = text;
    sendMessage();
}


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

// Append a message to chat
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

    // --- MODIFIED: Use a DIV instead of a P tag for the text container ---
    const msgText = document.createElement("div");
    msgText.classList.add("message-text"); // Add class for styling
    msgText.innerHTML = text; // Use innerHTML to render line breaks

    msgContent.appendChild(author);
    msgContent.appendChild(msgText); // Add the new div
    msgWrapper.appendChild(img);
    msgWrapper.appendChild(msgContent);

    chatBox.appendChild(msgWrapper);
    scrollToBottom();
}

// Show bot typing animation
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

    // --- MODIFIED: This line was removed so suggestions don't reload ---
    // loadAndDisplaySuggestions(); 

    const safeText = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    appendMessage("user", safeText);
    conversation.push({ role: "user", content: text });
    
    userInput.value = "";
    userInput.style.height = "auto";
    userInput.style.overflowY = "hidden";

    const typingDiv = showBotTyping();

    try {
        const res = await fetch("/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ conversation }),
        });

        const data = await res.json();
        removeBotTyping(); 

        let rawResponse = data.bot_response;

        // --- NEW: Fix non-standard bullet points (e.g., "** item") ---
        // Converts lines starting with "** " to "* "
        const bulletResponse = rawResponse.replace(/^(\s*)\*\*\s/gm, '$1* ');
        // --- End of bullet point fix ---

        // --- MODIFICATION: Handle * and ** for bolding ---
        // This regex finds content wrapped in single asterisks (e.g., *text*)
        // but NOT content already in double asterisks (e.g., **text**)
        // and converts it to double-asterisk format.
        const boldedResponse = bulletResponse.replace(/(?<!\*)\*([^\*]+)\*(?!\*)/g, '**$1**');
        // --- End of bolding modification ---

        // Convert Markdown to HTML (using the modified response)
        let htmlResponse = converter.makeHtml(boldedResponse);
        
        // --- MODIFICATION: Add disclaimer, but ONLY if not already present (case-insensitive) ---
        const disclaimerHtml = "<br><br><span class=\"disclaimer\"><strong>Disclaimer:</strong> I am an AI assistant and not a substitute for professional medical advice. Please consult a healthcare professional for any medical concerns.</span>";
        
        // Check if the bot's raw response or HTML response already has the disclaimer
        const disclaimerTextCheck = "disclaimer: i am an ai assistant"; // Check in lowercase
        if (!htmlResponse.toLowerCase().includes(disclaimerTextCheck) && !rawResponse.toLowerCase().includes(disclaimerTextCheck)) {
            htmlResponse += disclaimerHtml;
        }
        // --- End of modification ---
        
        appendMessage("bot", htmlResponse); // Use the modified htmlResponse
        conversation.push({ role: "bot", content: data.bot_response }); // Still save raw text
        
    } catch (err) {
        removeBotTyping();
        appendMessage("bot", "⚠️ Server error. Please try again.");
        console.error(err);
    }
}

// Event listeners
sendBtn.addEventListener("click", sendMessage);

userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});