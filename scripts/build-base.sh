#!/bin/bash
# 베이스 이미지 빌드 스크립트 (한 번만 실행)

set -e

echo "🏗️  Building base image with all dependencies..."

# 베이스 이미지 빌드 (시간이 오래 걸림, 하지만 한 번만)
docker build -f Dockerfile.base -t my-node-base . --no-cache

echo "✅ Base image built successfully!"
echo "📊 Image size:"
docker images my-node-base --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"

echo ""
echo "💡 Now you can use 'Dockerfile.fast' for super-fast builds!"
echo "   docker build -f Dockerfile.fast -t my-app ."