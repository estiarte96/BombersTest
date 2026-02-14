import { FirebaseDB } from './firebase-db.js';
import { ThemeManager } from './theme.js';

ThemeManager.init();


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

const loginAlert = document.getElementById('login-alert');
const loginAlertMsg = document.getElementById('login-alert-msg');

function showAlert(msg) {
    loginAlertMsg.textContent = msg;
    loginAlert.style.display = 'block';
    // Auto hide after 5 seconds
    setTimeout(() => {
        loginAlert.style.display = 'none';
    }, 5000);
}

// Handle Registration
registerForm.onsubmit = async (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    try {
        // Try Firebase Auth first
        await firebase.auth().createUserWithEmailAndPassword(email, password);

        // If successful, save extra data to DB
        const newUser = {
            name,
            email,
            password, // Storing password in DB is not recommended in production but keeping for existing logic
            stats: { correct: 0, wrong: 0, topics: {}, days: [new Date().toISOString().split('T')[0]] }
        };

        await FirebaseDB.updateUser(newUser);
        localStorage.setItem('current_user', JSON.stringify(newUser));
        window.location.href = 'app.html';

    } catch (error) {
        console.error("Firebase Auth Error:", error);

        // Fallback to existing manual DB check if Auth fails related to config/network
        // but if error is 'email-already-in-use', show that.
        if (error.code === 'auth/email-already-in-use') {
            showAlert('Aquest correu ja està registrat.');
            return;
        }

        // --- LEGACY FALLBACK FOR DB-ONLY USERS ---
        const existingUser = await FirebaseDB.getUserByEmail(email);
        if (existingUser) {
            showAlert('Aquest correu ja està registrat.');
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
        window.location.href = 'app.html';
    }
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
        window.location.href = 'app.html';
        return;
    }

    try {
        // Try Firebase Auth Login
        await firebase.auth().signInWithEmailAndPassword(email, password);

        // Get user data from DB to sync custom stats
        const user = await FirebaseDB.getUserByEmail(email);
        if (user) {
            if (!user.stats) user.stats = { correct: 0, wrong: 0, topics: {}, days: [] };
            localStorage.setItem('current_user', JSON.stringify(user));
        } else {
            // Should not happen if registered correctly, but create min profile
            const minUser = { email: email, name: email.split('@')[0], stats: {} };
            localStorage.setItem('current_user', JSON.stringify(minUser));
        }
        window.location.href = 'app.html';

    } catch (error) {
        console.error("Login Error:", error);
        // Fallback to DB check (for old users not in Auth)
        const user = await FirebaseDB.getUserByEmail(email);

        if (user && user.password === password) {
            if (!user.stats) {
                user.stats = { correct: 0, wrong: 0, topics: {}, days: [] };
            }
            localStorage.setItem('current_user', JSON.stringify(user));
            window.location.href = 'app.html';
        } else {
            // Show error banner
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                showAlert('Correu o contrasenya incorrectes.');
            } else {
                showAlert('Error en iniciar sessió. Comprova les dades.');
            }
        }
    }
};

// Forgot Password
const forgotPasswordLink = document.getElementById('forgot-password-link');
if (forgotPasswordLink) {
    forgotPasswordLink.onclick = async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        if (!email) {
            showAlert('Escriu el teu correu electrònic primer per recuperar la contrasenya.');
            return;
        }

        try {
            await firebase.auth().sendPasswordResetEmail(email);
            alert('T\'hem enviat un correu per restablir la contrasenya. Revisa la teva bústia.');
        } catch (error) {
            console.error("Reset Password Error:", error);
            if (error.code === 'auth/user-not-found') {
                showAlert('No hi ha cap compte amb aquest correu.');
            } else {
                showAlert('Error en enviar el correu. Torna-ho a provar.');
            }
        }
    };
}

// Redirect if already logged in
if (localStorage.getItem('current_user')) {
    window.location.href = 'app.html';
}

