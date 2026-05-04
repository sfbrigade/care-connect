FROM node:22.19.0-bookworm

# Support for multi-architecture builds
ARG TARGETARCH

# Git commit SHA for release tagging (PostHog `$git_commit` / `release`).
# Vite reads VITE_* env vars at build time; the same value is set at runtime so
# server-side captureException calls tag events with the same release.
ARG GIT_SHA=""
ENV VITE_GIT_SHA=$GIT_SHA

# Set an env variable for the location of the app files
ENV APP_HOME=/opt/node/app

# Install postgres dependencies
RUN apt update -y && \
    apt install -y curl ca-certificates && \
    install -d /usr/share/postgresql-common/pgdg && \
    curl -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc --fail https://www.postgresql.org/media/keys/ACCC4CF8.asc && \
    sh -c 'echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt bookworm-pgdg main" > /etc/apt/sources.list.d/pgdg.list' && \
    apt update -y && \
    apt install -y postgresql-client-17 chromium --no-install-recommends && \
    apt clean

# Set Chromium path for puppeteer-core
ENV CHROMIUM_PATH=/usr/bin/chromium

# update path to include any installed node module executables
RUN echo "export PATH=./node_modules/.bin:\$PATH\n" >> /root/.bashrc

# Create a directory for the server app to run from
RUN mkdir -p $APP_HOME

# Add the project files into the app directory and set as working directory
ADD . $APP_HOME
WORKDIR $APP_HOME

# Install dependencies, build client app, build server (Prisma client + forms dist)
RUN npm install && \
    npm run build -w client && \
    npm run build -w server

# Space-separated list of PostHog project IDs to upload source maps to. The same
# image is deployed to multiple environments (dev/prod), and each environment's
# PostHog project needs its own copy of the maps to symbolicate stack traces.
ARG POSTHOG_CLI_PROJECT_IDS=""

# Upload client source maps to PostHog for stack-trace symbolication, then delete
# them from the image so they aren't shipped to clients. Skipped if the
# POSTHOG_CLI_API_KEY secret or POSTHOG_CLI_PROJECT_IDS arg isn't provided
# (e.g. local builds, forks).
RUN --mount=type=secret,id=posthog_cli_api_key set -e; \
    if [ -s /run/secrets/posthog_cli_api_key ] && [ -n "$POSTHOG_CLI_PROJECT_IDS" ]; then \
      export POSTHOG_CLI_API_KEY="$(cat /run/secrets/posthog_cli_api_key)"; \
      first_project_id="$(echo $POSTHOG_CLI_PROJECT_IDS | awk '{print $1}')"; \
      POSTHOG_CLI_PROJECT_ID="$first_project_id" \
        npx --yes @posthog/cli@0.7.11 sourcemap inject --directory ./client/dist/client; \
      for project_id in $POSTHOG_CLI_PROJECT_IDS; do \
        echo "Uploading source maps to PostHog project $project_id"; \
        POSTHOG_CLI_PROJECT_ID="$project_id" \
          npx --yes @posthog/cli@0.7.11 sourcemap upload --directory ./client/dist/client \
            --release-name care-connect \
            --release-version "$GIT_SHA"; \
      done; \
    else \
      echo "POSTHOG_CLI_API_KEY or POSTHOG_CLI_PROJECT_IDS not provided — skipping source map upload"; \
    fi; \
    find ./client/dist -name '*.map' -delete

# Set up default command
CMD ["./node_modules/.bin/pm2-runtime", "-n", "web", "npm", "--", "start", "-w", "server"]
