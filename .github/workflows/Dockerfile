FROM node:16

WORKDIR /app

COPY ./.github/workflows/run.sh ./run.sh

COPY ./dist .

COPY ./package*.json ./

COPY ./maintanence.js ./maintanence.js

COPY ./www ./www

EXPOSE 5000

CMD ["/bin/bash", "run.sh"]