FROM node:20.11-slim

ADD . /image-uploader
WORKDIR /image-uploader

ENV NODE_ENV production

RUN ln -snf /usr/share/zoneinfo/Asia/Seoul /etc/localtime

EXPOSE 3000

CMD ["node", "./standalone/server.js"]