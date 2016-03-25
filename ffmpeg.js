/**
 * Created by zhongkui on 2016/3/14.
 */
var ffmpeg = require('fluent-ffmpeg')
    , EventEmitter = require('events').EventEmitter
    , util = require('util');

function FFMPEG(mongodb, srcFile) {
    this.on('screenshot', function(imageFile, text, large){
        var scale = (false === large) ? 'scale=284:-1,' : '';
        var drawtext = util.format("drawtext=fontfile=arial.ttf:fontcolor=white:x=(w-tw)-5:y=(h-th)-5:text='%s'", text);
        ffmpeg(srcFile)
            .inputOptions(['-re', '-an'])
            .addOptions(['-threads 2', '-ss 1', '-vframes 1'])
            .format('image2')
            .addOption('-vf', scale.concat(drawtext))
            .on('error', function (err, stdout, stderr) {
                console.log('ffmpeg: %s fail! Casue:%s', imageFile, stderr);
            })
            .on('end', function () {
                console.log('ffmpeg: %s saved', imageFile);
                mongodb.saveFileToGridfs(imageFile);
            }).save(imageFile);
    });
    EventEmitter.call(this);
}

util.inherits(FFMPEG, EventEmitter);

FFMPEG.prototype.screenshot = function(imageFile, text, large) {
    this.emit('screenshot',imageFile, text, large);
}

module.exports = FFMPEG;