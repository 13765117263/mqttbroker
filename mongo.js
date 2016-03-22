/**
 * Created by zhongkui on 2016/3/14.
 */
var MongoClient = require('mongodb').MongoClient
    , EventEmitter = require('events').EventEmitter
    , util = require('util')
    , FFMPEG = require('./ffmpeg').FFMPEG
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

    MongoClient.connect(mongo_url, server_opt, function (err, db) {
        if (err) {
            callback(err);
            return;
        }

        MongoDB.prototype.insert = function(tablename, data, topic) {
            db.collection(tablename).insertOne(data, function (err, docs) {
                if (err)
                    console.error(err);
                else
                    console.log('insert %s: {n:%d, _id:%s, topic:%s}', tablename, docs.result.n, docs.insertedId, topic);
            });
        }

        MongoDB.prototype.update = function(tablename, data, criteria, topic) {
            db.collection(tablename).updateOne(criteria, {'$set': data}, function (err, docs) {
                if (err)
                    console.error(err);
                else
                    console.log('update %s: {n:%d, topic:%s}', tablename, docs.result.nModified, topic);
            });
        }

        EventEmitter.call(this);
        callback(null, "CONNECT: ".concat(mongo_url, " successful!"));
    });
}

util.inherits(MongoDB, EventEmitter);
exports.MongoDB = MongoDB;

MongoDB.prototype.insertLivestreams = function (topic, payload) {
    var data = {};
    if (getObjectData(payload, data)) {
        this.insert('livestreams', data, topic);
    }
}

MongoDB.prototype.updateLivestreams = function (topic, payload) {
    var data = {}, criteria = {};
    if (getObjectData(payload, data, criteria)) {
        criteria.active = 1;
        this.update('livestreams', data, criteria, topic);
    }
}

MongoDB.prototype.insertStreamreports = function (topic, payload) {
    var data = {};
    if (getObjectData(payload, data)) {
        this.insert('streamreports', data, topic);
    }
}

MongoDB.prototype.insertRecordfiles = function (topic, payload) {
    var data = {};
    if (getObjectData(payload, data)) {
        this.insert('recordfiles', data, topic);
    }
}

MongoDB.prototype.updateRecordfiles = function (topic, payload) {
    var data = {}, criteria = {};
    if (getObjectData(payload, data, criteria)) {
        criteria.active = 1;
        this.update('recordfiles', data, criteria, topic);
        if (null != data.coverFile) {
            new FFMPEG(data.parentPath.concat('/', data.fileName))
                .screenshot(data.parentPath.concat('/', data.coverFile)
                    , secondFormat(data.fileDuration)
                    , false);
        }
    }
}

MongoDB.prototype.insertScreenfiles = function (topic, payload) {
    var data = {};
    if (getObjectData(payload, data)) {
        this.insert('screenfiles', data, topic);
        if (null != data.screenFile) {
            new FFMPEG(rtspServers[data.host].concat('/', data.appName, '/', data.streamName))
                .screenshot(data.parentPath.concat('/', data.screenFile)
                    , dateFormat(data.updateTime)
                    , data.screenLarge
                );
        }
    }
}

var getObjectData = function (payload, data, criteria) {
    try {
        var req = JSON.parse(payload);
        var msg = JSON.parse(req.msg);
        if (msg != null) {
            if (null == criteria) {
                for (var k in msg)
                    data[k] = msg[k];
            } else {
                var keys = /^(clientId|host|appName|streamName)$/;
                for (var k in msg) {
                    if (keys.test(k))
                        criteria[k] = msg[k];
                    else
                        data[k] = msg[k];
                }
            }
            return true;
        }
    } catch (ex) {
        console.error(ex.message);
    }
    return false;
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