FROM node:20-alpine AS dev
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
EXPOSE 8081
CMD ["npx", "expo", "start", "--web", "--port", "8081"]
