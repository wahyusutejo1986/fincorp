FROM node:25-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3001

# Default command runs the API server
# Use 'docker-compose run --rm seed' to run the seed script instead
CMD ["npm", "start"]
