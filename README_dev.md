# Dev notes

## Requirements

### np (for publishing)

```shell
npm install -g np
```

## GitHub Repository Setup

### Actions Secret

The CI workflow uses `MSSQL_SA_PASSWORD` to authenticate with SQL Server.
A default password is used as fallback, but it is recommended to set it explicitly:

1. Go to **Settings → Secrets and variables → Actions**
2. Click **New repository secret**
3. Name: `MSSQL_SA_PASSWORD`
4. Value: a strong password (must meet [SQL Server password policy](https://learn.microsoft.com/en-us/sql/relational-databases/security/password-policy))

> If this secret is not set, the workflow falls back to the default password defined in `.env.dev`.

## Environment Setup

Copy the environment template:

```shell
cp .env.dev .env
```

> `.env` is gitignored. Do not commit it. Update `MSSQL_SA_PASSWORD` in `.env` if needed.

## Running Tests

### Option 1: Fully Dockerized (Recommended)

Run MSSQL and execute tests inside a container — no local dependencies required:

```shell
cp .env.dev .env
docker compose -f docker-compose.test.yml build --pull
docker compose -f docker-compose.test.yml run --rm tester
```

Clean up containers and volumes:

```shell
docker compose -f docker-compose.test.yml down -v
```

### Option 2: Run Tests Locally (MSSQL via Docker)

Start MSSQL container:

```shell
cp .env.dev .env
docker compose up -d mssql
```

Wait for the MSSQL healthcheck to pass, then run tests:

```shell
npm install
cp test/_config.docker.json test/config.json
npm test
```

## Development Environment (Node-RED + MSSQL)

Start the full dev environment:

```shell
cp .env.dev .env
docker compose build --no-cache --pull
docker compose up -d
```

Install the local package into Node-RED:

```shell
docker compose exec nodered npm install /workspace/node-red-contrib-mssql-plus
docker compose restart nodered
```

View Node-RED logs:

```shell
docker compose logs -f nodered
```

Open `http://127.0.0.1:1880`

Stop and remove containers:

```shell
docker compose down
```

## Test Flow

Import the following flow, configure the connection node credentials, and deploy:

```json
[
    {
        "id": "14c2eb42.4809cd",
        "type": "tab",
        "label": "Flow 1",
        "disabled": false,
        "info": ""
    },
    {
        "id": "bd426342.77df68",
        "type": "inject",
        "z": "14c2eb42.4809cd",
        "name": "",
        "topic": "",
        "payload": "",
        "payloadType": "date",
        "repeat": "",
        "crontab": "",
        "once": false,
        "onceDelay": 0.1,
        "x": 140,
        "y": 60,
        "wires": [
            [
                "138f48ab.efa1b7"
            ]
        ]
    },
    {
        "id": "3156ca.3a591136",
        "type": "debug",
        "z": "14c2eb42.4809cd",
        "name": "",
        "active": true,
        "tosidebar": true,
        "console": false,
        "tostatus": false,
        "complete": "false",
        "x": 470,
        "y": 60,
        "wires": []
    },
    {
        "id": "138f48ab.efa1b7",
        "type": "MSSQL",
        "z": "14c2eb42.4809cd",
        "mssqlCN": "b00eadae.e4f898",
        "name": "",
        "query": "select * from sys.databases;",
        "outField": "payload",
        "returnType": 0,
        "throwErrors": 1,
        "x": 300,
        "y": 60,
        "wires": [
            [
                "3156ca.3a591136"
            ]
        ]
    },
    {
        "id": "b00eadae.e4f898",
        "type": "MSSQL-CN",
        "z": "",
        "tdsVersion": "7_4",
        "name": "",
        "server": "mssql",
        "port": "1433",
        "encyption": true,
        "database": "master",
        "useUTC": true,
        "connectTimeout": "15000",
        "requestTimeout": "15000",
        "cancelTimeout": "5000",
        "pool": "5",
        "parseJSON": false
    }
]
```

## Release

```shell
npm run release
npm run release-no-tests
```


Open `http://127.0.0.1:1880`

install plugin and import flow code

```json
[
    {
        "id": "14c2eb42.4809cd",
        "type": "tab",
        "label": "Flow 1",
        "disabled": false,
        "info": ""
    },
    {
        "id": "bd426342.77df68",
        "type": "inject",
        "z": "14c2eb42.4809cd",
        "name": "",
        "topic": "",
        "payload": "",
        "payloadType": "date",
        "repeat": "",
        "crontab": "",
        "once": false,
        "onceDelay": 0.1,
        "x": 140,
        "y": 60,
        "wires": [
            [
                "138f48ab.efa1b7"
            ]
        ]
    },
    {
        "id": "3156ca.3a591136",
        "type": "debug",
        "z": "14c2eb42.4809cd",
        "name": "",
        "active": true,
        "tosidebar": true,
        "console": false,
        "tostatus": false,
        "complete": "false",
        "x": 470,
        "y": 60,
        "wires": []
    },
    {
        "id": "138f48ab.efa1b7",
        "type": "MSSQL",
        "z": "14c2eb42.4809cd",
        "mssqlCN": "b00eadae.e4f898",
        "name": "",
        "query": "select * from sys.databases;",
        "outField": "payload",
        "returnType": 0,
        "throwErrors": 1,
        "x": 300,
        "y": 60,
        "wires": [
            [
                "3156ca.3a591136"
            ]
        ]
    },
    {
        "id": "b00eadae.e4f898",
        "type": "MSSQL-CN",
        "z": "",
        "tdsVersion": "7_4",
        "name": "",
        "server": "mssql",
        "port": "1433",
        "encyption": true,
        "database": "master",
        "useUTC": true,
        "connectTimeout": "15000",
        "requestTimeout": "15000",
        "cancelTimeout": "5000",
        "pool": "5",
        "parseJSON": false
    }
]
```

setup connection node Username and Password and deploy.

Stop and remove containers, networks

```shell
docker-compose down
```
