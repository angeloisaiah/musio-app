FROM mcr.microsoft.com/devcontainers/typescript-node:20

RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      ffmpeg \
      audiowaveform \
      jq \
      curl \
      ca-certificates \
      git \
    && rm -rf /var/lib/apt/lists/*
