FROM denoland/deno:1.39.2

# The port that your application listens to.
EXPOSE 4000

WORKDIR /app

# Prefer not to run as root.
# USER deno

# These steps will be re-run upon each file change in your working directory:
COPY . .

# Compile the main app so that it doesn't need to be compiled each startup/entry.
RUN deno task build

RUN mkdir -p /db/atoms
RUN chmod 755 /app

VOLUME /db

# Start the server by default, this can be overwritten at runtime
EXPOSE 4000
CMD [ "deno", "task", "start" ]
