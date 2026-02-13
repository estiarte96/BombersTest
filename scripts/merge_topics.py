import os
import json

def merge_topics(topics_folder, output_file):
    merged_data = []
    
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
                
            merged_data.append({
                "topic": topic_name,
                "questions": questions
            })
            print(f"Merged topic: {topic_name} ({len(questions)} questions)")
            
        except Exception as e:
            print(f"Error merging {filename}: {str(e)}")
            
    # Write the combined data to the final questions.json
    with open(output_file, 'w', encoding='utf-8') as out_f:
        json.dump(merged_data, out_f, indent=2, ensure_ascii=False)
        
    print(f"\nSuccessfully merged {len(merged_data)} topics into {output_file}")

if __name__ == "__main__":
    merge_topics('data/topics', 'data/questions.json')
