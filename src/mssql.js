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
                port: config.port ? parseInt(config.port) : undefined,
                tdsVersion: config.tdsVersion,
                encrypt: config.encyption,
                useUTC: config.useUTC,
                connectTimeout: config.connectTimeout ? parseInt(config.connectTimeout) : undefined,
                requestTimeout: config.requestTimeout ? parseInt(config.requestTimeout) : undefined,
                cancelTimeout: config.cancelTimeout ? parseInt(config.cancelTimeout) : undefined,
                camelCaseColumns: config.camelCaseColumns == "true" ? true : undefined,
            },
            pool: {
                max: parseInt(config.pool),
                min: 0,
                idleTimeoutMillis: 3000,
                //log: (message, logLevel) => console.log(`POOL: [${logLevel}] ${message}`)
            }
        };

        //config options seem to differ between pool and tedious connection
        //so for compatibility I just repeat the ones that differ so they get picked up in _poolCreate ()
        node.config.port = node.config.options.port;
        node.config.connectionTimeout = node.config.options.connectTimeout;
        node.config.requestTimeout = node.config.options.requestTimeout;
        node.config.cancelTimeout = node.config.options.cancelTimeout;
        node.config.encrypt = node.config.options.encrypt;

        node.connectedNodes = [];   

        node.connectionCleanup = function() {
            try {
                node.log(`Disconnecting server : ${node.config.server}, database : ${node.config.database}, port : ${node.config.options.port}, user : ${node.config.server}`);
                node.pool.then(_ => _.close()).catch(e => { console.error(e); });
            }
            catch (error) {
            }
            try {
                node.connectionPool.close();
            }
            catch (error) {
            }
            node.pool = null;
        }

        node.connectionPool = new sql.ConnectionPool(node.config)
        node.connectionPool.on('error', err => {
            node.error(err);
            node.connectionCleanup(node);
        }) 

        node.connect = function(){
            if(node.pool){
                return;
            }
            node.pool = node.connectionPool.connect()
            .then(_ => { 
                node.log(`Connected to server : ${node.config.server}, database : ${node.config.database}, port : ${node.config.options.port}, user : ${node.config.user}`);
                return _ 
            }).catch(e => {
                node.log(`Error connecting to server : ${node.config.server}, database : ${node.config.database}, port : ${node.config.options.port}, user : ${node.config.user}`);
                throw e;
            });
        }

        node.execSql = function(sql, callback) {
            node.connect();
            node.pool.then(_ => {
                return _.request().query(sql);
            }).then(result => {
                callback(null,result) 
            }).catch(e => { 
                callback(e) 
                //node.pool = null;
            })
        };
        node.disconnect = function (nodeId) {
            let index = node.connectedNodes.indexOf(nodeId);
            if (index >= 0) {
                node.connectedNodes.splice(index, 1);
            }
            if (node.connectedNodes.length === 0) {
                node.connectionCleanup();
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
                msg.error = err;
            } else if(err && err.message) {
                errMsg = err.message;
                //Make an error object from the err.  NOTE: We cant just assign err to msg.error as a promise 
                //rejection occurs when the node has 2 wires on the output. 
                //(redUtil.cloneMessage(m) causes error "node-red Cannot assign to read only property 'originalError'")
                msg.error = {
                    class: err.class,
                    code: err.code, 
                    lineNumber: err.lineNumber, 
                    message: err.message, 
                    name: err.name, 
                    number: err.number, 
                    procName: err.procName, 
                    serverName: err.serverName, 
                    state: err.state, 
                    toString: function(){
                        return this.message;
                    }
                }
            }
            
            node.status({
                fill: 'red',
                shape: 'ring',
                text: errMsg
            });

            if(node.throwErrors){
                node.error(msg.error,msg);
            } else {
                node.log(err);
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
