module.exports = function (RED) {
    'use strict';
    var mustache = require('mustache');
    const sql = require('mssql');

    function connection(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        //add mustache transformation to connection object
        var configStr = JSON.stringify(config)
        var transform = mustache.render(configStr, process.env);
        config = JSON.parse(transform);

        node.config = {
            user: node.credentials.username,
            password: node.credentials.password,
            domain: node.credentials.domain,
            server: config.server,
            database: config.database,
            options: {
                port: config.port,
                tdsVersion: config.tdsVersion,
                encrypt: config.encyption,
                useUTC: config.useUTC,
                connectTimeout: config.connectTimeout ? parseInt(config.connectTimeout) : undefined,
                requestTimeout: config.requestTimeout ? parseInt(config.requestTimeout) : undefined,
                cancelTimeout: config.cancelTimeout ? parseInt(config.cancelTimeout) : undefined
            },
            pool: {
                max: parseInt(config.pool),
                min: 0,
                idleTimeoutMillis: 3000
            }
        };

        node.connectedNodes = [];
        node.connect = function(){
            if(node.pool)
                return;
            node.pool = new sql.ConnectionPool(node.config).connect()
            .then(_ => { 
                return _ 
            }).catch(e => {
                node.log(`Error connecting to MSSQL:- server : ${node.config.server}, database : ${node.config.database}, port : ${node.config.options.port}, user : ${node.config.user}`);
                node.error(e);
                node.pool = null;
            });
        }
        node.execSql = function(sql, callback) {
            node.connect();
            node.pool.then(_ => {
                return _.request().query(sql)
            }).then(result => {
                callback(null,result) 
            }).catch(e => { 
                callback(e) 
                node.pool = null;
            })
        };
        node.disconnect = function (nodeId) {
            let index = node.connectedNodes.indexOf(nodeId);
            if (index >= 0) {
                node.connectedNodes.splice(index, 1);
            }
            if (node.connectedNodes.length === 0) {
                if (node.pool) {
                    node.log(`Disconnecting MSSQL:- server : ${node.config.server}, database : ${node.config.database}, port : ${node.config.options.port}, user : ${node.config.server}`);
                    node.pool.then(_ => _.close()).catch(e => console.error(e));
                }
                node.pool = null;
            }
        }
    }

    RED.nodes.registerType('MSSQL-CN', connection, {
        credentials: {
            username: {
                type: 'text'
            },
            password: {
                type: 'password'
            },
            domain: {
                type: 'text'
            }
        }
    });

    function mssql(config) {
        RED.nodes.createNode(this, config);
        var mssqlCN = RED.nodes.getNode(config.mssqlCN);
        var node = this;

        node.query = config.query;
        node.outField = config.outField;
        node.returnType = config.returnType;
        node.throwErrors = !config.throwErrors || config.throwErrors == "0" ? false : true;

        var setResult = function (msg, field, value, returnType = 0 ) {
            const set = (obj, path, val) => { 
                const keys = path.split('.');
                const lastKey = keys.pop();
                const lastObj = keys.reduce((obj, key) => 
                    obj[key] = obj[key] || {}, 
                    obj); 
                lastObj[lastKey] = val;
            }
            set(msg, field, returnType == 1 ? value : value.recordset);
        };

        node.processError = function(err,msg){
            let errMsg = "Error";
            if(typeof err == "string"){
                errMsg = err;
            } else if(err && err.message) {
                errMsg = err.message;
            }
            
            node.status({
                fill: 'red',
                shape: 'ring',
                text: errMsg
            });

            if(node.throwErrors){
                node.error(err,msg);
            } else {
                msg.error = err; 
                node.send(msg);
            }
        }    

        node.on('input', function (msg) {
            //clear node status
            node.status({}); 

            //put query into msg object so user can inspect how mustache rendered it
            msg.query = mustache.render(node.query, msg);

            if (!msg.query || (msg.query === '')) {
                msg.query = msg.payload;
            }

            node.status({
                fill: 'blue',
                shape: 'dot',
                text: 'requesting'
            });

            try {

                mssqlCN.execSql(msg.query, function (err, data) {
                    if (err) {
                        node.processError(err,msg)
                    } else {
                        node.status({
                            fill: 'green',
                            shape: 'dot',
                            text: 'done'
                        });
                        setResult(msg, node.outField, data, node.returnType);
                        node.send(msg);
                    }
                });
            } catch (err) {
                node.processError(err,msg)
            }
        });

        node.on('close', function () {
            mssqlCN.disconnect(node.id);
        });
    }
    RED.nodes.registerType('MSSQL', mssql);
};
