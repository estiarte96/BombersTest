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

    // Get questions from a specific source (official or ai)
    async getQuestions(source = 'official') {
        try {
            const snapshot = await getQuestionsRef().child(source).once('value');
            return snapshot.val() || [];
        } catch (error) {
            console.error(`Error getting ${source} questions:`, error);
            // Fallback for official
            if (source === 'official') {
                const response = await fetch('data/questions.json');
                return await response.json();
            }
            return [];
        }
    },

    // Initialize questions in Firebase for a specific source
    async initializeQuestions(questionsData, source = 'official') {
        try {
            await getQuestionsRef().child(source).set(questionsData);
            console.log(`${source} questions initialized in Firebase`);
            return true;
        } catch (error) {
            console.error(`Error initializing ${source} questions:`, error);
            return false;
        }
    },

    // --- MULTIPLAYER ROOMS ---
    getRoomsRef() {
        return getDb().ref('rooms');
    },

    async createRoom(roomData) {
        const ref = this.getRoomsRef().child(roomData.code);
        await ref.set(roomData);
        return ref;
    },

    async getRoom(code) {
        const snapshot = await this.getRoomsRef().child(code).once('value');
        return snapshot.val();
    },

    async joinRoom(code, player) {
        const playerKey = player.email.replace(/[.#$[\]]/g, '_');
        await this.getRoomsRef().child(code).child('players').child(playerKey).set(player);
    },

    async updatePlayerStatus(code, playerEmail, status) {
        const playerKey = playerEmail.replace(/[.#$[\]]/g, '_');
        await this.getRoomsRef().child(code).child('players').child(playerKey).update(status);
    },

    // --- ERROR REPORTING ---
    async saveErrorReport(report) {
        try {
            const reportRef = getDb().ref('error_reports').push();
            await reportRef.set({
                ...report,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
            console.log("Error report saved:", reportRef.key);
            return true;
        } catch (error) {
            console.error("Error saving report:", error);
            return false;
        }
    },

    async getErrorReports() {
        try {
            const snapshot = await getDb().ref('error_reports').once('value');
            const reportsObj = snapshot.val() || {};
            // Convert to array and add key as id
            return Object.entries(reportsObj).map(([key, value]) => ({
                id: key,
                ...value
            }));
        } catch (error) {
            console.error("Error getting reports:", error);
            return [];
        }
    },

    async resolveReport(reportId) {
        try {
            await getDb().ref('error_reports').child(reportId).remove();
            return true;
        } catch (error) {
            console.error("Error resolving report:", error);
            return false;
        }
    }
};

