import React, { useState } from 'react';
import { ExternalLink, Search } from 'lucide-react';

const toolCategories = [
  {
    category: 'Infrastructure & OPSEC',
    color: 'cyan',
    tools: [
      { name: 'Cobalt Strike', desc: 'Commercial adversary simulation platform', url: 'https://www.cobaltstrike.com' },
      { name: 'Sliver', desc: 'Open-source cross-platform C2 framework', url: 'https://github.com/BishopFox/sliver' },
      { name: 'Havoc', desc: 'Modern C2 framework with Demon implant', url: 'https://github.com/HavocFramework/Havoc' },
      { name: 'Brute Ratel C4', desc: 'Commercial adversary simulation toolkit', url: 'https://bruteratel.com' },
      { name: 'Mythic', desc: 'Cross-platform C2 framework with multiple agents', url: 'https://github.com/its-a-feature/Mythic' },
      { name: 'Metasploit', desc: 'Penetration testing framework', url: 'https://github.com/rapid7/metasploit-framework' },
      { name: 'Nightmangle', desc: 'Malleable C2 profile generator', url: 'https://github.com/d3d0c3d/nightmangle' },
      { name: 'C2concealer', desc: 'Random Malleable C2 profile generator', url: 'https://github.com/FortyNorthSecurity/C2concealer' },
    ]
  },
  {
    category: 'Reconnaissance',
    color: 'green',
    tools: [
      { name: 'BloodHound', desc: 'AD attack path visualization', url: 'https://github.com/BloodHoundAD/BloodHound' },
      { name: 'SharpHound', desc: 'BloodHound data collector (.NET)', url: 'https://github.com/BloodHoundAD/SharpHound' },
      { name: 'PowerView', desc: 'AD enumeration via PowerShell', url: 'https://github.com/PowerShellMafia/PowerSploit' },
      { name: 'ADSearch', desc: 'LDAP search for AD objects', url: 'https://github.com/tomcarver16/ADSearch' },
      { name: 'Seatbelt', desc: 'Host security enumeration (.NET)', url: 'https://github.com/GhostPack/Seatbelt' },
      { name: 'theHarvester', desc: 'Email, domain, and OSINT harvesting', url: 'https://github.com/laramies/theHarvester' },
      { name: 'Shodan', desc: 'Internet-facing asset search engine', url: 'https://www.shodan.io' },
      { name: 'Amass', desc: 'External DNS/OSINT enumeration', url: 'https://github.com/owasp-amass/amass' },
      { name: 'recon-ng', desc: 'Web reconnaissance framework', url: 'https://github.com/lanmaster53/recon-ng' },
      { name: 'Censys', desc: 'Internet device and certificate search', url: 'https://search.censys.io' },
      { name: 'Maltego', desc: 'Visual link analysis for OSINT', url: 'https://www.maltego.com' },
      { name: 'SpiderFoot', desc: 'Automated OSINT tool', url: 'https://github.com/smicallef/spiderfoot' },
      { name: 'Nmap', desc: 'Network scanner and service detection', url: 'https://nmap.org' },
      { name: 'Masscan', desc: 'High-speed port scanner', url: 'https://github.com/robertdavidgraham/masscan' },
    ]
  },
  {
    category: 'Initial Compromise',
    color: 'blue',
    tools: [
      { name: 'GoPhish', desc: 'Phishing campaign management', url: 'https://github.com/gophish/gophish' },
      { name: 'Evilginx2', desc: 'AITM phishing framework for credential and session hijacking', url: 'https://github.com/kgretzky/evilginx2' },
      { name: 'Modlishka', desc: 'Reverse proxy-based phishing toolkit', url: 'https://github.com/drk1wi/Modlishka' },
      { name: 'MSOLSpray', desc: 'O365 password spraying tool', url: 'https://github.com/dafthack/MSOLSpray' },
      { name: 'MailSniper', desc: 'Exchange/OWA password spraying', url: 'https://github.com/dafthack/MailSniper' },
      { name: 'DomainPasswordSpray', desc: 'LDAP domain password spray', url: 'https://github.com/dafthack/DomainPasswordSpray' },
      { name: 'kerbrute', desc: 'Kerberos-based user enum and spray', url: 'https://github.com/ropnop/kerbrute' },
      { name: 'ThreatCheck', desc: 'AV/EDR detection analysis for binaries', url: 'https://github.com/rasta-mouse/ThreatCheck' },
      { name: 'ConfuserEx', desc: '.NET obfuscator and protector', url: 'https://github.com/mkaring/ConfuserEx' },
      { name: 'Donut', desc: 'Position-independent shellcode from .NET/PE', url: 'https://github.com/TheWover/donut' },
    ]
  },
  {
    category: 'Wi-Fi',
    color: 'cyan',
    tools: [
      { name: 'Aircrack-ng', desc: 'Wi-Fi security auditing suite', url: 'https://www.aircrack-ng.org' },
      { name: 'hcxtools', desc: 'PMKID / WPA2 handshake capture & conversion', url: 'https://github.com/ZerBea/hcxtools' },
      { name: 'hcxdumptool', desc: 'Capture packets from WLAN adapters', url: 'https://github.com/ZerBea/hcxdumptool' },
      { name: 'reaver', desc: 'WPS brute-force and Pixie Dust', url: 'https://github.com/t6x/reaver-wps-fork-t6x' },
      { name: 'pixiewps', desc: 'WPS Pixie Dust offline attack', url: 'https://github.com/wiire-a/pixiewps' },
      { name: 'hostapd-wpe', desc: 'Rogue AP for 802.1X/EAP credential capture', url: 'https://github.com/OpenSecurityResearch/hostapd-wpe' },
      { name: 'mdk4', desc: 'Wi-Fi beacon flooding and attacks', url: 'https://github.com/aircrack-ng/mdk4' },
      { name: 'Kismet', desc: 'Wireless network detector and sniffer', url: 'https://www.kismetwireless.net' },
      { name: 'mitmproxy', desc: 'Interactive HTTPS/TLS MITM proxy', url: 'https://mitmproxy.org' },
    ]
  },
  {
    category: 'Web Applications',
    color: 'blue',
    tools: [
      { name: 'Burp Suite', desc: 'Web application security testing platform', url: 'https://portswigger.net/burp' },
      { name: 'sqlmap', desc: 'Automated SQL injection exploitation', url: 'https://sqlmap.org' },
      { name: 'ffuf', desc: 'Fast web fuzzer for dirs, params, and vhosts', url: 'https://github.com/ffuf/ffuf' },
      { name: 'gobuster', desc: 'Directory and DNS brute-forcing', url: 'https://github.com/OJ/gobuster' },
      { name: 'nuclei', desc: 'Template-based vulnerability scanner', url: 'https://github.com/projectdiscovery/nuclei' },
      { name: 'nikto', desc: 'Web server vulnerability scanner', url: 'https://github.com/sullo/nikto' },
      { name: 'subfinder', desc: 'Subdomain discovery tool', url: 'https://github.com/projectdiscovery/subfinder' },
      { name: 'httpx', desc: 'HTTP probing and fingerprinting', url: 'https://github.com/projectdiscovery/httpx' },
      { name: 'dalfox', desc: 'XSS finder and parameter analyzer', url: 'https://github.com/hahwul/dalfox' },
      { name: 'jwt_tool', desc: 'JWT testing and exploitation', url: 'https://github.com/ticarpi/jwt_tool' },
    ]
  },
  {
    category: 'Execution',
    color: 'red',
    tools: [
      { name: 'Donut', desc: 'Position-independent shellcode generation', url: 'https://github.com/TheWover/donut' },
      { name: 'sRDI', desc: 'Shellcode Reflective DLL Injection', url: 'https://github.com/monoxgas/sRDI' },
      { name: 'GadgetToJScript', desc: 'MSOFFICE ASR bypass via COM scriptlet', url: 'https://github.com/med0x2e/GadgetToJScript' },
      { name: 'LOLBAS', desc: 'Living Off The Land Binaries, Scripts and Libraries', url: 'https://lolbas-project.github.io' },
      { name: 'Invoke-ReflectivePEInjection', desc: 'Reflective PE injection via PowerShell', url: 'https://github.com/PowerShellMafia/PowerSploit' },
    ]
  },
  {
    category: 'Host Operations',
    color: 'purple',
    tools: [
      { name: 'Seatbelt', desc: 'Comprehensive host enumeration and recon', url: 'https://github.com/GhostPack/Seatbelt' },
      { name: 'SwiftBelt', desc: 'macOS host enumeration (Swift equivalent of Seatbelt)', url: 'https://github.com/cedowens/SwiftBelt' },
      { name: 'osquery', desc: 'SQL-powered OS introspection', url: 'https://osquery.io' },
      { name: 'SharpChrome', desc: 'Chrome cookie and credential extraction', url: 'https://github.com/GhostPack/SharpDPAPI' },
      { name: 'SharPersist', desc: 'Windows persistence toolkit (.NET)', url: 'https://github.com/mandiant/SharPersist' },
    ]
  },
  {
    category: 'Privilege Escalation',
    color: 'red',
    tools: [
      { name: 'WinPEAS', desc: 'Windows privilege escalation checker', url: 'https://github.com/carlospolop/PEASS-ng' },
      { name: 'LinPEAS', desc: 'Linux privilege escalation checker', url: 'https://github.com/carlospolop/PEASS-ng' },
      { name: 'PowerUp', desc: 'PowerShell privesc checker', url: 'https://github.com/PowerShellMafia/PowerSploit' },
      { name: 'SharpUp', desc: '.NET port of PowerUp', url: 'https://github.com/GhostPack/SharpUp' },
      { name: 'linux-exploit-suggester', desc: 'Automated kernel CVE matching', url: 'https://github.com/The-Z-Labs/linux-exploit-suggester' },
      { name: 'GTFOBins', desc: 'Unix binaries for privilege escalation', url: 'https://gtfobins.github.io' },
      { name: 'Accesschk', desc: 'Check object permissions (Sysinternals)', url: 'https://learn.microsoft.com/en-us/sysinternals/downloads/accesschk' },
    ]
  },
  {
    category: 'Credential Access',
    color: 'orange',
    tools: [
      { name: 'Mimikatz', desc: 'Windows credential extraction', url: 'https://github.com/gentilkiwi/mimikatz' },
      { name: 'pypykatz', desc: 'Mimikatz-compatible Python port', url: 'https://github.com/skelsec/pypykatz' },
      { name: 'Rubeus', desc: 'Kerberos ticket manipulation (.NET)', url: 'https://github.com/GhostPack/Rubeus' },
      { name: 'SharpDPAPI', desc: 'DPAPI secret and credential decryption', url: 'https://github.com/GhostPack/SharpDPAPI' },
      { name: 'DonPAPI', desc: 'Remote DPAPI secret dumping', url: 'https://github.com/login-securite/DonPAPI' },
      { name: 'LaZagne', desc: 'Password recovery for many applications', url: 'https://github.com/AlessandroZ/LaZagne' },
      { name: 'Hashcat', desc: 'GPU-accelerated password cracker', url: 'https://hashcat.net/hashcat' },
      { name: 'John the Ripper', desc: 'Password cracking tool', url: 'https://www.openwall.com/john' },
      { name: 'NetExec (nxc)', desc: 'Maintained fork of CrackMapExec — PTH, SAM/LSA/NTDS dump at scale', url: 'https://github.com/Pennyw0rth/NetExec' },
      { name: 'CrackMapExec', desc: 'Swiss army knife for Windows networks (legacy)', url: 'https://github.com/byt3bl33d3r/CrackMapExec' },
      { name: 'impacket-secretsdump', desc: 'Remote SAM/LSA/NTDS dumping via impacket', url: 'https://github.com/fortra/impacket' },
    ]
  },
  {
    category: 'Lateral Movement',
    color: 'pink',
    tools: [
      { name: 'Impacket', desc: 'Python library — psexec, wmiexec, smbexec, dcomexec, secretsdump, ticketer', url: 'https://github.com/fortra/impacket' },
      { name: 'NetExec (nxc)', desc: 'Maintained fork of CrackMapExec — SMB/WinRM/LDAP/RDP at scale with PTH', url: 'https://github.com/Pennyw0rth/NetExec' },
      { name: 'CrackMapExec', desc: 'SMB/WinRM/LDAP lateral movement (legacy, superseded by nxc)', url: 'https://github.com/byt3bl33d3r/CrackMapExec' },
      { name: 'Evil-WinRM', desc: 'WinRM interactive shell with PTH, file transfer, and .NET loading', url: 'https://github.com/Hackplayers/evil-winrm' },
      { name: 'SharpWMI', desc: 'WMI remote execution without CoInitializeSecurity (.NET)', url: 'https://github.com/GhostPack/SharpWMI' },
      { name: 'Chisel', desc: 'TCP/UDP tunneling over HTTP', url: 'https://github.com/jpillora/chisel' },
      { name: 'ligolo-ng', desc: 'TUN-based transparent pivoting tool', url: 'https://github.com/nicocha30/ligolo-ng' },
      { name: 'Proxychains', desc: 'TCP proxy chaining for pivoting', url: 'https://github.com/haad/proxychains' },
    ]
  },
  {
    category: 'Active Directory',
    color: 'cyan',
    tools: [
      { name: 'BloodHound', desc: 'AD attack path visualization', url: 'https://github.com/BloodHoundAD/BloodHound' },
      { name: 'Rubeus', desc: 'Full Kerberos attack toolkit — roasting, delegation, S4U, tickets, dcsync', url: 'https://github.com/GhostPack/Rubeus' },
      { name: 'Impacket', desc: 'GetTGT, GetST, ticketer (Silver/Golden/Diamond), GetUserSPNs, GetNPUsers', url: 'https://github.com/fortra/impacket' },
      { name: 'Whisker', desc: 'Shadow credentials via msDS-KeyCredentialLink (.NET)', url: 'https://github.com/eladshamir/Whisker' },
      { name: 'PyWhisker', desc: 'Shadow credentials (Python)', url: 'https://github.com/ShutdownRepo/pywhisker' },
      { name: 'PKINITtools', desc: 'PKINIT / shadow credential TGT request and S4U2self (Python)', url: 'https://github.com/dirkjanm/PKINITtools' },
      { name: 'krbrelayx', desc: 'Kerberos unconstrained delegation abuse and relay', url: 'https://github.com/dirkjanm/krbrelayx' },
      { name: 'Hashcat', desc: 'Crack Kerberoast / ASREPRoast hashes (modes 13100 / 18200)', url: 'https://hashcat.net/hashcat' },
      { name: 'Certipy', desc: 'ADCS enumeration and ESC exploitation (Python)', url: 'https://github.com/ly4k/Certipy' },
      { name: 'Certify', desc: 'ADCS vulnerability finder (.NET)', url: 'https://github.com/GhostPack/Certify' },
      { name: 'PetitPotam', desc: 'NTLM coerce via EFS', url: 'https://github.com/topotam/PetitPotam' },
      { name: 'Responder', desc: 'LLMNR/NBT-NS poisoning and coercion', url: 'https://github.com/lgandx/Responder' },
      { name: 'BloodyAD', desc: 'ACL/DACL abuse for AD', url: 'https://github.com/CravateRouge/bloodyAD' },
      { name: 'PowerMad', desc: 'Machine account creation for RBCD', url: 'https://github.com/Kevin-Robertson/Powermad' },
      { name: 'Grouper2', desc: 'Group Policy enumeration and analysis', url: 'https://github.com/l0ss/Grouper2' },
      { name: 'SharpSCCM', desc: 'SCCM/MCM enumeration and exploitation', url: 'https://github.com/Mayyhem/SharpSCCM' },
      { name: 'LAPSToolkit', desc: 'LAPS enumeration and abuse', url: 'https://github.com/leoloobeek/LAPSToolkit' },
    ]
  },
  {
    category: 'Domain Dominance',
    color: 'green',
    tools: [
      { name: 'Mimikatz', desc: 'Golden/Silver/Diamond ticket forgery, DCSync, lsadump', url: 'https://github.com/gentilkiwi/mimikatz' },
      { name: 'Impacket', desc: 'ticketer (forge Silver/Golden/Diamond tickets), secretsdump for DCSync', url: 'https://github.com/fortra/impacket' },
      { name: 'Rubeus', desc: 'Golden/Silver/Diamond ticket forge and inject, dcsync', url: 'https://github.com/GhostPack/Rubeus' },
      { name: 'Snaffler', desc: 'File share sensitive data hunting', url: 'https://github.com/SnaffCon/Snaffler' },
      { name: 'MANSPIDER', desc: 'Hunt for sensitive files on file shares', url: 'https://github.com/blacklanternsecurity/MANSPIDER' },
      { name: 'Certipy', desc: 'CA certificate forgery and persistence', url: 'https://github.com/ly4k/Certipy' },
    ]
  },
  {
    category: 'Defense Evasion',
    color: 'orange',
    tools: [
      { name: 'ThreatCheck', desc: 'Find AV-triggering bytes in binaries', url: 'https://github.com/rasta-mouse/ThreatCheck' },
      { name: 'AMSITrigger', desc: 'Identify AMSI-triggering content in scripts', url: 'https://github.com/RythmStick/AMSITrigger' },
      { name: 'ConfuserEx', desc: '.NET obfuscator and protector', url: 'https://github.com/mkaring/ConfuserEx' },
      { name: 'Donut', desc: 'Position-independent shellcode from .NET/PE', url: 'https://github.com/TheWover/donut' },
      { name: 'PEzor', desc: 'Open-source shellcode and PE packer', url: 'https://github.com/phra/PEzor' },
      { name: 'Scarecrow', desc: 'Shellcode loader with evasion techniques', url: 'https://github.com/optiv/ScareCrow' },
      { name: 'Freeze', desc: 'Payload creation for bypassing EDR', url: 'https://github.com/optiv/Freeze' },
      { name: 'LOLBAS', desc: 'Living Off The Land Binaries and Scripts', url: 'https://lolbas-project.github.io' },
    ]
  },
  {
    category: 'Windows APIs',
    color: 'red',
    tools: [
      { name: 'P/Invoke (pinvoke.net)', desc: 'Windows API signatures for .NET', url: 'https://www.pinvoke.net' },
      { name: 'D/Invoke', desc: 'Dynamic API invocation to avoid hooks', url: 'https://github.com/TheWover/DInvoke' },
      { name: 'SysWhispers3', desc: 'Direct/indirect syscall stub generation', url: 'https://github.com/klezVirus/SysWhispers3' },
      { name: 'HellsGate', desc: 'Direct syscall implementation via VX Tables', url: 'https://github.com/am0nsec/HellsGate' },
      { name: 'Windows API Index (MSDN)', desc: 'Official Windows API documentation', url: 'https://learn.microsoft.com/en-us/windows/win32/apiindex/windows-api-list' },
    ]
  },
  {
    category: 'Process Injection',
    color: 'orange',
    tools: [
      { name: 'sRDI', desc: 'Shellcode Reflective DLL Injection', url: 'https://github.com/monoxgas/sRDI' },
      { name: 'MemN0ps Process Injection', desc: 'Collection of process injection techniques', url: 'https://github.com/MemN0ps/process-injection-rs' },
      { name: 'ShellcodeTemplate', desc: 'Shellcode development and loader template', url: 'https://github.com/Cracked5pider/ShellcodeTemplate' },
      { name: 'Donut', desc: 'Convert .NET/PE/shellcode to position-independent code', url: 'https://github.com/TheWover/donut' },
    ]
  },
  {
    category: 'Malware',
    color: 'red',
    tools: [
      { name: 'SysWhispers3', desc: 'Direct & indirect syscall stub generation with dynamic SSN resolution', url: 'https://github.com/klezVirus/SysWhispers3' },
      { name: 'HellsGate', desc: "Hell's Gate — direct syscall via VX Tables", url: 'https://github.com/am0nsec/HellsGate' },
      { name: 'TartarusGate', desc: "Indirect syscall combining Hell's Gate + Halo's Gate", url: 'https://github.com/trickster0/TartarusGate' },
      { name: 'Ekko', desc: 'Sleep obfuscation with ROP chain for in-memory encryption', url: 'https://github.com/Cracked5pider/Ekko' },
      { name: 'Cronos', desc: 'Sleep obfuscation and stack spoofing', url: 'https://github.com/Idov31/Cronos' },
      { name: 'SharpDllProxy', desc: 'Generate DLL sideloading proxy from real DLL exports', url: 'https://github.com/Flangvik/SharpDllProxy' },
      { name: 'ThreatCheck', desc: 'Find AV/EDR detection bytes in binaries', url: 'https://github.com/rasta-mouse/ThreatCheck' },
      { name: 'AMSITrigger', desc: 'Identify AMSI-triggering content in scripts', url: 'https://github.com/RythmStick/AMSITrigger' },
      { name: 'ConfuserEx', desc: '.NET obfuscator — rename, encrypt strings, pack', url: 'https://github.com/mkaring/ConfuserEx' },
      { name: 'PEzor', desc: 'Open-source PE/shellcode packer with evasion', url: 'https://github.com/phra/PEzor' },
      { name: 'Freeze', desc: 'Payload creation tool for bypassing EDR solutions', url: 'https://github.com/optiv/Freeze' },
      { name: 'osslsigncode', desc: 'Cross-platform Authenticode PE signing tool', url: 'https://github.com/mtrojnar/osslsigncode' },
      { name: 'D/Invoke', desc: 'Dynamic API invocation library to avoid P/Invoke hooks', url: 'https://github.com/TheWover/DInvoke' },
      { name: 'MinHook', desc: 'Minimal x86/x64 API hook library for C/C++', url: 'https://github.com/TsudaKageyu/minhook' },
      { name: 'msfvenom', desc: 'Metasploit payload generator — shellcode, staged/stageless', url: 'https://github.com/rapid7/metasploit-framework' },
    ]
  },
  {
    category: 'ASR & WDAC',
    color: 'yellow',
    tools: [
      { name: 'WDAC Wizard', desc: 'GUI for WDAC policy creation', url: 'https://webapp-wdac-wizard.azurewebsites.net' },
      { name: 'MpCmdRun', desc: 'WDAC/Defender LOLBIN for bypasses', url: 'https://lolbas-project.github.io/lolbas/Binaries/MpCmdRun/' },
      { name: 'LOLBAS', desc: 'Living Off The Land Binaries — many bypass ASR/WDAC', url: 'https://lolbas-project.github.io' },
      { name: 'GadgetToJScript', desc: 'ASR bypass via trusted COM scriptlet', url: 'https://github.com/med0x2e/GadgetToJScript' },
    ]
  },
  {
    category: 'EDR Evasion',
    color: 'cyan',
    tools: [
      { name: 'SysWhispers3', desc: 'Direct/indirect syscall generation for EDR bypass', url: 'https://github.com/klezVirus/SysWhispers3' },
      { name: 'Ekko', desc: 'Sleep obfuscation with ROP chain', url: 'https://github.com/Cracked5pider/Ekko' },
      { name: 'Cronos', desc: 'Sleep obfuscation and stack spoofing', url: 'https://github.com/Idov31/Cronos' },
      { name: 'EDRSandblast', desc: 'EDR unhooking via kernel callbacks', url: 'https://github.com/wavestone-cdt/EDRSandblast' },
      { name: 'Backstab', desc: 'Kill protected EDR processes using handles', url: 'https://github.com/Yaxser/Backstab' },
      { name: 'PPLdump', desc: 'Bypass Protected Process Light for LSASS', url: 'https://github.com/itm4n/PPLdump' },
      { name: 'LOLDrivers', desc: 'Vulnerable drivers for BYOVD attacks', url: 'https://www.loldrivers.io' },
      { name: 'Freeze', desc: 'Payload creation for bypassing EDR solutions', url: 'https://github.com/optiv/Freeze' },
    ]
  },
  {
    category: 'DevOps & Cloud',
    color: 'blue',
    tools: [
      { name: 'Trivy', desc: 'Container and IaC vulnerability scanner', url: 'https://github.com/aquasecurity/trivy' },
      { name: 'Dive', desc: 'Interactive Docker image layer inspector — find secrets in build history', url: 'https://github.com/wagoodman/dive' },
      { name: 'truffleHog', desc: 'Secrets scanning in git repos and CI pipelines', url: 'https://github.com/trufflesecurity/trufflehog' },
      { name: 'gitleaks', desc: 'Git repository secrets detection', url: 'https://github.com/gitleaks/gitleaks' },
      { name: 'kube-hunter', desc: 'Kubernetes penetration testing and vulnerability scanning', url: 'https://github.com/aquasecurity/kube-hunter' },
      { name: 'peirates', desc: 'Kubernetes attack and pivot tool', url: 'https://github.com/inguardians/peirates' },
      { name: 'CDK', desc: 'Container escape and exploitation toolkit', url: 'https://github.com/cdk-team/CDK' },
      { name: 'Deepce', desc: 'Docker enumeration and container escape', url: 'https://github.com/stealthcopter/deepce' },
      { name: 'etcdctl', desc: 'CLI for etcd — dump all K8s secrets from etcd directly', url: 'https://github.com/etcd-io/etcd' },
      { name: 'Pacu', desc: 'AWS exploitation framework', url: 'https://github.com/RhinoSecurityLabs/pacu' },
      { name: 'ScoutSuite', desc: 'Multi-cloud security auditing tool', url: 'https://github.com/nccgroup/ScoutSuite' },
      { name: 'ansible2john', desc: 'Convert ansible-vault files for cracking with John/Hashcat', url: 'https://github.com/openwall/john' },
      { name: 'jenkins-decrypt', desc: 'Offline Jenkins credential decryption tool', url: 'https://github.com/tweksteen/jenkins-decrypt' },
    ]
  },
  {
    category: 'AI / ML Security',
    color: 'purple',
    tools: [
      { name: 'Garak', desc: 'LLM vulnerability scanner and red-teaming', url: 'https://github.com/leondz/garak' },
      { name: 'PyRIT', desc: 'Microsoft AI red-teaming toolkit', url: 'https://github.com/Azure/PyRIT' },
      { name: 'PromptInject', desc: 'Prompt injection attack framework', url: 'https://github.com/agencyenterprise/PromptInject' },
      { name: 'ART (IBM)', desc: 'Adversarial Robustness Toolbox for ML attacks', url: 'https://github.com/Trusted-AI/adversarial-robustness-toolbox' },
      { name: 'Foolbox', desc: 'Adversarial attacks on neural networks', url: 'https://github.com/bethgelab/foolbox' },
      { name: 'TextAttack', desc: 'NLP adversarial attack framework', url: 'https://github.com/QData/TextAttack' },
      { name: 'LLM Fuzzer', desc: 'Automated jailbreak fuzzing for LLMs', url: 'https://github.com/mnns/LLMFuzzer' },
    ]
  },
];

const colorMap = {
  cyan:   { header: 'text-cyan-400 border-cyan-500/30',   dot: 'bg-cyan-400' },
  green:  { header: 'text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400' },
  red:    { header: 'text-red-400 border-red-500/30',     dot: 'bg-red-400' },
  purple: { header: 'text-purple-400 border-purple-500/30', dot: 'bg-purple-400' },
  orange: { header: 'text-orange-400 border-orange-500/30', dot: 'bg-orange-400' },
  pink:   { header: 'text-pink-400 border-pink-500/30',   dot: 'bg-pink-400' },
  blue:   { header: 'text-blue-400 border-blue-500/30',   dot: 'bg-blue-400' },
  yellow: { header: 'text-yellow-400 border-yellow-500/30', dot: 'bg-yellow-400' },
};

export default function Tools() {
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? toolCategories.map(cat => ({
        ...cat,
        tools: cat.tools.filter(t =>
          t.name.toLowerCase().includes(search.toLowerCase()) ||
          t.desc.toLowerCase().includes(search.toLowerCase())
        )
      })).filter(cat => cat.tools.length > 0)
    : toolCategories;

  const totalTools = toolCategories.reduce((sum, c) => sum + c.tools.length, 0);

  return (
    <div className="space-y-10">
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-5xl font-bold font-mono tracking-tight">
          <span className="text-slate-200">Tools </span>
          <span className="text-red-500">Index</span>
        </h1>
        <p className="text-slate-500 font-mono text-sm mt-3">
          {totalTools} tools across {toolCategories.length} categories — click any tool to visit its repository
        </p>
      </div>

      <div className="relative max-w-md mx-auto">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search tools..."
          className="w-full bg-[#111827] border border-slate-700/50 rounded-lg pl-10 pr-4 py-2.5 text-sm font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-slate-500 transition-colors"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.map((cat) => {
          const colors = colorMap[cat.color] || colorMap.cyan;
          return (
            <div key={cat.category} className="bg-[#0d1117] border border-slate-800/50 rounded-xl overflow-hidden">
              <div className={`px-4 py-3 border-b-2 ${colors.header}`}>
                <span className="font-mono text-xs font-bold tracking-widest uppercase">{cat.category}</span>
                <span className="ml-2 text-slate-600 font-mono text-xs">({cat.tools.length})</span>
              </div>
              <div className="p-3 space-y-1.5">
                {cat.tools.map((tool) => (
                  <a
                    key={tool.name}
                    href={tool.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800/40 transition-all group"
                  >
                    <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${colors.dot}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">
                          {tool.name}
                        </span>
                        <ExternalLink className="w-3 h-3 text-slate-600 group-hover:text-slate-400 flex-shrink-0 transition-colors" />
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{tool.desc}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}