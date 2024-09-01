/* global describe,beforeEach,afterEach,it */
const should = require('should')
const helper = require('node-red-node-test-helper')
const mssqlPlusNode = require('../src/mssql.js')

helper.init(require.resolve('node-red'))

let testConnectionConfig
try {
    testConnectionConfig = require('../test/config.json') || {}
} catch (error) {
    testConnectionConfig = {}
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
        enableArithAbort: true,
        readOnlyIntent: false
    }
    const configNode = Object.assign({}, defConf, options)
    configNode.id = id || configNode.id
    return configNode
}

describe('Load MSSQL Plus Node', function () {
    'use strict'

    beforeEach(function (done) {
        helper.startServer(done)
    })

    afterEach(function (done) {
        helper.unload().then(function () {
            helper.stopServer(done)
        })
    })

    it('should be loaded', function (done) {
        const cn = getConfigNode('configNode', testConnectionConfig)
        const flow = [
            cn,
            { id: 'helperNode', type: 'helper' },
            { id: 'sqlNode', type: 'MSSQL', name: 'mssql', mssqlCN: cn.id, wires: [['helperNode']] }
        ]

        helper.load(mssqlPlusNode, flow, function () {
            const helperNode = helper.getNode('helperNode')
            const sqlNode = helper.getNode('sqlNode')
            const configNode = helper.getNode('configNode')
            try {
                should(helperNode).not.be.undefined()
                should(sqlNode).not.be.undefined()
                should(configNode).not.be.undefined()

                sqlNode.should.have.property('type', 'MSSQL')
                // ensure defaults are sane
                sqlNode.should.have.property('modeOpt').and.be.undefined()
                sqlNode.should.have.property('modeOptType', 'query')
                sqlNode.should.have.property('outField', 'payload') // compatibility with original node
                sqlNode.should.have.property('params').and.be.undefined()
                sqlNode.should.have.property('paramsOpt').and.be.undefined()
                sqlNode.should.have.property('paramsOptType', 'none')
                sqlNode.should.have.property('parseMustache', true) // compatibility with original node
                sqlNode.should.have.property('query').and.be.undefined()
                sqlNode.should.have.property('queryMode').and.be.undefined()
                sqlNode.should.have.property('queryOpt').and.be.undefined()
                sqlNode.should.have.property('queryOptType', 'editor') // compatibility with original node
                sqlNode.should.have.property('returnType').and.be.undefined()
                sqlNode.should.have.property('throwErrors', false) // compatibility with original node
                sqlNode.should.have.property('rows', 'rows')
                sqlNode.should.have.property('rowsType', 'msg')

                configNode.should.have.property('type', 'MSSQL-CN')
                configNode.should.have.property('config')
                configNode.should.have.property('pool')

                done()
            } catch (error) {
                done(error)
            }
        })
    })

    // Dynamic Tests
    // TODO: expose internal functionality (like row/column creation, coerceType helper functions to permit testing)
    it('should connect to database when topic and payload are set', function (done) {
        this.timeout((testConnectionConfig.connectTimeout || 5000) + 2000) // timeout with an error if done() isn't called within allotted time

        const cn = getConfigNode('configNode', testConnectionConfig)
        // flow that contains a status and catch node
        const flow = [
            cn,
            { id: 'helperNode', type: 'helper' },
            { id: 'sqlNode', type: 'MSSQL', name: 'mssql', mssqlCN: cn.id, wires: [['helperNode']] },
            { id: 'catchNode', type: 'catch', name: 'catch', scope: ['sqlNode'], wires: [['helperNodeCatch']] },
            { id: 'helperNodeCatch', type: 'helper' },
            { id: 'completeNode', type: 'complete', name: '', scope: ['sqlNode'], uncaught: false, wires: [['helperNodeComplete']] },
            { id: 'helperNodeComplete', type: 'helper' }
        ]

        helper.load(mssqlPlusNode, flow, function () {
            const helperNode = helper.getNode('helperNode')
            const helperNodeCatch = helper.getNode('helperNodeCatch')
            const helperNodeComplete = helper.getNode('helperNodeComplete')
            const sqlNode = helper.getNode('sqlNode')
            const configNode = helper.getNode('configNode')

            configNode.config.user = testConnectionConfig.username
            configNode.config.password = testConnectionConfig.password

            helperNodeComplete.on('input', function (msg) {
                try {
                    msg.should.have.property('topic', 'command')
                    msg.should.have.property('payload', 'connect')
                    msg.should.not.have.property('error')
                    done()
                } catch (error) {
                    done(error)
                }
            })
            helperNodeCatch.on('input', function (msg) {
                done(new Error('did not expect the mssql node to throw an error'))
            })
            helperNode.on('input', function (msg) {
                done(new Error('did not expect the mssql node to output a message'))
            })
            sqlNode.receive({ topic: 'command', payload: 'connect' }) // fire input of testNode
        })
    })

    it('should disconnect from database when topic and payload are set', function (done) {
        this.timeout((testConnectionConfig.connectTimeout || 5000) + 2000) // timeout with an error if done() isn't called within allotted time

        const cn = getConfigNode('configNode', testConnectionConfig)
        // flow that contains a status and catch node
        const flow = [
            cn,
            { id: 'helperNode', type: 'helper' },
            { id: 'sqlNode', type: 'MSSQL', name: 'mssql', mssqlCN: cn.id, wires: [['helperNode']] },
            { id: 'catchNode', type: 'catch', name: 'catch', scope: ['sqlNode'], wires: [['helperNodeCatch']] },
            { id: 'helperNodeCatch', type: 'helper' },
            { id: 'completeNode', type: 'complete', name: '', scope: ['sqlNode'], uncaught: false, wires: [['helperNodeComplete']] },
            { id: 'helperNodeComplete', type: 'helper' }
        ]

        helper.load(mssqlPlusNode, flow, async function () {
            const helperNode = helper.getNode('helperNode')
            const helperNodeCatch = helper.getNode('helperNodeCatch')
            const helperNodeComplete = helper.getNode('helperNodeComplete')
            const sqlNode = helper.getNode('sqlNode')
            const configNode = helper.getNode('configNode')

            configNode.config.user = testConnectionConfig.username
            configNode.config.password = testConnectionConfig.password
            // set connection timeout to 0.9 seconds
            configNode.config.connectTimeout = '900'

            sqlNode.receive({ topic: 'command', payload: 'connect' }) // connect to db

            // wait for the connection to be established
            await new Promise((resolve) => {
                setTimeout(() => {
                    resolve()
                }, 1500)
            })

            // check isConnected status
            const isConnected = configNode.isConnected()
            should(isConnected).be.true('expected connection to be established')

            // now hook up events and call disconnect
            helperNodeComplete.on('input', function (msg) {
                try {
                    msg.should.have.property('topic', 'command')
                    msg.should.have.property('payload', 'disconnect')
                    msg.should.not.have.property('error')
                    done()
                } catch (error) {
                    done(error)
                }
            })
            helperNodeCatch.on('input', function (msg) {
                done(new Error('did not expect the mssql node to throw an error'))
            })
            helperNode.on('input', function (msg) {
                done(new Error('did not expect the mssql node to output a message'))
            })
            sqlNode.receive({ topic: 'command', payload: 'disconnect' }) // fire input of testNode
        })
    })

    it('should perform a simple query', function (done) {
        this.timeout((testConnectionConfig.requestTimeout || 5000) + 1000) // timeout with an error if done() isn't called within allotted time

        const cn = getConfigNode('configNode', testConnectionConfig)
        const flow = [
            cn,
            { id: 'helperNode', type: 'helper' },
            { id: 'sqlNode', type: 'MSSQL', name: 'mssql', mssqlCN: cn.id, wires: [['helperNode']] }
        ]

        helper.load(mssqlPlusNode, flow, function () {
            const query = 'SELECT GETDATE() as now'
            const helperNode = helper.getNode('helperNode')
            const sqlNode = helper.getNode('sqlNode')
            const configNode = helper.getNode('configNode')

            configNode.config.user = testConnectionConfig.username
            configNode.config.password = testConnectionConfig.password

            configNode.should.have.property('id', 'configNode')
            helperNode.on('input', function (msg) {
                try {
                    msg.should.have.property('query', query)
                    msg.should.have.property('payload')
                    should(Array.isArray(msg.payload)).be.true('payload must be an array')
                    should(msg.payload.length).eql(1, 'payload array must have 1 element')
                    msg.payload[0].should.have.property('now')
                    should(msg.payload[0].now).not.be.undefined()
                    msg.should.not.have.property('error')
                    done()
                } catch (error) {
                    done(error)
                }
            })

            sqlNode.receive({ payload: query }) // fire input of testNode
        })
    })

    it('should return data to specified property', function (done) {
        this.timeout((testConnectionConfig.requestTimeout || 5000) + 1000) // timeout with an error if done() isn't called within allotted time

        const cn = getConfigNode('configNode', testConnectionConfig)
        const flow = [
            cn,
            { id: 'helperNode', type: 'helper' },
            { id: 'sqlNode', type: 'MSSQL', name: 'mssql', mssqlCN: cn.id, outField: 'custom_output', wires: [['helperNode']] }
        ]

        helper.load(mssqlPlusNode, flow, function () {
            const query = 'SELECT GETDATE() as now'
            const helperNode = helper.getNode('helperNode')
            const sqlNode = helper.getNode('sqlNode')
            const configNode = helper.getNode('configNode')

            configNode.config.user = testConnectionConfig.username
            configNode.config.password = testConnectionConfig.password

            configNode.should.have.property('id', 'configNode')
            helperNode.on('input', function (msg) {
                try {
                    msg.should.have.property('query', query)
                    msg.should.have.property('custom_output')
                    should(Array.isArray(msg.custom_output)).be.true('custom_output must be an array')
                    should(msg.custom_output.length).eql(1, 'custom_output array must have 1 element')
                    msg.custom_output[0].should.have.property('now')
                    should(msg.custom_output[0].now).not.be.undefined()
                    msg.should.not.have.property('error')
                    done()
                } catch (error) {
                    done(error)
                }
            })

            sqlNode.receive({ payload: query }) // fire input of testNode
        })
    })

    it('should perform a simple using ui configured query with mustache', function (done) {
        this.timeout((testConnectionConfig.requestTimeout || 5000) + 1000) // timeout with an error if done() isn't called within allotted time
        const cn = getConfigNode('configNode', testConnectionConfig)
        const flow = [
            cn,
            { id: 'helperNode', type: 'helper' },
            { id: 'sqlNode', type: 'MSSQL', mssqlCN: cn.id, name: '', outField: 'payload', throwErrors: '1', query: "SELECT GETDATE() as now, {{payload.number}} as anum, '{{payload.string}}' as astr\r\n", modeOpt: 'queryMode', modeOptType: 'query', queryOpt: 'payload', queryOptType: 'editor', paramsOpt: 'queryParams', paramsOptType: 'none', rows: 'rows', rowsType: 'msg', parseMustache: true, params: [], wires: [['helperNode']] }
        ]

        helper.load(mssqlPlusNode, flow, function () {
            const helperNode = helper.getNode('helperNode')
            const sqlNode = helper.getNode('sqlNode')
            const configNode = helper.getNode('configNode')

            configNode.config.user = testConnectionConfig.username
            configNode.config.password = testConnectionConfig.password

            configNode.should.have.property('id', 'configNode')
            helperNode.on('input', function (msg) {
                try {
                    msg.should.have.property('query').and.be.a.String()
                    msg.should.have.property('payload')
                    should(Array.isArray(msg.payload)).be.true('payload must be an array')
                    should(msg.payload.length).eql(1, 'payload array must have 1 element')
                    msg.payload[0].should.have.property('now')
                    should(msg.payload[0].now).not.be.undefined()
                    msg.payload[0].should.have.property('anum', 42)
                    msg.payload[0].should.have.property('astr', 'hello')
                    done()
                } catch (error) {
                    done(error)
                }
            })

            sqlNode.receive({
                payload: {
                    number: 42,
                    string: 'hello'
                }
            }) // fire input of testNode
        })
    })

    it('should can create table and insert/select data', function (done) {
        const cn = getConfigNode('configNode', testConnectionConfig)

        const flow = [
            cn,
            { id: 'helperNode', type: 'helper' },
            { id: 'sqlNode', type: 'MSSQL', name: 'mssql', mssqlCN: cn.id, wires: [['helperNode']] }
        ]

        helper.load(mssqlPlusNode, flow, function () {
            const query = "create table #t (id int PRIMARY KEY, data varchar(20)); insert into #t (id, data) values(1, 'a'); insert into #t (id, data) values(2, 'b'); select * from #t;"
            const helperNode = helper.getNode('helperNode')
            const sqlNode = helper.getNode('sqlNode')
            const configNode = helper.getNode('configNode')

            configNode.config.user = testConnectionConfig.username
            configNode.config.password = testConnectionConfig.password

            configNode.should.have.property('id', 'configNode')

            helperNode.on('input', function (msg) {
                try {
                    msg.should.have.property('query', query)
                    msg.should.have.property('payload')
                    should(Array.isArray(msg.payload)).be.true('payload must be an array')
                    should(msg.payload.length).eql(2, 'payload array must have 2 element')
                    msg.payload[0].should.have.property('id')
                    msg.payload[0].should.have.property('data')
                    should(msg.payload[0].id).not.be.undefined()
                    done()
                } catch (error) {
                    done(error)
                }
            })

            sqlNode.receive({ payload: query }) // fire input of testNode
        })
    })
})
