import { FirebaseDB } from './firebase-db.js';

const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const goToRegister = document.getElementById('go-to-register');
const goToLogin = document.getElementById('go-to-login');
const authTitle = document.getElementById('auth-title');
const authSubtitle = document.getElementById('auth-subtitle');

// Switch to Register
goToRegister.onclick = (e) => {
    e.preventDefault();
    loginForm.style.display = 'none';
    registerForm.style.display = 'flex';
    authTitle.textContent = 'Crea un Compte';
    authSubtitle.textContent = 'Uneix-te als futurs bombers.';
};

// Switch to Login
goToLogin.onclick = (e) => {
    e.preventDefault();
    registerForm.style.display = 'none';
    loginForm.style.display = 'flex';
    authTitle.textContent = 'Inicia Sessió';
    authSubtitle.textContent = 'Benvingut de nou, futur bomber.';
};

// Handle Registration
registerForm.onsubmit = async (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    const existingUser = await FirebaseDB.getUserByEmail(email);
    if (existingUser) {
        alert('Aquest correu ja està registrat.');
        return;
    }

    const newUser = {
        name,
        email,
        password,
        stats: { correct: 0, wrong: 0, topics: {}, days: [new Date().toISOString().split('T')[0]] }
    };

    await FirebaseDB.updateUser(newUser);
    localStorage.setItem('current_user', JSON.stringify(newUser));
    window.location.href = 'index.html';
};

// Handle Login
loginForm.onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    // MASTER USER PER PROVES OFFLINE
    if (email === 'offline@test.com' && password === '1234') {
        const currentUser = {
            name: 'Usuari de Proves',
            email: 'offline@test.com',
            password: '1234',
            stats: { correct: 0, wrong: 0, topics: {}, days: [new Date().toISOString().split('T')[0]] }
        };
        localStorage.setItem('current_user', JSON.stringify(currentUser));
        window.location.href = 'index.html';
        return;
    }

    const user = await FirebaseDB.getUserByEmail(email);

    if (user && user.password === password) {
        if (!user.stats) {
            user.stats = { correct: 0, wrong: 0, topics: {}, days: [] };
        }
        localStorage.setItem('current_user', JSON.stringify(user));
        window.location.href = 'index.html';
    } else {
        alert('Correu o contrasenya incorrectes.');
    }
};

// Redirect if already logged in
if (localStorage.getItem('current_user')) {
    window.location.href = 'index.html';
}
