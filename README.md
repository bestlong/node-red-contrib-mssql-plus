# node-red-contrib-mssql-plus

A [Node-RED](http://nodered.org) node for connecting to Microsoft MS SQL Databases.

Importantly, this package comes with pre-built linux drivers for communicating with the Azure & MS SQL services (using TDS protocal), removing the need to set-up environment level MSSQL (or similar) drivers.

## Features include...
* Connect to multiple SQL Servers from SQL2000 ~ latest
* Perform multiple queries in one go & get back multiple recordsets (depends on the queries sent)
* Use mustache in your SQL queries including msg, flow and global context. e.g...
  * `SELECT TOP {{{payload.maxRows}}} * FROM [MyTable] WHERE Name = '{{{flow.name}}}' AND quantity >= {{{global.minQty}}}`
  * Access the mustache rendered query in `msg.query` for understanding what happened to your {{{mustache}}} parameters 
* Chose between throwing an error to the catch node or outputting an error property in the output msg.
* Additional properties are in the msg object (use a debug node with "complete msg object" set to see whats available)

## Install

### Easiest

Use the Manage Palette > Install option from the menu inside node-red

### Harder

Alternatively in your Node-RED user directory, typically ~/.node-red, run

```bash
npm install node-red-contrib-mssql-plus
```

## Usage
Please refer to the built in help in the info panel in node red.

## Sample flow
* Payload: `{"count": 5, "name": "node-red"}`
* Query:   `SELECT TOP {{{payload.count}}} * FROM [MyTable] WHERE Name = '{{{payload.name}}}'`
* After Mustache: `SELECT TOP 5 * FROM [MyTable] WHERE Name = 'node-red'`

``` json
[{"id":"f88d9f9b.3eb73","type":"inject","z":"67f9c467.38728c","name":"{\"count\": 5, \"name\": \"node-red\"}","topic":"","payload":"{\"count\": 5, \"name\": \"node-red\"}","payloadType":"json","repeat":"","crontab":"","once":false,"onceDelay":0.1,"x":890,"y":60,"wires":[["d319638f.9af67"]]},{"id":"8a8fc63a.68d858","type":"debug","z":"67f9c467.38728c","name":"","active":true,"tosidebar":true,"console":false,"tostatus":false,"complete":"true","targetType":"full","x":1230,"y":60,"wires":[]},{"id":"d319638f.9af67","type":"MSSQL","z":"67f9c467.38728c","mssqlCN":"eb9034f1.ea68f8","name":"SQL2012","query":"SELECT TOP {{{payload.count}}} * \nFROM [MyTable] WHERE Name = '{{{payload.name}}}'","outField":"payload","returnType":"0","throwErrors":"0","x":1100,"y":60,"wires":[["8a8fc63a.68d858"]]},{"id":"eb9034f1.ea68f8","type":"MSSQL-CN","z":"","tdsVersion":"7_4","name":"","server":"localhost","port":"1433","encyption":true,"database":"MyDB","useUTC":true,"connectTimeout":"4000","requestTimeout":"5000","cancelTimeout":"5000","pool":"5"}]
```

## Screen shot
![image](https://user-images.githubusercontent.com/44235289/61793815-c68b2780-ae17-11e9-8112-26767fe7a208.png)

## Other

This node based on [node-red-contrib-mssql](https://github.com/redconnect-io/node-red-contrib-mssql).

Thanks to [Redconnect.io](http://www.redconnect.io).
