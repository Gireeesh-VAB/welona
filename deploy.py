#!/usr/bin/env python3
"""Deploy welona-admin to production using paramiko (no sshpass needed)."""

import os
import sys
import tarfile
import io
import paramiko
import subprocess
from pathlib import Path

HOST = "64.235.58.36"
USER = "root"
PASS = "CZDRdw7rxbEKxb8#f"
REMOTE_DIR = "/var/www/html/welona"
LOCAL_DIR = Path(__file__).parent

GREEN = "\033[0;32m"
YELLOW = "\033[1;33m"
RED = "\033[0;31m"
NC = "\033[0m"

def log(msg):  print(f"{GREEN}[✔]{NC} {msg}")
def warn(msg): print(f"{YELLOW}[!]{NC} {msg}")
def err(msg):  print(f"{RED}[✘]{NC} {msg}"); sys.exit(1)

EXCLUDE_DIRS = {"node_modules", ".next", "__pycache__", ".git"}
EXCLUDE_EXT  = {".db", ".db-journal"}

def make_tar(src: Path, arc_prefix: str) -> bytes:
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w:gz") as t:
        for root, dirs, files in os.walk(src):
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
            for f in files:
                fp = Path(root) / f
                if fp.suffix in EXCLUDE_EXT:
                    continue
                arcname = arc_prefix + "/" + fp.relative_to(src).as_posix()
                t.add(str(fp), arcname=arcname)
    return buf.getvalue()

def ssh_run(client, cmd, check=True):
    print(f"  $ {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd, get_pty=True)
    out = stdout.read().decode(errors="replace")
    rc  = stdout.channel.recv_exit_status()
    if out.strip():
        print(f"    {out.strip()[:1000]}")
    if check and rc != 0:
        err(f"Command failed (exit {rc}): {cmd}")
    return rc

def upload_tar(sftp, data: bytes, remote_path: str):
    sftp.putfo(io.BytesIO(data), remote_path)

def main():
    sync_frontend = "--frontend" in sys.argv or len(sys.argv) == 1
    sync_backend  = "--backend"  in sys.argv or len(sys.argv) == 1

    print("\n========================================")
    print(f"   Welona Deploy → {HOST}")
    print("========================================\n")

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    warn(f"Connecting to {HOST}...")
    client.connect(HOST, username=USER, password=PASS, timeout=30)
    sftp = client.open_sftp()
    log("Connected")

    if sync_backend:
        warn("Packing backend...")
        backend_tar = make_tar(LOCAL_DIR / "backend", "backend")
        warn("Packing shared...")
        shared_tar  = make_tar(LOCAL_DIR / "shared",  "shared")

        warn("Uploading backend...")
        upload_tar(sftp, backend_tar, "/tmp/welona_backend.tar.gz")
        warn("Uploading shared...")
        upload_tar(sftp, shared_tar, "/tmp/welona_shared.tar.gz")
        log("Upload complete")

        ssh_run(client, f"cd {REMOTE_DIR} && tar xzf /tmp/welona_backend.tar.gz")
        ssh_run(client, f"cd {REMOTE_DIR} && tar xzf /tmp/welona_shared.tar.gz")
        ssh_run(client, f"cd {REMOTE_DIR}/shared && npm install --legacy-peer-deps 2>&1 | tail -5")
        ssh_run(client, f"cd {REMOTE_DIR}/backend && npm install --legacy-peer-deps 2>&1 | tail -5")
        warn("Running prisma db push...")
        ssh_run(client, f"cd {REMOTE_DIR}/backend && npx prisma db push --accept-data-loss 2>&1 | tail -10")
        log("Prisma schema synced")
        warn("Building backend...")
        ssh_run(client, f"cd {REMOTE_DIR}/backend && npm run build 2>&1 | tail -10")
        log("Backend built")
        warn("Restarting backend PM2...")
        ssh_run(client, "pm2 restart welona-backend && pm2 save")
        log("welona-backend restarted")

    if sync_frontend:
        warn("Building frontend locally...")
        result = subprocess.run(
            ["npm", "run", "build"],
            cwd=str(LOCAL_DIR / "frontend"),
            capture_output=True, text=True
        )
        if result.returncode != 0:
            print(result.stdout[-2000:])
            print(result.stderr[-2000:])
            err("Frontend build failed")
        log("Frontend built locally")

        warn("Packing frontend .next...")
        next_tar = make_tar(LOCAL_DIR / "frontend" / ".next", ".next")
        warn("Packing frontend source...")
        src_tar  = make_tar(LOCAL_DIR / "frontend" / "src",   "src")

        warn("Uploading frontend .next...")
        upload_tar(sftp, next_tar, "/tmp/welona_next.tar.gz")
        warn("Uploading frontend src...")
        upload_tar(sftp, src_tar, "/tmp/welona_src.tar.gz")

        ssh_run(client, f"cd {REMOTE_DIR}/frontend && tar xzf /tmp/welona_next.tar.gz")
        ssh_run(client, f"cd {REMOTE_DIR}/frontend && tar xzf /tmp/welona_src.tar.gz")
        ssh_run(client, f"cd {REMOTE_DIR}/frontend && npm install --legacy-peer-deps 2>&1 | tail -5")
        warn("Restarting frontend PM2...")
        ssh_run(client, "pm2 restart welona-frontend && pm2 save")
        log("welona-frontend restarted")

    sftp.close()
    client.close()

    print("\n========================================")
    log("Deploy complete! https://welona.vabinformatics.com")
    print("========================================\n")

if __name__ == "__main__":
    main()
