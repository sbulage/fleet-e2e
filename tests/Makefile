deps: 
	@go install -mod=mod github.com/onsi/ginkgo/v2/ginkgo
	@go install -mod=mod github.com/onsi/gomega
	@go mod tidy

# Qase commands
create-qase-run: deps
	@go run qase/qase_cmd.go -create
delete-qase-run: deps
	@go run qase/qase_cmd.go -delete
publish-qase-run: deps
	@go run qase/qase_cmd.go -publish

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
