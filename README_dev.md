# Dev notes

## Requirement

### np

```shell
npm install -g np
```

## Prepare and run test

```shell
docker compose build --no-cache
docker-compose up -d mssql
```

```shell
mkdir -p temp
git clone --depth 1 https://github.com/node-red/node-red.git ./temp/node-red

npm install
npm install ./temp/node-red --no-save

cp test/_config.docker.json test/config.json
npm test
```

## Release

```shell
npm run release
```

## Test flow

run node-red and mssql use docker

```shell
docker compose build --no-cache
docker-compose up -d
```

view node-red container log output

```shell
docker-compose logs -f node-red
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
