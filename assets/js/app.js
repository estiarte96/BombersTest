import { FirebaseDB } from './firebase-db.js';

// App State
let allData = [];
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

// Auth Elements
const authScreen = document.getElementById('auth-screen');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const userProfile = document.getElementById('user-profile');
const userNameDisplay = document.getElementById('user-name-display');
const btnLogout = document.getElementById('btn-logout');
const btnShowStats = document.getElementById('btn-show-stats');
const btnStatsBack = document.getElementById('btn-stats-back');
const goToRegister = document.getElementById('go-to-register');
const goToLogin = document.getElementById('go-to-login');

// Load Data from Firebase
async function loadData() {
    try {
        // Load Questions from Firebase (or fallback to local)
        allData = await FirebaseDB.getQuestions();

        // If questions not in Firebase yet, initialize them
        if (!allData || allData.length === 0) {
            const response = await fetch('data/questions.json');
            allData = await response.json();
            await FirebaseDB.initializeQuestions(allData);
        }

        renderTopics();
        updateFailedUI();
        initAuth();
    } catch (error) {
        console.error('Error loading data:', error);
        // Fallback to local file
        const response = await fetch('data/questions.json');
        allData = await response.json();
        renderTopics();
        updateFailedUI();
        initAuth();
    }
}

function initAuth() {
    if (currentUser) {
        showApp();
    } else {
        switchScreen('auth-screen');
    }
}

function showApp() {
    userNameDisplay.textContent = currentUser.name || currentUser.email;
    userProfile.style.display = 'flex';
    document.getElementById('stats-overview').style.display = 'flex';

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
    const filtered = allData.filter(t => t.topic.toLowerCase().includes(filter.toLowerCase()));

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
    let questions = [];
    selectedData.forEach(t => {
        t.questions.forEach(q => {
            questions.push({ ...q, topicName: t.topic });
        });
    });

    let limit = (testMode === 'exam') ? 50 : 30;
    startQuiz(shuffleArray(questions).slice(0, limit), testMode === 'exam');
};

// Mix Aleatori (Tot)
document.getElementById('btn-random-mix').onclick = () => {
    let questions = [];
    allData.forEach(t => {
        t.questions.forEach(q => {
            questions.push({ ...q, topicName: t.topic });
        });
    });
    startQuiz(shuffleArray(questions).slice(0, 50), false);
};

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
            <div class="options-list">
                ${shuffledOptions.map((opt, idx) => {
        const letter = String.fromCharCode(97 + idx); // a, b, c, d
        return `
                    <button class="option-btn" onclick="handleChoice(${opt.isCorrect}, this)">
                        <span class="option-letter">${letter.toUpperCase()})</span>
                        <span class="option-text">${opt.text}</span>
                    </button>
                    `;
    }).join('')}
            </div>
        </div>
    `;

    // Store correct index for feedback
    window.currentCorrectIdx = shuffledOptions.findIndex(o => o.isCorrect);

    if (!question.answer && !currentQuiz.isExamMode) {
        console.warn("Falta resposta per aquesta pregunta.");
    }
}

window.handleChoice = function (isCorrect, btn) {
    if (document.querySelector('.option-btn.disabled')) return;

    const question = currentQuiz.questions[currentQuiz.currentIndex];

    if (isCorrect) {
        currentQuiz.score++;
        failedQuestions = failedQuestions.filter(q => q.id !== question.id);

        // Stats update
        if (!currentUser.stats) currentUser.stats = { correct: 0, wrong: 0, topics: {}, days: [] };
        currentUser.stats.correct = (currentUser.stats.correct || 0) + 1;

        const tName = question.topicName;
        if (!currentUser.stats.topics[tName]) currentUser.stats.topics[tName] = { correct: 0, total: 0 };
        currentUser.stats.topics[tName].correct++;
        currentUser.stats.topics[tName].total++;

    } else {
        if (!failedQuestions.find(q => q.id === question.id)) {
            failedQuestions.push({ ...question });
        }

        // Stats update
        if (!currentUser.stats) currentUser.stats = { correct: 0, wrong: 0, topics: {}, days: [] };
        currentUser.stats.wrong = (currentUser.stats.wrong || 0) + 1;

        const tName = question.topicName;
        if (!currentUser.stats.topics[tName]) currentUser.stats.topics[tName] = { correct: 0, total: 0 };
        currentUser.stats.topics[tName].total++;
    }

    updateUserInFirebase();
    localStorage.setItem('failed_questions', JSON.stringify(failedQuestions));
    updateFailedUI();

    const options = document.querySelectorAll('.option-btn');
    const nextBtn = document.getElementById('btn-next-question');

    currentQuiz.results.push({ id: question.id, correct: isCorrect });

    options.forEach((optBtn, idx) => {
        optBtn.classList.add('disabled');
        if (idx === window.currentCorrectIdx) {
            optBtn.classList.add('correct');
        } else if (optBtn === btn && !isCorrect) {
            optBtn.classList.add('wrong');
        }
    });

    nextBtn.style.display = 'flex';
};

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

// Auth Event Listeners
goToRegister.onclick = (e) => {
    e.preventDefault();
    loginForm.style.display = 'none';
    registerForm.style.display = 'flex';
    document.getElementById('auth-title').textContent = 'Crea un Compte';
    document.getElementById('auth-subtitle').textContent = 'Uneix-te als futurs bombers.';
};

goToLogin.onclick = (e) => {
    e.preventDefault();
    registerForm.style.display = 'none';
    loginForm.style.display = 'flex';
    document.getElementById('auth-title').textContent = 'Inicia Sessió';
    document.getElementById('auth-subtitle').textContent = 'Benvingut de nou, futur bomber.';
};

registerForm.onsubmit = async (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    // Check if user already exists in Firebase
    const existingUser = await FirebaseDB.getUserByEmail(email);
    if (existingUser) {
        alert('Aquest correu ja està registrat.');
        return;
    }

    const newUser = { name, email, password, stats: { correct: 0, wrong: 0, topics: {}, days: [] } };

    // Save to Firebase
    await FirebaseDB.updateUser(newUser);

    currentUser = newUser;
    localStorage.setItem('current_user', JSON.stringify(currentUser));
    showApp();
};

loginForm.onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    // Get user from Firebase
    const user = await FirebaseDB.getUserByEmail(email);

    if (user && user.password === password) {
        currentUser = user;
        // Initialize stats if missing
        if (!currentUser.stats) {
            currentUser.stats = { correct: 0, wrong: 0, topics: {}, days: [] };
        }
        localStorage.setItem('current_user', JSON.stringify(currentUser));
        showApp();
    } else {
        alert('Correu o contrasenya incorrectes.');
    }
};

btnLogout.onclick = () => {
    if (confirm('Segur que vols tancar la sessió?')) {
        currentUser = null;
        localStorage.removeItem('current_user');
        userProfile.style.display = 'none';
        document.getElementById('stats-overview').style.display = 'none';
        switchScreen('auth-screen');
        // Reset forms
        loginForm.reset();
        registerForm.reset();
        loginForm.style.display = 'flex';
        registerForm.style.display = 'none';
    }
};

// Stats logic
btnShowStats.onclick = () => {
    renderStats();
    switchScreen('stats-screen');
};

btnStatsBack.onclick = () => {
    switchScreen('selection-screen');
};

function renderStats() {
    const s = currentUser.stats || { correct: 0, wrong: 0, topics: {}, days: [] };
    const total = (s.correct || 0) + (s.wrong || 0);
    const accuracy = total > 0 ? Math.round((s.correct / total) * 100) : 0;

    document.getElementById('user-days').textContent = (s.days || []).length;
    document.getElementById('user-accuracy').textContent = `${accuracy}%`;
    document.getElementById('user-total-correct').textContent = s.correct || 0;
    document.getElementById('user-total-wrong').textContent = s.wrong || 0;

    const list = document.getElementById('topic-stats-list');
    list.innerHTML = '';

    const sortedTopics = Object.entries(s.topics || {}).sort((a, b) => b[1].total - a[1].total);

    if (sortedTopics.length === 0) {
        list.innerHTML = '<p style="text-align:center; padding: 20px; color: var(--text-muted);">Encara no tens estadístiques per temes.</p>';
        return;
    }

    sortedTopics.forEach(([name, data]) => {
        const pct = Math.round((data.correct / data.total) * 100);
        const item = document.createElement('div');
        item.className = 'topic-stat-item';
        item.innerHTML = `
            <div class="topic-stat-info">
                <span class="topic-stat-name">${name}</span>
                <span class="topic-stat-numbers">${data.correct}/${data.total} (${pct}%)</span>
            </div>
            <div class="topic-stat-bar-bg">
                <div class="topic-stat-bar-fill" style="width: ${pct}%"></div>
            </div>
        `;
        list.appendChild(item);
    });
}

loadData();
