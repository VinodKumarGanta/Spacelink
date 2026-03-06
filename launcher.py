import http.server
import socketserver
import os
import subprocess
import time
import webbrowser

PORT = 8000
DIRECTORY = "dashboard"

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        # Automatically sync from cloud when data.json is requested
        if self.path.startswith("/data.json"):
            print("[SYNC] Fresh mission data requested. Pulling from cloud...")
            try:
                subprocess.run(["python", "export_data.py"], capture_output=True)
            except Exception as e:
                print(f"Sync error: {e}")
        
        return super().do_GET()

    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length).decode('utf-8')
        
        if post_data.startswith("USER_MSG:"):
            # Write custom messages to a separate file for the simulation
            msg = post_data.replace("USER_MSG:", "")
            with open('user_in.txt', 'w') as f:
                f.write(msg)
            print(f"[UPLINK] User command staged: {msg}")
        else:
            # Write the command to override.txt in the root project dir
            override_path = os.path.join(os.path.dirname(__file__), 'override.txt')
            with open(override_path, 'w') as f:
                f.write(post_data)
            
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"OK")

def run_server():
    print("--- Space-Link Launcher ---")
    
    # Run sync script first to ensure data exists
    print("Exporting latest mission data...")
    try:
        subprocess.run(["python", "export_data.py"], check=True)
    except Exception as e:
        print(f"Warning: Data export failed: {e}")

    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Mission Control Dashboard active at http://localhost:{PORT}")
        print("Bypassing CORS for database access...")
        
        # Open browser automatically
        webbrowser.open(f"http://localhost:{PORT}/index.html")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down Mission Control.")
            httpd.server_close()

if __name__ == "__main__":
    run_server()
