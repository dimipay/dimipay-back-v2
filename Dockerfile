FROM node:lts

WORKDIR /usr/src/app
COPY package.json ./

RUN yarn install --production=true

COPY . .

EXPOSE 4000

CMD ["sh", "-c", "yarn prisma db pull && yarn prisma generate && yarn start"]
