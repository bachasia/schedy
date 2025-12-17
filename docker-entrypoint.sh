#!/bin/sh
set -e

# Fix permissions for /app/prisma directory
# This ensures the nextjs user can write to the volume mount
if [ -d "/app/prisma" ]; then
    chown -R nextjs:nodejs /app/prisma || true
    chmod -R 755 /app/prisma || true
fi

# Run migrations as nextjs user (after fixing permissions)
if [ "$1" = "node" ] && [ "$2" = "server.js" ]; then
    # Run migrations before starting the app
    su-exec nextjs prisma migrate deploy || true
fi

# Execute the main command
exec "$@"
