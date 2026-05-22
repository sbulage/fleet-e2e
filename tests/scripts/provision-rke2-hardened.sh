#!/bin/sh

set -euo pipefail

# This script is used to provision a RKE2 cluster with hardened configuration for testing purposes.
KUBECTL_VERSION="1.33.0"
# renovate: datasource=github-releases depName=kubernetes/kubernetes digestVersion="1.33.0"
KUBECTL_SHA256="9efe8d3facb23e1618cba36fb1c4e15ac9dc3ed5a2c2e18109e4a66b2bac12dc"

# Get version from environment variable or use default
HARDENED_VERSION="${HARDENING_CLUSTER_VERSION:-v1.33.0+rke2r1}"

# Function to get checksum for a given version
get_checksum_for_version() {
  local version="$1"
  case "$version" in
    "v1.33.0+rke2r1")
      echo "acf7c6f69c932b46313d84db862f3ff5583050036d63bb3d344fffff2037a39f"
      ;;
    "v1.32.8+rke2r1")
      echo "8a4494e75b41433fb01b8dab3673f60639b503df1adbb917f2b674068de6e72e"
      ;;
    *)
      echo "ERROR: Unknown RKE2 version: $version" >&2
      echo "Supported versions:" >&2
      echo "  - v1.33.0+rke2r1" >&2
      echo "  - v1.32.8+rke2r1" >&2
      exit 1
      ;;
  esac
}

# Get the checksum for the requested version
HARDENED_SHA256=$(get_checksum_for_version "$HARDENED_VERSION")

### Deploy Kubectl && alias

### Deploy Kubectl && alias
echo "Downloading kubectl"
curl -sSfL "https://dl.k8s.io/release/v${KUBECTL_VERSION}/kubernetes-client-linux-amd64.tar.gz" -o kubernetes-client-linux-amd64.tar.gz
tar -xzf kubernetes-client-linux-amd64.tar.gz kubernetes/client/bin/kubectl
echo "${KUBECTL_SHA256}  kubernetes/client/bin/kubectl" | sha256sum -c -
sudo install -o root -g root -m 0755 kubernetes/client/bin/kubectl /usr/local/bin/kubectl
rm -rf kubernetes kubernetes-client-linux-amd64.tar.gz
alias k=kubectl


# Node Setup
sudo bash -c 'cat << EOF > /etc/sysctl.d/90-kubelet.conf
vm.panic_on_oom=0
vm.overcommit_memory=1
kernel.panic=10
kernel.panic_on_oops=1
EOF'

# Enable the above options by executing the below commands.
sudo sysctl -p /etc/sysctl.d/90-kubelet.conf

# ETCD configuration creating its group
sudo useradd -r -c "etcd user" -s /sbin/nologin -M etcd -U

# Create RKE2 Config PodSecurityAdmission policy yaml: 
# https://ranchermanager.docs.rancher.com/reference-guides/rancher-security/psa-restricted-exemptions
cat << EOF > psa.yaml
apiVersion: apiserver.config.k8s.io/v1
kind: AdmissionConfiguration
plugins:
  - name: PodSecurity
    configuration:
      apiVersion: pod-security.admission.config.k8s.io/v1
      kind: PodSecurityConfiguration
      defaults:
        enforce: "restricted"
        enforce-version: "latest"
        audit: "restricted"
        audit-version: "latest"
        warn: "restricted"
        warn-version: "latest"
      exemptions:
        usernames: []
        runtimeClasses: []
        namespaces: [calico-apiserver,
                     calico-system,
                     cattle-alerting,
                     cattle-csp-adapter-system,
                     cattle-elemental-system,
                     cattle-epinio-system,
                     cattle-externalip-system,
                     cattle-fleet-local-system,
                     cattle-fleet-system,
                     cattle-gatekeeper-system,
                     cattle-global-data,
                     cattle-global-nt,
                     cattle-impersonation-system,
                     cattle-istio,
                     cattle-istio-system,
                     cattle-logging,
                     cattle-logging-system,
                     cattle-monitoring-system,
                     cattle-neuvector-system,
                     cattle-prometheus,
                     cattle-provisioning-capi-system,
                     cattle-resources-system,
                     cattle-sriov-system,
                     cattle-system,
                     cattle-ui-plugin-system,
                     cattle-windows-gmsa-system,
                     cert-manager,
                     cis-operator-system,
                     fleet-default,
                     ingress-nginx,
                     istio-system,
                     kube-node-lease,
                     kube-public,
                     kube-system,
                     longhorn-system,
                     rancher-alerting-drivers,
                     security-scan,
                     tigera-operator]
EOF

# Add special permissions 
# Bear in mind cis must be in sync with deployed k8s version
sudo mkdir -p /etc/rancher/rke2
echo "write-kubeconfig-mode: 644" | sudo tee /etc/rancher/rke2/config.yaml
echo "pod-security-admission-config-file: $PWD/psa.yaml" | sudo tee -a /etc/rancher/rke2/config.yaml > /dev/null
echo "profile: cis" | sudo tee -a /etc/rancher/rke2/config.yaml > /dev/null

# Deploy RKE2
echo "Downloading RKE2 version: ${HARDENED_VERSION}"
curl -sSfL "https://github.com/rancher/rke2/releases/download/${HARDENED_VERSION}/rke2.linux-amd64.tar.gz" -o rke2.tar.gz
echo "Validating SHA256: ${HARDENED_SHA256}"
echo "${HARDENED_SHA256}  rke2.tar.gz" | sha256sum -c -
curl -sSfL "https://get.rke2.io" -o install.sh
chmod 700 install.sh

# Use HARDENED_VERSION as the Kubernetes version if set, otherwise default to latest
if [ -n "${HARDENED_VERSION:-}" ]; then
  if [ "$(id -u)" -eq 0 ]; then
    INSTALL_RKE2_VERSION="${HARDENED_VERSION}" INSTALL_RKE2_TAR_PREFIX="$PWD" sh install.sh
  else
    sudo INSTALL_RKE2_VERSION="${HARDENED_VERSION}" INSTALL_RKE2_TAR_PREFIX="$PWD" sh install.sh
  fi
else
  if [ "$(id -u)" -eq 0 ]; then
    sh install.sh
  else
    sudo sh install.sh
  fi
fi

rm -f rke2.tar.gz install.sh

sleep 40
export PATH=$PATH:/opt/rke2/bin
export KUBECONFIG=/etc/rancher/rke2/rke2.yaml
sleep 5

# Start RKE2
echo "Starting RKE2 service"
sudo systemctl enable --now rke2-server.service
sleep 180

# Configure default Service account
echo "Configuring default Service account"
sudo bash -c 'cat << EOF > service_account_update.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
     name: default
automountServiceAccountToken: false
EOF'
sleep 5

# Update Service Account to the default namespace
for namespace in $(kubectl get namespaces -A -o=jsonpath="{.items[*]['metadata.name']}"); do
  echo -n "Patching namespace $namespace - "
  kubectl patch serviceaccount default -n ${namespace} -p "$(cat service_account_update.yaml)"
done

# Patch ingress class to make it default
kubectl patch ingressClass nginx -p '{"metadata": {"annotations":{"ingressclass.kubernetes.io/is-default-class": "true"}}}'
