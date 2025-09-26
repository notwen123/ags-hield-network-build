# Multi-stage build for optimized DAGShield node
FROM rust:1.75-slim as builder

# Install system dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    libclang-dev \
    cmake \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy manifests
COPY Cargo.toml Cargo.lock ./

# Copy source code
COPY src ./src

# Build the application
RUN cargo build --release

# Runtime stage
FROM debian:bookworm-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

# Create app user
RUN useradd -r -s /bin/false dagshield

# Create directories
RUN mkdir -p /app/data /app/models /app/config && \
    chown -R dagshield:dagshield /app

# Copy binary from builder
COPY --from=builder /app/target/release/dagshield-node /app/
COPY --from=builder /app/config.toml /app/config/

# Set ownership
RUN chown dagshield:dagshield /app/dagshield-node

# Switch to app user
USER dagshield

# Set working directory
WORKDIR /app

# Expose ports
EXPOSE 9000 9090

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:9090/health || exit 1

# Run the application
CMD ["./dagshield-node", "--config", "config/config.toml"]
