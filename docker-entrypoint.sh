#!/bin/sh
set -e

# Fix permissions for /app/prisma directory
# This ensures the nextjs user can write to the volume mount
# Only run if we're root (during container startup)
if [ "$(id -u)" = "0" ] && [ -d "/app/prisma" ]; then
    chown -R nextjs:nodejs /app/prisma || true
    chmod -R 755 /app/prisma || true
    # Switch to nextjs user for the rest
    exec su-exec nextjs "$0" "$@"
fi

# If we're already nextjs user, just execute the command
exec "$@"


