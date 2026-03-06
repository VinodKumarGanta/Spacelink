from cryptography.fernet import Fernet
import os

def setup_security():
    """Generates and saves a master encryption key for the Space-Link Project."""
    key_path = "secret.key"
    
    if os.path.exists(key_path):
        print(f"[*] Security key already exists at {key_path}")
        return

    # Generate a strong AES-256 (Fernet) key
    key = Fernet.generate_key()
    
    with open(key_path, "wb") as key_file:
        key_file.write(key)
    
    print(f"[+] Master encryption key generated and saved to {key_path}")
    print("[!] IMPORTANT: Keep this file safe. Without it, your cloud data cannot be decrypted.")

if __name__ == "__main__":
    setup_security()
