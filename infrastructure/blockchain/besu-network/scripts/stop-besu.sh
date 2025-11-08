#!/bin/bash

cd "$(dirname "$0")/.." || exit 1

echo "Stopping AutoLogger Besu Network"
echo "==================================="

echo "Stopping Besu containers..."
docker stop besu-node-0 besu-node-1 besu-node-2 2>/dev/null || true

echo "Removing containers..."
docker rm besu-node-0 besu-node-1 besu-node-2 2>/dev/null || true

echo "Removing besu_network..."
docker network rm besu_network 2>/dev/null || true

read -p "Do you want to clean up data directories? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Cleaning up data directories..."
    rm -rf node/besu-0/data
    rm -rf node/besu-1/data
    rm -rf node/besu-2/data
    rm -rf genesis
    echo "Data directories cleaned"
fi

echo "AutoLogger Besu Network stopped successfully!"
echo ""
echo "To start the network again, run:"
echo "  ./scripts/start-besu.sh"
