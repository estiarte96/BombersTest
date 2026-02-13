import os
import json

def merge_ai_topics(topics_folder, output_file):
    merged_data = []
    
    if not os.path.exists(topics_folder):
        os.makedirs(topics_folder)
        print(f"Created {topics_folder}")
        return

    # List all JSON files in the topics folder
    json_files = [f for f in os.listdir(topics_folder) if f.endswith('.json')]
    
    # Sort files to maintain consistent order
    json_files.sort()
    
    for filename in json_files:
        file_path = os.path.join(topics_folder, filename)
        topic_name = filename.replace('.json', '')
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                questions = json.load(f)
                
            # Ensure each question is tagged as AI for UI distinction if needed
            for q in questions:
                q['isAI'] = True
                
            merged_data.append({
                "topic": topic_name,
                "questions": questions
            })
            print(f"Merged AI topic: {topic_name} ({len(questions)} questions)")
            
        except Exception as e:
            print(f"Error merging {filename}: {str(e)}")
            
    # Write the combined data to the final ai_questions.json
    with open(output_file, 'w', encoding='utf-8') as out_f:
        json.dump(merged_data, out_f, indent=2, ensure_ascii=False)
        
    print(f"\nSuccessfully merged {len(merged_data)} AI topics into {output_file}")

if __name__ == "__main__":
    merge_ai_topics('data/ai_topics', 'data/ai_questions.json')
