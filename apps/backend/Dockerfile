FROM node:20-alpine

# Instalamos el CLI de NestJS globalmente
RUN npm install -g @nestjs/cli

WORKDIR /app

# Copiamos solo los archivos de dependencias primero para optimizar la caché
COPY package*.json ./
RUN npm install

# Copiamos el resto del código
COPY . .

EXPOSE 3000

# Comando para arrancar en modo desarrollo (con auto-recarga)
CMD ["npm", "run", "start:dev"]