FROM node:22-alpine
WORKDIR /app

COPY package.json package-lock.json* ./
COPY client/package.json ./client/
COPY server/package.json ./server/

RUN npm install

COPY . .

# Bake Kakao JS key into the Vite client at build time.
# Declaring ARG before RUN invalidates this layer when the key changes.
ARG VITE_KAKAO_JS_KEY
ENV VITE_KAKAO_JS_KEY=$VITE_KAKAO_JS_KEY
ARG VITE_DONATE_URL
ENV VITE_DONATE_URL=$VITE_DONATE_URL
RUN npm run build

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["node", "server/dist/index.js"]
