import { FirebaseDB } from './firebase-db.js';
import { ThemeManager } from './theme.js';
import { Multiplayer } from './multiplayer.js';

// App State
let allData = [];
let currentRoomCode = null; // Track if we are in a multiplayer match

try {
    ThemeManager.init();
    Multiplayer.init();
} catch (e) {
    console.error("Error durant la inicialització:", e);
}

let officialData = [];
let aiData = [];
let extraData = [];
let includeAI = false;
let includeExtra = false;
let includeOfficial = true;
let selectedTopics = new Set();
let failedQuestions = JSON.parse(localStorage.getItem('failed_questions') || '[]');
let favoriteQuestions = JSON.parse(localStorage.getItem('favorite_questions') || '[]');
let testMode = 'standard'; // 'standard' or 'exam'
let currentUser = JSON.parse(localStorage.getItem('current_user') || 'null');

// Sync favorites from user profile if exists
if (currentUser && currentUser.favorites) {
    favoriteQuestions = currentUser.favorites;
    localStorage.setItem('favorite_questions', JSON.stringify(favoriteQuestions));
}

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
const favoritesCountEl = document.getElementById('favorites-count');
const btnReviewFailed = document.getElementById('btn-review-failed');
const btnReviewFavorites = document.getElementById('btn-review-favorites');
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

        // Load Extra questions
        extraData = await FirebaseDB.getQuestions('extra');

        // Initial setup
        updateFinalData();

        renderTopics();
        updateFailedUI();
        initAuth();
    } catch (error) {
        console.error('Error loading data:', error);
        // Fallback
        const response = await fetch('data/questions.json');
        officialData = await response.json();
        updateFinalData();
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
    renderRanking();
}

async function renderRanking() {
    const rankingList = document.getElementById('ranking-list');
    if (!rankingList) return;

    rankingList.innerHTML = '<p style="text-align:center; padding: 10px;">Carregant rànquing...</p>';

    try {
        const users = await FirebaseDB.getUsers();

        // Filter and sort users by total correct answers
        const sortedUsers = users
            .filter(u => u.stats && (u.stats.correct || 0) > 0)
            .sort((a, b) => (b.stats.correct || 0) - (a.stats.correct || 0))
            .slice(0, 10);

        if (sortedUsers.length === 0) {
            rankingList.innerHTML = '<p style="text-align:center; color: var(--text-muted);">Encara no hi ha dades per al rànquing.</p>';
            return;
        }

        rankingList.innerHTML = '';
        sortedUsers.forEach((user, index) => {
            const displayName = user.nickname || getInitials(user.name || user.email);
            const isCurrent = (currentUser && user.email === currentUser.email);

            const div = document.createElement('div');
            div.className = `ranking-item ${isCurrent ? 'is-current' : ''}`;
            div.innerHTML = `
                <div class="rank-left">
                    <span class="rank-number">#${index + 1}</span>
                    <div class="rank-initials" style="${user.nickname ? 'width: auto; padding: 0 15px; border-radius: 20px;' : ''}">
                        ${displayName}
                    </div>
                </div>
                <div class="rank-score">
                    ${user.stats.correct} <span>encerts</span>
                </div>
            `;
            rankingList.appendChild(div);
        });
    } catch (error) {
        console.error('Error rendering ranking:', error);
        rankingList.innerHTML = '<p style="text-align:center; color: var(--danger);">Error en carregar el rànquing.</p>';
    }
}

function getInitials(name) {
    if (!name) return '??';
    const parts = name.split(/[ @._]/);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
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

    // Favorites UI - rename function later maybe?
    if (favoritesCountEl) favoritesCountEl.textContent = favoriteQuestions.length;
    if (btnReviewFavorites) btnReviewFavorites.disabled = favoriteQuestions.length === 0;
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
const examSettingsEl = document.getElementById('exam-settings');
const btnModeStandard = document.getElementById('btn-mode-standard');
const btnModeExam = document.getElementById('btn-mode-exam');

if (btnModeStandard) {
    btnModeStandard.onclick = function () {
        testMode = 'standard';
        this.classList.add('active');
        if (btnModeExam) btnModeExam.classList.remove('active');
        if (examSettingsEl) examSettingsEl.style.display = 'none';
    };
}

if (btnModeExam) {
    btnModeExam.onclick = function () {
        testMode = 'exam';
        this.classList.add('active');
        if (btnModeStandard) btnModeStandard.classList.remove('active');
        if (examSettingsEl) examSettingsEl.style.display = 'block';
    };
}

// Control Buttons
const btnSelectAll = document.getElementById('btn-select-all');
if (btnSelectAll) {
    btnSelectAll.onclick = () => {
        allData.forEach(t => selectedTopics.add(t.topic));
        updateSelectionUI();
    };
}

const btnDeselectAll = document.getElementById('btn-deselect-all');
if (btnDeselectAll) {
    btnDeselectAll.onclick = () => {
        selectedTopics.clear();
        updateSelectionUI();
    };
}

if (topicSearch) {
    topicSearch.oninput = (e) => renderTopics(e.target.value);
}

// Start Standard/Exam Test
if (startTestBtn) {
    startTestBtn.onclick = () => {
        const selectedData = allData.filter(t => selectedTopics.has(t.topic));
        // If not exam, request a huge number to get ALL unique questions available
        let numQuestions = testMode === 'exam' ? parseInt(document.getElementById('exam-num-questions').value) : 9999;
        let duration = testMode === 'exam' ? parseInt(document.getElementById('exam-match-time').value) * 60 : 0;

        const questions = getWeightedQuestions(selectedData, numQuestions);
        startQuiz(questions, testMode === 'exam', duration);
    };
}

// Mix Aleatori (Tot)
const btnRandomMix = document.getElementById('btn-random-mix');
if (btnRandomMix) {
    btnRandomMix.onclick = () => {
        let numQuestions = testMode === 'exam' ? parseInt(document.getElementById('exam-num-questions').value) : 9999;
        let duration = testMode === 'exam' ? parseInt(document.getElementById('exam-match-time').value) * 60 : 0;

        const questions = getWeightedQuestions(allData, numQuestions);
        startQuiz(questions, testMode === 'exam', duration);
    };
}


// Weighted random selection logic
// Weighted random selection logic
function getWeightedQuestions(data, totalToSelect) {
    const weights = (currentUser && currentUser.stats && currentUser.stats.weights) ? currentUser.stats.weights : {};

    // 1. Organize questions by topic
    let questionsByTopic = {};
    data.forEach(t => {
        questionsByTopic[t.topic] = t.questions.map(q => ({ ...q, topicName: t.topic }));
    });

    // 2. Determine how many questions to pick from each topic based on weights
    let selected = [];
    let topics = Object.keys(questionsByTopic);
    let totalWeight = 0;

    topics.forEach(t => {
        // Default weight is 5 if not set
        const w = weights[t];
        const val = (w !== undefined && w !== null && !isNaN(w)) ? parseInt(w) : 5;
        totalWeight += val;
    });

    if (totalWeight === 0) totalWeight = 1;

    // Mode Estudi (Unlimited - >5000 requested):
    // Use Weighted Random Sort (Efraimidis-Spirakis) to prioritize high-weight topics in the order.
    if (totalToSelect > 5000) {
        let allValidQuestions = [];
        data.forEach(t => {
            let w = weights[t.topic];
            let weight = (w !== undefined && w !== null && !isNaN(w)) ? parseInt(w) : 5;
            if (weight < 1) weight = 1;

            t.questions.forEach(q => {
                // R ^ (1/w)
                // Higher weight -> Exponent closer to 0 -> SortKey closer to 1
                const sortKey = Math.pow(Math.random(), 1 / weight);
                allValidQuestions.push({
                    ...q,
                    topicName: t.topic,
                    sortKey: sortKey
                });
            });
        });

        // Sort descending by Key: high weight topics will appear earlier on average
        allValidQuestions.sort((a, b) => b.sortKey - a.sortKey);

        return allValidQuestions;
    }

    // Mode Exam (Limited count e.g. 30):
    // Use weights to determine quota per topic
    let remainingSlots = totalToSelect;

    topics.forEach(t => {
        const w = weights[t];
        const weight = (w !== undefined && w !== null && !isNaN(w)) ? parseInt(w) : 5;
        const quota = Math.round((weight / totalWeight) * totalToSelect);

        // Get questions for this topic
        let topicQuestions = questionsByTopic[t];

        // Shuffle this topic's questions
        topicQuestions = shuffleArray(topicQuestions);

        // Take quota amount (or all if quota > available)
        let take = Math.min(quota, topicQuestions.length);
        if (take > 0) {
            selected.push(...topicQuestions.slice(0, take));
            remainingSlots -= take;
        }
    });

    // Fill remaining slots if any (due to rounding or empty topics)
    if (remainingSlots > 0 || selected.length < totalToSelect) {
        // Gather all remaining unselected questions
        let pool = [];
        let usedIds = new Set(selected.map(sq => sq.id));

        data.forEach(t => {
            t.questions.forEach(q => {
                if (!usedIds.has(q.id)) {
                    pool.push({ ...q, topicName: t.topic });
                }
            });
        });

        pool = shuffleArray(pool);
        selected.push(...pool.slice(0, totalToSelect - selected.length));
    }

    // Final shuffle of the mixed selection
    return shuffleArray(selected);
}

// Start Review Test
if (btnReviewFailed) {
    btnReviewFailed.onclick = () => {
        if (failedQuestions.length === 0) return;
        startQuiz(shuffleArray([...failedQuestions]), false);
    };
}

if (btnReviewFavorites) {
    btnReviewFavorites.onclick = () => {
        if (favoriteQuestions.length === 0) return;
        startQuiz(shuffleArray([...favoriteQuestions]), false);
    };
}

if (btnClearFailed) {
    btnClearFailed.onclick = () => {
        if (confirm('Segur que vols borrar totes les fallades registrades?')) {
            failedQuestions = [];
            localStorage.setItem('failed_questions', JSON.stringify([]));
            updateFailedUI();
        }
    };
}

function startQuiz(questions, isExam, customDuration) {
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
        totalTimeSeconds: customDuration ? customDuration : (isExam ? 2700 : 0),
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

    // Check Favorites Status
    const isFav = favoriteQuestions.some(q => q.id === question.id);

    container.innerHTML = `
        <div class="question-card">
            <div class="question-header-top">
                <span class="question-topic">${question.topicName} — ${question.exam}</span>
                <div class="question-actions-top">
                    <!-- Favorite Button -->
                    <button class="btn-action-icon btn-favorite ${isFav ? 'active' : ''}" title="${isFav ? 'Treure de favorits' : 'Afegir a favorits'}">
                        <i class="${isFav ? 'fas' : 'far'} fa-star"></i>
                    </button>
                    <!-- Report Button -->
                    <button class="btn-action-icon btn-report" title="Informar d'error">
                        <i class="fas fa-exclamation-triangle"></i>
                    </button>
                </div>
            </div>
            
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

    // Report Error Logic
    const reportBtn = container.querySelector('.btn-report');
    if (reportBtn) {
        reportBtn.onclick = async () => {
            const comment = prompt("Descriu l'error que has trobat en aquesta pregunta:");
            if (comment !== null) { // If user didn't cancel
                const report = {
                    questionId: question.id || 'unknown',
                    questionText: question.text,
                    topic: question.topicName || 'unknown',
                    user: currentUser ? currentUser.email : 'anonymous',
                    comment: comment || 'Sense comentari',
                    fixed: false
                };

                try {
                    await FirebaseDB.saveErrorReport(report);
                    alert("Gràcies pel teu feedback! Ho revisarem el més aviat possible.");
                } catch (e) {
                    alert("Hi ha hagut un error enviant l'informe. Torna-ho a provar més tard.");
                }
            }
        };
    }

    // Favorites Logic
    const starBtn = container.querySelector('.btn-favorite');
    if (starBtn) {
        starBtn.onclick = () => {
            const index = favoriteQuestions.findIndex(q => q.id === question.id);
            let isNowFav = false;

            if (index === -1) {
                // Add to favorites
                favoriteQuestions.push(question);
                isNowFav = true;
            } else {
                // Remove from favorites
                favoriteQuestions.splice(index, 1);
                isNowFav = false;
            }

            // Update UI
            if (isNowFav) {
                starBtn.classList.add('active');
                starBtn.innerHTML = '<i class="fas fa-star"></i>';
                starBtn.title = 'Treure de favorits';
            } else {
                starBtn.classList.remove('active');
                starBtn.innerHTML = '<i class="far fa-star"></i>';
                starBtn.title = 'Afegir a favorits';
            }

            // Save locally
            localStorage.setItem('favorite_questions', JSON.stringify(favoriteQuestions));

            // Sync with user profile if logged in
            if (currentUser) {
                currentUser.favorites = favoriteQuestions;
                updateUserInFirebase().catch(e => console.error('Error syncing favorites:', e));
            }

            updateFailedUI(); // Updates the count in the background
        };
    }

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

        // MULTIPLAYER SYNC
        if (currentRoomCode) {
            const progress = Math.round(((currentQuiz.currentIndex + 1) / currentQuiz.questions.length) * 100);
            FirebaseDB.updatePlayerStatus(currentRoomCode, currentUser.email, {
                score: currentQuiz.score,
                progress: progress
            });
        }
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

    // Calculate Score with Penalty: Correct - (Incorrect * 0.25)
    // Incorrect is total answered minus correct ones (assuming we force answer or count only answered ones as wrong?)
    // In our logic results array contains ONLY answered questions.
    // So Incorrect = results.length - score (where score is correct count)
    // Wait, let's recount from results to be safe.
    const correctCount = currentQuiz.results.filter(r => r.correct).length;
    const incorrectCount = currentQuiz.results.filter(r => !r.correct).length;

    // Penalize 0.25 points for each incorrect answer
    let rawScore = correctCount - (incorrectCount * 0.25);
    if (rawScore < 0) rawScore = 0; // Prevent negative scores

    // Percentage based on raw score vs total questions
    // e.g. 10 questions. 5 correct, 4 wrong. Score = 5 - 1 = 4. 4/10 = 40%
    const scorePct = total > 0 ? Math.round((rawScore / total) * 100) : 0;

    // Update score display to show weighted score, but let's keep simple "Correct" count for stats
    // Or maybe show the decimal score? User asked for formula, likely for the final grade.
    // We will show percentage based on formula.

    document.getElementById('final-score').textContent = `${scorePct}%`;
    document.querySelector('.score-circle').style.setProperty('--percentage', `${scorePct}%`);

    // Stat details: Just raw counts for clarity
    document.getElementById('stat-correct').textContent = correctCount;
    document.getElementById('stat-incorrect').textContent = incorrectCount; // Show actual errors count

    const duration = Math.floor((new Date() - currentQuiz.startTime) / 1000);
    const mins = Math.floor(duration / 60);
    const secs = duration % 60;
    document.getElementById('stat-time').textContent = `${mins}m ${secs}s`;

    const msgEl = document.getElementById('result-message');
    if (scorePct >= 80) msgEl.textContent = 'Excel·lent!';
    else if (scorePct >= 50) msgEl.textContent = 'Molt bé!';
    else msgEl.textContent = 'Cal seguir practicant';

    // Save test in history for the chart
    if (currentUser) {
        if (!currentUser.stats.history) currentUser.stats.history = [];

        const historyEntry = {
            date: new Date().toISOString(),
            score: currentQuiz.score,
            total: total,
            topics: {}
        };

        // Group results by topic for granular tracking
        currentQuiz.results.forEach(res => {
            const tName = res.questionObj.topicName || 'General';
            if (!historyEntry.topics[tName]) {
                historyEntry.topics[tName] = { correct: 0, total: 0 };
            }
            historyEntry.topics[tName].total++;
            if (res.correct) historyEntry.topics[tName].correct++;
        });

        // Limit history to last 50 entries to keep Firebase light
        currentUser.stats.history.push(historyEntry);
        if (currentUser.stats.history.length > 50) currentUser.stats.history.shift();

        updateUserInFirebase().catch(e => console.error('Error saving history:', e));
    }
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
    const screen = document.getElementById(screenId);
    if (screen) {
        screen.classList.add('active');
        window.scrollTo(0, 0);
    } else {
        console.warn(`La pantalla "${screenId}" no s'ha trobat al DOM.`);
    }
}

const btnRestart = document.getElementById('btn-restart');
if (btnRestart) {
    btnRestart.onclick = () => {
        currentRoomCode = null;
        switchScreen('selection-screen');
        renderRanking();
    };
}

const btnExitQuiz = document.getElementById('btn-exit-quiz');
if (btnExitQuiz) {
    btnExitQuiz.onclick = () => {
        if (confirm('Segur que vols sortir? El progrés es perdrà.')) {
            currentRoomCode = null;
            clearInterval(currentQuiz.timerInterval);
            switchScreen('selection-screen');
            renderRanking();
        }
    };
}

// New Button: Save and Exit (Finish Early)
const btnFinishEarly = document.getElementById('btn-finish-early');
if (btnFinishEarly) {
    btnFinishEarly.onclick = () => {
        if (confirm('Vols acabar el test ara i guardar el resultat?')) {
            // If in standard mode, we treat the answered questions as the total
            // so the score reflects "real" performance on what was attempted
            if (!currentQuiz.isExamMode) {
                const answeredCount = currentQuiz.currentIndex;
                // However, currentQuiz.currentIndex matches the NEXT question index usually, 
                // but results only have answered ones.
                // Actually, if we are at question 5 (index 4), we answered 4 questions OR we are looking at question 5.
                // If we are looking at it and haven't answered, result len is 4.
                // If we answered, 'Next' button is visible.

                // Let's use results length as the source of truth for "completed" questions
                const completedCount = currentQuiz.results.length;

                // Slice the questions array to match what we actually did
                // This will make finishQuiz calculate score against completedCount
                currentQuiz.questions = currentQuiz.questions.slice(0, completedCount);
                // Also update currentIndex to match end
                currentQuiz.currentIndex = completedCount;
            }

            finishQuiz();
        }
    };
}

if (btnLogout) {
    btnLogout.onclick = () => {
        if (confirm('Segur que vols tancar la sessió?')) {
            // Check if Firebase is available
            if (typeof firebase !== 'undefined' && firebase.auth) {
                firebase.auth().signOut().then(() => {
                    localStorage.removeItem('current_user');
                    window.location.href = 'login.html';
                }).catch((error) => {
                    // Force local logout
                    localStorage.removeItem('current_user');
                    window.location.href = 'login.html';
                });
            } else {
                // Offline fallback - logout locally
                localStorage.removeItem('current_user');
                window.location.href = 'login.html';
            }
        }
    };
}

// Stats logic
if (userNameDisplay) {
    userNameDisplay.onclick = () => {
        window.location.href = 'perfil.html';
    };
}

if (btnShowStats) {
    btnShowStats.onclick = () => {
        window.location.href = 'perfil.html';
    };
}



// Export functions to window for HTML onclick attributes
window.toggleTopic = toggleTopic;

// Toggles Logic
const btnToggleOfficial = document.getElementById('btn-toggle-official');
const officialStatusEl = document.getElementById('official-status');
const officialTotalCountEl = document.getElementById('official-total-count');
const btnToggleAI = document.getElementById('btn-toggle-ai');
const aiStatusEl = document.getElementById('ai-status');
const aiTotalCountEl = document.getElementById('ai-total-count');
const btnToggleExtra = document.getElementById('btn-toggle-extra');
const extraStatusEl = document.getElementById('extra-status');
const extraTotalCountEl = document.getElementById('extra-total-count');

function updateFinalData() {
    let merged = [];

    if (includeOfficial) {
        merged = JSON.parse(JSON.stringify(officialData));
    }

    if (includeExtra) {
        extraData.forEach(extraT => {
            const existing = merged.find(t => t.topic === extraT.topic);
            if (existing) {
                existing.questions = [...existing.questions, ...extraT.questions];
            } else {
                merged.push(JSON.parse(JSON.stringify(extraT)));
            }
        });
    }

    if (includeAI) {
        aiData.forEach(aiT => {
            const existing = merged.find(t => t.topic === aiT.topic);
            if (existing) {
                existing.questions = [...existing.questions, ...aiT.questions];
            } else {
                merged.push(JSON.parse(JSON.stringify(aiT)));
            }
        });
    }

    // Refresh UI Counters
    const officialTotal = (officialData || []).reduce((acc, t) => acc + (t.questions ? t.questions.length : 0), 0);
    const aiTotal = (aiData || []).reduce((acc, t) => acc + (t.questions ? t.questions.length : 0), 0);
    const extraTotal = (extraData || []).reduce((acc, t) => acc + (t.questions ? t.questions.length : 0), 0);

    if (officialTotalCountEl) officialTotalCountEl.textContent = officialTotal;
    if (aiTotalCountEl) aiTotalCountEl.textContent = aiTotal;
    if (extraTotalCountEl) extraTotalCountEl.textContent = extraTotal;

    allData = merged;
    renderTopics(topicSearch.value);
}


if (btnToggleOfficial) {
    btnToggleOfficial.onclick = () => {
        includeOfficial = !includeOfficial;
        btnToggleOfficial.classList.toggle('official-on', includeOfficial);
        btnToggleOfficial.classList.toggle('official-off', !includeOfficial);
        officialStatusEl.textContent = includeOfficial ? 'ON' : 'OFF';
        updateFinalData();
    };
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

window.startMultiplayerQuiz = (questions, roomCode, timeMin) => {
    currentRoomCode = roomCode;
    // Set duration: timeMin conversion to seconds
    const durationSeconds = (timeMin || 15) * 60;

    // Start quiz in Exam mode with custom duration
    startQuiz(questions, true, durationSeconds);
};



