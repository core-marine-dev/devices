mkdir -p tests/nodered/components
cp -r package.json src tests/nodered/components
chmod -R 777 tests/nodered/components
docker compose down
docker compose up --build
docker compose down