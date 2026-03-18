import os
import datetime
import hmac
import hashlib
from supabase import create_client, Client
from cryptography.fernet import Fernet

class MissionDatabase:
    """
    Handles Mission Control data storage using Supabase.
    Security: AES-256 (Fernet) Encryption + HMAC (Integritry) Digital Signatures.
    """
    def __init__(self):
        # Configuration
        self.url = os.environ.get("SUPABASE_URL", "https://vgawjuiwoytuiokvdfoo.supabase.co")
        self.key = os.environ.get("SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnYXdqdWl3b3l0dWlva3ZkZm9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3ODAwMjIsImV4cCI6MjA4ODM1NjAyMn0.EsdPiNfkB8B84azZjGhqt5UGuY0_1OsfZnwO4vvK6yI")
        
        try:
            self.supabase: Client = create_client(self.url, self.key)
            self._init_security_keys()
        except Exception as e:
            print(f"Error initializing Supabase client: {e}")
            self.supabase = None

    def _init_security_keys(self):
        """Loads or generates encryption and integrity keys."""
        key_path = "secret.key"
        try:
            if not os.path.exists(key_path):
                # AES-256 Fernet key
                self.cipher_key = Fernet.generate_key()
                with open(key_path, "wb") as f:
                    f.write(self.cipher_key)
            else:
                with open(key_path, "rb") as f:
                    self.cipher_key = f.read()
            
            self.cipher = Fernet(self.cipher_key)
            # Integrity Key (derived from master key)
            self.hmac_key = hashlib.sha256(self.cipher_key).digest()
        except Exception as e:
            print(f"Security failed to initialize: {e}")
            self.cipher = None

    def sign_data(self, data_str):
        """Generates a cryptographic signature for data integrity."""
        return hmac.new(self.hmac_key, data_str.encode(), hashlib.sha256).hexdigest()

    def verify_signature(self, data_str, signature):
        """Verifies the integrity of fetched cloud data."""
        expected = self.sign_data(data_str)
        return hmac.compare_digest(expected, signature)

    def encrypt_payload(self, plain_text):
        """Encrypts data for secure cloud storage."""
        if not self.cipher: return plain_text
        return self.cipher.encrypt(plain_text.encode()).decode()

    def decrypt_payload(self, cipher_text):
        """Decrypts data fetched from cloud storage."""
        if not self.cipher: return cipher_text
        try:
            return self.cipher.decrypt(cipher_text.encode()).decode()
        except:
            return "[DECRYPTION FAILED]"

    def log_transmission(self, source, destination, protocol, data_bits, status, latency, qber=0.0):
        """Logs encrypted and signed transmission event to Supabase."""
        if not self.supabase: return
            
        # 1. Encrypt Payload
        secure_bits = self.encrypt_payload(data_bits)
        
        # 2. Sign the data (Integrity check for payload + metadata)
        signature_base = f"{source}{destination}{secure_bits}{status}"
        digital_sig = self.sign_data(signature_base)
        
        data = {
            "timestamp": datetime.datetime.now().isoformat(),
            "source": source,
            "destination": destination,
            "protocol": protocol,
            "data_bits": secure_bits, 
            "status": status,
            "latency_sec": float(latency),
            "qber": float(qber),
            "signature": digital_sig # Verify this on fetch
        }
        
        try:
            self.supabase.table("transmissions").insert(data).execute()
        except Exception as e:
            print(f"Failed to log to Supabase: {e}")

    def get_recent_transmissions(self, limit=10, decrypt=True):
        """Fetches, verifies integrity, and decrypts data from Supabase."""
        if not self.supabase: return []
            
        try:
            response = self.supabase.table("transmissions").select("*").order("id", desc=True).limit(limit).execute()
            data = response.data or []
            
            for row in data:
                sig = row.get("signature")
                payload = row.get("data_bits")
                
                # Robustness check: Ensure required fields are present
                if not payload or not sig:
                    row["integrity_ok"] = False
                    row["data_bits"] = "[LINK CORRUPTION - MISSION ABORTED]"
                    continue
                
                # Verify Integrity
                sig_base = f"{row.get('source','')}{row.get('destination','')}{payload}{row.get('status','')}"
                row["integrity_ok"] = self.verify_signature(sig_base, sig)
                
                if decrypt:
                    row["data_bits"] = self.decrypt_payload(payload)
                    row["is_encrypted"] = True
            
            return data
        except Exception as e:
            print(f"Failed to fetch from Supabase: {e}")
            return []
