#!/bin/bash
set -e

influx bucket create \
  --name "${INFLUXDB_BUCKET:-drone_telemetry}" \
  --org "${INFLUXDB_ORG:-drone-lab}" \
  --retention 30d \
  --token "${DOCKER_INFLUXDB_INIT_ADMIN_TOKEN}" 2>/dev/null || true
