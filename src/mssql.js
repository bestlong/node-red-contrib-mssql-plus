module.exports = function (RED) {
    'use strict';
    var mustache = require('mustache');
    var sql = require('mssql');

    function connection(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        
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

        //add mustache transformation to connection object
        var configStr = JSON.stringify(this.config)
        var transform = mustache.render(configStr, process.env);
        this.config = JSON.parse(transform);
        
        this.connectedNodes = [];

        this.connect = function (nodeId) {
            if (node.connectedNodes.indexOf(nodeId) < 0) {
                node.connectedNodes.push(nodeId);
            }
            if (!node.connection) {
                if (!node.connectPromise) {
                    node.connectPromise = sql.connect(node.config).then(function () {
                        node.log('Connected to SQL database');
                        node.connection = sql;
                    }).catch(function (error) {
                        node.connectPromise = null;
                        throw (error);
                    });
                }
                return node.connectPromise;
            } else {
                return Promise.resolve();
            }
        }

        this.disconnect = function (nodeId) {
            let index = node.connectedNodes.indexOf(nodeId);
            if (index >= 0) {
                node.connectedNodes.splice(index, 1);
            }
            if (node.connectedNodes.length === 0) {
                node.connectPromise = null;
                if (node.connection) {
                    node.log("Disconnecting SQL connection");
                    node.connection.close();
                    node.connection = null;
                }
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
        this.query = config.query;
        this.outField = config.outField;

        var node = this;
        var b = node.outField.split('.');
        var i = 0;
        var r = null;
        var m = null;
        var rec = function (obj) {
            i += 1;
            if ((i < b.length) && (typeof obj[b[i - 1]] === 'object')) {
                rec(obj[b[i - 1]]); // not there yet - carry on digging
            } else {
                if (i === b.length) { // we've finished so assign the value
                    obj[b[i - 1]] = r;
                    node.send(m);
                    node.status({});
                } else {
                    obj[b[i - 1]] = {}; // needs to be a new object so create it
                    rec(obj[b[i - 1]]); // and carry on digging
                }
            }
        };

        node.on('input', function (msg) {
            mssqlCN.connect(node.id).then(() => {
                node.status({
                    fill: 'blue',
                    shape: 'dot',
                    text: 'requesting'
                });

                var query = mustache.render(node.query, msg);

                if (!query || (query === '')) {
                    query = msg.payload;
                }

                var request = new mssqlCN.connection.Request();
                request.query(query).then(function (rows) {
                    i = 0;
                    r = rows;
                    m = msg;
                    rec(msg);
                }).catch(function (error) {
                    node.error(error);
                    node.status({
                        fill: 'red',
                        shape: 'ring',
                        text: 'Error'
                    });
                    msg.error = error;
                    node.send(msg);
                });
            }).catch(function (error) {
                node.error(error);
                node.status({
                    fill: 'red',
                    shape: 'ring',
                    text: 'Error'
                });
                msg.error = error;
                node.send(msg);
            });
        });

        node.on('close', function () {
            mssqlCN.disconnect(node.id);
        });
    }
    RED.nodes.registerType('MSSQL', mssql);
};
