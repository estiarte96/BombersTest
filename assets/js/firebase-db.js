// Access the initialized Firebase instance
const getDb = () => firebase.database();

// Database references
const getUsersRef = () => getDb().ref('users');
const getQuestionsRef = () => getDb().ref('questions');

// Firebase Database Functions
export const FirebaseDB = {
    // Get all users
    async getUsers() {
        try {
            const snapshot = await getUsersRef().once('value');
            const usersObj = snapshot.val() || {};
            return Object.values(usersObj);
        } catch (error) {
            console.error('Error getting users:', error);
            return [];
        }
    },

    // Save all users
    async saveUsers(users) {
        try {
            // Convert array to object with email as key
            const usersObj = {};
            users.forEach(user => {
                const key = user.email.replace(/[.#$[\]]/g, '_'); // Firebase keys can't contain these chars
                usersObj[key] = user;
            });
            await getUsersRef().set(usersObj);
            return true;
        } catch (error) {
            console.error('Error saving users:', error);
            return false;
        }
    },

    // Get single user by email
    async getUserByEmail(email) {
        try {
            const key = email.replace(/[.#$[\]]/g, '_');
            const snapshot = await getUsersRef().child(key).once('value');
            return snapshot.val();
        } catch (error) {
            console.error('Error getting user:', error);
            return null;
        }
    },

    // Update single user
    async updateUser(user) {
        try {
            const key = user.email.replace(/[.#$[\]]/g, '_');
            await getUsersRef().child(key).set(user);
            return true;
        } catch (error) {
            console.error('Error updating user:', error);
            return false;
        }
    },

    // Get all questions
    async getQuestions() {
        try {
            const snapshot = await getQuestionsRef().once('value');
            return snapshot.val() || [];
        } catch (error) {
            console.error('Error getting questions:', error);
            // Fallback to local file
            const response = await fetch('data/questions.json');
            return await response.json();
        }
    },

    // Initialize questions in Firebase (run once)
    async initializeQuestions(questionsData) {
        try {
            await getQuestionsRef().set(questionsData);
            console.log('Questions initialized in Firebase');
            return true;
        } catch (error) {
            console.error('Error initializing questions:', error);
            return false;
        }
    }
};
