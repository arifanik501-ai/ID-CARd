import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 8085
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def log_message(self, format, *args):
        # Clean logging
        sys.stderr.write(f"[{self.log_date_time_string()}] {format % args}\n")

def run():
    # Security: Listen strictly on localhost (127.0.0.1), NEVER 0.0.0.0
    with socketserver.TCPServer(("127.0.0.1", PORT), Handler) as httpd:
        url = f"http://127.0.0.1:{PORT}/index.html"
        print("=" * 60)
        print(" MEP GROUP - ID CARD GENERATION SOFTWARE")
        print(" Server running at:", url)
        print(" Opening in your default web browser...")
        print("=" * 60)
        webbrowser.open(url)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")

if __name__ == "__main__":
    run()
