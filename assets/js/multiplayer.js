import { FirebaseDB } from './firebase-db.js';

export const Multiplayer = {
    currentRoom: null,
    isHost: false,

    init() {
        // Buttons
        document.getElementById('btn-mode-multiplayer').onclick = () => this.showSetup();
        document.getElementById('btn-multi-back').onclick = () => this.switchScreen('selection-screen');
        document.getElementById('btn-create-room').onclick = () => this.createRoom();
        document.getElementById('btn-join-room').onclick = () => this.joinRoom();
        document.getElementById('btn-leave-lobby').onclick = () => this.leaveRoom();
        document.getElementById('btn-start-multi-test').onclick = () => this.startMatch();
    },

    showSetup() {
        this.switchScreen('multiplayer-screen');
    },

    async createRoom() {
        const currentUser = JSON.parse(localStorage.getItem('current_user'));
        if (!currentUser) return;

        const numQuestions = parseInt(document.getElementById('multi-num-questions').value);
        const matchTime = parseInt(document.getElementById('multi-match-time').value);

        const code = Math.random().toString(36).substring(2, 6).toUpperCase();
        const playerKey = currentUser.email.replace(/[.#$[\]]/g, '_');

        const roomData = {
            code: code,
            host: currentUser.email,
            status: 'waiting',
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            settings: {
                questions: numQuestions,
                time: matchTime
            },
            players: {
                [playerKey]: {
                    name: currentUser.name || currentUser.email,
                    nickname: currentUser.nickname || '',
                    email: currentUser.email,
                    score: 0,
                    progress: 0,
                    isHost: true
                }
            }
        };

        try {
            await FirebaseDB.createRoom(roomData);
            this.isHost = true;
            this.enterLobby(code);
        } catch (error) {
            alert('Error al crear la sala');
        }
    },

    async joinRoom() {
        const codeInput = document.getElementById('join-room-code');
        const code = codeInput.value.trim().toUpperCase();
        if (!code) return;

        const currentUser = JSON.parse(localStorage.getItem('current_user'));
        const room = await FirebaseDB.getRoom(code);

        if (!room) {
            alert('Sala no trobada');
            return;
        }

        if (room.status !== 'waiting') {
            alert('La partida ja ha començat');
            return;
        }

        const player = {
            name: currentUser.name || currentUser.email,
            nickname: currentUser.nickname || '',
            email: currentUser.email,
            score: 0,
            progress: 0,
            isHost: false
        };

        await FirebaseDB.joinRoom(code, player);
        this.isHost = false;
        this.enterLobby(code);
    },

    enterLobby(code) {
        this.currentRoom = code;
        document.getElementById('lobby-room-code').textContent = code;
        this.switchScreen('lobby-screen');

        // Listen for player changes
        const roomRef = FirebaseDB.getRoomsRef().child(code);
        roomRef.on('value', (snapshot) => {
            const room = snapshot.val();
            if (!room) return;

            if (room.status === 'playing' && !window.isInMatch) {
                // PARTIDA COMENÇADA! (Això s'executarà per als convidats)
                this.startMatchUI(room);
            }

            this.updatePlayersList(room.players);

            // Show start button only for host
            const startBtn = document.getElementById('btn-start-multi-test');
            const waitMsg = document.getElementById('lobby-wait-msg');
            if (this.isHost) {
                startBtn.style.display = 'block';
                waitMsg.style.display = 'none';
            } else {
                startBtn.style.display = 'none';
                waitMsg.style.display = 'block';
            }
        });
    },

    updatePlayersList(players) {
        const list = document.getElementById('players-list');
        const count = document.getElementById('player-count');
        const currentUser = JSON.parse(localStorage.getItem('current_user'));

        const playersArray = Object.values(players);
        count.textContent = playersArray.length;
        list.innerHTML = '';

        playersArray.forEach(p => {
            const initials = this.getInitials(p.name);
            const isMe = p.email === currentUser.email;

            const div = document.createElement('div');
            div.className = `player-bubble ${isMe ? 'is-me' : ''} ${p.isHost ? 'is-host' : ''}`;
            div.innerHTML = `
                <div class="player-avatar">${p.nickname ? p.nickname.substring(0, 2).toUpperCase() : initials}</div>
                <span class="player-name">${p.nickname || p.name}</span>
                <div class="player-progress-mini" style="width: 100%; height: 4px; background: var(--border); border-radius: 2px; margin-top: 5px; overflow: hidden;">
                    <div style="width: ${p.progress || 0}%; height: 100%; background: var(--success); transition: width 0.3s;"></div>
                </div>
                <span style="font-size: 10px; color: var(--text-muted);">${p.score || 0} pts</span>
            `;
            list.appendChild(div);
        });
    },

    async startMatch() {
        const room = await FirebaseDB.getRoom(this.currentRoom);
        const settings = room.settings || { questions: 20, time: 15 };

        // Generar preguntes basades en els ajustos de la sala
        const allQuestions = await FirebaseDB.getQuestions('official');
        let pool = [];
        allQuestions.forEach(t => {
            t.questions.forEach(q => pool.push({ ...q, topicName: t.topic }));
        });

        // Shuffle and pick the amount requested
        const selected = pool.sort(() => 0.5 - Math.random()).slice(0, settings.questions);

        await FirebaseDB.getRoomsRef().child(this.currentRoom).update({
            status: 'playing',
            matchQuestions: selected,
            startTime: firebase.database.ServerValue.TIMESTAMP
        });
    },

    startMatchUI(room) {
        window.isInMatch = true;
        const settings = room.settings || { questions: 20, time: 15 };
        // Reiniciem l'estat del Quiz a app.js i injectem les preguntes del multi
        if (window.startMultiplayerQuiz) {
            window.startMultiplayerQuiz(room.matchQuestions, this.currentRoom, settings.time);
        }
    },

    leaveRoom() {
        if (!this.currentRoom) return;
        FirebaseDB.getRoomsRef().child(this.currentRoom).off(); // Deixar d'escoltar
        this.currentRoom = null;
        this.switchScreen('selection-screen');
    },

    getInitials(name) {
        const parts = name.split(/[ @._]/);
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return parts[0].substring(0, 2).toUpperCase();
    },

    switchScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(id).classList.add('active');
    }
};
