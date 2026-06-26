import time
import random
import os
from space_env import SpaceEnvironment
from quantum_relay import QuantumRelay
from database_manager import MissionDatabase
from jepa_engine import JEPAEngine
from sovereignty_ledger import SovereigntyLedger
from sovereign_slm import SovereignSLM
from ip_guard import IPGuard

def run_continuous_simulation():
    """
    Runs a real-time continuous mission simulation.
    This script populates the Supabase cloud database in real-time
    by simulating live packet transmissions between Earth and Mars.
    """
    print("====== SPACE-LINK CONTINUOUS MISSION STARTED ======")
    print("Target: Supabase Cloud (Live Ingestion)")
    
    # Initialize components
    distance_km = 384400 # Earth-Moon average
    space = SpaceEnvironment(distance_km)
    quantum = QuantumRelay()
    db = MissionDatabase()
    jepa = JEPAEngine()
    ledger = SovereigntyLedger()
    slm = SovereignSLM()
    guard = IPGuard()
    
    if db.url == "YOUR_SUPABASE_PROJECT_URL":
        print("[!] ABORTED: Supabase credentials not configured in database_manager.py")
        return

    one_way_latency = space.get_one_way_light_time()
    print(f"Distance: {distance_km} km")
    print(f"Network Latency: {one_way_latency:.2f} seconds (one-way)")
    
    # Initial IP Guard Check
    guard.verify_system_integrity()
    
    print("Press Ctrl+C to stop simulation.\n")

    try:
        while True:
            # 1. Choose a random source for the burst
            source = random.choice(["Earth", "Moon"])
            dest = "Moon" if source == "Earth" else "Earth"
            
            # 2. Generate bit pattern for Superdense Coding
            bits = f"{random.choice(['0','1'])}{random.choice(['0','1'])}"
            
            # 3. Physical channel simulation
            survival_prob = space.quantum_attenuation()
            success = random.random() < survival_prob
            
            # 4. Processing logic and Real-World Anomalies Simulation
            qber = 0.0
            recv_bits = "--"
            status = "LOST"
            
            
            anomaly_chance = random.random()
            anomaly_active = False
            forced_event = None
            
            # Check for Dashboard UI Override
            override_file = os.path.join(os.path.dirname(__file__), 'override.txt')
            if os.path.exists(override_file):
                with open(override_file, 'r') as f:
                    cmd = f.read().strip()
                if cmd == "INJECT_JAMMING":
                    anomaly_active = True
                    forced_event = ("JAMMING HACK", "SYS-WARN", "MANUAL OVERRIDE: Noise floor elevated.")
                    # Clear override after reading
                    with open(override_file, 'w') as f:
                        f.write("NOMINAL")
                elif cmd == "INJECT_SPOOFING":
                    anomaly_active = True
                    forced_event = ("SPOOFING HACK", "SEC-BREACH", "MANUAL OVERRIDE: Forged signal origin detected.")
                    with open(override_file, 'w') as f:
                        f.write("NOMINAL")
                elif cmd == "RESOLVE":
                    # Force nominal mode for this tick
                    anomaly_chance = 1.0 # Guarantee no random anomaly
                    with open(override_file, 'w') as f:
                        f.write("NOMINAL")
                    # Log a system restore event
                    db.log_transmission(
                        source="NETWORK",
                        destination="ALL",
                        protocol="SYSTEM",
                        data_bits="All systems nominal. Interference cleared.",
                        status="NOMINAL",
                        latency=one_way_latency,
                        qber=0.0
                    )
                    print(">>> [SYSTEM RESTORED] Interference cleared by operator.")
            
            # Check for User Input Message from Dashboard
            user_msg = None
            user_in_path = os.path.join(os.path.dirname(__file__), 'user_in.txt')
            if os.path.exists(user_in_path):
                with open(user_in_path, 'r') as f:
                    user_msg = f.read().strip()
                if user_msg:
                    # Clear for next check
                    with open(user_in_path, 'w') as f: f.write("")
            
            if anomaly_chance < 0.15 or forced_event: # 15% chance of a space event OR a forced UI event
                anomaly_active = True
                event = forced_event if forced_event else random.choice([
                    ("SOLAR FLARE", "SYS-ALERT", "Extreme CME interference detected."),
                    ("ORBITAL DEBRIS", "SYS-WARN", "Collision avoidance maneuver active."),
                    ("SPOOFING HACK", "SEC-BREACH", "Unverified jamming signature blocked."),
                    ("OPTICAL DRIFT", "SYS-WARN", "Laser targeting off-axis. Recalibrating.")
                ])
                
                print(f">>> [ANOMALY DETECTED] {event[0]}: {event[2]}")
                db.log_transmission(
                    source="NETWORK",
                    destination="ALL",
                    protocol="SYSTEM",
                    data_bits=f"[{event[0]}] {event[2]}",
                    status=event[1],
                    latency=one_way_latency,
                    qber=1.0 # Represents 100% disruption for the alert log itself
                )
                
                # Apply physics effects of the anomaly to the immediate packet
                if event[0] in ["SOLAR FLARE", "OPTICAL DRIFT"]:
                    success = False # Instant packet loss
                elif event[0] == "SPOOFING HACK":
                    qber = round(random.uniform(0.15, 0.45), 2) # Force massive QBER spike
                    success = True # Packet arrives but represents a hack/corruption
            
            if success:
                decoded = quantum.simulate_superdense_coding(bits[0], bits[1])
                
                if not anomaly_active or qber == 0.0: # Normal calc
                    qber = quantum.calculate_qber(bits, decoded)
                    
                status = "SUCCESS" if qber < 0.1 else "CORRUPTED"
                recv_bits = decoded if qber < 0.1 else "??"

            # 5. Multimedia Simulation (Occasional)
            protocol = "Quantum-SDC"
            payload_bits = f"Sent:{bits}|Recv:{recv_bits}"
            
            if status == "SUCCESS" and (user_msg or random.random() < 0.2): 
                if user_msg:
                    res = slm.process_command(user_msg)
                    protocol = "Quantum-SDC-SLM"
                    if res["status"] == "PROCESSED":
                        payload_bits = f"COM_INTENT: {res['intent']} | TOK: {res['compressed_payload']} | BITS: {res['compressed_bits']}/{res['original_bits']} (SAVED 90%)"
                    else:
                        payload_bits = f"SECURITY_ALERT: {res['msg']}"
                    user_msg = None # Handled
                else:
                    m_type = random.choice(["IMAGE", "VIDEO", "AUDIO", "TEXT"])
                    if m_type == "IMAGE":
                        protocol = "Quantum-SDC-Image"
                        payload_bits = "B-DATA: lunar_image.png | HEX:2F4A... [VERIFIED]"
                    elif m_type == "VIDEO":
                        protocol = "Quantum-SDC-Video"
                        payload_bits = "B-STREAM: live_feed_moon_south_pole.mp4"
                    elif m_type == "AUDIO":
                        protocol = "Quantum-SDC-Audio"
                        payload_bits = "A-STREAM: mission_comms_audio.wav"
                    else:
                        protocol = "Quantum-SDC-Text"
                        payload_bits = f"Final Msg: {random.choice(['All systems nominal.', 'Oxygen levels 98%.', 'Requesting orbital plot.'])}"

            # 6. AI & Sovereignty Check (Foundational AI & Blockchain)
            # JEPA Prediction
            vitals = {"solar_flux": random.randint(50, 200), "cosmic_noise": random.randint(5, 25)}
            prediction = jepa.predict_anomaly(vitals)
            
            # Blockchain Logging
            tx_id = ledger.secure_log(payload_bits)
            
            # Enhanced Logging for Dashboard
            final_status = status
            if prediction["prediction"] != "NOMINAL":
                final_status = f"MITIGATED ({prediction['prediction']})"
                print(f">>> [JEPA PREDICTION] {prediction['prediction']} | Mitigating using Sovereign Protocol...")

            # 7. Log to Supabase Cloud
            print(f"[LIVE] {source} -> {dest} | Type: {protocol} | Status: {final_status} | TXID: {tx_id}")
            db.log_transmission(
                source=source,
                destination=dest,
                protocol=protocol,
                data_bits=f"{payload_bits} | TXID:{tx_id}",
                status=final_status,
                latency=one_way_latency,
                qber=qber
            )
            
            # 8. Periodic Sovereign Audit (IP-Guard Integrity Check)
            if random.random() < 0.2: # ~20% chance per packet to perform a deep audit
                integrity = guard.get_integrity_status()
                audit_bits = f"IP-GUARD-AUDIT: {integrity} | BLOCKCHAIN_ID: {ledger.ledger_id[:16]}"
                db.log_transmission(
                    source="SYS-AUDIT",
                    destination="SOVEREIGN-OPS",
                    protocol="SOVEREIGN_AUDIT",
                    data_bits=audit_bits,
                    status="SUCCESS",
                    latency=0.0,
                    qber=0.0
                )
                print(f">>> [SOVEREIGN AUDIT] System integrity verified. Ledger: {ledger.ledger_id[:8]}...")

            # Wait between bursts (adjust for data frequency)
            time.sleep(random.uniform(2, 5))

    except KeyboardInterrupt:
        print("\nSimulation suspended by Mission Control.")

if __name__ == "__main__":
    run_continuous_simulation()
