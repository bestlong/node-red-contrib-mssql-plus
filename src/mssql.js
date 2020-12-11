module.exports = function (RED) {
    'use strict';
    var mustache = require('mustache');
    const sql = require('mssql');

    const UUID = (function(){
        const crypto = require('crypto');
        //isValid routine developed based on \tedious\lib\guid-parser.js
        //checking the guid in this node BEFORE calling pool.query() 
        //prevents an exception that I cannot catch in tedious
        const CHARCODEMAP = {};
        const hexDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f', 'A', 'B', 'C', 'D', 'E', 'F'].map(d => d.charCodeAt(0));
        for (let i = 0; i < hexDigits.length; i++) {
          const map = CHARCODEMAP[hexDigits[i]] = {};
          for (let j = 0; j < hexDigits.length; j++) {
            const hex = String.fromCharCode(hexDigits[i], hexDigits[j]);
            const value = parseInt(hex, 16);
            map[hexDigits[j]] = value;
          }
        }
        return {
            /**
             * Tests a string to ensude it is a valid RFC4122 UUID. 
             * @param {string} guid  
             * @returns {boolean} true if valid
             */
            isValid: function (guid) {
                try {
                    return Array.isArray( [CHARCODEMAP[guid.charCodeAt(6)][guid.charCodeAt(7)], CHARCODEMAP[guid.charCodeAt(4)][guid.charCodeAt(5)], CHARCODEMAP[guid.charCodeAt(2)][guid.charCodeAt(3)], CHARCODEMAP[guid.charCodeAt(0)][guid.charCodeAt(1)], CHARCODEMAP[guid.charCodeAt(11)][guid.charCodeAt(12)], CHARCODEMAP[guid.charCodeAt(9)][guid.charCodeAt(10)], CHARCODEMAP[guid.charCodeAt(16)][guid.charCodeAt(17)], CHARCODEMAP[guid.charCodeAt(14)][guid.charCodeAt(15)], CHARCODEMAP[guid.charCodeAt(19)][guid.charCodeAt(20)], CHARCODEMAP[guid.charCodeAt(21)][guid.charCodeAt(22)], CHARCODEMAP[guid.charCodeAt(24)][guid.charCodeAt(25)], CHARCODEMAP[guid.charCodeAt(26)][guid.charCodeAt(27)], CHARCODEMAP[guid.charCodeAt(28)][guid.charCodeAt(29)], CHARCODEMAP[guid.charCodeAt(30)][guid.charCodeAt(31)], CHARCODEMAP[guid.charCodeAt(32)][guid.charCodeAt(33)], CHARCODEMAP[guid.charCodeAt(34)][guid.charCodeAt(35)]]);
                } catch (error) {
                    return false
                }
            },
            /**
             * Generates a V4 RFC4122 UUID.  
             * @returns {string} UUID
             */
            v4 : function() {
                var buf = crypto.randomBytes(32);
                var idx = 0;
                return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                    var r = buf[idx++]&0xf;
                    var v = c == 'x' ? r : (r&0x3|0x8);
                    return v.toString(16);
                });
            }      
        }
    })();
    
    
    /**
     * extractTokens - borrowed from @0node-red/nodes/core/core/80-template.js
     */
    function extractTokens(tokens, set) {
        set = set || new Set();
        tokens.forEach(function (token) {
            if (token[0] !== 'text') {
                set.add(token[1]);
                if (token.length > 4) {
                    extractTokens(token[4], set);
                }
            }
        });
        return set;
    }

    const sqlParamTypes = {
        "varchar": { params: [], sqlType: "VarChar" },
        "varchar(?)": { params: ["n"], sqlType: "VarChar" },
        "nvarchar": { params: [], sqlType: "NVarChar" },
        "nvarchar(?)": { params: ["n"], sqlType: "NVarChar" },
        "text": { params: [], sqlType: "Text" },
        "int": { params: [], sqlType: "Int" },
        "bigint": { params: [], sqlType: "BigInt" },
        "tinyint": { params: [], sqlType: "TinyInt" },
        "smallint": { params: [], sqlType: "SmallInt" },
        "bit": { params: [], sqlType: "Bit" },
        "float": { params: [], sqlType: "Float" },
        "numeric": { params: [], sqlType: "Numeric" },
        "numeric(?,?)": { params: ["n","n"], sqlType: "Numeric" },
        "decimal": { params: [], sqlType: "Decimal" },
        "decimal(?,?)": { params: ["n","n"], sqlType: "Decimal" },
        "real": { params: [], sqlType: "Real" },
        "date": { params: [], sqlType: "Date" },
        "datetime": { params: [], sqlType: "DateTime" },
        "datetime2": { params: [], sqlType: "DateTime2" },
        "datetime2(?)": { params: ["n"], sqlType: "DateTime2" },
        "datetimeoffset": { params: [], sqlType: "DateTimeOffset" },
        "datetimeoffset(?)": { params: ["n"], sqlType: "DateTimeOffset" },
        "smalldatetime": { params: [], sqlType: "SmallDateTime" },
        "time": { params: [], sqlType: "Time" },
        "time(?)": { params: ["n"], sqlType: "Time" },
        "uniqueidentifier": { params: [], sqlType: "UniqueIdentifier" },
        "smallmoney": { params: [], sqlType: "SmallMoney" },
        "money": { params: [], sqlType: "Money" },
        "binary": { params: [], sqlType: "Binary" },
        "varbinary": { params: [], sqlType: "VarBinary" },
        "varbinary(?)": { params: ["n"], sqlType: "VarBinary" },
        "image": { params: [], sqlType: "Image" },
        "xml": { params: [], sqlType: "Xml" },
        "char": { params: [], sqlType: "Char" },
        "char(?)": { params: ["n"], sqlType: "Char" },
        "nchar": { params: [], sqlType: "NChar" },
        "nchar(?)": { params: ["n"], sqlType: "NChar" },
        "ntext": { params: [], sqlType: "NText" },
        "tvp": { params: [], sqlType: "TVP" },
        "tvp(?)": { params: ["p"], sqlType: "TVP" },
        "udt": { params: [], sqlType: "UDT" },
        "geography": { params: [], sqlType: "Geography" },
        "geometry": { params: [], sqlType: "Geometry" },
        "variant": { params: [], sqlType: "Variant" },
    };

    function coerceType(sqlType) {
        if(!sqlType) return null; //no type specified (infered)
        let st = sqlType.trim();
        let sl = st.toLowerCase();
        let bp = sl.indexOf("(");
        let typeName, typeParams = "", p, p2;
        if (bp > -1) { //has bracket?
            typeName = sl.slice(0, bp).trim();//get typename without params
            typeParams = "(?)"; //additional typename param for sqlParamTypes lookup
            let _params = st.slice(bp + 1, -1);//get params
            let hasComma = _params.indexOf(",") > 0; //more than one param?
            if(hasComma && (sl.includes("decimal") || sl.includes("numeric"))) {
                typeParams = "(?,?)"; //additional typename param for sqlParamTypes lookup
                let aparams = _params.split(","); 
                p = aparams[0];
                p2 = aparams[1];
            } else {
                p = _params;
            }
        } else {
            typeName = sl; //use lowercase type name for sqlParamTypes lookup
        }
        //lookup the desired type from sqlParamTypes
        let _type = sqlParamTypes[typeName+typeParams];
        if(_type) {
            let aparams = [];
            if(_type.params.length >= 1) {
                if(_type.params[0] === "n") {
                    aparams.push(parseInt(p));
                } else {
                    aparams.push(p);
                } 
            }
            if(_type.params.length >= 2) {
                if(_type.params[1] === "n") {
                    aparams.push(parseInt(p2));
                } else if(_type.params[0] === "n") {
                    aparams.push(p2);
                } 
            }
            if(aparams.length)
                return sql[_type.sqlType](...aparams);//e.g. sql.NChar(10)
            return sql[_type.sqlType]();//e.g. sql.NChar()

        }
        throw new Error(`Unable to determine the type or its properties from '${sqlType}'` );
    }

    /**
     * parseContext - borrowed from @0node-red/nodes/core/core/80-template.js
     */
    function parseContext(key) {
        var match = /^(flow|global)(\[(\w+)\])?\.(.+)/.exec(key);
        if (match) {
            var parts = {};
            parts.type = match[1];
            parts.store = (match[3] === '') ? "default" : match[3];
            parts.field = match[4];
            return parts;
        }
        return undefined;
    }

    /**
     * checks if `n` is a valid number.
     * @param {string | number} n 
     */
    function isNumber(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    }

    /**
     * Parse a string or number into an integer and return it.
     * If `n` cannot be parsed, `defaultValue` is returned instead.
     * @param {string | number} n 
     * @param {boolean} defaultValue - the value to return if `n` is not a valid number
     * @returns {integer} `n` parsed to an integer or `defaultValue` if `n` is invalid
     */
    function safeParseInt(n, defaultValue) {
        try {
            var x = parseInt(n);
            if (isNumber(x)) {
                return x;
            }
        } catch (error) {
            //do nothing
        }
        return defaultValue;
    }

    /**
     * NodeContext - borrowed from @0node-red/nodes/core/core/80-template.js
     */
    function NodeContext(msg, nodeContext, parent, escapeStrings, cachedContextTokens) {
        this.msgContext = new mustache.Context(msg, parent);
        this.nodeContext = nodeContext;
        this.escapeStrings = escapeStrings;
        this.cachedContextTokens = cachedContextTokens;
    }

    NodeContext.prototype = new mustache.Context();

    NodeContext.prototype.lookup = function (name) {
        // try message first:
        try {
            var value = this.msgContext.lookup(name);
            if (value !== undefined) {
                if (this.escapeStrings && typeof value === "string") {
                    value = value.replace(/\\/g, "\\\\");
                    value = value.replace(/\n/g, "\\n");
                    value = value.replace(/\t/g, "\\t");
                    value = value.replace(/\r/g, "\\r");
                    value = value.replace(/\f/g, "\\f");
                    value = value.replace(/[\b]/g, "\\b");
                }
                return value;
            }

            // try flow/global context:
            var context = parseContext(name);
            if (context) {
                var type = context.type;
                var store = context.store;
                var field = context.field;
                var target = this.nodeContext[type];
                if (target) {
                    return this.cachedContextTokens[name];
                }
            }
            return '';
        }
        catch (err) {
            throw err;
        }
    }

    NodeContext.prototype.push = function push(view) {
        return new NodeContext(view, this.nodeContext, this.msgContext, undefined, this.cachedContextTokens);
    };

    function connection(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        //add mustache transformation to connection object
        var configStr = JSON.stringify(config)
        var transform = mustache.render(configStr, process.env);
        config = JSON.parse(transform);

        //add mustache transformation to credentials object
        try {
            var credStr = JSON.stringify(node.credentials)
            var transform = mustache.render(credStr, process.env);
            node.credentials = JSON.parse(transform);
        } catch (error) {
            console.error(error);
        }


        node.config = {
            user: (node.credentials ? node.credentials.username : "") || "",
            password: (node.credentials ? node.credentials.password : "")  || "",
            domain: node.credentials ? node.credentials.domain : "",
            server: config.server,
            database: config.database,
            options: {
                port: config.port ? safeParseInt(config.port, 1433) : undefined,
                tdsVersion: config.tdsVersion || "7_4",
                encrypt: config.encyption,
                trustServerCertificate: (config.trustServerCertificate === "false" || config.trustServerCertificate === false) ? false : true, //defaults to true for backwards compatibility - TODO: Review this default.
                useUTC: config.useUTC,
                connectTimeout: config.connectTimeout ? safeParseInt(config.connectTimeout, 15000) : undefined,
                requestTimeout: config.requestTimeout ? safeParseInt(config.requestTimeout, 15000) : undefined,
                cancelTimeout: config.cancelTimeout ? safeParseInt(config.cancelTimeout, 5000) : undefined,
                camelCaseColumns: (config.camelCaseColumns === "true" || config.camelCaseColumns === true) ? true : undefined, //defaults to undefined. 
                parseJSON: (config.parseJSON === "true" || config.parseJSON === true) ? true : false, //defaults to true. 
                enableArithAbort: (config.enableArithAbort === "false" || config.enableArithAbort === false) ? false : true, //defaults to true. 
            },
            pool: {
                max: safeParseInt(config.pool, 5),
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

        node.connectionCleanup = function () {
            try {
                if (node.pool) {
                    node.log(`Disconnecting server : ${node.config.server}, database : ${node.config.database}, port : ${node.config.options.port}, user : ${node.config.server}`);
                    node.pool.then(_ => _.close()).catch(e => { console.error(e); });
                }
            }
            catch (error) {
            }
            try {
                if (node.connectionPool) node.connectionPool.close();
            }
            catch (error) {
            }
            node.status({
                fill: 'grey',
                shape: 'dot',
                text: 'disconnected'
            });
            node.pool = null;
        }

        node.connectionPool = new sql.ConnectionPool(node.config)
        node.connectionPool.on('error', err => {
            node.error(err);
            node.connectionCleanup();
        })

        node.connect = function () {
            if (node.pool) {
                return;
            }
            node.status({
                fill: 'yellow',
                shape: 'dot',
                text: 'connecting'
            });
            node.pool = node.connectionPool.connect()
                .then(_ => {
                    node.log(`Connected to server : ${node.config.server}, database : ${node.config.database}, port : ${node.config.options.port}, user : ${node.config.user}`);
                    return _
                }).catch(e => {
                    node.log(`Error connecting to server : ${node.config.server}, database : ${node.config.database}, port : ${node.config.options.port}, user : ${node.config.user}`);
                    throw e;
                });
        }

        node.execSql = function (queryMode, sqlQuery, params, callback) {
            node.connect();
            var _info = [];
            node.pool.then(_ => {

                let req = _.request();
                req.on('info', info => {
                    _info.push(info)
                })
                if (params && params.length) {
                    for (let index = 0; index < params.length; index++) {
                        let p = params[index];
                        if (p.output == true) {
                            if (p.type) {
                                req.output(p.name, p.type);
                            } else {
                                req.output(p.name);
                            }
                        } else {
                            //if the data is a vtp/udt, coerce the type from string into sql.type
                            if (p.type && (p.type.name == "UDT" || p.type.name == "TVP" || (p.type.type && p.type.type.name == "TVP"))
                                && typeof p.value == "object"
                                && p.value.columns && p.value.rows) {
                                let table = new sql.Table()
                                for (let index = 0; index < p.value.columns.length; index++) {
                                    let col = p.value.columns[index];
                                    table.columns.add(col.name, coerceType(col.type))
                                }
                                for (let index = 0; index < p.value.rows.length; index++) {
                                    let row = p.value.rows[index];
                                    if(Array.isArray(row)){
                                        table.rows.add(...row);
                                    } else {
                                        table.rows.add(row);
                                    }
                                }
                                req.input(p.name,p.type, table);
                            }
                            else if (p.type) {
                                req.input(p.name, p.type, p.value);
                            } else {
                                req.input(p.name, p.value);
                            }
                        }
                    }
                }
                if (queryMode == "execute") {
                    return req.execute(sqlQuery);                        
                } else {
                    return req.query(sqlQuery);
                }
            }).then(result => {
                callback(null, result, _info);
            }).catch(e => {
                console.error(e)
                node.pool = null;
                callback(e);
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
        node.params = config.params;
        node.queryMode = config.queryMode;

        node.modeOpt = config.modeOpt;
        node.modeOptType = config.modeOptType || "query";
        node.queryOpt = config.queryOpt;
        node.queryOptType = config.queryOptType || "editor";
        node.paramsOpt = config.paramsOpt;
        node.paramsOptType = config.paramsOptType || "none";

        var setResult = function (msg, field, value, returnType = 0) {
            let setValue = returnType == 1 ? value : value && value.recordset;
            // if(!setValue) return;
            const set = (obj, path, val) => {
                const keys = path.split('.');
                const lastKey = keys.pop();
                const lastObj = keys.reduce((obj, key) =>
                    obj[key] = obj[key] || {},
                    obj);
                lastObj[lastKey] = val;
            }
            set(msg, field, setValue);
        };

        var updateOutputParams = function (params, data) {
            if (!params || !params.length) return;
            if (!data || !data.output) return;
            var outputParams = params.filter(e => e.output);
            for (let index = 0; index < outputParams.length; index++) {
                let param = outputParams[index];
                param.value = data.output[param.name];
            }
        }

        var validateQueryParam = function(p){
            //{name:string, type?:string, value?:any, output?:boolean}
            if(typeof p !== "object" ) {
                throw new Error("Parameter is not an object");
            }
            if(!p.name || typeof p.name !== "string") {
                throw new Error("Parameter does not have a valid name property");
            }
            if(!p.output && !('value' in p)) {
                throw new Error("Input parameter '" + p.name + "' does not have a value property");
            }
            if(p.type && p.type.toLowerCase() == "uniqueidentifier") {
                if(!UUID.isValid(p.value)) {
                    throw new Error("Unique identifier is not valid")
                }
            }
            return true;
        }

        node.processError = function (err, msg) {
            let errMsg = "Error";
            if (typeof err == "string") {
                errMsg = err;
                msg.error = err;
            } else if (err && err.message) {
                errMsg = err.message;

                if (err.precedingErrors !== undefined
                    && err.precedingErrors.length
                    && err.precedingErrors[0].originalError !== undefined
                    && err.precedingErrors[0].originalError.info !== null
                    && err.precedingErrors[0].originalError.info.message !== null) {
                    errMsg += ' (' + err.precedingErrors[0].originalError.info.message + ')';
                }
                //Make an error object from the err.  NOTE: We cant just assign err to msg.error as a promise 
                //rejection occurs when the node has 2 wires on the output. 
                //(redUtil.cloneMessage(m) causes error "node-red Cannot assign to read only property 'originalError'")
                msg.error = {
                    class: err.class,
                    code: err.code,
                    lineNumber: err.lineNumber,
                    message: err.message,
                    details: errMsg,
                    name: err.name,
                    number: err.number,
                    procName: err.procName,
                    serverName: err.serverName,
                    state: err.state,
                    toString: function () {
                        return this.message;
                    }
                }
            }

            node.status({
                fill: 'red',
                shape: 'ring',
                text: errMsg
            });

            if (node.throwErrors) {
                node.error(msg.error, msg);
            } else {
                node.log(err);
                node.send(msg);
            }
        }
        
        node.on('input', function (msg) {
            node.status({}); //clear node status
            delete msg.error; //remove any .error property passed in from previous node

            //evaluate UI typedInput settings...
            var queryMode;
            if(node.modeOptType == "query" || node.modeOptType=="execute") {
                queryMode = node.modeOptType;
            } else {
                RED.util.evaluateNodeProperty(node.modeOpt, node.modeOptType, node, msg, (err, value) => {
                    if (err) {
                        let errmsg = `Unable to evaluate query mode choice`
                        node.processError(errmsg, msg);
                        return;//halt flow!
                    } else {
                        queryMode = value || "";
                    }
                });
            }

            if(!["query","execute"].includes(queryMode)){
                node.processError(`Query mode '${queryMode}' is not valid. Supported options are 'query' and 'execute'.`, msg);
                return null;//halt flow
            }

            var query;
            if(!node.paramsOptType || node.queryOptType == "editor") {
                query = node.query || msg.payload; //legacy
            } else {
                RED.util.evaluateNodeProperty(node.queryOpt, node.queryOptType, node, msg, (err, value) => {
                    if (err) {
                        let errmsg = `Unable to evaluate query choice`
                        node.processError(errmsg, msg);
                        return;//halt flow!
                    } else {
                        query = value;
                    }
                });
            }

            var queryParams = [];
            if(node.paramsOptType == "none") { 
                //no params
            } else if(!node.paramsOptType || node.queryOptType == "editor") {
                let _params = node.params || [];
                for (let iParam = 0; iParam < _params.length; iParam++) {
                    let param = RED.util.cloneMessage(_params[iParam]);
                    if(param.output == false) {
                        if(param.valueType === "jsEpoch") {
                            param.value = Date.now();
                        } else if(param.valueType === "unixEpoch") {
                            param.value = Math.floor(Date.now() / 1000);
                        } else if(param.valueType === "datetime") {
                            param.value = new Date();
                        } else if(param.valueType === "uuidv4") {
                            param.value = UUID.v4();
                        } else {
                            RED.util.evaluateNodeProperty(param.value, param.valueType, node, msg, (err, value) => {
                                if (err) {
                                    let errmsg = `Unable to evaluate value for parameter at index [${iParam}] named '${param.name}'`
                                    node.processError(errmsg, msg);
                                    return;//halt flow!
                                } else {
                                    param.value = value;
                                }
                            });
                        }
                    } 
                    queryParams.push(param);
                }
            } else {
                RED.util.evaluateNodeProperty(node.paramsOpt, node.paramsOptType, node, msg, (err, value) => {
                    if (err) {
                        let errmsg = `Unable to evaluate parameter choice`
                        node.processError(errmsg, msg);
                        return;//halt flow!
                    } else {
                        let _params = value || [];
                        for (let iParam = 0; iParam < _params.length; iParam++) {
                            let param = RED.util.cloneMessage(_params[iParam]);
                            delete param.valueType;
                            queryParams.push(param);
                        }
                        
                    }
                });
            }
            
            msg.query = query;
            msg.queryMode = queryMode;
            msg.queryParams = queryParams || [];

            //now validate params, remove superfluous properties & coerce type into sql.type
            if(msg.queryParams && msg.queryParams.length){
                for (let iParam = 0; iParam < msg.queryParams.length; iParam++) {
                    let param = msg.queryParams[iParam];
                    try {
                        validateQueryParam(param)
                        param.type = coerceType(param.type);
                        if(param.output) delete param.value;
                        delete param.valueType;
                    } catch (error) {
                        node.processError(`query parameter at index [${iParam}] is not valid. ${error.message}.`, msg);
                        return null;
                    }
                }
            }

            var promises = [];
            var tokens = extractTokens(mustache.parse(msg.query));
            var resolvedTokens = {};
            tokens.forEach(function (name) {
                var context = parseContext(name);
                if (context) {
                    var type = context.type;
                    var store = context.store;
                    var field = context.field;
                    var target = node.context()[type];
                    if (target) {
                        var promise = new Promise((resolve, reject) => {
                            target.get(field, store, (err, val) => {
                                if (err) {
                                    reject(err);
                                } else {
                                    resolvedTokens[name] = val;
                                    resolve();
                                }
                            });
                        });
                        promises.push(promise);
                        return;
                    }
                }
            });

            Promise.all(promises).then(function () {
                var value = mustache.render(msg.query, new NodeContext(msg, node.context(), null, false, resolvedTokens));
                msg.query = value;
                doSQL(node, msg);
            }).catch(function (err) {
                node.processError(err, msg)
            });
        });

        function doSQL(node, msg) {
            node.status({
                fill: 'blue',
                shape: 'dot',
                text: 'requesting'
            });

            try {
                mssqlCN.execSql(msg.queryMode, msg.query, msg.queryParams, function (err, data, info) {
                    if (err) {
                        node.processError(err, msg)
                    } else {
                        node.status({
                            fill: 'green',
                            shape: 'dot',
                            text: 'done'
                        });
                        msg.sqlInfo = info;
                        updateOutputParams(msg.queryParams, data);
                        setResult(msg, node.outField, data, node.returnType);
                        node.send(msg);
                    }
                });
            } catch (err) {
                node.processError(err, msg)
            }
        }
        node.on('close', function () {
            mssqlCN.disconnect(node.id);
        });
    }
    RED.nodes.registerType('MSSQL', mssql);
};
