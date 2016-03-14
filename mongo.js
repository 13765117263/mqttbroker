/**
 * Created by zhongkui on 2016/3/14.
 */
var MongoClient = require('mongodb').MongoClient
    , EventEmitter = require('events').EventEmitter
    , ffmpeg = require('./ffmpeg')
    , moment = require('moment');

exports.MongoDB = function (mongo_url, callback) {
    var server_opt = {
        server: {
            //auto_reconnect: true,
            poolSize: 40,
            socketOptions: {keepAlive: 1, connectTimeoutMS: 30000}
        }
    }

    var event = new EventEmitter();

    MongoClient.connect(mongo_url, server_opt, function (err, db) {
        if (err) {
            callback(err);
            return;
        }

        event.on('insert', function (tablename, data, topic) {
            db.collection(tablename).insert(data, function (err, docs) {
                if (err)
                    console.error(err);
                else
                    console.log('insert %s: {n:%d, _id:%s, topic:%s}', tablename, docs.result.n, docs.insertedIds, topic);
            });
        });

        event.on('update', function (tablename, data, criteria, topic) {
            db.collection(tablename).update(criteria, {'$set': data}, function (err, docs) {
                if (err)
                    console.error(err);
                else
                    console.log('update %s: {n:%d, topic:%s}', tablename, docs.result.n, topic);
            });
        });

        callback(null, "CONNECT: ".concat(mongo_url, " successful!"));
    });

    this.insertLivestreams = function (topic, payload) {
        var data = {};
        if (getObjectData(payload, data)) {
            event.emit('insert', 'livestreams', data, topic);
        }
    }

    this.updateLivestreams = function (topic, payload) {
        var data = {}, criteria = {};
        if (getObjectData(payload, data, criteria)) {
            criteria.active = 1;
            event.emit('update', 'livestreams', data, criteria, topic);
        }
    }

    this.insertStreamreports = function (topic, payload) {
        var data = {};
        if (getObjectData(payload, data)) {
            event.emit('insert', 'streamreports', data, topic);
        }
    }

    this.insertRecordfiles = function (topic, payload) {
        var data = {};
        if (getObjectData(payload, data)) {
            event.emit('insert', 'recordfiles', data, topic);
        }
    }

    this.updateRecordfiles = function (topic, payload) {
        var data = {}, criteria = {};
        if (getObjectData(payload, data, criteria)) {
            criteria.active = 1;
            event.emit('update', 'recordfiles', data, criteria, topic);
            if (null != data.coverFile) {
                ffmpeg(data.parentPath.concat('/', data.fileName)
                    , data.parentPath.concat('/', data.coverFile)
                    , secondFormat(data.fileDuration)
                    , false);
            }
        }
    }

    this.insertScreenfiles = function (topic, payload) {
        var data = {};
        if (getObjectData(payload, data)) {
            event.emit('insert', 'screenfiles', data, topic);
            if (null != data.screenFile) {
                ffmpeg("rtsp://".concat(data.host, ':1935', '/', data.appName, '/', data.streamName)
                    , data.parentPath.concat('/', data.screenFile)
                    , dateFormat(data.updateTime)
                    , data.screenLarge);
            }
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