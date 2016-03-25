var mqtt = require('mqtt')
    , Mongodb = require('./mongo')
    , websocket = require('websocket-stream')
    , WebSocketServer = require('ws').Server
    , Connection = require('mqtt-connection')
    , http = require('http')
    , express = require('express');

DEBUG = true;

var db = new Mongodb('mongodb://sa:Mongodb2016@localhost:27017/wms', function(err, msg){
    if(err) throw err;
    console.log(msg);
});

var broker_auth = {
    username: 'admin',
    password: 'password'
};

var clients = {};

function handle(client) {
    client.on('connect', function (packet) {
        clients[packet.clientId] = client;
        client.id = packet.clientId;
        console.log("CONNECT: client id: " + client.id);
        client.subscriptions = [];
        if (packet.username != broker_auth.username || packet.password.toString() != broker_auth.password) {
            client.connack({returnCode: 4});
            client.stream.end();
            delete clients[client.id];
        }
        client.connack({returnCode: 0});
    });

    client.on('subscribe', function (packet) {
        var granted = [];
        console.log("SUBSCRIBE(%s): %j", client.id, packet);
        for (var i = 0; i < packet.subscriptions.length; i++) {
            var qos = packet.subscriptions[i].qos
                , topic = packet.subscriptions[i].topic
                , reg = new RegExp(topic.replace('+', '[^\/]+').replace('#', '.+').concat('$'));
            granted.push(qos);
            client.subscriptions.push(reg);
        }
        client.suback({messageId: packet.messageId, granted: granted});
    });

    client.on('publish', function (packet) {
        //console.log("PUBLISH(%s): %j", client.id, packet);
        //baseinfo
        if (/^req\/(.*)\/(.*)\/pub\/(.*)\/baseinfo$/.test(packet.topic))
            db.insertLivestreams(packet.topic, packet.payload);
        //reportinfo or getreport
        else if(/^req\/(.*)\/(.*)\/pub\/(.*)\/reportinfo$/.test(packet.topic))
            db.insertStreamreports(packet.topic, packet.payload);
        //videoinfo audioinfo metainfo
        else if (/^req\/(.*)\/(.*)\/pub\/(.*)\/(videoinfo|audioinfo|metainfo)$/.test(packet.topic))
            db.updateLivestreams(packet.topic, packet.payload);
        //unpublish
        else if(/^req\/(.*)\/(.*)\/unpub\/(.*)$/.test(packet.topic))
            db.updateLivestreams(packet.topic, packet.payload);
        //record start or stop
        else if(/^req\/(.*)\/(.*)\/record\/(.*)\/(start|stop)$/.test(packet.topic))
            db.updateLivestreams(packet.topic, packet.payload);
        //record segmentStart
        else if(/^req\/(.*)\/(.*)\/record\/(.*)\/segmentStart$/.test(packet.topic))
            db.insertRecordfiles(packet.topic, packet.payload);
        //record segmentEnd
        else if(/^req\/(.*)\/(.*)\/record\/(.*)\/segmentEnd$/.test(packet.topic))
            db.updateRecordfiles(packet.topic, packet.payload);
        //screenshot
        else if(/^req\/(.*)\/(.*)\/pub\/(.*)\/screenshot$/.test(packet.topic))
            db.insertScreenfiles(packet.topic, packet.payload);

        for (var k in clients) {
            var c = clients[k];
            for (var i = 0; i < c.subscriptions.length; i++) {
                var s = c.subscriptions[i];
                if (s.test(packet.topic)) {
                    c.publish({topic: packet.topic, payload: packet.payload});
                    break;
                }
            }
        }
    });

    client.on('pingreq', function (packet) {
        console.log('PINGREQ(%s)', client.id);
        client.pingresp();
    });

    client.on('disconnect', function (packet) {
        client.stream.end();
    });

    client.on('close', function (packet) {
        delete clients[client.id];
    });

    client.on('error', function (e) {
        client.stream.end();
        console.log(e);
    });
}

function attachWebsocketServer(wsServer, handle) {
    wsServer.on('client', handle);
    var wss = new WebSocketServer({server: wsServer});
    wss.on('connection', function (ws) {
        var stream = websocket(ws),
            connection = new Connection(stream);
        wsServer.emit('client', connection);
    });
    return wsServer;
}

new mqtt.Server(handle).listen(1883);
attachWebsocketServer(http.createServer(),handle).listen(9999);

if (DEBUG) {
    var authinfo = JSON.stringify(
        {
            userName:"admin",
            password:"123456",
            streams:[
                {
                    "appName":"live"
                    , "streamName":"myStream"
                    , "protocol":"rtmp"
                    , "allowHost":[
                    "MYF-ZHONGKUI-L1"
                ]
                    , "edges":[
                    {"ip":"127.0.0.1","dstApp":"live1","dstStream":"myStream"}
                ]
                    , "timerTasks": {"report":10, "screenshot":10}
                },
                /*record : segmentType: string
                 values: ["none", "duration", "size", "schedule"]
                 segmentParam:
                 segmentType = none      value: null
                 segmentType = duration  value: long (unit: Seconds  ex: 1Hour 60 * 60 * 1000)
                 segmentType = size      value: long (unit: Bytes    ex: 10MB  10 * 1024 * 1024) */
                //segmentType = schedule  value: string (ex: EveryHour 0 */1 * * *)
                {
                    "appName":"live"
                    , "streamName":"test"
                    , "allowHost":[
                    "MYF-ZHONGKUI-L1"
                ]
                    , "edges":[
                    {"ip":"127.0.0.1", "dstApp":"live1"}
                ]
                    , "record":{"segmentType":"duration","segmentParam":60, "segmentCover":true}
                }
            ]
        }
    );

    var edgeinfo = JSON.stringify(
        {
            userName:"admin",
            password:"123456",
            streams:[
                {
                    "appName":"live1"
                    , "streamName":"myStream"
                    , "allowHost":[
                    "MYF-ZHONGKUI-L1"
                ]
                },
                {
                    "appName":"live1"
                    , "streamName":"test"
                    , "allowHost":[
                    "MYF-ZHONGKUI-L1"
                ]
                }
            ]
        }
    );

    var app = express();
    app.get('/vap/json/authinfo.json', function(req, res){
        //console.log(req.param('username'));
        res.setHeader('Content-Type', 'application/json;charset=utf-8');
        res.send(authinfo);
    });

    app.get('/vap/json/edgeinfo.json', function(req, res){
        //console.log(req.param('username'));
        res.setHeader('Content-Type', 'application/json;charset=utf-8');
        res.send(edgeinfo);
    });

    app.get('/', function(req, res) {
        res.sendFile(__dirname.concat('/html/index.html'));
    });

    app.get('/:path/:filename', function(req, res) {
        res.sendFile(__dirname.concat('/html/',req.params.path, '/',req.params.filename));
    });
    app.listen(8080);
}
