# One-shot deployer image: compiles + deploys the contract to the ganache
# service, writing the address + ABI to a shared volume the backend reads.
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx hardhat compile
CMD ["npx", "hardhat", "run", "scripts/deploy.js", "--network", "ganache"]
