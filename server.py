from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import json
import os

app = Flask(__name__, static_folder='.')
CORS(app)

DATA_DIR = 'data'
USERS_FILE = os.path.join(DATA_DIR, 'users.json')
QUESTIONS_FILE = os.path.join(DATA_DIR, 'questions.json')

# Serve Static Files
@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

# API Endpoints
@app.route('/api/questions', methods=['GET'])
def get_questions():
    try:
        with open(QUESTIONS_FILE, 'r', encoding='utf-8') as f:
            return jsonify(json.load(f))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/users', methods=['GET'])
def get_users():
    try:
        if not os.path.exists(USERS_FILE):
            return jsonify([])
        with open(USERS_FILE, 'r', encoding='utf-8') as f:
            return jsonify(json.load(f))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/save-users', methods=['POST'])
def save_users():
    try:
        users_data = request.json
        with open(USERS_FILE, 'w', encoding='utf-8') as f:
            json.dump(users_data, f, indent=2, ensure_ascii=False)
        return jsonify({"status": "success"})
    except Exception as e:
        print(f"Error saving users: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("Servidor Bombers Test actiu a http://localhost:5000")
    app.run(port=5000, debug=True)
