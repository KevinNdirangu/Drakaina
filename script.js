// Virtual Assistant - Fully Enhanced Version (More Learned)
let learnedResponses = JSON.parse(localStorage.getItem('learnedResponses')) || {};
let chatHistory = JSON.parse(localStorage.getItem('chatHistory')) || [];
let chatContext = []; // For short-term memory (last 10 exchanges)
const MAX_CONTEXT = 10;

const responseArea = document.getElementById('response-area');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const voiceBtn = document.getElementById('voice-btn');
const modal = document.getElementById('learn-modal');
const learnedQuestion = document.getElementById('learned-question');
const assistantResponseInput = document.getElementById('assistant-response');
const saveLearnBtn = document.getElementById('save-learn');
const cancelLearnBtn = document.getElementById('cancel-learn');
const themeToggle = document.getElementById('theme-toggle');
const manageLearnedBtn = document.getElementById('manage-learned');

let pendingQuestion = '';

// Enhanced Intent Recognition
function recognizeIntent(input) {
    const lower = input.toLowerCase().trim();
    if (/(\btime\b|what.*time|current time|time now|clock)/i.test(lower)) return 'time';
    if (/(\bdate\b|today.*date|current date|what day|day today)/i.test(lower)) return 'date';
    if (/morse|to morse code|translate.*morse/i.test(lower)) return 'morse';
    if (/qr code|generate qr|make qr|qr for/i.test(lower)) return 'qr_code';
    if (/take a note|save a note|remember|note that|add note/i.test(lower)) return 'note';
    return 'unknown';
}

// Lightweight string similarity (edit distance)
function stringSimilarity(str1, str2) {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    const longerLen = longer.length;
    if (longerLen === 0) return 1.0;
    return (longerLen - editDistance(longer, shorter)) / longerLen;
}

function editDistance(s1, s2) {
    let costs = new Array(s2.length + 1);
    for (let i = 0; i <= s2.length; i++) costs[i] = i;
    let prevCost;
    for (let i = 0; i < s1.length; i++) {
        prevCost = i + 1;
        for (let j = 0; j < s2.length; j++) {
            const newCost = s1[i] === s2[j] ? costs[j] : costs[j] + 1;
            costs[j] = prevCost;
            prevCost = newCost;
        }
        costs[s2.length] = prevCost;
    }
    return costs[s2.length];
}

// Find best learned response using similarity
function findBestLearnedResponse(input) {
    let bestMatch = null;
    let highestScore = 0.68; // Minimum similarity threshold

    for (const [key, response] of Object.entries(learnedResponses)) {
        const score = stringSimilarity(input, key);
        if (score > highestScore) {
            highestScore = score;
            bestMatch = response;
        }
    }
    return bestMatch;
}

// Load chat history
function loadChatHistory() {
    responseArea.innerHTML = '';
    chatHistory.forEach(msg => {
        const div = document.createElement('div');
        div.className = `message ${msg.sender}`;
        div.textContent = msg.text;
        responseArea.appendChild(div);
    });
    responseArea.scrollTop = responseArea.scrollHeight;
}

// Save to history
function saveChatHistory(sender, text) {
    chatHistory.push({ sender, text });
    if (chatHistory.length > 100) chatHistory.shift();
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
}

// Add message
function addMessage(text, sender) {
    const div = document.createElement('div');
    div.className = `message ${sender}`;
    div.textContent = text;
    responseArea.appendChild(div);
    responseArea.scrollTop = responseArea.scrollHeight;
    saveChatHistory(sender, text);
}

// Text-to-Speech
function speak(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.05;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
    }
}

// Morse Code
const MORSE_CODE_DICT = {
    'a': '.-', 'b': '-...', 'c': '-.-.', 'd': '-..', 'e': '.', 'f': '..-.', 'g': '--.',
    'h': '....', 'i': '..', 'j': '.---', 'k': '-.-', 'l': '.-..', 'm': '--', 'n': '-.',
    'o': '---', 'p': '.--.', 'q': '--.-', 'r': '.-.', 's': '...', 't': '-', 'u': '..-',
    'v': '...-', 'w': '.--', 'x': '-..-', 'y': '-.--', 'z': '--..',
    '1': '.----', '2': '..---', '3': '...--', '4': '....-', '5': '.....',
    '6': '-....', '7': '--...', '8': '---..', '9': '----.', '0': '-----', ' ': '/'
};

function textToMorse(text) {
    return text.toLowerCase().split('').map(char => MORSE_CODE_DICT[char] || char).join(' ');
}

// QR Code
function generateQRCode(data) {
    const qrDiv = document.createElement('div');
    qrDiv.style.margin = "15px 0";
    responseArea.appendChild(qrDiv);
    new QRCode(qrDiv, { text: data, width: 200, height: 200 });
}

// Save Note
function saveNote(note) {
    let notes = JSON.parse(localStorage.getItem('assistant_notes')) || [];
    notes.push({ text: note, time: new Date().toLocaleString() });
    localStorage.setItem('assistant_notes', JSON.stringify(notes));
}

// Show all learned responses
function showLearnedResponses() {
    let message = "Learned Responses:\n\n";
    const entries = Object.entries(learnedResponses);
    if (entries.length === 0) {
        message += "No responses learned yet.";
    } else {
        entries.forEach(([q, a], i) => {
            message += `${i+1}. "${q}" → "${a}"\n`;
        });
    }
    addMessage(message, 'assistant');
    speak("Here are the responses I have learned.");
}

// Process Input (Core Logic)
function processInput(input) {
    if (!input.trim()) return;

    addMessage(input, 'user');
    chatContext.push({ role: 'user', text: input });
    if (chatContext.length > MAX_CONTEXT) chatContext.shift();

    const intent = recognizeIntent(input);
    let response = "";

    if (intent === 'time') {
        response = `The current time is ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (intent === 'date') {
        response = `Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`;
    } else if (intent === 'morse') {
        const text = input.replace(/translate (.+) to morse/i, '$1').trim() || input;
        response = textToMorse(text);
    } else if (intent === 'qr_code') {
        const data = input.replace(/generate qr code for |qr for /i, '').trim();
        if (data) {
            generateQRCode(data);
            response = `QR code for "${data}" generated below.`;
        } else {
            response = "Please specify the content for the QR code.";
        }
    } else if (intent === 'note') {
        const noteText = input.replace(/take a note|save a note|remember|note that/i, '').trim();
        if (noteText) {
            saveNote(noteText);
            response = "Note saved successfully.";
        } else {
            response = "What would you like me to remember?";
        }
    } else {
        let learned = learnedResponses[input.toLowerCase()];
        if (!learned) {
            learned = findBestLearnedResponse(input);
        }
        if (learned) {
            response = learned;
        } else {
            response = "I'm not sure how to respond to that yet. Would you like to teach me?";
            setTimeout(() => {
                pendingQuestion = input;
                learnedQuestion.textContent = input;
                assistantResponseInput.value = '';
                modal.style.display = 'flex';
                assistantResponseInput.focus();
            }, 800);
        }
    }

    addMessage(response, 'assistant');
    chatContext.push({ role: 'assistant', text: response });
    if (chatContext.length > MAX_CONTEXT) chatContext.shift();

    speak(response);
}

// Theme Toggle
function toggleTheme() {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    themeToggle.textContent = isDark ? '☀️' : '🌙';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

// Event Listeners
sendBtn.addEventListener('click', () => {
    const input = userInput.value.trim();
    if (input) {
        processInput(input);
        userInput.value = '';
    }
});

userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendBtn.click();
});

voiceBtn.addEventListener('click', () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Voice recognition is not supported in this browser.");
        return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        userInput.value = transcript;
        processInput(transcript);
    };
    recognition.start();
});

themeToggle.addEventListener('click', toggleTheme);
manageLearnedBtn.addEventListener('click', showLearnedResponses);

saveLearnBtn.addEventListener('click', () => {
    const answer = assistantResponseInput.value.trim();
    if (answer && pendingQuestion) {
        learnedResponses[pendingQuestion.toLowerCase()] = answer;
        localStorage.setItem('learnedResponses', JSON.stringify(learnedResponses));
        addMessage("Thank you! I've learned this response.", "assistant");
        speak("Thank you! I've learned how to respond.");
    }
    modal.style.display = 'none';
});

cancelLearnBtn.addEventListener('click', () => {
    modal.style.display = 'none';
});

// Initialize
window.onload = () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.body.classList.add('dark');
        themeToggle.textContent = '☀️';
    }

    loadChatHistory();
    speechSynthesis.getVoices();

    if (chatHistory.length === 0) {
        const welcome = "Hello! How can I assist you today?";
        addMessage(welcome, 'assistant');
        speak(welcome);
    }
};