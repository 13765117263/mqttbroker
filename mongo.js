/**
 * Created by zhongkui on 2016/3/14.
 */
var mongodb = require('mongodb')
    , FFMPEG = require('./ffmpeg')
    , EventEmitter = require('events').EventEmitter
    , util = require('util')
    , fs = require('fs')
    , Grid = require('gridfs-stream')
    , moment = require('moment');

var rtspServers = {
    'MYF-ZHONGKUI-L1': 'rtsp://127.0.0.1:1935',
    'dev-spzb02-253-163': 'rtsp://10.201.253.163:1935',
    'dev-spzb03-253-164': 'rtsp://10.201.253.164:1935'
}

function MongoDB(mongo_url, callback) {
    var server_opt = {
        server: {
            //auto_reconnect: true,
            poolSize: 40,
            socketOptions: {keepAlive: 1, connectTimeoutMS: 30000}
        }
    }

    var self = this;
    mongodb.MongoClient.connect(mongo_url, server_opt, function (err, db) {
        if (err) {
            callback(err);
            return;
        }
        self.on('insertData', function (tablename, topic, obj) {
            db.collection(tablename).insertOne(obj.data, function (err, docs) {
                if (err)
                    console.error(err);
                else
                    console.log('insert %s: {n:%d, _id:%s, topic:%s}', tablename, docs.result.n, docs.insertedId, topic);
            });
        });

        self.on('updateData', function (tablename, topic, obj) {
            db.collection(tablename).updateOne(obj.criteria, {'$set': obj.data}, function (err, docs) {
                if (err)
                    console.error(err);
                else
                    console.log('update %s: {n:%d, topic:%s}', tablename, docs.result.nModified, topic);
            });
        });

        self.on('insertFs', function (imageFile) {
            var gfs = Grid(db, mongodb);
            var writestream = gfs.createWriteStream({filename: imageFile});
            fs.createReadStream(imageFile).pipe(writestream);
            writestream.on('close', function (file) {
                fs.unlink(imageFile, function () {
                    console.log(file.filename + ' Written To DB');
                });
            });
        });
        callback(null, "CONNECT: ".concat(mongo_url, " successful!"));
    });

    EventEmitter.call(this);
}

MongoDB.prototype.insertLivestreams = function (topic, payload) {
    var obj = parseObjectData(payload);
    if (obj) {
        this.emit('insertData', 'livestreams', topic, obj);
    }
}

MongoDB.prototype.updateLivestreams = function (topic, payload) {
    var obj = parseObjectData(payload);
    if (obj) {
        obj.criteria.active = 1;
        this.emit('updateData', 'livestreams', topic, obj);
    }
}

MongoDB.prototype.insertStreamreports = function (topic, payload) {
    var obj = parseObjectData(payload);
    if (obj) {
        this.emit('insertData', 'streamreports', topic, obj);
    }
}

MongoDB.prototype.insertRecordfiles = function (topic, payload) {
    var obj = parseObjectData(payload);
    if (obj) {
        this.emit('insertData', 'recordfiles', topic, obj);
    }
}

MongoDB.prototype.updateRecordfiles = function (topic, payload) {
    var obj = parseObjectData(payload);
    if (obj) {
        obj.criteria.active = 1;
        this.emit('updateData', 'recordfiles', topic, obj);
        if (!!obj.data.coverFile && !!obj.data.parentPath && !!obj.data.fileName && !!obj.data.fileDuration) {
            new FFMPEG(this, obj.data.parentPath.concat('/', obj.data.fileName))
                .screenshot(obj.data.parentPath.concat('/', obj.data.coverFile)
                    , secondFormat(obj.data.fileDuration)
                    , false);
        }
    }
}

MongoDB.prototype.insertScreenfiles = function (topic, payload) {
    var obj = parseObjectData(payload);
    if (obj) {
        this.emit('insertData', 'screenfiles', topic, obj);
        if (!!obj.data.screenFile && !!obj.criteria.host && !!obj.criteria.appName && !!obj.criteria.streamName && !!obj.data.parentPath && !!obj.data.updateTime) {
            var rtsp = rtspServers[obj.criteria.host].concat('/', obj.criteria.appName, '/', obj.criteria.streamName);
            new FFMPEG(this, rtsp)
                .screenshot(obj.data.parentPath.concat('/', obj.data.screenFile)
                    , dateFormat(obj.data.updateTime)
                    , obj.data.screenLarge
                );
        }
    }
}

MongoDB.prototype.saveFileToGridfs = function (imageFile) {
    if (imageFile) {
        this.emit('insertFs', imageFile);
    }
}

function parseObjectData(payload) {
    try {
        var req = JSON.parse(payload);
        if (!req)
            throw new Error('Payload parse fail');
        var msg = JSON.parse(req.msg);
        if (!msg)
            throw new Error('Msg is null');
    } catch (ex) {
        console.error(ex.message);
        return null;
    }

    var rval = {data: {}, criteria: {}};
    var keys = /^(clientId|host|appName|streamName)$/;
    for (var k in msg) {
        if (keys.test(k))
            rval.criteria[k] = msg[k];
        else
            rval.data[k] = msg[k]
    }
    return rval;
}

var secondFormat = function (s) {
    if (s < 3600)
        return moment({minute: Math.floor((s % 3600) / 60), second: s % 60}).format('m:ss').replace(/:/g, '\\:');
    else
        return moment({
            hour: Math.floor(s / 3600),
            minute: Math.floor((s % 3600) / 60),
            second: s % 60
        }).format('H:mm:ss').replace(/:/g, '\\:');
}

var dateFormat = function (t) {
    return moment(t, "YYYY-MM-DD HH:mm:ss").format('YYYY/MM/DD HH:mm:ss').replace(/:/g, '\\:');
}

util.inherits(MongoDB, EventEmitter);
module.exports = MongoDB;