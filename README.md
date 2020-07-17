# node-red-contrib-mssql-plus

A [Node-RED](http://nodered.org) node for connecting to Microsoft MS SQL Databases.

Importantly, this package comes with pre-built linux drivers for communicating with the Azure & MS SQL services (using TDS protocol), removing the need to set-up environment level MSSQL (or similar) drivers.

## Features include...
* Connect to multiple SQL Servers from SQL2000 ~ 2019
* Perform multiple queries in one go & get back multiple recordsets (depends on the queries sent)
* Supports stored procedures
* Use env vars in the config node for all fields (including credentials). e.g...
  * Server `{{{SQL_IP}}}`
  * Password `{{{SQL_PW}}}`
* Use mustache in your SQL queries including msg, flow and global context. e.g...
  * `SELECT TOP {{{payload.maxRows}}} * FROM [MyTable] WHERE Name = '{{{flow.name}}}' AND quantity <= {{{global.maxQty}}}`
  * View the final query (mustache rendered into values) in `msg.query` to understanding what happened to your {{{mustache}}} parameters 
* Enter parameters in the UI or send parameters in via `msg.sqlParams` for use in your SQL queries e.g...
  * `SELECT * FROM [MyTable] WHERE Name = @name AND quantity <= @maxQty`
  * View the final parameters (rendered with final values) in `msg.sqlParams` that were used in the query to aid debugging 
  * View output parameters values in `msg.sqlParams` after the query has executed 
* Choose between throwing an error to the catch node or outputting an error property in `msg.error`
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
Demonstrating mustache rendering, input parameters, mutliple queries, print info... 
* Payload: `{"count": 5, "age": 35}`
* Parameters
  * `name`, `varchar(20)`, `stephen`
  * `age`, `int`, `msg.payload.age`
* Query:   
```
      PRINT @name
      SELECT TOP {{{payload.count}}} * 
      FROM testdb.dbo.[MyTable] WHERE Name = @name
      SELECT TOP {{{payload.count}}} * 
      FROM testdb.dbo.[MyTable] WHERE Age = @age
      PRINT 'complete'
```
* After Rendering Mustache: 
```
      PRINT @name
      SELECT TOP 5 * 
      FROM testdb.dbo.[MyTable] WHERE Name = @name
      SELECT TOP 5 * 
      FROM testdb.dbo.[MyTable] WHERE Age = @age
      PRINT 'complete'
```

flow...
``` json
[{"id":"61625aaf.479d84","type":"inject","z":"595a5dd5.a963a4","name":"{\"count\": 5, \"age\": 35}","topic":"","payload":"{\"count\": 5, \"age\": 35}","payloadType":"json","repeat":"","crontab":"","once":false,"onceDelay":0.1,"x":400,"y":320,"wires":[["6e09980a.127878"]]},{"id":"babb6d0.5ae7e9","type":"debug","z":"595a5dd5.a963a4","name":"","active":true,"tosidebar":true,"console":false,"tostatus":false,"complete":"true","targetType":"full","x":450,"y":440,"wires":[]},{"id":"6e09980a.127878","type":"MSSQL","z":"595a5dd5.a963a4","mssqlCN":"a51e405c.10f64","name":"","query":"PRINT @name\n\nSELECT TOP {{{payload.count}}} * \nFROM testdb.dbo.[MyTable] WHERE Name = @name\n\nSELECT TOP {{{payload.count}}} * \nFROM testdb.dbo.[MyTable] WHERE Age = @age\n\nPRINT 'complete'","outField":"payload","returnType":"1","throwErrors":"0","params":[{"output":false,"name":"name","type":"VarChar(20)","valueType":"str","value":"stephen"},{"output":false,"name":"age","type":"int","valueType":"msg","value":"payload.age"}],"x":440,"y":380,"wires":[["babb6d0.5ae7e9"]]},{"id":"a51e405c.10f64","type":"MSSQL-CN","z":"","tdsVersion":"7_4","name":"Local SQL","server":"192.168.1.38","port":"1433","encyption":false,"database":"","useUTC":false,"connectTimeout":"15000","requestTimeout":"15000","cancelTimeout":"5000","pool":"5","parseJSON":false}]
```

## Screen shot
![image](https://user-images.githubusercontent.com/44235289/87775292-c43a8e00-c81d-11ea-8329-d7d7385c37d6.png)

## Other

This node based on [node-red-contrib-mssql](https://github.com/redconnect-io/node-red-contrib-mssql).

Thanks to [Redconnect.io](http://www.redconnect.io).
