FROM node:latest

RUN mkdir -p /app
WORKDIR /app

ARG GITHUB_TOKEN

RUN git clone https://github.com/dimipay/dimipay-back-v2/ .

RUN npm uninstall dimipay-backend-crypto-engine && \
    npm install https://bot-user:${GITHUB_TOKEN}@github.com/dimipay/dimipay-backend-crypto-engine.git && \
    npm i && \
    npx prisma db pull && npx prisma generate

CMD npm start