import { FirebaseDB } from './firebase-db.js';

// Simple auth
document.getElementById('btn-admin-login').onclick = () => {
    const pass = document.getElementById('admin-pass').value;
    // Hardcoded pass for now: admin1234
    if (pass === 'admin1234') {
        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('admin-content').style.display = 'block';
        loadReports();
    } else {
        alert('Accés denegat');
    }
};

async function loadReports() {
    const list = document.getElementById('reports-list');
    list.innerHTML = '<p style="text-align: center;">Carregant...</p>';

    try {
        const reports = await FirebaseDB.getErrorReports();
        document.getElementById('report-count').textContent = reports.length;

        if (reports.length === 0) {
            list.innerHTML = '<p style="text-align: center; color: var(--text-muted);">No hi ha reports pendents.</p>';
            return;
        }

        // Sort by timestamp desc
        reports.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        list.innerHTML = '';
        reports.forEach(r => {
            const div = document.createElement('div');
            div.className = 'report-card';
            const date = r.timestamp ? new Date(r.timestamp).toLocaleString() : 'Data desconeguda';

            div.innerHTML = `
                <div class="report-header">
                    <span class="report-topic">${r.topic}</span>
                    <span class="report-time">${date}</span>
                </div>
                <div class="report-content">
                    <div class="report-question">Pregunta: ${r.questionText} (ID: ${r.questionId})</div>
                    <div class="report-comment">" ${r.comment} "</div>
                    <div class="report-user">Reportat per: ${r.user}</div>
                </div>
                <div style="text-align: right;">
                     <button class="btn-resolve" data-id="${r.id}">
                        <i class="fas fa-check"></i> Marcar com Resolt
                     </button>
                </div>
            `;
            list.appendChild(div);
        });

        // Add listeners
        document.querySelectorAll('.btn-resolve').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const btn = e.currentTarget;
                if (confirm('Marcar com a resolt i eliminar de la llista?')) {
                    // Disable button to prevent double clicks
                    btn.disabled = true;
                    btn.textContent = 'Processant...';

                    const id = btn.getAttribute('data-id');
                    await FirebaseDB.resolveReport(id);
                    // Reload reports
                    loadReports();
                }
            });
        });

    } catch (e) {
        console.error(e);
        list.innerHTML = '<p style="color: red;">Error carregant reports.</p>';
    }
}
