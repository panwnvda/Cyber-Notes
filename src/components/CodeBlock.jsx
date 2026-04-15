import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export default function CodeBlock({ children, title }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = typeof children === 'string' ? children : '';
    navigator.clipboard.writeText(text.replace(/^(#.*$)/gm, '').trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderLine = (line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.startsWith('REM ') || trimmed.startsWith('rem ')) {
      return <span key={i} className="text-slate-500 italic">{line}</span>;
    }
    if (trimmed.startsWith('$') || trimmed.startsWith('>') || trimmed.startsWith('PS ') || trimmed.startsWith('C:\\')) {
      return <span key={i} className="text-emerald-400">{line}</span>;
    }
    // Check for common command patterns
    const cmdPatterns = /^(nmap|curl|wget|python|python3|ruby|perl|nc|netcat|ssh|scp|ftp|telnet|crackmapexec|nxc|netexec|bloodhound|ldapsearch|smbclient|enum4linux|gobuster|ffuf|dirb|nikto|sqlmap|hydra|john|hashcat|mimikatz|rubeus|certutil|certipy|impacket|secretsdump|getTGT|getST|GetUserSPNs|GetNPUsers|psexec|wmiexec|smbexec|evil-winrm|xfreerdp|msfconsole|msfvenom|searchsploit|responder|ntlmrelayx|mitm6|coercer|petitpotam|addcomputer|ticketer|lookupsid|findDelegation|dacledit|owneredit|services\.py|sc |reg |net |wmic |powershell|iex|invoke-|set-|get-|new-|add-|remove-|import-|export-|test-|start-|stop-|enable-|disable-|mkdir|rmdir|del |copy |move |type |dir |cd |ls |cat |grep|awk|sed|find |chmod|chown|chgrp|sudo|su |apt|yum|dnf|pip|gem|npm|docker|kubectl|terraform|ansible|git |svn|make|gcc|g\+\+|javac|go |cargo|rustc|cl |link |msbuild|csc |mono|dotnet|certify|sccmhunter|sharpsccm|sharphound|powerview|powerup|winpeas|linpeas|chisel|ligolo|socat|proxychains|msiexec|rundll32|regsvr32|mshta|cmstp|wscript|cscript|bitsadmin|certreq|forfiles|esentutl|expand|extrac32|makecab|replace|hh\.exe|ie4uinit|msconfig|msdeploy|msdt|presentationhost|tracker|pcalua|infdefaultinstall|diskshadow|dnscmd|ldifde|csvde|ntdsutil|dsquery|dsget|dsmod|dsadd|dsrm|dsmove|gpresult|gpupdate|auditpol|secedit|icacls|takeown|cacls|attrib|compact|cipher|robocopy|xcopy|clip|openssl|ssh-keygen|base64|xxd|od)/i;
    if (cmdPatterns.test(trimmed)) {
      return <span key={i} className="text-emerald-400">{line}</span>;
    }
    return <span key={i} className="text-slate-200">{line}</span>;
  };

  const lines = typeof children === 'string' ? children.split('\n') : [];

  return (
    <div className="rounded-lg border border-slate-700/50 bg-[#0c1222] overflow-hidden my-3">
      {title && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/50 bg-[#0f1629]">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-mono text-xs">{'>'}_</span>
            <span className="text-slate-400 font-mono text-xs">{title}</span>
          </div>
          <button onClick={handleCopy} className="text-slate-500 hover:text-slate-300 transition-colors">
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}
      <pre className="p-4 overflow-x-auto text-[13px] font-mono leading-relaxed">
        <code className="flex flex-col gap-0.5">
          {lines.map((line, i) => (
            <React.Fragment key={i}>
              {renderLine(line, i)}
              {i < lines.length - 1 && '\n'}
            </React.Fragment>
          ))}
        </code>
      </pre>
    </div>
  );
}