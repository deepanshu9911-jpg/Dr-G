import json
import re

# Load the data
with open('mayo_all_letters_symptoms.jsonl.json', 'r') as f:
    data = json.load(f)

result = {}

for item in data:
    disease = item['disease_name']
    symptoms_text = item['symptoms']
    
    # Try to find symptoms list
    match = re.search(r'symptoms.*?include:?\s*(.*)', symptoms_text, re.IGNORECASE | re.DOTALL)
    if match:
        symptoms_part = match.group(1)
        symptoms_list = [s.strip().strip('.').lower() for s in symptoms_part.split(';') if s.strip() and not s.startswith('There is a problem')]
        # Remove empty or invalid
        symptoms_list = [s for s in symptoms_list if len(s) > 3]  # rough filter
    else:
        # If no match, try to split the whole text
        symptoms_list = [s.strip().strip('.').lower() for s in symptoms_text.split(';') if s.strip() and len(s) > 3 and not s.startswith('There is a problem')]
    
    result[disease] = symptoms_list

# Write to new file
with open('diseases_symptoms.json', 'w') as f:
    json.dump(result, f, indent=2)

print("Processed and saved to diseases_symptoms.json")