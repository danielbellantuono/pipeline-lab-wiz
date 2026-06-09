FROM node:14-alpine

WORKDIR /usr/src/app

# dipendenze ed installazione
COPY package*.json ./
RUN npm install

# applicazione
COPY app.js .

# MIO NOME
RUN echo "Daniel Bellantuono - Build Date: $(TZ=Europe/Rome date '+%Y-%m-%d %H:%M:%S %Z')" > /usr/src/app/wizexercise.txt

EXPOSE 3000

CMD ["npm", "start"]
