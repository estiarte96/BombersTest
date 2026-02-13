import { FirebaseDB } from './firebase-db.js';

let currentUser = JSON.parse(localStorage.getItem('current_user') || 'null');

if (!currentUser) {
    window.location.href = 'login.html';
}

const userNameDisplay = document.getElementById('user-name-display');
const btnLogout = document.getElementById('btn-logout');
const btnStatsBack = document.getElementById('btn-stats-back');

userNameDisplay.textContent = currentUser.name || currentUser.email;

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
    window.location.href = 'index.html';
};

btnLogout.onclick = () => {
    if (confirm('Segur que vols tancar la sessió?')) {
        localStorage.removeItem('current_user');
        window.location.href = 'login.html';
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
}

renderStats();
