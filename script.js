// Drakaina 1.2.0 - Advanced Intent & Learning System
let learnedResponses = JSON.parse(localStorage.getItem('learnedResponses')) || {};
let chatHistory = JSON.parse(localStorage.getItem('chatHistory')) || [];

// Constants
const MAX_HISTORY = 100;
const SIMILARITY_THRESHOLD = 0.7;

// DOM Elements
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
const aboutBtn = document.getElementById('about-btn');
const aboutModal = document.getElementById('about-modal');
const closeAboutBtn = document.getElementById('close-about');

let pendingQuestion = '';

/**
 * Advanced Intent Recognition (Score-based)
 */
function recognizeIntent(input) {
    const text = input.toLowerCase().trim();
    const scores = {
        time: 0,
        date: 0,
        morse: 0,
        qr: 0,
        note: 0,
        weather: 0,
        identity: 0
    };

    // Time keywords
    if (/\b(time|clock|hour|minutes)\b/.test(text)) scores.time += 2;
    if (/\b(what|current|tell|now)\b/.test(text) && scores.time > 0) scores.time += 1;

    // Date keywords
    if (/\b(date|day|today|month|year|calendar)\b/.test(text)) scores.date += 2;

    // Morse keywords
    if (/\b(morse|dots|dashes)\b/.test(text)) scores.morse += 3;
    if (/\b(translate|code|to)\b/.test(text)) scores.morse += 1;

    // QR keywords
    if (/\b(qr|code|scan|barcode)\b/.test(text)) scores.qr += 2;
    if (/\b(generate|make|create)\b/.test(text)) scores.qr += 1;

    // Note keywords
    if (/\b(note|remember|memo|remind)\b/.test(text)) scores.note += 2;
    if (/\b(take|save|write)\b/.test(text)) scores.note += 1;

    // Weather keywords (New from app.py)
    if (/\b(weather|temperature|forecast|climate|rain|sun)\b/.test(text)) scores.weather += 3;
    if (/\b(in|at|for)\b/.test(text) && scores.weather > 0) scores.weather += 1;

    // Identity keywords
    if (/\b(who|name|drakaina|aegon|identity)\b/.test(text)) scores.identity += 2;

    // Find the highest score
    let bestIntent = 'unknown';
    let highestScore = 2; // Minimum score to qualify

    for (const [intent, score] of Object.entries(scores)) {
        if (score > highestScore) {
            highestScore = score;
            bestIntent = intent;
        }
    }

    return bestIntent;
}

/**
 * Fuzzy String Matching
 */
function stringSimilarity(str1, str2) {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    if (s1 === s2) return 1.0;
    
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    const longerLen = longer.length;
    if (longerLen === 0) return 1.0;
    
    return (longerLen - editDistance(longer, shorter)) / longerLen;
}

function editDistance(s1, s2) {
    let costs = new Array(s2.length + 1);
    for (let i = 0; i <= s2.length; i++) costs[i] = i;
    for (let i = 0; i < s1.length; i++) {
        let prevCost = i + 1;
        for (let j = 0; j < s2.length; j++) {
            const newCost = s1[i] === s2[j] ? costs[j] : Math.min(costs[j], costs[j + 1], prevCost) + 1;
            costs[j] = prevCost;
            prevCost = newCost;
        }
        costs[s2.length] = prevCost;
    }
    return costs[s2.length];
}

/**
 * UI Actions
 */
function addMessage(text, sender) {
    const div = document.createElement('div');
    div.className = `message ${sender}`;
    div.textContent = text;
    responseArea.appendChild(div);
    responseArea.scrollTop = responseArea.scrollHeight;
    
    chatHistory.push({ sender, text, time: new Date().getTime() });
    if (chatHistory.length > MAX_HISTORY) chatHistory.shift();
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
}

function speak(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    utterance.voice = voices.find(v => v.name.includes('Google') || v.name.includes('Samantha') || v.lang === 'en-US');
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
}

/**
 * Response Processing
 */
function processInput(input) {
    if (!input.trim()) return;
    addMessage(input, 'user');

    const intent = recognizeIntent(input);
    let response = "";

    switch (intent) {
        case 'time':
            response = `Current time is ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            break;
        case 'date':
            response = `Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`;
            break;
        case 'identity':
            response = "I am Drakaina, a digital companion powered by Aegon 🐉. I am here to help you manage your strategic workflows.";
            break;
        case 'morse':
            const textToConvert = input.replace(/translate|to|morse|code/gi, '').trim() || input;
            response = textToMorse(textToConvert);
            break;
        case 'qr':
            const qrData = input.replace(/generate|make|create|qr|code|for/gi, '').trim();
            if (qrData) {
                generateQRCode(qrData);
                response = `Generated QR code for: "${qrData}"`;
            } else {
                response = "What data should I encode into the QR?";
            }
            break;
        case 'note':
            const noteText = input.replace(/take|save|write|note|remember|memo/gi, '').trim();
            if (noteText) {
                saveNote(noteText);
                response = "Strategic note saved to local memory.";
            } else {
                response = "What would you like me to remember?";
            }
            break;
        case 'weather':
            response = "I can see you're asking about the weather! I currently don't have an active API key to fetch live data, but I can help you set one up in the code.";
            break;
        default:
            // Check learned responses with fuzzy matching
            let bestMatch = null;
            let highestScore = SIMILARITY_THRESHOLD;

            for (const [q, a] of Object.entries(learnedResponses)) {
                const score = stringSimilarity(input, q);
                if (score > highestScore) {
                    highestScore = score;
                    bestMatch = a;
                }
            }

            if (bestMatch) {
                response = bestMatch;
            } else {
                response = "My current logic doesn't cover this request. Would you like to teach me how to respond?";
                setTimeout(() => {
                    pendingQuestion = input;
                    learnedQuestion.textContent = input;
                    assistantResponseInput.value = '';
                    modal.style.display = 'flex';
                }, 800);
            }
    }

    if (response) {
        addMessage(response, 'assistant');
        speak(response);
    }
}

// Helpers
function textToMorse(text) {
    const dict = { 'a': '.-', 'b': '-...', 'c': '-.-.', 'd': '-..', 'e': '.', 'f': '..-.', 'g': '--.', 'h': '....', 'i': '..', 'j': '.---', 'k': '-.-', 'l': '.-..', 'm': '--', 'n': '-.', 'o': '---', 'p': '.--.', 'q': '--.-', 'r': '.-.', 's': '...', 't': '-', 'u': '..-', 'v': '...-', 'w': '.--', 'x': '-..-', 'y': '-.--', 'z': '--..', '1': '.----', '2': '..---', '3': '...--', '4': '....-', '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.', '0': '-----', ' ': '/' };
    return text.toLowerCase().split('').map(c => dict[c] || c).join(' ');
}

function generateQRCode(data) {
    const qrDiv = document.createElement('div');
    qrDiv.style.margin = "15px 0";
    responseArea.appendChild(qrDiv);
    new QRCode(qrDiv, { text: data, width: 200, height: 200 });
}

function saveNote(text) {
    let notes = JSON.parse(localStorage.getItem('drakaina_notes')) || [];
    notes.push({ text, time: new Date().toLocaleString() });
    localStorage.setItem('drakaina_notes', JSON.stringify(notes));
}

function showLearnedResponses() {
    const entries = Object.entries(learnedResponses);
    let msg = entries.length ? "Learned Knowledge:\n\n" : "No learned responses yet.";
    entries.forEach(([q, a], i) => msg += `${i+1}. "${q}" → "${a}"\n`);
    addMessage(msg, 'assistant');
}

function toggleTheme() {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    themeToggle.textContent = isDark ? '☀️' : '🌙';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

// Listeners
sendBtn.onclick = () => { processInput(userInput.value); userInput.value = ''; };
userInput.onkeypress = (e) => { if (e.key === 'Enter') sendBtn.click(); };

aboutBtn.onclick = () => aboutModal.style.display = 'flex';
closeAboutBtn.onclick = () => aboutModal.style.display = 'none';
themeToggle.onclick = toggleTheme;
manageLearnedBtn.onclick = showLearnedResponses;

saveLearnBtn.onclick = () => {
    const answer = assistantResponseInput.value.trim();
    if (answer && pendingQuestion) {
        learnedResponses[pendingQuestion.toLowerCase()] = answer;
        localStorage.setItem('learnedResponses', JSON.stringify(learnedResponses));
        addMessage("Understood. I have added this to my knowledge base.", "assistant");
    }
    modal.style.display = 'none';
};

cancelLearnBtn.onclick = () => modal.style.display = 'none';

window.onload = () => {
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark');
        themeToggle.textContent = '☀️';
    }
    
    // Load History
    chatHistory.forEach(m => {
        const div = document.createElement('div');
        div.className = `message ${m.sender}`;
        div.textContent = m.text;
        responseArea.appendChild(div);
    });
    responseArea.scrollTop = responseArea.scrollHeight;

    window.speechSynthesis.getVoices();
    if (!chatHistory.length) addMessage("Hello Ndirangu. Drakaina is online. How shall we proceed?", "assistant");
};
