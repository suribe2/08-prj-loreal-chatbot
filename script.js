/* ——————————————————————————————————————————
   L'Oréal Beauty Advisor — script.js
   Sends conversation history to a Cloudflare Worker
   which proxies to OpenAI's chat completions API.
   Response is read from data.choices[0].message.content
—————————————————————————————————————————— */

/* —— Config —— */
const WORKER_URL = "https://green-violet-8681.sebastian-us.workers.dev"; // e.g. https://loreal-advisor.yourname.workers.dev

const SYSTEM_PROMPT = `You are an expert L'Oréal Paris Beauty Advisor with deep knowledge of L'Oréal's full product range, including skincare, makeup, haircare, and fragrance lines.

Your role is to:
- Help users discover L'Oréal products that suit their skin type, tone, concerns, and lifestyle
- Recommend personalised skincare and haircare routines
- Explain ingredients and their benefits in simple, friendly language
- Suggest complementary products and how to layer or combine them
- Answer questions about specific L'Oréal product lines (e.g. Revitalift, True Match, Elvive, Color Riche)

IMPORTANT: You must ONLY answer questions related to L'Oréal products, beauty routines, skincare, makeup, haircare, fragrance, or closely related beauty topics. If a user asks about anything unrelated to these topics, politely let them know you can only help with L'Oréal and beauty-related questions, and gently steer them back to what you can help with.

Tone: warm, knowledgeable, luxurious but approachable. Keep responses concise (2-4 short paragraphs max). Write in flowing prose — no markdown headers or bullet symbols. Always end with a helpful follow-up question to understand the user better.`;

/* —— DOM elements —— */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const sendBtn = document.getElementById("sendBtn");
const currentQuestion = document.getElementById("currentQuestion");
const questionText = document.getElementById("questionText");
const chips = document.querySelectorAll(".chip");

/* —— Conversation history —— */
const messages = [];

/* —— Render initial greeting —— */
appendMessage(
  "ai",
  "Hello! I'm your L'Oréal Paris Beauty Advisor. Whether you're looking for the perfect moisturiser, a bold lip colour, or a haircare routine that works for you — I'm here to help. What can I do for you today?",
);

/* —— Suggestion chips —— */
chips.forEach((chip) => {
  chip.addEventListener("click", () => {
    userInput.value = chip.textContent;
    chatForm.dispatchEvent(new Event("submit"));
  });
});

/* —— Form submit —— */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const text = userInput.value.trim();
  if (!text) return;

  // Show current question above chat window (resets each time)
  questionText.textContent = text;
  currentQuestion.classList.remove("hidden");

  // Show user message bubble in chat
  appendMessage("user", text);
  userInput.value = "";
  setLoading(true);

  // Add to conversation history
  messages.push({ role: "user", content: text });

  // Show typing indicator
  const typingEl = showTyping();

  try {
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
      }),
    });

    const data = await response.json();
    const reply = data.choices[0].message.content;

    // Add assistant reply to history
    messages.push({ role: "assistant", content: reply });

    // Remove typing indicator and show reply
    typingEl.remove();
    appendMessage("ai", reply);
  } catch (err) {
    typingEl.remove();
    appendMessage(
      "ai",
      "I'm sorry, I'm having a little trouble connecting right now. Please check that your Cloudflare Worker URL is set in script.js and try again.",
    );
    console.error("API error:", err);
  } finally {
    setLoading(false);
  }
});

/* —— Helpers —— */

function appendMessage(role, text) {
  const wrapper = document.createElement("div");
  wrapper.classList.add("msg", role);

  const label = document.createElement("div");
  label.classList.add("msg-label");
  label.textContent = role === "user" ? "You" : "L'Oréal Advisor";

  const bubble = document.createElement("div");
  bubble.classList.add("msg-bubble");
  bubble.textContent = text;

  wrapper.appendChild(label);
  wrapper.appendChild(bubble);
  chatWindow.appendChild(wrapper);
  scrollToBottom();
}

function showTyping() {
  const wrapper = document.createElement("div");
  wrapper.classList.add("msg", "ai");

  const label = document.createElement("div");
  label.classList.add("msg-label");
  label.textContent = "L'Oréal Advisor";

  const indicator = document.createElement("div");
  indicator.classList.add("typing-indicator");
  indicator.innerHTML = "<span></span><span></span><span></span>";

  wrapper.appendChild(label);
  wrapper.appendChild(indicator);
  chatWindow.appendChild(wrapper);
  scrollToBottom();
  return wrapper;
}

function scrollToBottom() {
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function setLoading(isLoading) {
  sendBtn.disabled = isLoading;
  userInput.disabled = isLoading;
}
