var should = require("should");
var helper = require("node-red-node-test-helper");
var mssqlPlusNode = require("../src/mssql.js");

// helper.init(require.resolve('node-red'));

describe('Load MSSQL Plus Node', function(){
    "use strict";

    beforeEach(function(done) {
        helper.startServer(done);
    });

    afterEach(function(done){
        helper.unload().then(function() {
            helper.stopServer(done);
        });
    });

    it('should be loaded', function(done) {
        var flow = [
            { id: "f1", type: "tab", label: "Test flow" },
            { id: "n1", z: "f1", type: "MSSQL", name: "mssql", mssqlCN: "n2" },
            { id: "n2", z: "", type: "MSSQL-CN", name: "mssql-cn" },
        ];

        // helper.load(mssqlPlusNode, flow, {n2: {mssqlCN: "n1"}}, function() {
        helper.load(mssqlPlusNode, flow, function() {
            // var f1 = helper.getNode("f1");
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            // console.log(f1);
            console.log(n1);
            console.log(n2);
            n1.should.have.property('name', 'mssql');
            // n2.should.have.property('name', 'mssql-cn');
            done();
        });
    });
});
