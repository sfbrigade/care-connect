# Local MinIO image for development and tests (S3 stand-in; never deployed).
#
# MinIO stopped publishing community images in 2026: minio/minio and minio/mc
# were removed from Docker Hub and Quay. The official binaries for the last
# community release are still published as GitHub release assets, so we build
# our own image from those and verify them against pinned sha256 checksums.
#
# Kept compatible with the classic Docker builder (no BuildKit-only features)
# because Testcontainers builds this image through the Docker API.
FROM alpine:3.22

ARG MINIO_RELEASE=RELEASE.2025-09-07T16-13-09Z
ARG MINIO_SHA256_AMD64=7c5bd8512c6e966455b1d198209358b2d191c77a83ab377c4073281065fb855f
ARG MINIO_SHA256_ARM64=5c83cd2cf151717ba0243f73e1c7802ff36e272b67144bdd7f1f7d684fd6f03d

ARG MC_RELEASE=RELEASE.2025-08-13T08-35-41Z
ARG MC_SHA256_AMD64=01f866e9c5f9b87c2b09116fa5d7c06695b106242d829a8bb32990c00312e891
ARG MC_SHA256_ARM64=14c8c9616cfce4636add161304353244e8de383b2e2752c0e9dad01d4c27c12c

RUN set -eu; \
    apk add --no-cache ca-certificates curl; \
    case "$(uname -m)" in \
      x86_64) arch=amd64; minio_sha="$MINIO_SHA256_AMD64"; mc_sha="$MC_SHA256_AMD64" ;; \
      aarch64|arm64) arch=arm64; minio_sha="$MINIO_SHA256_ARM64"; mc_sha="$MC_SHA256_ARM64" ;; \
      *) echo "unsupported architecture: $(uname -m)" >&2; exit 1 ;; \
    esac; \
    curl -fsSL --retry 3 -o /usr/local/bin/minio \
      "https://github.com/minio/minio/releases/download/${MINIO_RELEASE}/minio.linux-${arch}.${MINIO_RELEASE}"; \
    curl -fsSL --retry 3 -o /usr/local/bin/mc \
      "https://github.com/minio/mc/releases/download/${MC_RELEASE}/mc.linux-${arch}.${MC_RELEASE}"; \
    echo "${minio_sha}  /usr/local/bin/minio" | sha256sum -c -; \
    echo "${mc_sha}  /usr/local/bin/mc" | sha256sum -c -; \
    chmod +x /usr/local/bin/minio /usr/local/bin/mc; \
    apk del curl

VOLUME /data
EXPOSE 9000 9001

# No CMD on purpose: callers pass the full argument list (e.g. `server /data`).
ENTRYPOINT ["minio"]
