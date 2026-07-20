FROM node:20-alpine

WORKDIR /app

# Install only server dependencies
RUN echo '{"name":"ming-ssh-proxy","dependencies":{"ws":"^8.21.1","ssh2":"^1.17.0"}}' > package.json
RUN npm install

COPY server.js .

EXPOSE 3001

CMD ["node", "server.js"]
