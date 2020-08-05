# build
FROM node:14-alpine as build-stage

WORKDIR /app
# Copy npm dependencies
COPY package*.json ./
COPY yarn.lock ./

RUN yarn install
COPY . .
RUN yarn build

# production stage
FROM node:14-alpine as production-stage
WORKDIR /app
# Install server production requirements
COPY package*.json ./
COPY yarn.lock ./

RUN yarn install --production && \
	yarn cache clean
COPY --from=build-stage /app/locales/ /app/locales/
COPY --from=build-stage /app/dist/ /app/dist/

# Copy outer files from root folder
COPY --from=build-stage /app/*.* /app/

EXPOSE 8080
CMD ["yarn", "start"]