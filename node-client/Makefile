# DAGShield Node Makefile

.PHONY: build test run clean docker benchmark

# Build the project
build:
	cargo build --release

# Run tests
test:
	cargo test --all-features

# Run the node
run:
	cargo run -- --config config.toml

# Run with verbose logging
run-verbose:
	RUST_LOG=debug cargo run -- --config config.toml --verbose

# Run benchmark
benchmark:
	cargo run --release -- --config config.toml --benchmark

# Clean build artifacts
clean:
	cargo clean

# Build Docker image
docker-build:
	docker build -t dagshield-node:latest .

# Run with Docker Compose
docker-up:
	docker-compose up -d

# Stop Docker services
docker-down:
	docker-compose down

# View Docker logs
docker-logs:
	docker-compose logs -f dagshield-node

# Run performance benchmarks
bench:
	cargo bench

# Format code
fmt:
	cargo fmt

# Run clippy linter
clippy:
	cargo clippy --all-targets --all-features -- -D warnings

# Generate documentation
docs:
	cargo doc --no-deps --open

# Install dependencies
deps:
	rustup update
	cargo install cargo-audit cargo-outdated

# Security audit
audit:
	cargo audit

# Check for outdated dependencies
outdated:
	cargo outdated

# Full CI pipeline
ci: fmt clippy test audit

# Development setup
dev-setup:
	rustup component add rustfmt clippy
	cargo install cargo-watch
	mkdir -p data models config

# Watch for changes and rebuild
watch:
	cargo watch -x "run -- --config config.toml"

# Generate test data
test-data:
	mkdir -p test-data
	echo "Generating test blockchain data..."
	# Add test data generation commands here

# Deploy to testnet
deploy-testnet:
	@echo "Deploying to testnet..."
	# Add deployment commands here

# Monitor node
monitor:
	@echo "Opening monitoring dashboard..."
	open http://localhost:3000

help:
	@echo "Available commands:"
	@echo "  build         - Build the project"
	@echo "  test          - Run tests"
	@echo "  run           - Run the node"
	@echo "  benchmark     - Run performance benchmarks"
	@echo "  docker-build  - Build Docker image"
	@echo "  docker-up     - Start with Docker Compose"
	@echo "  ci            - Run full CI pipeline"
	@echo "  dev-setup     - Setup development environment"
	@echo "  help          - Show this help message"
