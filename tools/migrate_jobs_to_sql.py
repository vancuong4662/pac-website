#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script to migrate job data from TypeScript file to SQL

This script extracts job data from the old project's suggestJobs.ts file
and generates SQL INSERT statements for the new database.
Handles duplicate job_codes by generating unique identifiers.

Usage:
    python migrate_jobs_to_sql.py

Output:
    - jobs_data_insertion.sql (data insertion with unique job_codes)
"""

import re
import json
import os
from typing import Dict, List, Any
from collections import defaultdict

class JobDataMigrator:
    def __init__(self):
        self.base_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.old_project_path = os.path.join(self.base_path, "old-project", "backend-app", "src", "constants", "suggestJobs.ts")
        self.sql_output_path = os.path.join(self.base_path, "sql")
        
        # Ensure output directory exists
        os.makedirs(self.sql_output_path, exist_ok=True)
        
    def read_typescript_file(self) -> str:
        """Read the TypeScript file containing job data"""
        try:
            with open(self.old_project_path, 'r', encoding='utf-8') as f:
                content = f.read()
            print(f"✅ Successfully read TypeScript file: {self.old_project_path}")
            return content
        except FileNotFoundError:
            print(f"❌ Error: TypeScript file not found at {self.old_project_path}")
            return ""
        except Exception as e:
            print(f"❌ Error reading file: {e}")
            return ""
    
    def parse_typescript_data(self, content: str) -> List[Dict[str, Any]]:
        """Parse TypeScript job data and convert to Python dictionaries"""
        jobs = []
        
        # Find the jobs array
        jobs_match = re.search(r'export const jobs = \[(.*)\];', content, re.DOTALL)
        if not jobs_match:
            print("❌ Could not find jobs array in TypeScript file")
            return []
        
        jobs_content = jobs_match.group(1)
        
        # Split individual job objects
        # We'll use a simple approach: split by '},\n  {' pattern
        job_blocks = re.split(r'},\s*\n\s*{', jobs_content)
        
        print(f"🔍 Found {len(job_blocks)} job blocks to parse")
        
        for i, block in enumerate(job_blocks):
            try:
                # Clean up the block
                block = block.strip()
                if not block.startswith('{'):
                    block = '{' + block
                if not block.endswith('}'):
                    block = block + '}'
                
                # Parse individual job
                job = self.parse_job_object(block)
                if job:
                    jobs.append(job)
                    
                if (i + 1) % 50 == 0:
                    print(f"📊 Processed {i + 1} jobs...")
                    
            except Exception as e:
                print(f"⚠️ Error parsing job block {i + 1}: {e}")
                continue
        
        print(f"✅ Successfully parsed {len(jobs)} jobs")
        
        # Check for duplicates and fix them
        jobs = self.fix_duplicate_job_codes(jobs)
        
        return jobs
    
    def parse_job_object(self, block: str) -> Dict[str, Any]:
        """Parse a single job object from TypeScript"""
        job = {}
        
        # Extract simple string fields
        string_fields = {
            'activitiesCode': 'activities_code',
            'capacity': 'capacity', 
            'code': 'job_code',
            'description': 'job_description',
            'essentialAbility': 'essential_ability',
            'group': 'job_group',
            'hollandCode': 'holland_code',
            'name': 'job_name',
            'workContext': 'work_environment',
            'workStyle': 'work_style',
            'workValue': 'work_value'
        }
        
        for ts_field, sql_field in string_fields.items():
            pattern = rf"{ts_field}:\s*['\"]([^'\"]*)['\"]"
            match = re.search(pattern, block, re.DOTALL)
            if match:
                value = match.group(1).replace('\\n', ' ').replace('\\t', ' ').strip()
                # Clean up multiple spaces
                value = re.sub(r'\s+', ' ', value)
                job[sql_field] = value
        
        # Extract educationLevel (number)
        edu_match = re.search(r'educationLevel:\s*(\d+)', block)
        if edu_match:
            job['education_level'] = int(edu_match.group(1))
        
        # Extract array fields
        array_fields = {
            'expertise': 'specializations',
            'mission': 'main_tasks', 
            'workArea': 'work_areas'
        }
        
        for ts_field, sql_field in array_fields.items():
            pattern = rf"{ts_field}:\s*\[(.*?)\]"
            match = re.search(pattern, block, re.DOTALL)
            if match:
                array_content = match.group(1)
                # Extract individual array items
                items = re.findall(r"['\"]([^'\"]*)['\"]", array_content)
                if items:
                    job[sql_field] = json.dumps(items, ensure_ascii=False)
        
        return job
    
    def fix_duplicate_job_codes(self, jobs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """No job_code needed - use auto-increment id only"""
        print(f"\n✅ Using auto-increment id for {len(jobs)} jobs (no job_code needed)")
        return jobs
    
    def generate_data_insertion_sql(self, jobs: List[Dict[str, Any]]) -> str:
        """Generate SQL INSERT statements for job data"""
        sql = """-- =====================================================
-- JOBS DATA INSERTION 
-- Insert 200 job records from old project
-- =====================================================

-- Disable foreign key checks and autocommit for better performance
SET FOREIGN_KEY_CHECKS = 0;
SET AUTOCOMMIT = 0;

-- Clear existing jobs data (if any)
DELETE FROM jobs;

-- Reset auto increment
ALTER TABLE jobs AUTO_INCREMENT = 1;

-- Insert job data
"""
        
        # Group inserts for better performance
        batch_size = 50
        for i in range(0, len(jobs), batch_size):
            batch = jobs[i:i + batch_size]
            sql += f"\n-- Batch {i//batch_size + 1}: Jobs {i+1} to {min(i + batch_size, len(jobs))}\n"
            sql += "INSERT INTO jobs (\n"
            sql += "    job_name, holland_code, job_group, activities_code,\n"
            sql += "    capacity, essential_ability, education_level, work_environment,\n" 
            sql += "    work_style, work_value, job_description, specializations,\n"
            sql += "    main_tasks, work_areas, is_active\n"
            sql += ") VALUES\n"
            
            values = []
            for job in batch:
                value_parts = [
                    self.escape_sql_string(job.get('job_name', '')),
                    self.escape_sql_string(job.get('holland_code', '')),
                    self.escape_sql_string(job.get('job_group', '')),
                    self.escape_sql_string(job.get('activities_code', '')),
                    self.escape_sql_string(job.get('capacity', '')),
                    self.escape_sql_string(job.get('essential_ability', '')),
                    str(job.get('education_level', 'NULL')),
                    self.escape_sql_string(job.get('work_environment', '')),
                    self.escape_sql_string(job.get('work_style', '')),
                    self.escape_sql_string(job.get('work_value', '')),
                    self.escape_sql_string(job.get('job_description', '')),
                    self.escape_sql_string(job.get('specializations', 'NULL'), is_json=True),
                    self.escape_sql_string(job.get('main_tasks', 'NULL'), is_json=True),
                    self.escape_sql_string(job.get('work_areas', 'NULL'), is_json=True),
                    'TRUE'
                ]
                
                values.append(f"    ({', '.join(value_parts)})")
            
            sql += ',\n'.join(values) + ';\n\n'
        
        sql += """
-- Commit transaction
COMMIT;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;
SET AUTOCOMMIT = 1;

-- Verify insertion
SELECT 
    COUNT(*) as total_jobs,
    COUNT(DISTINCT holland_code) as unique_holland_codes,
    COUNT(DISTINCT job_group) as unique_job_groups
FROM jobs;

SELECT 'Jobs data insertion completed successfully!' as message;
"""
        
        return sql
    
    def escape_sql_string(self, value: str, is_json: bool = False) -> str:
        """Escape string for SQL insertion"""
        if value is None or value == '' or value == 'NULL':
            return 'NULL'
        
        if is_json and value == 'NULL':
            return 'NULL'
        
        # Escape single quotes and backslashes
        escaped = value.replace("\\", "\\\\").replace("'", "\\'")
        
        return f"'{escaped}'"
    
    def run_migration(self):
        """Main migration process"""
        print("🚀 Starting job data migration from TypeScript to SQL...")
        print("=" * 60)
        
        # Step 1: Read TypeScript file
        content = self.read_typescript_file()
        if not content:
            return
        
        # Step 2: Parse job data
        jobs = self.parse_typescript_data(content)
        if not jobs:
            print("❌ No jobs found to migrate")
            return
        
        # Step 3: Generate data insertion SQL
        print("\n📝 Generating data insertion SQL...")
        data_sql = self.generate_data_insertion_sql(jobs)
        data_file = os.path.join(self.sql_output_path, "jobs_data_insertion.sql")
        
        with open(data_file, 'w', encoding='utf-8') as f:
            f.write(data_sql)
        print(f"✅ Data insertion SQL saved to: {data_file}")
        
        # Step 4: Summary
        print("\n" + "=" * 60)
        print("📊 MIGRATION SUMMARY")
        print("=" * 60)
        print(f"✅ Total jobs migrated: {len(jobs)}")
        print(f"✅ File generated: {data_file}")
        print()
        print("🔧 NEXT STEPS:")
        print("1. Jobs table already exists in create-all-tables.sql")
        print("2. Run jobs_data_insertion.sql to populate data")
        print("3. Update quiz system to use jobs table for suggestions")
        
        # Step 5: Sample data preview
        if jobs:
            print("\n📋 SAMPLE JOB DATA:")
            sample_job = jobs[0]
            for key, value in sample_job.items():
                if isinstance(value, str) and len(value) > 100:
                    value = value[:100] + "..."
                print(f"   {key}: {value}")

def main():
    """Main entry point"""
    migrator = JobDataMigrator()
    migrator.run_migration()

if __name__ == "__main__":
    main()