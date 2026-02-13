import os
import json
import re

def clean_topic_name(name):
    # Remove extension
    name = name.replace('.json', '')
    
    # Map for the first few topics that don't have 'T'
    special_starts = {
        "1 CE": "T1- Constitució espanyola",
        "1 EAC": "T1- Estatuts d'autonomia",
        "2 F. PÚBLICA": "T2- Funció pública",
        "3 PRL I EPIS": "T3- PRL i EPIS",
        "4 L.192020 I PROTOCOLS": "T4- Llei 19/2020 i Protocols",
        "5 L.172015": "T5- Llei 17/2015",
        "6 L.BOMBERS": "T6- Llei de Bombers",
        "6 L.PC": "T6- Llei de Protecció Civil",
        "7 D. GUÀRDIA": "T7- Decret de Guàrdia",
        "7 D. INTERIOR": "T7- Departament d'Interior",
        "T 9 N. DEL FOC": "T9- Naturalesa del foc",
        "T 10A. EXTINTORS": "T10- Extintors",
        "T11 QUÍMICA": "T11- Química",
        "T12 HIDRÀULICA": "T12- Hidràulica",
        "T13. ELECTRICITAT MAGNITUDS ": "T13- Electricitat Magnituds",
        "T14 METEOROLOGIA": "T14- Meteorologia",
        "T15 CONCEPTES MÈDICS": "T15- Conceptes Mèdics",
        "T16. VEGETACIÓ": "T16- Vegetació",
        "T17 MECÀNICA": "T17- Mecànica",
        "T18. MOTORS": "T18- Motors",
        "T19 FLUIDS": "T19- Fluids",
        "T20 M. VEHICLES": "T20- M. Vehicles",
        "T21 RISC QUÍMIC": "T21- Risc Químic",
        "T22 P. PASSIVA": "T22- Protecció Passiva",
        "T22P. ACTIVA": "T22- Protecció Activa",
        "T23 AT. SANITARIA": "T23- Atenció Sanitària",
        "T24 C.MATERIALS": "T24- C. Materials",
        "T25 C. EDIFICACIÓ": "T25- Edificació",
        "T26 COMPONENTS I APARELLS": "T26- Components i Aparells",
        "T27 INST ELECTRIQUES": "T27- Inst. Elèctriques",
        "T28 I. GASOS": "T28- I. Gasos",
        "T29 CARTOGRAFIA": "T29- Cartografia",
        "T30 G. FÍSICA": "T30- G. Física",
        "T.31 G. HUMANA": "T31- G. Humana",
        "T32 ORG. ADMINISTRATIVA ": "T32- Org. Administrativa",
        "T8 FÍSICA": "T8- Física"
    }
    
    if name in special_starts:
        return special_starts[name]
    
    # Generic cleanup if not in map
    # Replace T.XX or T XX or TXX with TXX-
    name = re.sub(r'^T[.\s]?(\d+)', r'T\1-', name)
    # Improve formatting
    name = name.replace('-', '- ').replace('  ', ' ').strip()
    return name

def rename_and_update_json():
    topics_dir = r"g:\Mi unidad\JEstiarte\02-EST\05-WEB\web bombers\data\topics"
    
    for filename in os.listdir(topics_dir):
        if not filename.endswith('.json') or filename == "desktop.ini":
            continue
            
        old_path = os.path.join(topics_dir, filename)
        new_topic_name = clean_topic_name(filename)
        
        # 1. Read and update inside content
        with open(old_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        data['topic'] = new_topic_name
        
        # 2. Save back with new content
        with open(old_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
            
        print(f"Updated {filename} -> {new_topic_name}")

if __name__ == "__main__":
    rename_and_update_json()
    # Note: merge_topics.py needs to be run after this
