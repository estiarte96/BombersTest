import json

def list_topics():
    with open('questions.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    print(f"Total topics: {len(data)}")
    for t in data:
        print(f"- {t['topic']} ({len(t['questions'])} questions)")

if __name__ == "__main__":
    list_topics()
