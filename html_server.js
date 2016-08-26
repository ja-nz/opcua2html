const opcua = require('node-opcua');
//const express = require('express');
//const app = express();
//const http = require('http').Server(app);
//const io = require('socket.io')(http);

const client = new opcua.OPCUAClient();
const hostname = require('os').hostname().toLowerCase();
const endpointUrl = 'opc.tcp://' + hostname +':26543';

const NODES =['PumpSpeed', 'Pressure', 'Temperature'];


// TODO:
var userIdentity  = null;
//xx var  userIdentity = { userName: 'opcuauser', password: 'opcuauser' };

// Starter chain
connect(endpointUrl)
  .then(client => createSession(client))
  .then(session => subscribe(session))
  .then(subscription => monitor(subscription))
  .then(monitoring => getData(monitoring))
  .catch(err => console.log( 'Error: ' + err));

function connect(endpointUrl) {
  return new Promise((resolve, reject) =>
    client.connect(endpointUrl, (err) => {
      if (!err) resolve(client); else reject(Error(err));
    })
  );
}

function createSession(client) {
  return new Promise((resolve, reject) =>
    client.createSession(userIdentity, (err, session) => {
      if (!err) resolve(session); else reject(Error(err));
    })
  );
}

function subscribe(session) {
  return new Promise((resolve, reject) =>
      {
        const subscription = new opcua.ClientSubscription(session,{
          //requestedPublishingInterval: 3000, -> not useful
          requestedMaxKeepAliveCount:  2000,
          requestedLifetimeCount:      6000,
          maxNotificationsPerPublish:  1000,
          publishingEnabled: true,
          priority: 10
        });

        subscription
          .on('started',() => {
            console.log('subscription started');
            resolve(subscription);
          })
          .on('keepalive',() => console.log('keepalive'))
          .on('terminated',() => reject(Error('terminated')));
      }
  );
}

function monitor(subscription) {
  return new Promise((resolve, reject) =>
      {
        const monitoring = [];
        const nodes = NODES; //NODES at head of this file

        for (let node of nodes) {
          const item = subscription.monitor({
            nodeId: 'ns=2;s=' + node,
            attributeId: opcua.AttributeIds.Value
          },
          {
            samplingInterval: 3000, // number of packages send to browser
            discardOldest: true,
            queueSize: 100
          },
          opcua.read_service.TimestampsToReturn.Both, (err) => {
            if (err) {
              console.log('Monitor ns=2;s= ' + node +  ' failed');
              reject(Error(err));
            }
          });
          monitoring.push(item);
        }

        resolve(monitoring);
      }
  );
}

function getData(monitoring) {

  const port = 3700;
  const cachedData = new Array(monitoring.length);
 // app.use(express.static(__dirname + '/'));

 // io.on('connection', (socket) => { // open a connection
    monitoring.forEach((item, i) => { // iterate over monitored OPC nodes
      item.on('changed', (dataValue) => { // watch every OPC Node and receive the dataValue Object
        cachedData[i] = { // deconstruct the dataValue Object into the cachedData
          value: dataValue.value.value,
          timestamp: dataValue.serverTimestamp,
          nodeId: item.itemToMonitor.nodeId.value
        };
        if (cachedData.filter((el) => el !== undefined).length === monitoring.length) { // check if cachedData is completely filled opcValues
          if (i === monitoring.length -1) // emit data at the end of every fill loop
          //  io.sockets.emit('data', cachedData);
            console.log(cachedData);
        }
      });
   });

 //   socket.on('disconnect', () => console.log("IO Socket disconnected"));
 // });

 // http.listen(port, () =>
 //   console.log('Listening on port ' + port)
 // );
}
