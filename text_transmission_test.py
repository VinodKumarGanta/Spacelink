import time
import binascii
from space_env import SpaceEnvironment
from quantum_relay import QuantumRelay
from database_manager import MissionDatabase

def text_to_bits(text):
    """Convert text string to a string of binary digits."""
    return bin(int.from_bytes(text.encode('utf-8'), 'big'))[2:].zfill(len(text.encode('utf-8')) * 8)

def bits_to_text(bits):
    """Convert a string of binary digits back to a text string."""
    try:
        # The bits string might not be perfectly divisible by 8 if heavily corrupted, but we sent it correctly
        n = int(bits, 2)
        return n.to_bytes((len(bits) + 7) // 8, 'big').decode('utf-8', errors='replace')
    except Exception as e:
        return "[DECODE ERROR]"

def transmit_real_data(message="Houston, we have a problem."):
    """
    Simulates sending actual text data via Quantum Superdense Coding.
    Each 2-bit chunk is transmitted over the Earth-Moon link.
    """
    print("====== DEEP SPACE SECURE PAYLOAD TRANSMISSION ======")
    print(f"Original Message    : '{message}'")
    
    # 1. Convert Payload to Binary
    binary_payload = text_to_bits(message)
    print(f"Total Bits to Send  : {len(binary_payload)}")
    
    # Initialize components
    space = SpaceEnvironment(distance_km=384400) # Moon distance
    quantum = QuantumRelay()
    db = MissionDatabase()
    
    one_way_latency = space.get_one_way_light_time()
    
    # 2. Chunk data into 2-bit pairs for Superdense Coding
    bit_pairs = [binary_payload[i:i+2] for i in range(0, len(binary_payload), 2)]
    
    received_binary = ""
    total_qber = 0
    successful_photons = 0
    
    print("\n[TRANSMITTING] Moon -> Earth (Quantum Link Active)...")
    
    for pair in bit_pairs:
        # Physical attenuation (probability of photon surviving)
        survival_prob = space.quantum_attenuation()
        success = True # Hardcoding to true for the sake of the demo, to guarantee payload arrival
        
        if success:
            # Quantum Superdense Coding Exchange
            decoded_pair = quantum.simulate_superdense_coding(pair[0], pair[1])
            qber = quantum.calculate_qber(pair, decoded_pair)
            total_qber += qber
            
            # Reconstruct the received binary payload
            received_binary += decoded_pair
            
            if qber < 0.1:
                successful_photons += 1
                
        # Small delay to mimic processing/transmission rate
        time.sleep(0.005)

    print("\n====== RECEPTION REPORT ======")
    print(f"Received Binary     : {received_binary[:64]}... (truncated)")
    print(f"Total QBER          : {(total_qber / len(bit_pairs)) * 100:.2f}%")
    
    # 3. Decode the received binary back to text
    decoded_message = bits_to_text(received_binary)
    print(f"\n[FINAL DECODED MSG] : '{decoded_message}'")
    print("====================================================")
    
    # Log one final combined event
    db.log_transmission(
        source="Moon",
        destination="Earth",
        protocol="Quantum-SDC-Text",
        data_bits=f"Final Msg:{decoded_message}",
        status="SUCCESS" if total_qber < 0.1 else "CORRUPTED",
        latency=one_way_latency,
        qber=total_qber/len(bit_pairs)
    )


if __name__ == "__main__":
    transmit_real_data("Apollo Base to Houston: Data extraction is 100% complete.")
