FROM golang:1.17

# Create appuser to run the application
RUN adduser --disabled-password --gecos '' appuser

# Install supercronic
RUN apk add --no-cache supercronic

# Set the working directory
WORKDIR /app

# Copy all necessary files
COPY . .

# Build the application
RUN go build -o myapp .

# Switch to appuser
USER appuser

# Command to run supercronic
CMD ["/usr/bin/supercronic", "cronjobs.txt"]