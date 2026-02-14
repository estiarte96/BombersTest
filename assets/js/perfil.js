import { FirebaseDB } from './firebase-db.js';
import { ThemeManager } from './theme.js';

let currentUser = JSON.parse(localStorage.getItem('current_user') || 'null');
ThemeManager.init();


if (!currentUser) {
    window.location.href = 'login.html';
}

const userNameDisplay = document.getElementById('user-name-display');
const btnLogout = document.getElementById('btn-logout');
const btnStatsBack = document.getElementById('btn-stats-back');
const profileForm = document.getElementById('profile-form');
const profileNameInput = document.getElementById('profile-name');
const profileNicknameInput = document.getElementById('profile-nickname');

// Load initial values
userNameDisplay.textContent = currentUser.name || currentUser.email;
profileNameInput.value = currentUser.name || '';
profileNicknameInput.value = currentUser.nickname || '';

// Handle Profile Update
profileForm.onsubmit = async (e) => {
    e.preventDefault();
    const newName = profileNameInput.value.trim();
    const newNickname = profileNicknameInput.value.trim().toLowerCase();

    if (!newName || !newNickname) {
        alert('Si us plau, omple tots els camps.');
        return;
    }

    const btnSave = document.getElementById('btn-save-profile');
    const originalText = btnSave.innerHTML;
    btnSave.disabled = true;
    btnSave.textContent = 'VERIFICANT...';

    try {
        // Check if nickname is taken by someone else
        const allUsers = await FirebaseDB.getUsers();
        const isTaken = allUsers.some(u =>
            u.email !== currentUser.email &&
            u.nickname &&
            u.nickname.toLowerCase() === newNickname
        );

        if (isTaken) {
            alert('Aquest mote ja està en ús. Tria\'n un altre.');
            btnSave.disabled = false;
            btnSave.innerHTML = originalText;
            return;
        }

        // Update user object
        currentUser.name = newName;
        currentUser.nickname = newNickname;

        btnSave.textContent = 'GUARDANT...';
        await FirebaseDB.updateUser(currentUser);
        localStorage.setItem('current_user', JSON.stringify(currentUser));

        userNameDisplay.textContent = newName;
        alert('Perfil actualitzat correctament!');
    } catch (error) {
        console.error('Error updating profile:', error);
        alert('Hi ha hagut un error al guardar els canvis.');
    } finally {
        btnSave.disabled = false;
        btnSave.innerHTML = originalText;
    }
};

const btnToggleConfig = document.getElementById('btn-toggle-config');
const btnResetStats = document.getElementById('btn-reset-stats');
const configSection = document.getElementById('weights-config-section');
const btnSaveWeights = document.getElementById('btn-save-weights');
const weightsList = document.getElementById('weights-list');


btnResetStats.onclick = async () => {
    if (confirm('Estàs segur que vols reiniciar totes les teves estadístiques? Les dades de Correctes i Fallades es posaran a zero.')) {
        if (!currentUser.stats) currentUser.stats = {};

        // Reset only the metrics, keep weights and usage days
        currentUser.stats.correct = 0;
        currentUser.stats.wrong = 0;
        currentUser.stats.topics = {};

        btnResetStats.disabled = true;
        const originalText = btnResetStats.innerHTML;
        btnResetStats.textContent = 'REINICIANT...';

        try {
            await FirebaseDB.updateUser(currentUser);
            localStorage.setItem('current_user', JSON.stringify(currentUser));
            renderStats();
            alert('Estadístiques reiniciades amb èxit.');
        } catch (e) {
            console.error('Error resetting stats:', e);
            alert('Hi ha hagut un problema al reiniciar.');
        } finally {
            btnResetStats.disabled = false;
            btnResetStats.innerHTML = originalText;
        }
    }
};

btnToggleConfig.onclick = () => {
    configSection.classList.toggle('hidden');
    if (!configSection.classList.contains('hidden')) {
        renderWeights();
    }
};

btnStatsBack.onclick = () => {
    window.location.href = 'app.html';
};

btnLogout.onclick = () => {
    if (confirm('Segur que vols tancar la sessió?')) {
        // If Firebase is loaded and online
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().signOut().then(() => {
                localStorage.removeItem('current_user');
                window.location.href = 'login.html';
            }).catch((error) => {
                // Force logout if Firebase fails
                localStorage.removeItem('current_user');
                window.location.href = 'login.html';
            });
        } else {
            // Offline fallback
            localStorage.removeItem('current_user');
            window.location.href = 'login.html';
        }
    }
};

async function renderWeights() {
    weightsList.innerHTML = '<p style="text-align:center;">Carregant temes...</p>';

    try {
        const questions = await FirebaseDB.getQuestions();
        const topics = questions.map(q => q.topic);

        if (!currentUser.stats) currentUser.stats = {};
        if (!currentUser.stats.weights) currentUser.stats.weights = {};

        weightsList.innerHTML = '';
        const sortedTopicNames = [...new Set(topics)].sort((a, b) =>
            a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
        );

        sortedTopicNames.forEach(name => {
            const currentWeight = currentUser.stats.weights[name] || 5;
            const div = document.createElement('div');
            div.className = 'weight-item';
            div.innerHTML = `
                <div class="weight-info">
                    <span class="weight-name">${name}</span>
                </div>
                <div class="weight-selector">
                    <span class="weight-label">Importància</span>
                    <input type="number" class="weight-input" min="1" max="10" value="${currentWeight}" data-topic="${name}">
                </div>
            `;
            weightsList.appendChild(div);
        });
    } catch (e) {
        console.error('Error rendering weights:', e);
        weightsList.innerHTML = '<p style="color:red;">Error carregant temes.</p>';
    }
}

btnSaveWeights.onclick = async () => {
    const inputs = weightsList.querySelectorAll('.weight-input');
    const newWeights = {};

    inputs.forEach(input => {
        const topic = input.getAttribute('data-topic');
        const val = parseInt(input.value);
        newWeights[topic] = Math.max(1, Math.min(10, val));
    });

    if (!currentUser.stats) currentUser.stats = {};
    currentUser.stats.weights = newWeights;

    btnSaveWeights.disabled = true;
    btnSaveWeights.textContent = 'GUARDANT...';

    try {
        await FirebaseDB.updateUser(currentUser);
        localStorage.setItem('current_user', JSON.stringify(currentUser));
        alert('Configuració d\'importància guardada correctament!');
        configSection.classList.add('hidden');
    } catch (e) {
        alert('Error al guardar la configuració.');
    } finally {
        btnSaveWeights.disabled = false;
        btnSaveWeights.textContent = 'GUARDAR CONFIGURACIÓ';
    }
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

    const sortedTopics = Object.entries(s.topics || {}).sort((a, b) =>
        a[0].localeCompare(b[0], undefined, { numeric: true, sensitivity: 'base' })
    );

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

    renderChart(s.history || []);
}

let evolutionChart = null;

function renderChart(history) {
    const ctx = document.getElementById('evolutionChart');
    if (!ctx || history.length === 0) return;

    if (evolutionChart) {
        evolutionChart.destroy();
    }

    // Group history by Day
    const dailyData = {};
    history.forEach(h => {
        const day = new Date(h.date).toISOString().split('T')[0];
        if (!dailyData[day]) {
            dailyData[day] = {
                correct: 0,
                total: 0,
                topics: {}
            };
        }
        dailyData[day].correct += h.score;
        dailyData[day].total += h.total;

        Object.entries(h.topics || {}).forEach(([tName, tData]) => {
            if (!dailyData[day].topics[tName]) {
                dailyData[day].topics[tName] = { correct: 0, total: 0 };
            }
            dailyData[day].topics[tName].correct += tData.correct;
            dailyData[day].topics[tName].total += tData.total;
        });
    });

    // Sort days chronologically
    const sortedDays = Object.keys(dailyData).sort();
    const labels = sortedDays.map(d => {
        const [y, m, day] = d.split('-');
        return `${day}/${m}`;
    });

    // Dataset for Daily Global Average
    const globalData = sortedDays.map(d => Math.round((dailyData[d].correct / dailyData[d].total) * 100));

    // Get all unique topics from all days
    const topicsSet = new Set();
    sortedDays.forEach(d => {
        Object.keys(dailyData[d].topics).forEach(t => topicsSet.add(t));
    });

    const datasets = [
        {
            label: 'Mitjana Global Diària',
            data: globalData,
            borderColor: '#e63946',
            backgroundColor: 'rgba(230, 57, 70, 0.1)',
            borderWidth: 4,
            fill: true,
            tension: 0.3,
            pointRadius: 5,
            pointHoverRadius: 8
        }
    ];

    // Add datasets for each topic
    const topicList = Array.from(topicsSet);
    topicList.forEach((topic, idx) => {
        const data = sortedDays.map(d => {
            if (dailyData[d].topics[topic]) {
                return Math.round((dailyData[d].topics[topic].correct / dailyData[d].topics[topic].total) * 100);
            }
            return null;
        });

        // Add topic line (hidden by default to avoid mess)
        const color = `hsl(${(idx * 137.5) % 360}, 70%, 50%)`;
        datasets.push({
            label: topic,
            data: data,
            borderColor: color,
            borderWidth: 2,
            hidden: true,
            spanGaps: true,
            tension: 0.3,
            pointRadius: 3
        });
    });

    evolutionChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: '% Encerts (Mitjana Diària)'
                    },
                    ticks: {
                        callback: function (value) { return value + '%'; }
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Dies d\'estudi'
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 12,
                        usePointStyle: true,
                        padding: 15,
                        font: { size: 10 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return `${context.dataset.label}: ${context.parsed.y}%`;
                        }
                    }
                }
            }
        }
    });
}


renderStats();
