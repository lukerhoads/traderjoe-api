FROM node:16-alpine as builder
WORKDIR /usr/src/app
COPY /package.json ./
COPY /yarn.lock ./
RUN npm install -g -s --no-progress yarn && \
    yarn install --production && \
    yarn run build && \
    yarn run prune && \
    yarn cache clean
COPY tsconfig.json ./
COPY src src
RUN yarn run build

FROM node:16-alpine 
ENV NODE_ENV=production
WORKDIR /usr/src/app
RUN chown node:node .
USER node
COPY --from=builder /usr/src/app/node_modules ./node_modules 
COPY package.json ./ 
COPY --from=builder /usr/src/app/dist/ dist/
EXPOSE 3000
ENTRYPOINT ["yarn", "start"]
