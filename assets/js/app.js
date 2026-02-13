import { FirebaseDB } from './firebase-db.js';

// App State
let allData = [];
let officialData = [];
let aiData = [];
let extraData = [];
let includeAI = false;
let includeExtra = false;
let selectedTopics = new Set();
let failedQuestions = JSON.parse(localStorage.getItem('failed_questions') || '[]');
let testMode = 'standard'; // 'standard' or 'exam'
let currentUser = JSON.parse(localStorage.getItem('current_user') || 'null');

let currentQuiz = {
    questions: [],
    currentIndex: 0,
    score: 0,
    results: [],
    startTime: null,
    timerInterval: null,
    totalTimeSeconds: 0,
    isExamMode: false
};

// DOM Elements
const selectionScreen = document.getElementById('selection-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultsScreen = document.getElementById('results-screen');
const topicsGrid = document.getElementById('topics-grid');
const selectedCountEl = document.getElementById('selected-count');
const startTestBtn = document.getElementById('btn-start-test');
const topicSearch = document.getElementById('topic-search');
const failedCountEl = document.getElementById('failed-count');
const btnReviewFailed = document.getElementById('btn-review-failed');
const btnClearFailed = document.getElementById('btn-clear-failed');

// Header Elements
const userProfile = document.getElementById('user-profile');
const userNameDisplay = document.getElementById('user-name-display');
const btnLogout = document.getElementById('btn-logout');
const btnShowStats = document.getElementById('btn-show-stats');

// Load Data from Firebase
async function loadData() {
    try {
        // --- SINCRONITZACIÓ AMB FIREBASE ---
        // Oficials
        try {
            const offResp = await fetch('data/questions.json');
            const offJSON = await offResp.json();
            await FirebaseDB.initializeQuestions(offJSON, 'official');
        } catch (e) { console.log("Cap JSON oficial trobat"); }

        // IA
        try {
            const aiResp = await fetch('data/ai_questions.json');
            const aiJSON = await aiResp.json();
            await FirebaseDB.initializeQuestions(aiJSON, 'ai');
        } catch (e) { console.log("Cap JSON d'IA trobat"); }

        // Extra
        try {
            const extraResp = await fetch('data/extra_questions.json');
            const extraJSON = await extraResp.json();
            await FirebaseDB.initializeQuestions(extraJSON, 'extra');
        } catch (e) { console.log("Cap JSON extra trobat"); }
        // -----------------------------------

        // Load Official questions
        officialData = await FirebaseDB.getQuestions('official');

        // Load AI questions
        aiData = await FirebaseDB.getQuestions('ai');

        // Initial setup with official only
        updateFinalData();

        renderTopics();
        updateFailedUI();
        initAuth();
    } catch (error) {
        console.error('Error loading data:', error);
        // Fallback
        const response = await fetch('data/questions.json');
        officialData = await response.json();
        allData = JSON.parse(JSON.stringify(officialData));
        renderTopics();
        updateFailedUI();
        initAuth();
    }
}

function initAuth() {
    if (currentUser) {
        showApp();
    } else {
        window.location.href = 'login.html';
    }
}

function showApp() {
    userNameDisplay.textContent = currentUser.name || currentUser.email;
    userProfile.style.display = 'flex';
    const statsOverview = document.getElementById('stats-overview');
    if (statsOverview) statsOverview.style.display = 'flex';

    // Track usage days
    const today = new Date().toISOString().split('T')[0];
    if (!currentUser.stats) currentUser.stats = { correct: 0, wrong: 0, topics: {}, days: [] };
    if (!currentUser.stats.days) currentUser.stats.days = [];
    if (!currentUser.stats.days.includes(today)) {
        currentUser.stats.days.push(today);
        updateUserInFirebase();
    }

    switchScreen('selection-screen');
}

async function updateUserInFirebase() {
    try {
        await FirebaseDB.updateUser(currentUser);
        localStorage.setItem('current_user', JSON.stringify(currentUser));
    } catch (error) {
        console.error('Error updating user in Firebase:', error);
    }
}

function updateFailedUI() {
    failedCountEl.textContent = failedQuestions.length;
    btnReviewFailed.disabled = failedQuestions.length === 0;
    if (btnClearFailed) btnClearFailed.disabled = failedQuestions.length === 0;
}

// Render Themes List
function renderTopics(filter = '') {
    topicsGrid.innerHTML = '';
    const naturalSort = (a, b) => a.topic.localeCompare(b.topic, undefined, { numeric: true, sensitivity: 'base' });
    const filtered = allData
        .filter(t => t.topic.toLowerCase().includes(filter.toLowerCase()))
        .sort(naturalSort);

    filtered.forEach(topicData => {
        const div = document.createElement('div');
        div.className = `topic-item ${selectedTopics.has(topicData.topic) ? 'selected' : ''}`;
        div.innerHTML = `
            <div class="topic-checkbox">
                <i class="fas fa-check"></i>
            </div>
            <div class="topic-info">
                <h3>${topicData.topic}</h3>
                <span>${topicData.questions.length} preguntes</span>
            </div>
        `;
        div.onclick = () => toggleTopic(topicData.topic);
        topicsGrid.appendChild(div);
    });
}

function toggleTopic(topic) {
    if (selectedTopics.has(topic)) {
        selectedTopics.delete(topic);
    } else {
        selectedTopics.add(topic);
    }
    updateSelectionUI();
}

function updateSelectionUI() {
    selectedCountEl.textContent = selectedTopics.size;
    startTestBtn.disabled = selectedTopics.size === 0;
    renderTopics(topicSearch.value);
}

// Mode Selection
document.getElementById('btn-mode-standard').onclick = function () {
    testMode = 'standard';
    this.classList.add('active');
    document.getElementById('btn-mode-exam').classList.remove('active');
};

document.getElementById('btn-mode-exam').onclick = function () {
    testMode = 'exam';
    this.classList.add('active');
    document.getElementById('btn-mode-standard').classList.remove('active');
};

// Control Buttons
document.getElementById('btn-select-all').onclick = () => {
    allData.forEach(t => selectedTopics.add(t.topic));
    updateSelectionUI();
};

document.getElementById('btn-deselect-all').onclick = () => {
    selectedTopics.clear();
    updateSelectionUI();
};

topicSearch.oninput = (e) => renderTopics(e.target.value);

// Start Standard/Exam Test
startTestBtn.onclick = () => {
    const selectedData = allData.filter(t => selectedTopics.has(t.topic));
    const questions = getWeightedQuestions(selectedData, (testMode === 'exam' ? 50 : 30));
    startQuiz(questions, testMode === 'exam');
};

// Mix Aleatori (Tot)
document.getElementById('btn-random-mix').onclick = () => {
    const questions = getWeightedQuestions(allData, 50);
    startQuiz(questions, false);
};

// Weighted random selection logic
function getWeightedQuestions(data, totalToSelect) {
    const weights = (currentUser && currentUser.stats && currentUser.stats.weights) ? currentUser.stats.weights : {};
    let fullPool = [];

    data.forEach(t => {
        const weight = weights[t.topic] || 5;
        // We multiply the topic's questions in the pool based on its weight
        // Higher weight = more presence in the random shuffle
        t.questions.forEach(q => {
            const questionEntry = { ...q, topicName: t.topic };
            for (let i = 0; i < weight; i++) {
                fullPool.push(questionEntry);
            }
        });
    });

    // Shuffle and pick unique questions (by ID)
    const shuffled = shuffleArray(fullPool);
    const selected = [];
    const usedIds = new Set();

    for (const q of shuffled) {
        if (!usedIds.has(q.id)) {
            selected.push(q);
            usedIds.add(q.id);
        }
        if (selected.length >= totalToSelect) break;
    }

    return selected;
}

// Start Review Test
btnReviewFailed.onclick = () => {
    if (failedQuestions.length === 0) return;
    startQuiz(shuffleArray([...failedQuestions]), false);
};

btnClearFailed.onclick = () => {
    if (confirm('Segur que vols borrar totes les fallades registrades?')) {
        failedQuestions = [];
        localStorage.setItem('failed_questions', JSON.stringify([]));
        updateFailedUI();
    }
};

function startQuiz(questions, isExam) {
    if (questions.length === 0) {
        alert('No hi ha preguntes disponibles.');
        return;
    }

    currentQuiz = {
        questions: questions,
        currentIndex: 0,
        score: 0,
        results: [],
        startTime: new Date(),
        totalTimeSeconds: isExam ? 2700 : 0, // 45 mins for exam
        isExamMode: isExam,
        timerInterval: setInterval(isExam ? updateExamTimer : updateTimer, 1000)
    };

    switchScreen('quiz-screen');
    renderQuestion();
}

function renderQuestion() {
    const question = currentQuiz.questions[currentQuiz.currentIndex];
    const container = document.getElementById('question-container');
    const counter = document.getElementById('question-counter');
    const nextBtn = document.getElementById('btn-next-question');
    const progressBar = document.getElementById('progress-bar');

    nextBtn.style.display = 'none';
    progressBar.style.width = `${(currentQuiz.currentIndex / currentQuiz.questions.length) * 100}%`;
    counter.textContent = `Pregunta ${currentQuiz.currentIndex + 1} de ${currentQuiz.questions.length}`;

    // Shuffle options but keep track of which one is correct
    const options = Object.entries(question.options).map(([key, val]) => ({
        originalKey: key,
        text: val,
        isCorrect: (key === (question.answer || '').toLowerCase())
    }));

    const shuffledOptions = shuffleArray([...options]);

    container.innerHTML = `
        <div class="question-card">
            <span class="question-topic">${question.topicName} — ${question.exam}</span>
            <h2 class="question-text">${question.text}</h2>
            <div class="options-list" id="options-list">
                ${shuffledOptions.map((opt, idx) => {
        const letter = String.fromCharCode(97 + idx); // a, b, c, d
        return `
                    <button class="option-btn" data-correct="${opt.isCorrect}" data-index="${idx}">
                        <span class="option-letter">${letter.toUpperCase()})</span>
                        <span class="option-text">${opt.text}</span>
                    </button>
                    `;
    }).join('')}
            </div>
        </div>
    `;

    // Add event listeners to buttons
    const buttons = container.querySelectorAll('.option-btn');

    buttons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const isCorrect = btn.getAttribute('data-correct') === 'true';
            handleChoice(isCorrect, btn);
        });
    });

    // Store correct index for feedback
    window.currentCorrectIdx = shuffledOptions.findIndex(o => o.isCorrect);

    if (!question.answer && !currentQuiz.isExamMode) {
        console.warn("Falta resposta per aquesta pregunta.");
    }
}

function handleChoice(isCorrect, btn) {

    // Check if we already answered
    if (document.querySelector('.option-btn.disabled') || document.querySelector('.option-btn.selected-exam')) {
        return;
    }

    const question = currentQuiz.questions[currentQuiz.currentIndex];

    // Save the result
    currentQuiz.results.push({
        id: question.id,
        correct: isCorrect,
        selectedBtn: btn,
        questionObj: question
    });

    if (isCorrect) {
        currentQuiz.score++;
    }

    // Update Stats (Safely)
    if (currentUser) {
        if (!currentUser.stats) currentUser.stats = { correct: 0, wrong: 0, topics: {}, days: [] };
        const tName = question.topicName || 'General';
        if (!currentUser.stats.topics) currentUser.stats.topics = {};
        if (!currentUser.stats.topics[tName]) currentUser.stats.topics[tName] = { correct: 0, total: 0 };

        if (isCorrect) {
            currentUser.stats.correct = (currentUser.stats.correct || 0) + 1;
            currentUser.stats.topics[tName].correct++;
            currentUser.stats.topics[tName].total++;
            // Remove from failed if it was there
            failedQuestions = failedQuestions.filter(q => q.id !== question.id);
        } else {
            currentUser.stats.wrong = (currentUser.stats.wrong || 0) + 1;
            currentUser.stats.topics[tName].total++;
            // Add to failed if not there
            if (!failedQuestions.find(q => q.id === question.id)) {
                failedQuestions.push({ ...question });
            }
        }
        updateUserInFirebase().catch(e => console.error('Firebase sync failed', e));
        localStorage.setItem('failed_questions', JSON.stringify(failedQuestions));
        updateFailedUI();
    }

    const nextBtn = document.getElementById('btn-next-question');
    const options = document.querySelectorAll('.option-btn');

    if (currentQuiz.isExamMode) {
        // Exam Mode: Only highlight selection, no feedback yet
        options.forEach(opt => opt.classList.add('disabled'));
        btn.classList.add('selected-exam');
    } else {
        // Standard Mode: Immediate feedback
        options.forEach((optBtn, idx) => {
            optBtn.classList.add('disabled');
            if (idx === window.currentCorrectIdx) {
                optBtn.classList.add('correct');
            } else if (optBtn === btn && !isCorrect) {
                optBtn.classList.add('wrong');
            }
        });
    }

    nextBtn.style.display = 'flex';
}

document.getElementById('btn-next-question').onclick = () => {
    currentQuiz.currentIndex++;
    if (currentQuiz.currentIndex < currentQuiz.questions.length) {
        renderQuestion();
    } else {
        finishQuiz();
    }
};

function finishQuiz() {
    clearInterval(currentQuiz.timerInterval);
    switchScreen('results-screen');

    const total = currentQuiz.questions.length;
    const scorePct = Math.round((currentQuiz.score / total) * 100);

    document.getElementById('final-score').textContent = `${scorePct}%`;
    document.querySelector('.score-circle').style.setProperty('--percentage', `${scorePct}%`);
    document.getElementById('stat-correct').textContent = currentQuiz.score;
    document.getElementById('stat-incorrect').textContent = total - currentQuiz.score;

    const duration = Math.floor((new Date() - currentQuiz.startTime) / 1000);
    const mins = Math.floor(duration / 60);
    const secs = duration % 60;
    document.getElementById('stat-time').textContent = `${mins}m ${secs}s`;

    const msgEl = document.getElementById('result-message');
    if (scorePct >= 80) msgEl.textContent = 'Excel·lent!';
    else if (scorePct >= 50) msgEl.textContent = 'Molt bé!';
    else msgEl.textContent = 'Cal seguir practicant';
}

function updateTimer() {
    const duration = Math.floor((new Date() - currentQuiz.startTime) / 1000);
    const mins = String(Math.floor(duration / 60)).padStart(2, '0');
    const secs = String(duration % 60).padStart(2, '0');
    document.getElementById('quiz-timer').textContent = `${mins}:${secs}`;
}

function updateExamTimer() {
    currentQuiz.totalTimeSeconds--;
    if (currentQuiz.totalTimeSeconds <= 0) {
        finishQuiz();
        return;
    }
    const mins = String(Math.floor(currentQuiz.totalTimeSeconds / 60)).padStart(2, '0');
    const secs = String(currentQuiz.totalTimeSeconds % 60).padStart(2, '0');
    const timerEl = document.getElementById('quiz-timer');
    timerEl.textContent = `${mins}:${secs}`;
    if (currentQuiz.totalTimeSeconds < 300) timerEl.style.color = 'var(--danger)';
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    window.scrollTo(0, 0);
}

document.getElementById('btn-restart').onclick = () => {
    switchScreen('selection-screen');
};

document.getElementById('btn-exit-quiz').onclick = () => {
    if (confirm('Segur que vols sortir? El progrés es perdrà.')) {
        clearInterval(currentQuiz.timerInterval);
        switchScreen('selection-screen');
    }
};

btnLogout.onclick = () => {
    if (confirm('Segur que vols tancar la sessió?')) {
        currentUser = null;
        localStorage.removeItem('current_user');
        window.location.href = 'login.html';
    }
};

// Stats logic
userNameDisplay.onclick = () => {
    window.location.href = 'perfil.html';
};

btnShowStats.onclick = () => {
    window.location.href = 'perfil.html';
};



// Export functions to window for HTML onclick attributes
window.toggleTopic = toggleTopic;

// Toggles Logic
const btnToggleAI = document.getElementById('btn-toggle-ai');
const aiStatusEl = document.getElementById('ai-status');
const btnToggleExtra = document.getElementById('btn-toggle-extra');
const extraStatusEl = document.getElementById('extra-status');

function updateFinalData() {
    let merged = JSON.parse(JSON.stringify(officialData));

    if (includeExtra) {
        extraData.forEach(extraT => {
            const existing = merged.find(t => t.topic === extraT.topic);
            if (existing) {
                existing.questions = [...existing.questions, ...extraT.questions];
            } else {
                merged.push(extraT);
            }
        });
    }

    if (includeAI) {
        aiData.forEach(aiT => {
            const existing = merged.find(t => t.topic === aiT.topic);
            if (existing) {
                existing.questions = [...existing.questions, ...aiT.questions];
            } else {
                merged.push(aiT);
            }
        });
    }

    allData = merged;
    renderTopics(topicSearch.value);
}

if (btnToggleAI) {
    btnToggleAI.onclick = () => {
        includeAI = !includeAI;
        btnToggleAI.classList.toggle('ai-on', includeAI);
        btnToggleAI.classList.toggle('ai-off', !includeAI);
        aiStatusEl.textContent = includeAI ? 'ON' : 'OFF';
        updateFinalData();
    };
}

if (btnToggleExtra) {
    btnToggleExtra.onclick = () => {
        includeExtra = !includeExtra;
        btnToggleExtra.classList.toggle('extra-on', includeExtra);
        btnToggleExtra.classList.toggle('extra-off', !includeExtra);
        extraStatusEl.textContent = includeExtra ? 'ON' : 'OFF';
        updateFinalData();
    };
}

loadData();
