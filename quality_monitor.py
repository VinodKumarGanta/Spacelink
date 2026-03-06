import os
from database_manager import MissionDatabase

def calculate_quality_metrics(data):
    """Core logic to calculate data quality metrics."""
    if not data:
        return None

    total_packets = len(data)
    successful_packets = 0
    lost_packets = 0
    corrupted_packets = 0
    total_qber = 0.0
    valid_qber_count = 0
    total_latency = 0.0
    integrity_passed = 0
    integrity_failed = 0

    for row in data:
        status = row.get("status", "")
        if status == "SUCCESS": successful_packets += 1
        elif status == "LOST": lost_packets += 1
        else: corrupted_packets += 1
            
        qber_val = row.get("qber")
        if qber_val is not None:
            total_qber += float(qber_val)
            valid_qber_count += 1
            
        lat_val = row.get("latency_sec")
        if lat_val is not None: total_latency += float(lat_val)
            
        if row.get("integrity_ok", False): integrity_passed += 1
        else: integrity_failed += 1

    avg_qber = (total_qber / valid_qber_count) * 100 if valid_qber_count > 0 else 0
    avg_latency = (total_latency / total_packets) / 60 if total_packets > 0 else 0
    delivery_rate = (successful_packets / total_packets) * 100 if total_packets > 0 else 0
    integrity_rate = (integrity_passed / total_packets) * 100 if total_packets > 0 else 0

    health = "HEALTHY"
    if avg_qber > 2.0 or integrity_rate < 100: health = "DEGRADED"
    if avg_qber > 11.0 or delivery_rate < 50: health = "CRITICAL"

    return {
        "overall_health": health,
        "avg_qber": round(avg_qber, 2),
        "avg_latency": round(avg_latency, 2),
        "delivery_rate": round(delivery_rate, 1),
        "integrity_rate": round(integrity_rate, 1),
        "total_packets": total_packets,
        "successful_packets": successful_packets,
        "lost_packets": lost_packets,
        "corrupted_packets": corrupted_packets,
        "integrity_passed": integrity_passed,
        "integrity_failed": integrity_failed
    }

def analyze_data_quality():
    """CLI tool for Data Quality Monitoring."""
    print("=======================================")
    print("  SPACE-LINK: DATA QUALITY MONITOR     ")
    print("=======================================\n")
    
    db = MissionDatabase()
    if db.url == "YOUR_SUPABASE_PROJECT_URL":
        print("[!] ERROR: Supabase credentials missing. Cannot analyze data.")
        return
        
    print("Fetching last 50 transmissions for analysis...\n")
    data = db.get_recent_transmissions(limit=50, decrypt=False)
    result = calculate_quality_metrics(data)
    
    if not result:
        print("[?] No mission data found in the cloud to analyze.")
        return

    print(f"Overall Link Status: [{result['overall_health']}]")
    print("---------------------------------------")
    print(" 1. ACCURACY (QBER)")
    print(f"    Avg Error Rate:   {result['avg_qber']}%")
    print(f"    Threshold:        < 2% Optimal, > 11% Abort")
    print()
    print(" 2. COMPLETENESS (Delivery)")
    print(f"    Success Rate:     {result['delivery_rate']}% ({result['successful_packets']}/{result['total_packets']})")
    print(f"    Packets Lost:     {result['lost_packets']}")
    print(f"    Packets Corrupt:  {result['corrupted_packets']}")
    print()
    print(" 3. INTEGRITY (HMAC Verification)")
    print(f"    Signatures Valid: {result['integrity_rate']}% ({result['integrity_passed']}/{result['total_packets']})")
    print(f"    Signatures Fail:  {result['integrity_failed']} (Tamper Risk/Legacy Data)")
    print()
    print(" 4. TIMELINESS (Latency)")
    print(f"    Avg Arrival Time: {result['avg_latency']} mins")
    print("=======================================")

if __name__ == "__main__":
    analyze_data_quality()
