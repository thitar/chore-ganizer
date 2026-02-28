FROM some-base-image

# Install supercronic
RUN apk add --no-cache supercronic

# Create a non-root user
RUN adduser -D appuser
USER appuser

# Copy supercronic configuration
COPY supercronic.conf /etc/supercronic.conf

# Run supercronic instead of cron
CMD ["supercronic", "/etc/supercronic.conf"]