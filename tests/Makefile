GINKGO_VERSION = v2.19.0
GOMEGA_VERSION = v1.33.1

deps:
	@go install github.com/onsi/ginkgo/v2/ginkgo@$(GINKGO_VERSION)
	@go get github.com/onsi/gomega@$(GOMEGA_VERSION)
	@go mod tidy

e2e-install-rancher: deps
	ginkgo --label-filter install -r -v ./e2e

e2e-install-only-certs-and-rancher: deps
	ginkgo --label-filter deploy-only-certs-and-rancher -r -v ./e2e

e2e-no-k3s-install-test-rancher:
	@./scripts/certs-and-rancher-install.sh

e2e-upgrade-rancher-manager: deps
	ginkgo --label-filter upgrade-rancher-manager -r -v ./e2e

start-cypress-tests:
	@./scripts/start-cypress-tests

e2e-install-rke2-hardened-cluster:
	@./scripts/provision-rke2-hardened.sh
