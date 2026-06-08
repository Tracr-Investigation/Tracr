FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["sh", "-c", "npx docusaurus build --out-dir /tmp/docusaurus-build && npx docusaurus serve --dir /tmp/docusaurus-build --host 0.0.0.0 --port 3000 --no-open"]
