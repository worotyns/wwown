FROM denoland/deno:1.39.2

VOLUME /db

WORKDIR /app
COPY . .

RUN deno task build
RUN mkdir -p /db/atoms
RUN chmod 755 /app

EXPOSE 4000
CMD [ "deno", "task", "start" ]
