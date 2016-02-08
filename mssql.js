module.exports = function(RED) {
	'use strict';
	var mustache = require('mustache');
	var sql = require('mssql');

	function connection(config) {
	    RED.nodes.createNode(this, config);
	    
        var node = this;
	    this.config = {
            user: node.credentials.username,
            password : node.credentials.password,
            server : config.server,
            database : config.database,
            options : {
                           encrypt : config.encyption
                       }
        };
        
        
	    this.connection = sql;

/*	   	node.on('close',function(){
	   		node.pool.close(function(){});
	   	})
*/	}
  	RED.nodes.registerType('MSSQL-CN', connection, {
	    credentials: {
			username: {type:'text'},
			password: {type:'password'}
	    }
	});

  	function mssql(config) {
	    RED.nodes.createNode(this, config);
	    var mssqlCN = RED.nodes.getNode(config.mssqlCN);
	    this.query = config.query;
	    this.connection = mssqlCN.connection;
	    this.config = mssqlCN.config;
	    this.outField = config.outField;
	    
        var node = this;
	    var b = node.outField.split('.');
        var i = 0;
        var r = null;
        var m = null;
        var rec = function(obj) {
            i += 1;
            if ((i < b.length) && (typeof obj[b[i-1]] === 'object')) {
                rec(obj[b[i-1]]); // not there yet - carry on digging
            }
            else {
                 if (i === b.length) { // we've finished so assign the value
                     obj[b[i-1]] = r;
                     node.send(m);
                     node.status({});
                 }
                 else {
                     obj[b[i-1]] = {}; // needs to be a new object so create it
                     rec(obj[b[i-1]]); // and carry on digging
                 }
            }
        };
        
        node.on('input',function(msg){
            console.log(node.config);
		  
            node.connection.connect(node.config).then(function(){
 
              node.status({fill:'blue',shape:'dot',text:'requesting'});
		  
              var query = mustache.render(node.query,msg);
              
              if (!query || (query === '')) {
                  query = msg.payload;
              }
            
              var request = new node.connection.Request();
              
              request.query(query).then(function (rows){
	        		i = 0;
	        		r = rows;
	        		m = msg;
	        		rec(msg);
              }).catch(function(err) {
                  node.error(err);
                  node.status({fill:'red',shape:'ring',text:'Error'});
                  return;
              });
            
              
          }).catch(function(err) {
	    		node.error(err);
	    		node.status({fill:'red',shape:'ring',text:'Error'});
	    		return;
          });
        });

	}
  	RED.nodes.registerType('MSSQL', mssql);
};
