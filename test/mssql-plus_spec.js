/* global describe,beforeEach,afterEach,it */
const should = require('should');
const helper = require('node-red-node-test-helper');
const mssqlPlusNode = require('../src/mssql.js');

let testConnectionConfig;
try {
    testConnectionConfig = require('../test/config.json') || {};
} catch (error) {
    testConnectionConfig = {};
}

function getConfigNode (id, options) {
    const defConf = {
        id: 'configNode',
        type: 'MSSQL-CN',
        tdsVersion: '7_4',
        name: 'MS SQL Server connection',
        server: '127.0.0.1',
        port: '1433',
        encyption: false,
        trustServerCertificate: true,
        database: 'testdb',
        useUTC: true,
        connectTimeout: '15000',
        requestTimeout: '15000',
        cancelTimeout: '5000',
        pool: '5',
        parseJSON: false,
        enableArithAbort: true
    };
    const configNode = Object.assign({}, defConf, options);
    configNode.id = id || configNode.id;
    return configNode;
}

describe('Load MSSQL Plus Node', function () {
    'use strict';

    beforeEach(function (done) {
        helper.startServer(done);
    });

    afterEach(function (done) {
        helper.unload().then(function () {
            helper.stopServer(done);
        });
    });

    it('should be loaded', function (done) {
        const cn = getConfigNode('configNode', testConnectionConfig);
        const flow = [
            cn,
            { id: 'helperNode', type: 'helper' },
            { id: 'sqlNode', type: 'MSSQL', name: 'mssql', mssqlCN: cn.id, wires: [['helperNode']] }
        ];

        helper.load(mssqlPlusNode, flow, function () {
            const helperNode = helper.getNode('helperNode');
            const sqlNode = helper.getNode('sqlNode');
            const configNode = helper.getNode('configNode');

            should(helperNode).not.be.undefined();
            should(sqlNode).not.be.undefined();
            should(configNode).not.be.undefined();

            sqlNode.should.have.property('type', 'MSSQL');
            sqlNode.should.have.property('modeOptType', 'query');

            configNode.should.have.property('config');
            configNode.should.have.property('pool');
            configNode.should.have.property('type', 'MSSQL-CN');

            done();
        });
    });

    // Dynamic Tests
    // TODO: expose internal functionality (like row/column creation, coerceType helper functions to permit testing)
    it('should perform a simple query', function (done) {
        this.timeout((testConnectionConfig.requestTimeout || 5000) + 1000); // timeout with an error if done() isn't called within alloted time

        const cn = getConfigNode('configNode', testConnectionConfig);
        const flow = [
            cn,
            { id: 'helperNode', type: 'helper' },
            { id: 'sqlNode', type: 'MSSQL', name: 'mssql', mssqlCN: cn.id, wires: [['helperNode']] }
        ];

        helper.load(mssqlPlusNode, flow, function () {
            const query = 'SELECT GETDATE() as now';
            const helperNode = helper.getNode('helperNode');
            const sqlNode = helper.getNode('sqlNode');
            const configNode = helper.getNode('configNode');

            configNode.config.user = testConnectionConfig.username;
            configNode.config.password = testConnectionConfig.password;
            configNode.pool.config.user = testConnectionConfig.username;
            configNode.pool.config.password = testConnectionConfig.password;

            configNode.should.have.property('id', 'configNode');
            helperNode.on('input', function (msg) {
                try {
                    msg.should.have.property('query', query);
                    msg.should.have.property('payload');
                    should(Array.isArray(msg.payload)).be.true('payload must be an array');
                    should(msg.payload.length).eql(1, 'payload array must have 1 element');
                    msg.payload[0].should.have.property('now');
                    should(msg.payload[0].now).not.be.undefined();
                    done();
                } catch (error) {
                    done(error);
                }
            });

            sqlNode.receive({ payload: query }); // fire input of testNode
        });
    });
});
