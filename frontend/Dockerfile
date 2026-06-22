# --- Build stage ---
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# VITE_* vars are baked at build time; override via --build-arg if needed.
ARG VITE_API_URL=/api
ARG VITE_CONTRACT_ADDRESS=
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_CONTRACT_ADDRESS=$VITE_CONTRACT_ADDRESS
RUN npm run build

# --- Serve stage ---
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
