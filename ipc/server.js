const net = require('net');
const fs = require('fs');
//const request = require('request');

const FrameParser = require('./FrameHelpers/Parser');
const {composeFrame} = require('./FrameHelpers/compose');

//const CONFIGFILE = process.env['HOME'] + '/.config/bobaos.json';
console.log(process.env);


// TODO: if config file is described in args, then load it, else - default
// TODO: args for daemon
// TODO: bobaos datapoint sdk daemon (bdsd)

// TODO: Bobaos Datapoint Sdk Message
// |B|D|S|M|<L>|<DATA>|<CR>
// <L> = <DATA>.length (~)
// <CR> = sum(<DATA>) % 256


// bdsd config.json
//const config = require(CONFIGFILE);

// Bobaos Datapoint Sdk unix domain socket
// bdsm.sock
const SOCKETFILE = process.env['XDG_RUNTIME_DIR'] + '/bdsd.sock';
let SHUTDOWN = false;

let connections = [];
let server;

const createServer = socketFile => {
  return net.createServer(stream => {
      console.log('Listening on:', socketFile);
      let connectionId = Math.round(Math.random()*Date.now());
      let connection = {stream: stream, id: connectionId};
      connections.push(connection);
      const frameParser = new FrameParser();
      stream.pipe(frameParser);
      frameParser.on('data', data => {
        console.log('got data from client', connection.id, data.toString());
        // TODO: process parsed data to api.js
        // TODO: var #1:
        // TODO: 1) EE emits event 'request'
        // TODO: 2) api.js already subscribed to this event with callback([stream, data] as params) that do following:
        // TODO:    *** parse request. if wrong, then send error to this socket.
        // TODO:    *** if request is good then send data to bobaos, process response and send data to socket.

      });
      stream.on('end', _ => {
        console.log('disconnect', connection.id);
        // delete connection from connections array
        const findConnById = t => t.id === connection.id;
        let connectionIndex = connections.findIndex(findConnById);
        if (connectionIndex > 0) {
          connections.splice(connectionIndex, 1);
        }
      });
    })
    .listen(socketFile)
    .on('connection', socket => {
      console.log('connected');
    });
};

console.log('Checking for leftover socket.');
fs.stat(SOCKETFILE, function (err, stats) {
  if (err) {
    // start server
    console.log('No leftover socket found.');
    server = createServer(SOCKETFILE);
    return;
  }
  // remove file then start server
  console.log('Removing leftover socket.');
  fs.unlink(SOCKETFILE, function (err) {
    if (err) {
      // This should never happen.
      console.error(err);
      process.exit(0);
    }
    server = createServer(SOCKETFILE);
  });
});

// close all connections when the user does CTRL-C
function cleanup() {
  if (!SHUTDOWN) {
    SHUTDOWN = true;
    console.log('\n', "Terminating.", '\n');
    connections
      .forEach(t => {
        console.log('Disconnecting', t.timestamp);
        t.stream.write(JSON.stringify({method: 'disconnect'}));
        t.stream.end();
      });
    server.close();
    process.exit(0);
  }
}

process.on('SIGINT', cleanup);

// test
// setInterval( _ => {
//   connections.forEach(t => {
//     t.stream.write(JSON.stringify({method: 'test'}));
//   })
// }, 5000);