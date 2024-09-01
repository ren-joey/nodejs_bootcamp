# Database Optimization

## Introduction
This step focuses on improving the performance of your backend application by optimizing database queries and structure. Proper database optimization is essential before implementing caching to ensure that your application is as efficient as possible.

Step-by-Step Guide
- Add Indexes to Frequently Queried Columns: Improve the speed of database queries by adding indexes to columns that are frequently used in `WHERE` clauses or as join keys.
- Optimize SQL Queries: Refactor and optimize your SQL queries to minimize the execution time and improve performance.
- Analyze and Monitor Query Performance: Use tools to analyze and monitor the performance of your queries.

## STEP 1: Add Indexes to Frequently Queried Columns
Indexes are a powerful way to speed up data retrieval operations in a database. However, they come with trade-offs, such as increased storage usage and slower write operations, so it’s important to add indexes strategically.

Identify Columns for Indexing:
- Columns used frequently in WHERE clauses.
- Columns used in JOIN operations.
- Columns used in ORDER BY clauses.

Add Indexes Using TypeORM:
```ts
import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, Unique, Index } from 'typeorm';

export enum UserRole {
    USER = 'user',
    ADMIN = 'admin'
}

@Entity()
@Unique(['email'])
export class User {
@PrimaryGeneratedColumn()
    id!: number;

@Column()
    name!: string;

@Column()
@Index('IDX_USER_EMAIL', { unique: true })  // Index on email with uniqueness
    email!: string;

@Column()
    password!: string;

@Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER
})
    role!: UserRole;
}
```
- `@Index` Decorator: Adds an index to the specified column(s).
- `{ unique: true }`: Ensures that the index enforces unique values.

## STEP 2: Optimize SQL Queries (Optional)
Ensure your SQL queries are optimized for performance.

Refactor Expensive Queries:
- Minimize the number of joins in a single query.
- Avoid using SELECT *; select only the columns you need.
- Use pagination (LIMIT and OFFSET) for large result sets.

Use Query Builder or Custom SQL:<br>
If you need more control over your queries, consider using TypeORM's Query Builder or writing custom SQL queries.<br>
Example: Use Query Builder:
```ts
// Example of using Query Builder to find users with specific roles
const users = await AppDataSource.getRepository(User)
  .createQueryBuilder('user')
  .where('user.role = :role', { role: UserRole.ADMIN })
  .getMany();
```
Example: Custom SQL Query:
```ts
// Example of a raw SQL query for advanced use cases
const users = await AppDataSource.query(
  `SELECT * FROM user WHERE role = $1`,
  [UserRole.ADMIN]
);
```

## STEP 3: Analyze and Monitor Query Performance (Optional)
Monitoring query performance helps identify slow queries and areas of the database that need optimization.

1. Use Database Monitoring Tools:
    - PostgreSQL: Use tools like pg_stat_activity, pg_stat_statements, and pgAdmin for monitoring.
    - MySQL: Use the Slow Query Log, EXPLAIN, and SHOW STATUS commands for performance analysis.
2. Set Up Performance Monitoring Dashboards:<br>
    Consider using tools like Grafana with Prometheus to visualize and monitor query performance over time. You can also use third-party services like Datadog, New Relic, or AWS CloudWatch for comprehensive monitoring.


## STEP 4: Check Index Usage
Basic `EXPLAIN` Command: The basic `EXPLAIN` command shows the execution plan for a query, indicating whether an index will be used.
```sql
EXPLAIN SELECT * FROM users WHERE email = 'john@example.com';
-- or
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'john@example.com';
```
Look for lines in the output that mention `Index Scan` or `Bitmap Index Scan`. If you see `Seq Scan` (sequential scan), it means the query is scanning the entire table without using an index.