import os
import re
import json
from bs4 import BeautifulSoup

def extract_questions_from_html(folder_path, output_folder):
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)
    
    unparsed_log = []
    
    html_files = [f for f in os.listdir(folder_path) if f.endswith('.html')]
    
    for filename in html_files:
        topic_name = filename.replace('.html', '')
        file_path = os.path.join(folder_path, filename)
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                soup = BeautifulSoup(f, 'html.parser')
            
            # 1. Extract global answers from "RESPOSTES" section (if exists)
            global_answer_map = {}
            rows = soup.find_all('tr')
            in_respostes = False
            for row in rows:
                row_text = row.get_text(strip=True)
                if "RESPOSTES" in row_text.upper():
                    in_respostes = True
                    continue
                if in_respostes:
                    # Look for formats like "81/23 (model A): 8A, 46C, 19B, 43B."
                    exam_match = re.search(r'(\d+/\d+).*?:\s*(.*)', row_text)
                    if exam_match:
                        exam_id = exam_match.group(1)
                        qa_text = exam_match.group(2)
                        # Find all question-answer pairs like "8A", "46C"
                        pairs = re.findall(r'(\d+)([A-D])', qa_text.upper())
                        for q_num, ans in pairs:
                            global_answer_map[f"{exam_id}-{q_num}"] = ans.lower()
            
            # 2. Extract bold styles
            bold_classes = set()
            style_tag = soup.find('style')
            if style_tag:
                bold_matches = re.findall(r'\.([a-zA-Z0-9_-]+)\{[^}]*font-weight:(?:bold|700)[^}]*\}', style_tag.string)
                bold_classes.update(bold_matches)
            
            questions = []
            current_exam = "General"
            current_question = None
            
            # Identify the body rows again for question extraction
            for row in rows:
                row_cells = row.find_all('td')
                if not row_cells:
                    continue
                
                # Check for "RESPOSTES" in the whole row text
                full_row_text = row.get_text(strip=True)
                if "RESPOSTES" in full_row_text.upper():
                    break
                
                # We'll look through all cells in the row to find a match
                found_match = False
                for cell_data in row_cells:
                    text = cell_data.get_text(strip=True)
                    if not text:
                        continue
                    
                    # Exam header (81/24, 81/23, 2009, etc.)
                    if re.match(r'^(\d+/\d+(?:\.\d+)?|\d{4})$', text):
                        current_exam = text
                        found_match = True
                        break
                    
                    # Question start
                    q_match = re.match(r'^(\d+)[.\s]+(.*)', text)
                    if q_match:
                        q_num = q_match.group(1)
                        q_text = q_match.group(2).strip()
                        
                        lookup_key = f"{current_exam}-{q_num}"
                        ans = global_answer_map.get(lookup_key, "")
                        
                        current_question = {
                            "id": f"{topic_name}-{current_exam}-{q_num}",
                            "exam": current_exam,
                            "num": q_num,
                            "text": q_text,
                            "options": {},
                            "answer": ans
                        }
                        questions.append(current_question)
                        found_match = True
                        break
                    
                    # Options
                    opt_match = re.match(r'^([a-d])[\s.)]+(.*)', text.lower())
                    if opt_match and current_question:
                        opt_letter = opt_match.group(1)
                        opt_text = opt_match.group(2).strip()
                        current_question["options"][opt_letter] = opt_text
                        
                        # Bold check
                        if not current_question["answer"]:
                            is_bold = False
                            if any(cls in bold_classes for cls in cell_data.get('class', [])):
                                is_bold = True
                            else:
                                inner_div = cell_data.find('div')
                                if inner_div and any(cls in bold_classes for cls in inner_div.get('class', [])):
                                    is_bold = True
                            if is_bold:
                                current_question["answer"] = opt_letter
                        found_match = True
                        break
                
                # If no specific match (q, opt, header) was found but we have a current_question,
                # maybe this row is a continuation of text?
                if not found_match and current_question and full_row_text:
                    # Skip rows that look like page headers or metadata
                    if not re.match(r'^(TEMA|PÀGINA|PAGE|HOJA)', full_row_text.upper()):
                        if not current_question["options"]:
                            current_question["text"] += " " + full_row_text
                        else:
                            last_opt = list(current_question["options"].keys())[-1]
                            current_question["options"][last_opt] += " " + full_row_text

            valid_questions = [q for q in questions if len(q["options"]) >= 2]
            
            if valid_questions:
                output_file = os.path.join(output_folder, f"{topic_name}.json")
                with open(output_file, 'w', encoding='utf-8') as out_f:
                    json.dump(valid_questions, out_f, indent=2, ensure_ascii=False)
                print(f"Topic '{topic_name}': {len(valid_questions)} questions extracted.")
            else:
                unparsed_log.append(f"Topic '{topic_name}': No valid questions found.")

        except Exception as e:
            unparsed_log.append(f"Topic '{topic_name}': Error during parsing - {str(e)}")

    with open('unparsed_report.md', 'w', encoding='utf-8') as report_f:
        report_f.write("# Unparsed Topics Report\n\n")
        if unparsed_log:
            for log in unparsed_log:
                report_f.write(f"- {log}\n")
        else:
            report_f.write("All topics successfully parsed!\n")

if __name__ == "__main__":
    extract_questions_from_html('data/PreguntesExamens', 'data/topics')
