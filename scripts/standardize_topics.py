import os
import json
import re

def clean_topic_name(filename):
    # Mapping based on the current filenames found in the directory
    mapping = {
        "T1 CE": "T1- Constitució espanyola",
        "T1 EAC": "T1- Estatuts d'autonomia",
        "T2 F. PÚBLICA": "T2- Funció pública",
        "T3 PRL I EPIS": "T3- PRL i EPIS",
        "T4 L.192020 I PROTOCOLS": "T4- Llei 19/2020 i Protocols",
        "T5 L.172015": "T5- Llei 17/2015",
        "T6 L.BOMBERS": "T6- Llei de Bombers",
        "T6 L.PC": "T6- Llei de Protecció Civil",
        "T7 D. GUÀRDIA": "T7- Decret de Guàrdia",
        "T7 D. INTERIOR": "T7- Departament d'Interior", 
        "T8 FÍSICA": "T8- Física",
        "T9 N. DEL FOC": "T9- Naturalesa del foc",
        "T10 A. EXTINTORS": "T10- Extintors",
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
        "T31 G. HUMANA": "T31- G. Humana",
        "T32 ORG. ADMINISTRATIVA ": "T32- Org. Administrativa"
    }
    
    base = filename.replace('.json', '').strip()
    if base in mapping:
        return mapping[base]
    
    # Fallback cleanup
    name = re.sub(r'^T[.\s]?(\d+)', r'T\1-', base)
    name = name.replace('-', '- ').replace('  ', ' ').strip()
    return name

def rename_and_sync():
    topics_dir = r"g:\Mi unidad\JEstiarte\02-EST\05-WEB\web bombers\data\topics"
    
    for filename in os.listdir(topics_dir):
        if not filename.endswith('.json') or filename == "desktop.ini":
            continue
            
        old_path = os.path.join(topics_dir, filename)
        new_topic_name = clean_topic_name(filename)
        new_filename = new_topic_name + ".json"
        new_path = os.path.join(topics_dir, new_filename)
        
        try:
            # 1. Update internal
            with open(old_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            data['topic'] = new_topic_name
            
            # Save temporary
            temp_path = old_path + ".tmp"
            with open(temp_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=4, ensure_ascii=False)
            
            # Close old and remove
            os.remove(old_path)
            # Rename temp to new
            os.rename(temp_path, new_path)
            
            print(f"Renamed: {filename} -> {new_filename}")
        except Exception as e:
            print(f"Error {filename}: {e}")

if __name__ == "__main__":
    rename_and_sync()
