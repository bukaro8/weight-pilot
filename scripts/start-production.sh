#!/bin/sh
set -eu

node scripts/db-migrate-safe.mjs
exec "$@"
