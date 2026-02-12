import json

def check_results():
    with open('questions.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    ce_topic = next((t for t in data if t['topic'] == '1 CE'), None)
    if ce_topic:
        print(f"Topic: {ce_topic['topic']}")
        for q in ce_topic['questions'][:10]: # Check first 10
            print(f"Q{q['num']}: {q['text'][:50]}... | Answer: {q['answer']}")
    else:
        print("Sheet '1 CE' not found in JSON.")

if __name__ == "__main__":
    check_results()
