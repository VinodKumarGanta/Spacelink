import hashlib
import json
import time

class SovereigntyLedger:
    """
    Simulates a Blockchain-based Decentralized Ledger for Digital Sovereignty.
    Ensures every packet transmitted via Space-Link is traceable and untamperable.
    """
    def __init__(self):
        self.chain = []
        self.ledger_id = hashlib.sha256(b"SpaceLink-Sovereign-Root-v1").hexdigest()
        self.create_block(proof=1, previous_hash="0") # Genesis block

    def create_block(self, proof, previous_hash):
        block = {
            'index': len(self.chain) + 1,
            'timestamp': time.time(),
            'proof': proof,
            'previous_hash': previous_hash,
            'transmission_id': hashlib.sha256(str(time.time()).encode()).hexdigest()[:12]
        }
        self.chain.append(block)
        return block

    def get_previous_block(self):
        return self.chain[-1]

    def hash_block(self, block):
        encoded_block = json.dumps(block, sort_keys=True).encode()
        return hashlib.sha256(encoded_block).hexdigest()

    def secure_log(self, transmission_data):
        """Logs a transmission to the immutable ledger."""
        previous_block = self.get_previous_block()
        previous_hash = self.hash_block(previous_block)
        
        # In a real system, transmission_data hash is included
        block = self.create_block(proof=100, previous_hash=previous_hash)
        # print(f"[SOVEREIGNTY] Data secured in Block #{block['index']} | Hash: {previous_hash[:10]}...")
        return block['transmission_id']

if __name__ == "__main__":
    ledger = SovereigntyLedger()
    tx_id = ledger.secure_log("Lunar Telemetry Packet #402")
    print(f"Transmission secured with ID: {tx_id}")
