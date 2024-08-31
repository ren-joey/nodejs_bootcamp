# Setting Up a Basic REST API

## Introduction
Now that we have our initial environment set up with Docker, Node.js, TypeScript, Nginx, and PostgreSQL, let's build a basic REST API using Express. This will involve:
- Creating API Routes: We'll define routes for basic CRUD (Create, Read, Update, Delete) operations.
- Connecting to PostgreSQL: We'll set up a connection to the PostgreSQL database using an ORM (like `TypeORM` or `Prisma`).

## STEP 1: Install Necessary Packages
First, install the necessary packages for creating a REST API and connecting to PostgreSQL. We'll use `pg` for the PostgreSQL client and an ORM of your choice (here, I'll use `TypeORM` as an example).
```bash
cd app
npm install pg typeorm reflect-metadata dotenv
npm install @types/pg --save-dev
```

## STEP2: Sensitive Information Security
Create a new file `.env.sample` in the `root` directory:
```
POSTGRES_HOST=
POSTGRES_PORT=
POSTGRES_USER=
POSTGRES_PASSWORD=
POSTGRES_DB=
APP_PORT=
NGINX_PORT=
```
Then copy the `.env.sample` file and rename it to `.env`, then add following properties into `.env` file:
```
POSTGRES_HOST=db
POSTGRES_PORT=5432
POSTGRES_USER=user
POSTGRES_PASSWORD=password
POSTGRES_DB=testdb
APP_PORT=3000
NGINX_PORT=8080
```

## STEP3: Configure TypeORM
Create a new file `ormconfig.ts` in the `app` directory for TypeORM configuration:
```typescript
import { DataSourceOptions } from 'typeorm';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const ormConfig: DataSourceOptions = {
  type: 'postgres',
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  synchronize: true,
  logging: false,
  entities: ['src/entity/**/*.ts'],
  migrations: ['src/migration/**/*.ts'],
  subscribers: ['src/subscriber/**/*.ts'],
};

export default ormConfig;
```
This configuration tells TypeORM to connect to the PostgreSQL database using the credentials and settings defined in the `docker-compose.yml` file.

## STEP 4: Create Database Entity
Create a `src/entity/User.ts` file to define a basic `User` entity:
```typescript
import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column()
  email!: string;
}
```

## STEP 5: Update the Server to Use TypeORM
Update your `index.ts` file to initialize TypeORM and set up basic API routes:
```typescript
import express from 'express';
import { DataSource } from 'typeorm';
import { User } from './entity/User';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.APP_PORT || 3000;

app.use(express.json());

// Initialize DataSource with environment variables
const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.POSTGRES_HOST,
    port: parseInt(process.env.POSTGRES_HOST || '5432'),
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    synchronize: true,
    logging: false,
    entities: [User],
    migrations: [],
    subscribers: []
});

// Connect to the database
AppDataSource.initialize().then(async () => {
    app.get('/', (req, res) => {
        res.send('Hello World!');
    });

    const userRepository = AppDataSource.getRepository(User);

    // Basic CRUD routes
    app.get('/users', async (req, res) => {
        const users = await userRepository.find();
        res.json(users);
    });

    app.post('/users', async (req, res) => {
        const user = userRepository.create(req.body);
        const result = await userRepository.save(user);
        res.json(result);
    });

    app.put('/users/:id', async (req, res) => {
        const user = await userRepository.findOneBy({ id: parseInt(req.params.id) });
        if (user) {
            userRepository.merge(user, req.body);
            const result = await userRepository.save(user);
            res.json(result);
        } else {
            res.status(404).send('User not found');
        }
    });

    app.delete('/users/:id', async (req, res) => {
        const result = await userRepository.delete(req.params.id);
        res.json(result);
    });

    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`)
    });
}).catch((error) => console.log(error));
```

## STEP 6: Update Settings
From `docker-compose.yml`, update the sensitive properties:
```
version: '3.8'

services:
  app:
    image: node:18-alpine
    working_dir: /app
    volumes:
      - ./app:/app
    command: sh -c "npm install && npm run dev"
    ports:
      - "${APP_PORT:-3000}:3000"
    depends_on:
      - db
    env_file:
      - .env

  nginx:
    image: nginx:alpine
    ports:
      - "${NGINX_PORT:-8080}:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - app

  db:
    image: postgres:14
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "${POSTGRES_PORT:-5432}:5432"
    env_file:
      - .env

volumes:
  postgres_data:
```
From `app/tsconfig.json`, update the settings to let typescript capable to recognize the ORM specifiers in `app/src/entity/User.ts`:
```json
{
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
}
```
To prevent sensitive information being uploaded to internet, create `.gitignore` file in `root` directory, and put `.env` into it:
```
.env
```

## STEP 7: Rebuild and Run Your Docker Environment
With these changes in place, rebuild and run your Docker environment again:
```bash
docker-compose down
docker-compose up --build
```

## STEP 8: Test Your API
Once everything is up and running, you can test your API using a tool like Postman, Insomnia, or `curl`.
- Get all users: GET [http://localhost:8080/users](http://localhost:8080/users)
- Create a new user: POST [http://localhost:8080/users](http://localhost:8080/users) with a JSON body like:
```json
{"name": "John Doe", "email": "john@example.com"}
```
- Update a user: PUT http://localhost:8080/users/1 with a JSON body like:
```json
{"name": "Jane Doe"}
```
- Delete a user: DELETE http://localhost:8080/users/1