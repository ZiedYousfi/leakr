ARG GO_VERSION=1
FROM golang:${GO_VERSION}-bookworm AS builder

# Disable CGO for a fully static binary
ENV CGO_ENABLED=0
WORKDIR /usr/src/app

# Download dependencies and verify
COPY go.mod go.sum ./
RUN go mod download && go mod verify

# Copy source and build
COPY . .
RUN go build -v -o /run-app .

# Final image
FROM debian:bookworm

# Install CA certificates for TLS trust
RUN apt-get update \
    && apt-get install -y ca-certificates \
    && update-ca-certificates \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user for security
RUN useradd -m -u 1000 appuser
USER appuser

# Copy the static binary
COPY --from=builder /run-app /usr/local/bin/run-app

# Explicit entrypoint path
CMD ["/usr/local/bin/run-app"]
