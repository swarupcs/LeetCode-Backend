## Prisma init

```
npx prisma init
```

## Install PostgreSQL in Docker

```
docker run --name leetlab-postgres -e POSTGRES_USER=swarup -e POSTGRES_PASSWORD=1234 -p 5432:5432 -d postgres
```

## Create Docker Volume for Postgres DB

```
docker run --name leetlab-postgresql -e POSTGRES_USER=swarup -e POSTGRES_PASSWORD=1234 -p 5432:5432 -v pgdata:/var/lib/postgresql/data -d postgres
```

## Prisma Generate

```
npx prisma generate
```

## Prisma DB Migrate

```
npx prisma migrate dev
```

## Prisma DB Sync

```
npx prisma db push
```

## Create JWT SECRET using Bash

```
openssl rand -hex 32
```