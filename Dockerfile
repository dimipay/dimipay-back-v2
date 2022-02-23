FROM node:latest

RUN mkdir -p /app
WORKDIR /app

ARG DATABASE_URL
ARG DIMIAPI_BASEURL
ARG DIMIAPI_ID
ARG DIMIAPI_PW
ARG FACESIGN_API_KEY
ARG FACESIGN_API_URI
ARG GITHUB_TOKEN
ARG JWT_SECRET
ARG NAVER_API_ACCESS_KEY
ARG NAVER_SMS_API_KEY
ARG NAVER_SMS_API_SERVICE_ID
ARG NAVER_SMS_API_URI
ARG NAVER_SMS_SENDING_NUMBER
ARG NOTION_PAGE_ID
ARG NOTION_TOKEN
ARG PORT
ARG REDIS_URI
ARG SERVER_PORT

RUN git clone https://github.com/dimipay/dimipay-back-v2/ .

RUN npm uninstall dimipay-backend-crypto-engine && \
    npm install https://bot-user:${GITHUB_TOKEN}@github.com/dimipay/dimipay-backend-crypto-engine.git && \
    npm i && \
    npx prisma db pull && npx prisma generate

CMD npm start