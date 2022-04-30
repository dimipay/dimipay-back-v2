FROM node:12

WORKDIR /usr/src/app
ENV DATABASE_URL='mysql://2adtc02ykedy:pscale_pw_s8P6UluLqL8dW0RLqm9dkxDTc3PuJoCXvpSfp-6_axc@32r714fllgrd.ap-northeast-2.psdb.cloud/planetscale?sslaccept=strict'
COPY package.json ./

RUN yarn install --production=true

COPY . .

EXPOSE 3000
RUN yarn prisma db pull
RUN yarn prisma generate

CMD ["yarn", "start"]
