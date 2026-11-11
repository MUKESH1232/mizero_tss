FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY backend/index.js ./backend/index.js

ENV NODE_ENV=development
EXPOSE 3000

CMD ["node", "--watch", "backend/index.js"]
