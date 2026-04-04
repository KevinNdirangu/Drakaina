// Virtual Assistant - Enhanced Web Version
let learnedResponses = JSON.parse(localStorage.getItem('learnedResponses')) || {};

const responseArea = document.getElementById('response-area');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const voiceBtn = document.getElementById('voice-btn');
const modal = document.getElementById('learn-modal');
const learnedQuestion = document.getElementById('learned-question');
const assistantResponseInput = document.getElementById('assistant-response');
const saveLearnBtn = document.getElementById('save-learn');
const cancelLearnBtn = document.getElementById('cancel-learn');

let pendingQuestion = '';

// Text-to-Speech with better voice selection
function speak(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Try to use a more natural voice
        const voices = speechSynthesis.getVoices();
        const preferredVoice = voices.find(voice => 
            voice.name.includes('Samantha') || 
            voice.name.includes('Karen') || 
            voice.lang.includes('en-US')
        );
        
        if (preferredVoice) utterance.voice = preferredVoice;
        
        utterance.rate = 1.05;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
    }
}

// Add message to chat
function addMessage(text, sender) {
    const div = document.createElement('div');
    div.className = `message ${sender}`;
    div.textContent = text;
    responseArea.appendChild(div);
    responseArea.scrollTop = responseArea.scrollHeight;
}

// Save learned response
function saveLearnedResponse(question, answer) {
    learnedResponses[question.toLowerCase()] = answer;
    localStorage.setItem('learnedResponses', JSON.stringify(learnedResponses));
}

// Show learning modal
function showLearnModal(question) {
    pendingQuestion = question;
    learnedQuestion.textContent = question;
    assistantResponseInput.value = '';
    modal.style.display = 'flex';
    assistantResponseInput.focus();
}

// Intent Recognition
function recognizeIntent(input) {
    const lower = input.toLowerCase();
    if (lower.includes('weather')) return 'weather';
    if (lower.includes('time')) return 'time';
    if (lower.includes('date') || lower.includes('day')) return 'date';
    if (lower.includes('morse')) return 'morse';
    if (lower.includes('qr code') || lower.includes('qr')) return 'qr_code';
    if (lower.includes('note') || lower.includes('remember')) return 'note';
    return 'unknown';
}

// Process Input
async function processInput(input) {
    if (!input.trim()) return;

    addMessage(input, 'user');

    const intent = recognizeIntent(input);
    let response = "";

    if (intent === 'time') {
        response = `The current time is ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    } 
    else if (intent === 'date') {
        response = `Today is ${new Date().toLocaleDateString('en-US', {weekday:'long', month:'long', day:'numeric', year:'numeric'})}`;
    } 
    else if (intent === 'morse') {
        const text = input.replace(/translate (.+) to morse code?/i, '$1').trim();
        response = textToMorse(text || input);
    } 
    else if (intent === 'qr_code') {
        const data = input.replace(/generate qr code for (.+)/i, '$1').trim();
        if (data) {
            generateQRCode(data);
            response = `QR code for "${data}" has been generated below.`;
        } else {
            response = "Please tell me what you want the QR code for.";
        }
    } 
    else if (intent === 'note') {
        const noteText = input.replace(/(take|save|make) a? note (about|that|for)? (.+)/i, '$3').trim();
        if (noteText) {
            saveNote(noteText);
            response = "Note saved successfully.";
        } else {
            response = "What would you like me to remember?";
        }
    } 
    else if (learnedResponses[input.toLowerCase()]) {
        response = learnedResponses[input.toLowerCase()];
    } 
    else {
        response = "I'm not sure how to respond to that yet.";
        // Show learning modal after a short delay
        setTimeout(() => {
            showLearnModal(input);
        }, 800);
    }

    addMessage(response, 'assistant');
    speak(response);
}

// Morse Code
const MORSE_CODE_DICT = { /* same as before */ 
    'a': '.-', 'b': '-...', 'c': '-.-.', 'd': '-..', 'e': '.', 'f': '..-.', 'g': '--.',
    'h': '....', 'i': '..', 'j': '.---', 'k': '-.-', 'l': '.-..', 'm': '--', 'n': '-.',
    'o': '---', 'p': '.--.', 'q': '--.-', 'r': '.-.', 's': '...', 't': '-', 'u': '..-',
    'v': '...-', 'w': '.--', 'x': '-..-', 'y': '-.--', 'z': '--..',
    '1': '.----','2': '..---','3': '...--','4': '....-','5': '.....',
    '6': '-....','7': '--...','8': '---..','9': '----.','0': '-----',' ': '/'
};

function textToMorse(text) {
    return text.toLowerCase().split('').map(c => MORSE_CODE_DICT[c] || c).join(' ');
}

// QR Code
function generateQRCode(data) {
    const qrDiv = document.createElement('div');
    qrDiv.style.margin = "15px 0 10px 0";
    responseArea.appendChild(qrDiv);
    
    new QRCode(qrDiv, {
        text: data,
        width: 200,
        height: 200,
        colorDark: "#2c3e50",
        colorLight: "#ffffff"
    });
}

// Save Note
function saveNote(note) {
    let notes = JSON.parse(localStorage.getItem('assistant_notes')) || [];
    notes.push({ text: note, time: new Date().toLocaleString() });
    localStorage.setItem('assistant_notes', JSON.stringify(notes));
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
    if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
        alert("Voice input is not supported in this browser.");
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        userInput.value = transcript;
        processInput(transcript);
    };

    recognition.onerror = () => alert("Voice recognition failed. Please type your message.");
    recognition.start();
});

// Modal controls
saveLearnBtn.addEventListener('click', () => {
    const answer = assistantResponseInput.value.trim();
    if (answer && pendingQuestion) {
        saveLearnedResponse(pendingQuestion, answer);
        addMessage("Thank you! I've learned this response.", "assistant");
        speak("Thank you! I've learned how to respond.");
    }
    modal.style.display = 'none';
});

cancelLearnBtn.addEventListener('click', () => {
    modal.style.display = 'none';
});

// Load voices and initialize
window.onload = () => {
    // Load voices for better TTS
    speechSynthesis.onvoiceschanged = () => {};
    speechSynthesis.getVoices();

    addMessage("Hello! How can I assist you today?", "assistant");
    speak("Hello! How can I assist you today?");
};