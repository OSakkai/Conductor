# Usar imagem oficial do Node.js
FROM node:18-alpine

# Instalar dependências necessárias para compilar módulos nativos
RUN apk add --no-cache python3 make g++ libc6-compat

# Criar diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências e recompilar bcrypt
RUN npm ci --omit=dev && npm rebuild bcrypt --build-from-source

# Copiar código fonte
COPY . .

# Compilar o TypeScript
RUN npm run build

# Expor porta
EXPOSE 3000

# Comando para iniciar a aplicação
CMD ["npm", "run", "start:prod"]