FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci && chmod -R +x node_modules/.bin/

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
