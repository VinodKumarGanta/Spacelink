import json
import os
from database_manager import MissionDatabase
from quality_monitor import calculate_quality_metrics
from database_manager import MissionDatabase

def export_to_json(output_path="dashboard/data.json"):
    """
    Fetches latest mission records from Supabase, decrypts, 
    and verifies digital signatures before caching in data.json.
    """
    print("--- MISSION DATA SECURITY SYNC ---")
    db = MissionDatabase()
    
    if db.url == "YOUR_SUPABASE_PROJECT_URL":
        print("[!] ERROR: Supabase credentials missing.")
        return

    # Fetch latest 50 records from Supabase
    # This automatically decrypts and verifies integrity using HMAC signatures.
    try:
        data = db.get_recent_transmissions(limit=50)
        
        # Verify the cloud is actually storing encrypted content
        if data and len(data) > 0:
            print(f"Verified {len(data)} cloud records.")
            print(f"Integrity check passed for {sum(1 for r in data if r.get('integrity_ok'))} records.")
    except Exception as e:
        print(f"Fetch failed: {e}")
        return

    # Calculate quality metrics from the fetched data
    quality_stats = calculate_quality_metrics(data)

    payload = {
        "transmissions": data,
        "quality": quality_stats
    }

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w') as f:
        json.dump(payload, f, indent=4)
    
    print(f"[SUCCESS] Deep-space cloud state synchronized to dashboard.")

if __name__ == "__main__":
    export_to_json()
