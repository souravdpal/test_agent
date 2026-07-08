// Configuration
const FAKE_USER_ID = "USR-9982-SDF";
const BASE_TEST_STRING = "phyicsclasstest-20-10"; // testName - duration(mins) - totalQuestions
let [testName, durationMinutes, totalQuestions] = BASE_TEST_STRING.split('-');
totalQuestions = parseInt(totalQuestions);

// State & Caches
let currentIndex = 1;
let startTime = null;
let timerInterval = null;

// The Caches: This holds data so we don't query SQL twice for the same question
const questionCache = {}; // Stores question text & options
const answerKeyCache = {}; // Stores correct answers (hidden from user)
const userSelections = {}; // Stores user's chosen answers

// DOM Elements
const uiElements = {
    title: document.getElementById('test-title'),
    progress: document.getElementById('progress-text'),
    timer: document.getElementById('timer'),
    questionText: document.getElementById('question-text'),
    optionsContainer: document.getElementById('options-container'),
    prevBtn: document.getElementById('prev-btn'),
    nextBtn: document.getElementById('next-btn'),
    submitBtn: document.getElementById('submit-btn'),
    loading: document.getElementById('loading-indicator'),
    content: document.getElementById('question-content'),
    quizUi: document.getElementById('quiz-ui'),
    resultsScreen: document.getElementById('results-screen'),
    finalScore: document.getElementById('final-score'),
    jsonOutput: document.getElementById('json-output'),
    timeTaken: document.getElementById('time-taken-display')
};

// Initialize Meta Data
uiElements.title.textContent = testName.toUpperCase();

// Data Formatter Utility for Equations/LaTeX strings
function formatQuizText(text) {
    if (!text) return '';
    
    // 1. Remove LaTeX math wrappers ($)
    let formatted = text.replace(/\$/g, '');
    
    // 2. Convert LaTeX multiplication symbol (\times) to standard math cross (×)
    formatted = formatted.replace(/\\times/g, '×');
    
    // 3. Remove stray escape backslashes left over from LaTeX spacing
    formatted = formatted.replace(/\\/g, '');
    
    // 4. Map standard numbers to Unicode superscripts for exponents (e.g. m/s^2 -> m/s²)
    const superscripts = {
        '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
        '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹'
    };
    formatted = formatted.replace(/\^([0-9])/g, (match, digit) => superscripts[digit] || digit);
    
    return formatted.trim();
}

// Timer Logic
function startTimer(totalSeconds) {
    startTime = Date.now();
    let timeLeft = totalSeconds;

    timerInterval = setInterval(() => {
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            submitTest(); // Auto-submit if time runs out
            return;
        }
        
        let m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
        let s = (timeLeft % 60).toString().padStart(2, '0');
        uiElements.timer.textContent = `${m}:${s}`;
        timeLeft--;
    }, 1000);
}

// Load Question Logic
function loadQuestion(index) {
    // Manage Button States
    uiElements.prevBtn.disabled = (index === 1);
    
    if (index === totalQuestions) {
        uiElements.nextBtn.style.display = 'none';
        uiElements.submitBtn.style.display = 'block';
    } else {
        uiElements.nextBtn.style.display = 'block';
        uiElements.submitBtn.style.display = 'none';
    }

    uiElements.progress.textContent = `Question ${index} of ${totalQuestions}`;
    const queryId = `${BASE_TEST_STRING}-${index}`;
    const data = questionCache[queryId];

    if (!data) {
        console.error(`Question ${queryId} not found in cache.`);
        return;
    }

    // Render Question text with formatting applied
    uiElements.optionsContainer.innerHTML = '';
    uiElements.questionText.textContent = `${index}. ${formatQuizText(data.question)}`;

    data.options.forEach((opt) => {
        const label = document.createElement('label');
        label.className = 'option-label';
        
        const radio = document.createElement('input');
        radio.type = 'radio'; 
        radio.name = 'current-question';
        radio.value = opt;
        
        // Restore user's previous selection if navigating back
        if (userSelections[queryId] === opt) {
            radio.checked = true;
        }

        // Save selection dynamically
        radio.addEventListener('change', (e) => {
            userSelections[queryId] = e.target.value;
        });

        label.appendChild(radio);
        // Render option text with formatting applied
        label.appendChild(document.createTextNode(formatQuizText(opt)));
        uiElements.optionsContainer.appendChild(label);
    });
}

// Navigation Events
uiElements.nextBtn.addEventListener('click', () => {
    if (currentIndex < totalQuestions) {
        currentIndex++;
        loadQuestion(currentIndex);
    }
});

uiElements.prevBtn.addEventListener('click', () => {
    if (currentIndex > 1) {
        currentIndex--;
        loadQuestion(currentIndex);
    }
});

uiElements.submitBtn.addEventListener('click', submitTest);

// Final Submission Logic
function submitTest() {
    clearInterval(timerInterval);
    const endTime = Date.now();
    const timeTakenMs = endTime - startTime;
    const timeTakenSec = Math.round(timeTakenMs / 1000);

    let marks = 0;
    const mappedAnswers = {};

    // Calculate Marks & Map Answers
    for (let i = 1; i <= totalQuestions; i++) {
        const qId = `${BASE_TEST_STRING}-${i}`;
        const userAns = userSelections[qId] || null;
        const correctAns = answerKeyCache[qId];

        mappedAnswers[qId] = {
            userAnswer: userAns,
            isCorrect: userAns === correctAns
        };

        if (userAns === correctAns) {
            marks++;
        }
    }

    // Generate JSON Payload
    const payload = {
        userId: FAKE_USER_ID,
        testId: BASE_TEST_STRING,
        totalQuestions: totalQuestions,
        marksScored: marks,
        timeTakenSeconds: timeTakenSec,
        answers: mappedAnswers
    };

    console.log("SENDING TO API:", payload);
    showResults(payload);
}

function showResults(data) {
    uiElements.quizUi.style.display = 'none';
    uiElements.resultsScreen.style.display = 'block';
    
    uiElements.finalScore.textContent = `${data.marksScored} / ${data.totalQuestions}`;
    uiElements.timeTaken.textContent = `Completed in ${data.timeTakenSeconds} seconds`;
    
    uiElements.jsonOutput.textContent = JSON.stringify(data, null, 2);
}

// Boot Sequence (Fetch everything from API upfront)
async function initTest() {
    uiElements.content.style.display = 'none';
    uiElements.loading.style.display = 'block';

    try {
        const response = await fetch(`/api/test/${BASE_TEST_STRING}`);
        const data = await response.json();

        if (data.success && data.rows && data.rows.length > 0) {
            // Populate caches matching the exact MariaDB column definitions
            data.rows.forEach(row => {
                const optionsArray = typeof row.options === 'string' ? JSON.parse(row.options) : row.options;
                
                // Fixed column references: row.question and row.answer
                questionCache[row.id] = { question: row.question, options: optionsArray };
                answerKeyCache[row.id] = row.answer;
            });

            // Start Quiz
            uiElements.loading.style.display = 'none';
            uiElements.content.style.display = 'block';
            startTimer(parseInt(durationMinutes) * 60);
            loadQuestion(currentIndex);
        } else {
            console.error("Test data empty or invalid:", data);
            uiElements.loading.textContent = "Failed to load test. No questions found.";
        }
    } catch (error) {
        console.error("Error fetching test data:", error);
        uiElements.loading.textContent = "Network error loading test.";
    }
}

// Start Application
initTest();