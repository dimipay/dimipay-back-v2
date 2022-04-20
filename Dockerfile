FROM node:12

WORKDIR /usr/src/app
ENV DATABASE_URL=mysql://d9km6vnpf6c0:pscale_pw__uRp0iUIMxQ1lJk7viLpCgfMHVhg9y9FtK7b5R2yqLc@32r714fllgrd.ap-northeast-2.psdb.cloud/planetscale?sslaccept=strict
COPY package.json ./

RUN yarn install

COPY . .

EXPOSE 3000
RUN yarn prisma db pull
RUN yarn prisma generate

CMD ["yarn", "start"]
