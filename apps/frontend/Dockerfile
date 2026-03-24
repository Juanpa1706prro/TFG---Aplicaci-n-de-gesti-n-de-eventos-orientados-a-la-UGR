FROM node:20-alpine

# Instalamos el CLI de Angular globalmente
RUN npm install -g @angular/cli

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 4200

# Arrancamos Angular permitiendo conexiones externas
CMD ["ng", "serve", "--host", "0.0.0.0"]