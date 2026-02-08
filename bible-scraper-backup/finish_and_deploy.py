#!/usr/bin/env python3
"""
Finish and Deploy - After scraping is complete, this script:
1. Splits bible_data.json into individual version files
2. Places them in the correct directory structure for GitHub hosting
"""

import json
import sys
from pathlib import Path

def main():
    input_file = "bible_data.json"
    output_dir = Path("versions") / "en"
    
    # Check if input exists
    if not Path(input_file).exists():
        print(f"Error: {input_file} not found. Is the scraper still running?")
        sys.exit(1)
    
    # Load data
    print(f"Loading {input_file}...")
    with open(input_file, 'r', encoding='utf-8') as f:
        bible_data = json.load(f)
    
    print(f"Found {len(bible_data)} translations")
    
    # Create output directory
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Split each version into its own file
    for version_name, version_data in sorted(bible_data.items()):
        # Count verses
        verse_count = 0
        book_count = 0
        if isinstance(version_data, dict):
            book_count = len(version_data)
            for book, chapters in version_data.items():
                if isinstance(chapters, dict):
                    for chapter, verses in chapters.items():
                        if isinstance(verses, dict):
                            verse_count += len(verses)
        
        filename = f"{version_name}.json"
        output_file = output_dir / filename
        
        print(f"  Writing {version_name}: {book_count} books, {verse_count} verses -> {output_file}")
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(version_data, f, indent=2, ensure_ascii=False)
    
    print(f"\nDone! {len(bible_data)} version files created in {output_dir}/")
    print(f"\nFile listing:")
    for file in sorted(output_dir.glob("*.json")):
        size_mb = file.stat().st_size / (1024 * 1024)
        print(f"  {file.name} ({size_mb:.1f} MB)")
    
    print(f"\n--- NEXT STEPS ---")
    print(f"1. Create a GitHub repo called 'bible-versions':")
    print(f"   Go to https://github.com/new and create 'bible-versions'")
    print(f"")
    print(f"2. Then run these commands:")
    print(f"   cd /Users/jz/Desktop/bible-scraper")
    print(f"   git init")
    print(f"   git add versions/")
    print(f"   git commit -m 'Add scraped Bible versions'")
    print(f"   git remote add origin https://github.com/jacixn/bible-versions.git")
    print(f"   git branch -M main")
    print(f"   git push -u origin main")


if __name__ == "__main__":
    main()
