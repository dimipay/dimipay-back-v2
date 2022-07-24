FROM node:lts

WORKDIR /usr/src/app
COPY package.json ./

ENV TZ Asia/Seoul
ARG DOPPLER_TOKEN
ENV DOPPLER_TOKEN $DOPPLER_TOKEN

RUN (curl -Ls --tlsv1.2 --proto "=https" --retry 3 https://cli.doppler.com/install.sh || wget -t 3 -qO- https://cli.doppler.com/install.sh) | sh
RUN doppler configure set token ${DOPPLER_TOKEN}
RUN yarn install --production=true

COPY . .

EXPOSE 4000

CMD yarn start:doppler