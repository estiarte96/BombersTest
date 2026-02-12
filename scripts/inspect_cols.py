import openpyxl

def inspect_columns(file_path, sheet_name):
    wb = openpyxl.load_workbook(file_path, data_only=True)
    sheet = wb[sheet_name]
    print(f"Inspecting columns for sheet: {sheet_name}")
    for i, row in enumerate(sheet.iter_rows(values_only=True)):
        if i > 100: break
        if any(row):
            # Print column index and value for non-empty cells
            parts = [f"C{j}:{v}" for j, v in enumerate(row) if v]
            print(f"Row {i+1}: {' | '.join(parts)}")

if __name__ == "__main__":
    inspect_columns('PREGUNTES.xlsx', '1 CE')
