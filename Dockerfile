FROM denoland/deno:1.39.2

VOLUME /db
STOPSIGNAL SIGTERM

WORKDIR /app

COPY . .

RUN deno task build
RUN mkdir -p /db/atoms
RUN chmod 755 /app

EXPOSE 4000
CMD ["run", "--allow-all", "main.ts"]