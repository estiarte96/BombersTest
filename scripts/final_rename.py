import os

def rename_to_standard():
    topics_dir = r"g:\Mi unidad\JEstiarte\02-EST\05-WEB\web bombers\data\topics"
    
    mapping = {
        "T1 CE.json": "T1- Constitució espanyola.json",
        "T1 EAC.json": "T1- Estatuts d'autonomia.json",
        "T2 F. PÚBLICA.json": "T2- Funció pública.json",
        "T3 PRL I EPIS.json": "T3- PRL i EPIS.json",
        "T4 L.192020 I PROTOCOLS.json": "T4- Llei 19/2020 i Protocols.json",
        "T5 L.172015.json": "T5- Llei 17/2015.json",
        "T6 L.BOMBERS.json": "T6- Llei de Bombers.json",
        "T6 L.PC.json": "T6- Llei de Protecció Civil.json",
        "T7 D. GUÀRDIA.json": "T7- Decret de Guàrdia.json",
        "T7 D. INTERIOR.json": "T7- Departament d'Interior.json",
        "T8 FÍSICA.json": "T8- Física.json",
        "T9 N. DEL FOC.json": "T9- Naturalesa del foc.json",
        "T10 A. EXTINTORS.json": "T10- Extintors.json",
        "T11 QUÍMICA.json": "T11- Química.json",
        "T12 HIDRÀULICA.json": "T12- Hidràulica.json",
        "T13. ELECTRICITAT MAGNITUDS .json": "T13- Electricitat Magnituds.json",
        "T14 METEOROLOGIA.json": "T14- Meteorologia.json",
        "T15 CONCEPTES MÈDICS.json": "T15- Conceptes Mèdics.json",
        "T16. VEGETACIÓ.json": "T16- Vegetació.json",
        "T17 MECÀNICA.json": "T17- Mecànica.json",
        "T18. MOTORS.json": "T18- Motors.json",
        "T19 FLUIDS.json": "T19- Fluids.json",
        "T20 M. VEHICLES.json": "T20- M. Vehicles.json",
        "T21 RISC QUÍMIC.json": "T21- Risc Químic.json",
        "T22 P. PASSIVA.json": "T22- Protecció Passiva.json",
        "T22P. ACTIVA.json": "T22- Protecció Activa.json",
        "T23 AT. SANITARIA.json": "T23- Atenció Sanitària.json",
        "T24 C.MATERIALS.json": "T24- C. Materials.json",
        "T25 C. EDIFICACIÓ.json": "T25- Edificació.json",
        "T26 COMPONENTS I APARELLS.json": "T26- Components i Aparells.json",
        "T27 INST ELECTRIQUES.json": "T27- Inst. Elèctriques.json",
        "T28 I. GASOS.json": "T28- I. Gasos.json",
        "T29 CARTOGRAFIA.json": "T29- Cartografia.json",
        "T30 G. FÍSICA.json": "T30- G. Física.json",
        "T31 G. HUMANA.json": "T31- G. Humana.json",
        "T32 ORG. ADMINISTRATIVA .json": "T32- Org. Administrativa.json"
    }
    
    for old_name, new_name in mapping.items():
        old_path = os.path.join(topics_dir, old_name)
        new_path = os.path.join(topics_dir, new_name)
        
        if os.path.exists(old_path):
            try:
                os.rename(old_path, new_path)
                print(f"Renamed {old_name} -> {new_name}")
            except Exception as e:
                print(f"Error renaming {old_name}: {e}")
        else:
            print(f"Skipping {old_name} (not found)")

if __name__ == "__main__":
    rename_to_standard()
