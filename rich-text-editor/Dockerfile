# pull official base image
FROM node:19-alpine

# set working directory
WORKDIR /front

# add `/app/node_modules/.bin` to $PATH
ENV PATH /front/node_modules/.bin:$PATH

# install app dependencies
COPY package.json ./
COPY package-lock.json ./
RUN npm install --silent && npm install react-scripts@3.4.1 -g --silent

# add app
COPY . ./