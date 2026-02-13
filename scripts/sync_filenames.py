import os
import json

def sync_internal_topic_names():
    topics_dir = r"g:\Mi unidad\JEstiarte\02-EST\05-WEB\web bombers\data\topics"
    
    for filename in os.listdir(topics_dir):
        if not filename.endswith('.json') or filename == "desktop.ini":
            continue
            
        path = os.path.join(topics_dir, filename)
        new_topic_name = filename.replace('.json', '').strip()
        
        try:
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Update internal name to match current filename
            data['topic'] = new_topic_name
            
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=4, ensure_ascii=False)
            
            print(f"Synced {filename} internal name.")
        except Exception as e:
            print(f"Error processing {filename}: {e}")

if __name__ == "__main__":
    sync_internal_topic_names()
