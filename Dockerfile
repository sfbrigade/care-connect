FROM node:22.23.5-bookworm

# Support for multi-architecture builds
ARG TARGETARCH

# Set an env variable for the location of the app files
ENV APP_HOME=/opt/node/app

# Refresh installed OS packages and install the PostgreSQL 17 client.
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl ca-certificates && \
    install -d /usr/share/postgresql-common/pgdg && \
    curl -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc --fail https://www.postgresql.org/media/keys/ACCC4CF8.asc && \
    sh -c 'echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt bookworm-pgdg main" > /etc/apt/sources.list.d/pgdg.list' && \
    apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get upgrade -y --with-new-pkgs && \
    apt-get install -y --no-install-recommends postgresql-client-17 && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

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

# Set up default command
CMD ["./node_modules/.bin/pm2-runtime", "-n", "web", "npm", "--", "start", "-w", "server"]
