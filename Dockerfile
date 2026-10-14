FROM node:22-alpine AS web
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY index.html tsconfig.json vite.config.ts ./
COPY public ./public
COPY src ./src
RUN npm run build
FROM python:3.12-slim
WORKDIR /app
COPY gateway/requirements.txt ./gateway/requirements.txt
RUN pip install --no-cache-dir -r gateway/requirements.txt
COPY gateway ./gateway
COPY --from=web /app/dist ./dist
RUN useradd --create-home senexa && mkdir -p /app/gateway/data && chown -R senexa:senexa /app
USER senexa
EXPOSE 8000
CMD ["python","-m","uvicorn","gateway.app:app","--host","0.0.0.0","--port","8000"]
