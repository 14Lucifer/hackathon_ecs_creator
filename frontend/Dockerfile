FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

# The compose file copies /app/dist into the shared nginx volume
CMD ["sh", "-c", "echo 'frontend built'"]
