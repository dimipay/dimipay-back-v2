FROM node:12

WORKDIR /usr/src/app
COPY package.json ./

RUN yarn install --production=true

COPY . .

EXPOSE 3000
RUN yarn prisma db pull
RUN yarn prisma generate

CMD ["yarn", "start"]
