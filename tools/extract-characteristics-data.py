#!/usr/bin/env python3
"""
Script to extract characteristics data from TypeScript file and convert to JSON
Author: PAC Development Team
Purpose: Convert characteristics.ts data to JSON format for frontend use
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
    
    # Handle escaped quotes and newlines
    text = text.replace("\\'", "'").replace('\\"', '"')
    text = text.replace('\\n', '\n').replace('\\t', '\t')
    
    return text.strip()

def extract_object_property(content, prop_name):
    """Extract object property value from TypeScript content"""
    # Handle string properties
    string_pattern = rf'{prop_name}:\s*[\'"]([^\'"`]*?)[\'"]'
    string_match = re.search(string_pattern, content, re.DOTALL)
    
    if string_match:
        return clean_typescript_string(string_match.group(1))
    
    # Handle multi-line string properties
    multiline_pattern = rf'{prop_name}:\s*[\'"`]([^\'"`]*?$.*?)[\'"`]'
    multiline_match = re.search(multiline_pattern, content, re.DOTALL | re.MULTILINE)
    
    if multiline_match:
        return clean_typescript_string(multiline_match.group(1))
    
    # Handle array properties
    array_pattern = rf'{prop_name}:\s*\[(.*?)\]'
    array_match = re.search(array_pattern, content, re.DOTALL)
    
    if array_match:
        array_content = array_match.group(1)
        items = []
        current_item = ""
        quote_count = 0
        bracket_count = 0
        
        for char in array_content:
            if char in ["'", '"']:
                quote_count += 1
            elif char == '[':
                bracket_count += 1
            elif char == ']':
                bracket_count -= 1
            
            if char == ',' and quote_count % 2 == 0 and bracket_count == 0:
                if current_item.strip():
                    cleaned_item = clean_typescript_string(current_item.strip())
                    if cleaned_item:
                        items.append(cleaned_item)
                current_item = ""
            else:
                current_item += char
        
        # Add the last item
        if current_item.strip():
            cleaned_item = clean_typescript_string(current_item.strip())
            if cleaned_item:
                items.append(cleaned_item)
        
        return items
    
    # Handle object properties
    object_pattern = rf'{prop_name}:\s*\{{([^}}]*?)\}}'
    object_match = re.search(object_pattern, content, re.DOTALL)
    
    if object_match:
        object_content = object_match.group(1)
        obj = {}
        
        # Extract key-value pairs from object
        pair_pattern = r'(\w+):\s*[\'"]([^\'"]*)[\'"]'
        pairs = re.findall(pair_pattern, object_content)
        
        for key, value in pairs:
            obj[key] = clean_typescript_string(value)
        
        return obj
    
    return None

def parse_characteristics_object(char_content):
    """Parse a single characteristics object from TypeScript"""
    char_data = {}
    
    # Define expected properties for characteristics
    properties = [
        'code', 'name', 'description', 'detailed_description',
        'strengths', 'weaknesses', 'work_style', 'learning_style',
        'ideal_environment', 'career_paths', 'compatible_types',
        'development_areas', 'work_values', 'motivations',
        'communication_style', 'leadership_style', 'stress_indicators',
        'growth_opportunities'
    ]
    
    for prop in properties:
        value = extract_object_property(char_content, prop)
        if value is not None:
            char_data[prop] = value
    
    # Try to extract any other properties that might exist
    # Look for pattern: propertyName: "value" or propertyName: ["array", "values"]
    additional_props_pattern = r'(\w+):\s*(?:[\'"]([^\'"]*)[\'"]|\[(.*?)\])'
    additional_matches = re.findall(additional_props_pattern, char_content, re.DOTALL)
    
    for prop_name, string_value, array_value in additional_matches:
        if prop_name not in char_data:
            if string_value:
                char_data[prop_name] = clean_typescript_string(string_value)
            elif array_value:
                # Parse array value
                array_items = []
                items = re.findall(r'[\'"]([^\'"]*)[\'"]', array_value)
                for item in items:
                    cleaned_item = clean_typescript_string(item)
                    if cleaned_item:
                        array_items.append(cleaned_item)
                char_data[prop_name] = array_items
    
    return char_data

def extract_characteristics_from_typescript(file_path):
    """Extract all characteristics data from TypeScript file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            content = file.read()
        
        print(f"[INFO] Reading characteristics file: {file_path}")
        
        # Look for various export patterns
        export_patterns = [
            r'export const (\w+) = \[(.*?)\];',  # export const ARRAY = [...]
            r'export const (\w+) = \{(.*?)\};',  # export const OBJECT = {...}
            r'const (\w+) = \[(.*?)\];\s*export',  # const ARRAY = [...]; export
            r'(\w+):\s*\[(.*?)\]',  # property: [...]
        ]
        
        characteristics = []
        
        for pattern in export_patterns:
            matches = re.findall(pattern, content, re.DOTALL)
            
            for match in matches:
                if len(match) == 2:
                    var_name, var_content = match
                    print(f"[FOUND] Found potential data in variable: {var_name}")
                    
                    # Try to parse as array of objects
                    if var_content.strip().startswith('{'):
                        # Split into individual objects
                        objects = []
                        brace_count = 0
                        current_object = ""
                        
                        for char in var_content:
                            current_object += char
                            
                            if char == '{':
                                brace_count += 1
                            elif char == '}':
                                brace_count -= 1
                                
                                if brace_count == 0:
                                    # We've found a complete object
                                    char_data = parse_characteristics_object(current_object)
                                    if char_data:  # Only add if we have valid data
                                        objects.append(char_data)
                                    current_object = ""
                        
                        if objects:
                            characteristics.extend(objects)
                            print(f"[SUCCESS] Extracted {len(objects)} characteristics from {var_name}")
        
        # If no characteristics found, try a more general approach
        if not characteristics:
            print("[INFO] Trying alternative extraction methods...")
            
            # Look for any object-like structures
            object_pattern = r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}'
            potential_objects = re.findall(object_pattern, content, re.DOTALL)
            
            for obj_content in potential_objects:
                if len(obj_content) > 50:  # Skip small objects
                    char_data = parse_characteristics_object(obj_content)
                    if char_data and len(char_data) > 2:  # Must have at least some properties
                        characteristics.append(char_data)
        
        return characteristics
        
    except FileNotFoundError:
        print(f"[ERROR] File not found: {file_path}")
        return []
    except Exception as e:
        print(f"[ERROR] Error reading file: {e}")
        return []

def save_characteristics_to_json(characteristics, output_path):
    """Save characteristics data to JSON file"""
    try:
        # Ensure output directory exists
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # Create structured JSON data
        output_data = {
            "metadata": {
                "version": "1.0",
                "source": "characteristics.ts",
                "extracted_at": "2024-11-07",
                "total_characteristics": len(characteristics),
                "description": "Holland Code personality characteristics data extracted from TypeScript"
            },
            "characteristics": characteristics
        }
        
        with open(output_path, 'w', encoding='utf-8') as file:
            json.dump(output_data, file, ensure_ascii=False, indent=2)
        
        print(f"[SUCCESS] Successfully saved {len(characteristics)} characteristics to {output_path}")
        return True
        
    except Exception as e:
        print(f"[ERROR] Error saving JSON file: {e}")
        return False

def main():
    """Main function"""
    print("[INFO] Starting characteristics data extraction...")
    
    # File paths
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    
    input_file = project_root / "old-project" / "backend-app" / "src" / "constants" / "characteristics.ts"
    output_file = project_root / "static" / "characteristics-data.json"
    
    print(f"[INPUT] Input file: {input_file}")
    print(f"[OUTPUT] Output file: {output_file}")
    
    # Check if input file exists
    if not input_file.exists():
        print(f"[ERROR] Input file not found: {input_file}")
        
        # Try alternative locations
        alternative_paths = [
            project_root / "old-project" / "src" / "constants" / "characteristics.ts",
            project_root / "old-project" / "constants" / "characteristics.ts",
            project_root / "src" / "constants" / "characteristics.ts"
        ]
        
        for alt_path in alternative_paths:
            if alt_path.exists():
                print(f"[FOUND] Found alternative file: {alt_path}")
                input_file = alt_path
                break
        else:
            print("[ERROR] Could not find characteristics.ts file in any expected location")
            sys.exit(1)
    
    # Extract characteristics data
    characteristics = extract_characteristics_from_typescript(input_file)
    
    if not characteristics:
        print("[ERROR] No characteristics data extracted")
        print("[INFO] This might be because the file structure is different than expected")
        print("[INFO] Please check the file content and adjust the extraction logic if needed")
        sys.exit(1)
    
    # Save to JSON
    if save_characteristics_to_json(characteristics, output_file):
        print(f"[SUCCESS] Characteristics data extraction completed successfully!")
        print(f"[INFO] Extracted {len(characteristics)} characteristics")
        
        # Display summary
        for i, char in enumerate(characteristics, 1):
            name = char.get('name', char.get('code', 'Unknown'))
            code = char.get('code', 'N/A')
            print(f"   {i}. {name} ({code})")
    else:
        print("[ERROR] Failed to save characteristics data")
        sys.exit(1)

if __name__ == "__main__":
    main()