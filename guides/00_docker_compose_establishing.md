# Docker Compose Establishing

## Introduction
Setting up a Docker environment that includes Node.js with TypeScript, Nginx, and PostgreSQL.

## Step 1: Create a Project Directory
Create a new directory for your backend development project. Inside this directory, create another directory named app where your Node.js application will reside.

```bash
mkdir backend-project
cd backend-project
mkdir app
```

## Step 2: Create a Docker Compose File
In the root of your backend-project directory, create a docker-compose.yml file. This file will define the services (Node.js, Nginx, PostgreSQL) that Docker will run.

```yaml
version: '3.8'

services:
  app:
    image: node:18-alpine
    working_dir: /app
    volumes:
      - ./app:/app
    command: sh -c "npm install && npm run dev"
    ports:
      - "3000:3000"
    depends_on:
      - db

  nginx:
    image: nginx:alpine
    ports:
      - "8080:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - app

  db:
    image: postgres:14
    environment:
      POSTGRES_DB: mydb
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

## Step 3: Create a Basic Nginx Configuration
Create an nginx.conf file in the root of your backend-project directory. This configuration will forward requests from Nginx to your Node.js application.

```nginx
events {}

http {
  server {
    listen 80;

    location / {
      proxy_pass http://app:3000;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
    }
  }
}
```

## Step 4: Initialize a Node.js Project with TypeScript
Navigate to the app directory and initialize a new Node.js project with TypeScript:

```bash
cd app
npm init -y
npm install typescript ts-node @types/node --save-dev
npx tsc --init
```
Modify the tsconfig.json file to set the rootDir to ./src and outDir to ./dist. This setup will ensure that TypeScript files from the src directory are compiled into JavaScript files in the dist directory.

## Step 5: Create a Basic Node.js Server
Create a src directory in the app folder and add the express package to your dependencies:
```bash
npm install express
npm install @types/express --save-dev
```
add an index.ts file with the following content:
```typescript
import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Hello, World!');
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
```
Also,
Update the package.json file to include the following scripts:
```json
"scripts": {
  "dev": "ts-node src/index.ts"
}
```

## Step 6: Run Docker Compose
Go back to the root of your backend-project directory and run the following command to start all services:

```bash
docker-compose up --build
```
This command will build and start the Docker containers for Node.js, Nginx, and PostgreSQL.

## Step 7: Verify Your Setup
Node.js Server: Open your browser and navigate to http://localhost:8080. You should see "Hello, World!" from your Node.js server.<br>
PostgreSQL: You can connect to PostgreSQL on localhost:5432 using any PostgreSQL client with the credentials defined in docker-compose.yml.

## Step 8: Shut Down
Once you finish your work, you can easily shut your docker service down by:
```bash
docker-compose down
```