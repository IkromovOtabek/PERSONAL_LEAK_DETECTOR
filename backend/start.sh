#!/bin/bash

# Wait for PostgreSQL
echo "Waiting for PostgreSQL..."
while ! nc -z postgres 5432; do
  sleep 0.1
done
echo "PostgreSQL started"

# Wait for Redis
echo "Waiting for Redis..."
while ! nc -z redis 6379; do
  sleep 0.1
done
echo "Redis started"

# Run migrations
echo "Running migrations..."
alembic upgrade head

# Start the application
export S3_ENABLED=true
echo "Starting application..."
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

