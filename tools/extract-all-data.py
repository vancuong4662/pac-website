#!/usr/bin/env python3
"""
Master script to extract all personality data from TypeScript files
Author: PAC Development Team
Purpose: Run both group and characteristics extraction scripts
"""

import subprocess
import sys
import os
from pathlib import Path

def run_script(script_path, script_name):
    """Run a Python script and handle output"""
    print(f"\n{'='*60}")
    print(f"[RUNNING] {script_name}")
    print(f"{'='*60}")
    
    try:
        result = subprocess.run([sys.executable, script_path], 
                              capture_output=True, text=True, encoding='utf-8')
        
        # Print stdout
        if result.stdout:
            print(result.stdout)
        
        # Print stderr if there are errors
        if result.stderr:
            print(f"[WARNING] Warnings/Errors from {script_name}:")
            print(result.stderr)
        
        # Check return code
        if result.returncode == 0:
            print(f"[SUCCESS] {script_name} completed successfully")
            return True
        else:
            print(f"[ERROR] {script_name} failed with return code {result.returncode}")
            return False
            
    except Exception as e:
        print(f"[ERROR] Error running {script_name}: {e}")
        return False

def check_output_files():
    """Check if output files were created successfully"""
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    
    output_files = [
        project_root / "static" / "group-data.json",
        project_root / "static" / "characteristics-data.json"
    ]
    
    print(f"\n{'='*60}")
    print("[CHECK] Checking output files")
    print(f"{'='*60}")
    
    all_files_exist = True
    
    for file_path in output_files:
        if file_path.exists():
            size = file_path.stat().st_size
            print(f"[OK] {file_path.name} - {size:,} bytes")
        else:
            print(f"[MISSING] {file_path.name} - Not found")
            all_files_exist = False
    
    return all_files_exist

def main():
    """Main function"""
    print("PAC Personality Data Extraction Tool")
    print("=" * 60)
    print("This tool extracts personality data from TypeScript files")
    print("and converts them to JSON format for frontend use.")
    print("=" * 60)
    
    script_dir = Path(__file__).parent
    
    # Define scripts to run
    scripts = [
        {
            "path": script_dir / "extract-group-data.py",
            "name": "Group Data Extraction"
        },
        {
            "path": script_dir / "extract-characteristics-data.py", 
            "name": "Characteristics Data Extraction"
        }
    ]
    
    # Check if all scripts exist
    missing_scripts = []
    for script in scripts:
        if not script["path"].exists():
            missing_scripts.append(script["path"])
    
    if missing_scripts:
        print("[ERROR] Missing script files:")
        for script_path in missing_scripts:
            print(f"   - {script_path}")
        print("\n[INFO] Please ensure all extraction scripts are in the tools/ directory")
        sys.exit(1)
    
    # Run all scripts
    success_count = 0
    
    for script in scripts:
        if run_script(script["path"], script["name"]):
            success_count += 1
    
    # Summary
    print(f"\n{'='*60}")
    print("[SUMMARY] EXTRACTION SUMMARY")
    print(f"{'='*60}")
    print(f"[INFO] Successful extractions: {success_count}/{len(scripts)}")
    
    if success_count == len(scripts):
        print("[SUCCESS] All data extraction completed successfully!")
        
        # Check output files
        if check_output_files():
            print("\n[NEXT] Next Steps:")
            print("1. Review the generated JSON files in static/ directory")
            print("2. Integrate these files into your frontend application") 
            print("3. Update read-test-result.js to load data from these JSON files")
            print("4. Implement localStorage caching for performance")
            
            print("\n[FILES] Generated Files:")
            print("   - static/group-data.json (Personality groups)")
            print("   - static/characteristics-data.json (Detailed characteristics)")
            
        else:
            print("[WARNING] Some output files were not created successfully")
            
    else:
        print(f"[ERROR] {len(scripts) - success_count} extraction(s) failed")
        print("[INFO] Please check the error messages above and fix any issues")
        sys.exit(1)

if __name__ == "__main__":
    main()