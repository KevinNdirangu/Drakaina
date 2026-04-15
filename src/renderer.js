const { ipcRenderer } = require('electron');

// Drakaina 1.3.3 - Electron Edition
let learnedResponses = {};
let chatHistory = [];

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
const clearHistoryBtn = document.getElementById('clear-history');
const manageLearnedBtn = document.getElementById('manage-learned');
const aboutBtn = document.getElementById('about-btn');
const aboutModal = document.getElementById('about-modal');
const closeAboutBtn = document.getElementById('close-about');

let pendingQuestion = '';

/**
 * File Persistence Logic
 */
function saveData(file, data) {
    ipcRenderer.send('save-data', { file, data });
}

function loadData(file) {
    ipcRenderer.send('load-data', { file });
}

ipcRenderer.on('load-data-success', (event, { file, data }) => {
    if (file === 'knowledge.json') {
        learnedResponses = data || {};
    } else if (file === 'history.json') {
        chatHistory = data || [];
        renderHistory();
    }
});

/**
 * Advanced Intent Recognition (Enhanced Score-based)
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
        identity: 0,
        sysinfo: 0,
        project: 0
    };

    // Time keywords
    if (/\b(time|clock|hour|minutes|what.*time|current.*time)\b/.test(text)) scores.time += 3;

    // Date keywords
    if (/\b(date|day|today|month|year|calendar|what.*date)\b/.test(text)) scores.date += 3;

    // Morse keywords
    if (/\b(morse|dots|dashes|translate.*to.*morse)\b/.test(text)) scores.morse += 4;

    // QR keywords
    if (/\b(qr|code|scan|barcode|generate.*qr)\b/.test(text)) scores.qr += 3;

    // Note keywords
    if (/\b(note|remember|memo|remind|save.*note)\b/.test(text)) scores.note += 3;

    // Weather keywords
    if (/\b(weather|temperature|forecast|climate|rain|sun|in.*(\w+))\b/.test(text)) scores.weather += 3;

    // Identity keywords
    if (/\b(who|name|drakaina|aegon|identity|who.*are.*you)\b/.test(text)) scores.identity += 4;

    // System info keywords
    if (/\b(system|cpu|memory|ram|stats|performance|usage)\b/.test(text)) scores.sysinfo += 3;

    // Project keywords
    if (/\b(project|status|current|working|active)\b/.test(text)) scores.project += 3;

    let bestIntent = 'unknown';
    let highestScore = 2; 

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
    saveData('history.json', chatHistory);
}

function renderHistory() {
    responseArea.innerHTML = '';
    chatHistory.forEach(m => {
        const div = document.createElement('div');
        div.className = `message ${m.sender}`;
        div.textContent = m.text;
        responseArea.appendChild(div);
    });
    responseArea.scrollTop = responseArea.scrollHeight;
}

function speak(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    
    // Correct pronunciation for "Ndirangu" before speaking
    let processedText = text.replace(/Ndirangu/g, 'Dirarngo');
    
    const utterance = new SpeechSynthesisUtterance(processedText);
    const voices = window.speechSynthesis.getVoices();
    
    // Attempt to find a high-quality "English" voice
    const preferredVoices = ['Google US English', 'Samantha', 'Microsoft Zira', 'Microsoft Sarah'];
    let selectedVoice = voices.find(v => preferredVoices.includes(v.name));
    
    if (!selectedVoice) {
        selectedVoice = voices.find(v => v.lang.startsWith('en-'));
    }
    
    if (selectedVoice) {
        utterance.voice = selectedVoice;
        console.log(`Using voice: ${selectedVoice.name}`);
    }
    
    utterance.rate = 1.05;
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
                saveData('notes.json', { note: noteText, time: new Date().toLocaleString() });
                response = "Strategic note saved to JSON memory.";
            } else {
                response = "What would you like me to remember?";
            }
            break;
        case 'weather':
            response = "I can see you're asking about the weather! I currently don't have an active API key to fetch live data, but I can help you set one up in the code.";
            break;
        case 'sysinfo':
            const si = require('systeminformation');
            Promise.all([si.currentLoad(), si.mem(), si.battery()]).then(([load, mem, batt]) => {
                const cpu = load.currentLoad.toFixed(1);
                const ram = ((mem.used / mem.total) * 100).toFixed(1);
                const battStatus = batt.hasBattery ? `, Battery at ${batt.percent}% (${batt.isCharging ? 'Charging' : 'Discharging'})` : '';
                const msg = `System status: CPU at ${cpu}% and Memory at ${ram}%${battStatus}.`;
                addMessage(msg, 'assistant');
                speak(msg);
            });
            return; // Exit early as we add the message in the promise
        case 'project':
            response = "Active Projects: \n1. PROJECT BETA (HR Tool) - On Break\n2. Echoes of Deception (Book) - Writing\n3. Drakaina (Digital Companion) - Evolution v1.3.5";
            break;
        default:
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
}

// Listeners
sendBtn.onclick = () => { processInput(userInput.value); userInput.value = ''; };
userInput.onkeypress = (e) => { if (e.key === 'Enter') sendBtn.click(); };

aboutBtn.onclick = () => aboutModal.style.display = 'flex';
closeAboutBtn.onclick = () => aboutModal.style.display = 'none';

themeToggle.onclick = toggleTheme;
manageLearnedBtn.onclick = showLearnedResponses;

clearHistoryBtn.onclick = () => {
    if (confirm("Are you sure you want to clear the entire chat history?")) {
        chatHistory = [];
        saveData('history.json', chatHistory);
        renderHistory();
        addMessage("Chat history has been cleared. How shall we proceed, Ndirangu?", "assistant");
    }
};

voiceBtn.onclick = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Voice recognition is not supported in this environment.");
        return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.onstart = () => {
        voiceBtn.textContent = '🛑';
        voiceBtn.style.background = '#dc3545';
    };
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        userInput.value = transcript;
        processInput(transcript);
    };
    recognition.onerror = (event) => {
        console.error("Speech Recognition Error:", event.error);
        alert(`Voice Recognition Error: ${event.error}. Please try typing instead!`);
        voiceBtn.textContent = '🎤';
        voiceBtn.style.background = '#28a745';
    };
    recognition.onend = () => {
        voiceBtn.textContent = '🎤';
        voiceBtn.style.background = '#28a745';
    };
    recognition.start();
};

saveLearnBtn.onclick = () => {
    const answer = assistantResponseInput.value.trim();
    if (answer && pendingQuestion) {
        learnedResponses[pendingQuestion.toLowerCase()] = answer;
        saveData('knowledge.json', learnedResponses);
        addMessage("Knowledge acquired and saved to the JSON memory bank.", "assistant");
    }
    modal.style.display = 'none';
};

cancelLearnBtn.onclick = () => modal.style.display = 'none';

window.onload = () => {
    loadData('knowledge.json');
    loadData('history.json');

    window.speechSynthesis.getVoices();
    if (!chatHistory.length) addMessage("Hello Ndirangu. Drakaina 1.2.1 is online. How shall we proceed?", "assistant");
};
