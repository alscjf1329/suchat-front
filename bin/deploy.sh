cd /app/suchat-front
git pull

docker compose build
docker compose up -d
docker image prune -f
