# Test environment for TokenScope CLI installation
FROM debian:bookworm-slim

# Install dependencies
RUN apt-get update && apt-get install -y \
    curl \
    jq \
    sqlite3 \
    bash \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user for testing
RUN useradd -m -s /bin/bash testuser
USER testuser
WORKDIR /home/testuser

# Set up environment
ENV HOME=/home/testuser
ENV PATH="/home/testuser/.local/bin:${PATH}"

# Copy test script
COPY --chown=testuser:testuser test-install.sh /home/testuser/test-install.sh
RUN chmod +x /home/testuser/test-install.sh

# Run tests
CMD ["/home/testuser/test-install.sh"]
