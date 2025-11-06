#!/usr/bin/env python3
"""
Script to extract group data from TypeScript file and convert to JSON
Author: PAC Development Team
Purpose: Convert group.ts data to JSON format for frontend use
"""

import re
import json
import sys
import os
from pathlib import Path

def clean_typescript_string(text):
    """Clean TypeScript string by removing quotes and handling special characters"""
    if not text:
        return ""
    
    # Remove surrounding quotes
    if text.startswith("'") and text.endswith("'"):
        text = text[1:-1]
    elif text.startswith('"') and text.endswith('"'):
        text = text[1:-1]
    
    # Handle escaped quotes
    text = text.replace("\\'", "'").replace('\\"', '"')
    
    return text.strip()

def extract_array_values(content, array_name):
    """Extract array values from TypeScript content"""
    pattern = rf'{array_name}:\s*\[(.*?)\]'
    match = re.search(pattern, content, re.DOTALL)
    
    if not match:
        return []
    
    array_content = match.group(1)
    
    # Split by comma and clean each item
    items = []
    current_item = ""
    quote_count = 0
    
    for char in array_content:
        if char in ["'", '"']:
            quote_count += 1
        
        if char == ',' and quote_count % 2 == 0:
            if current_item.strip():
                items.append(clean_typescript_string(current_item.strip()))
            current_item = ""
        else:
            current_item += char
    
    # Add the last item
    if current_item.strip():
        items.append(clean_typescript_string(current_item.strip()))
    
    return items

def extract_string_value(content, field_name):
    """Extract string value from TypeScript content"""
    # Pattern for single-line string
    pattern = rf'{field_name}:\s*[\'"]([^\'"]*)[\'"]'
    match = re.search(pattern, content)
    
    if match:
        return match.group(1)
    
    # Pattern for multi-line string
    pattern = rf'{field_name}:\s*[\'"]([^\'"]*)$'
    match = re.search(pattern, content, re.MULTILINE)
    
    if match:
        # Find the end of the multi-line string
        start_pos = match.end()
        remaining_content = content[start_pos:]
        
        # Look for the closing quote
        quote_char = content[match.start():match.end()][-1]
        end_match = re.search(rf'[^\\\]{quote_char}', remaining_content)
        
        if end_match:
            full_string = match.group(1) + remaining_content[:end_match.start() + 1]
            return full_string.replace('\\n', '\n').replace('\\t', '\t')
    
    return ""

def parse_group_object(group_content):
    """Parse a single group object from TypeScript"""
    group_data = {}
    
    # Extract basic string fields
    string_fields = [
        'characterName', 'code', 'description', 'explain', 
        'group', 'hollandName', 'id', 'trendDescription'
    ]
    
    for field in string_fields:
        value = extract_string_value(group_content, field)
        group_data[field] = value
    
    # Extract array fields
    array_fields = [
        'favoriteActivity', 'highlights', 'jobs', 'keywords', 
        'majors', 'needValue'
    ]
    
    for field in array_fields:
        values = extract_array_values(group_content, field)
        group_data[field] = values
    
    return group_data

def extract_groups_from_typescript(file_path):
    """Extract all group data from TypeScript file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            content = file.read()
        
        # Find the NTC array
        ntc_pattern = r'export const NTC = \[(.*?)\];'
        ntc_match = re.search(ntc_pattern, content, re.DOTALL)
        
        if not ntc_match:
            print("❌ Could not find NTC array in TypeScript file")
            return []
        
        ntc_content = ntc_match.group(1)
        
        # Split into individual group objects
        groups = []
        brace_count = 0
        current_group = ""
        
        for char in ntc_content:
            current_group += char
            
            if char == '{':
                brace_count += 1
            elif char == '}':
                brace_count -= 1
                
                if brace_count == 0:
                    # We've found a complete group object
                    group_data = parse_group_object(current_group)
                    if group_data.get('code'):  # Only add if we have a valid code
                        groups.append(group_data)
                    current_group = ""
        
        return groups
        
    except FileNotFoundError:
        print(f"❌ File not found: {file_path}")
        return []
    except Exception as e:
        print(f"❌ Error reading file: {e}")
        return []

def save_groups_to_json(groups, output_path):
    """Save groups data to JSON file"""
    try:
        # Ensure output directory exists
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # Create structured JSON data
        output_data = {
            "metadata": {
                "version": "1.0",
                "source": "group.ts",
                "extracted_at": "2024-11-07",
                "total_groups": len(groups),
                "description": "Holland Code personality groups data extracted from TypeScript"
            },
            "groups": groups
        }
        
        with open(output_path, 'w', encoding='utf-8') as file:
            json.dump(output_data, file, ensure_ascii=False, indent=2)
        
        print(f"[SUCCESS] Successfully saved {len(groups)} groups to {output_path}")
        return True
        
    except Exception as e:
        print(f"[ERROR] Error saving JSON file: {e}")
        return False

def main():
    """Main function"""
    print("[INFO] Starting group data extraction...")
    
    # File paths
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    
    input_file = project_root / "old-project" / "backend-app" / "src" / "constants" / "group.ts"
    output_file = project_root / "static" / "group-data.json"
    
    print(f"[INPUT] Input file: {input_file}")
    print(f"[OUTPUT] Output file: {output_file}")
    
    # Check if input file exists
    if not input_file.exists():
        print(f"[ERROR] Input file not found: {input_file}")
        sys.exit(1)
    
    # Extract groups data
    groups = extract_groups_from_typescript(input_file)
    
    if not groups:
        print("[ERROR] No groups data extracted")
        sys.exit(1)
    
    # Save to JSON
    if save_groups_to_json(groups, output_file):
        print(f"[SUCCESS] Group data extraction completed successfully!")
        print(f"[INFO] Extracted {len(groups)} personality groups")
        
        # Display summary (avoid Unicode issues)
        try:
            for i, group in enumerate(groups, 1):
                name = group.get('characterName', 'Unknown')
                code = group.get('code', 'N/A')
                # Use ASCII representation to avoid encoding issues
                print(f"   {i}. Group {code}")
        except UnicodeEncodeError:
            print("[INFO] Group details saved successfully (Unicode display skipped)")
    else:
        print("[ERROR] Failed to save group data")
        sys.exit(1)

if __name__ == "__main__":
    main()