FROM alpine:3.22
RUN apk add --no-cache sqlite
COPY backup.sh /usr/local/bin/backup.sh
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/backup.sh /usr/local/bin/docker-entrypoint.sh
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
