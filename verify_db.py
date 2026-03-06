import os
from database_manager import MissionDatabase

def verify_cloud_storage():
    """
    Utility script to verify Supabase connectivity
    and list the most recent transmissions from the cloud.
    """
    print("--- MISSION CONTROL: Supabase Verification ---")
    db = MissionDatabase()
    
    if db.url == "YOUR_SUPABASE_PROJECT_URL":
        print("[!] ERROR: Supabase URL project credentials are not configured in database_manager.py")
        return

    print("Fetching latest mission data from Supabase...")
    data = db.get_recent_transmissions(limit=5)
    
    if not data:
        print("[?] INFO: No records found. Ensure the 'transmissions' table is created and populated.")
    else:
        print(f"--- Latest {len(data)} Cloud Records ---")
        for i, row in enumerate(data):
            print(f"[{i+1}] {row.get('timestamp')} | {row.get('source')} -> {row.get('destination')} | {row.get('status')} | Data: {row.get('data_bits')}")

if __name__ == "__main__":
    verify_cloud_storage()
