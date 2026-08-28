cd /app/suchat-front
git pull

# NEXT_PUBLIC_* 값은 빌드 타임에 번들에 박혀야 해서, docker compose의
# 기본 .env 자동 로드(파일명이 .env.production이라 안 먹힘) 대신
# 셸로 직접 export해서 build-arg로 전달되게 함
set -a
source .env.production
set +a

docker compose build
docker compose up -d
docker image prune -f
