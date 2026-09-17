FROM node:22-alpine
WORKDIR /app

COPY package.json package-lock.json* ./
COPY client/package.json ./client/
COPY server/package.json ./server/

RUN npm install

COPY . .

# VITE_KAKAO_JS_KEY is read from the build environment (set in Railway Variables)
RUN npm run build

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["node", "server/dist/index.js"]
