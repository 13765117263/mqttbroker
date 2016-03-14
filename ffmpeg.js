/**
 * Created by zhongkui on 2016/3/14.
 */
var ffmpeg = require('fluent-ffmpeg')
    , util = require('util');

module.exports = function (srcFile, imageFile, text, large) {
    var scale = (false === large) ? 'scale=284:-1,' : '';
    var drawtext = util.format("drawtext=fontcolor=white:x=(w-tw)-5:y=(h-th)-5:text='%s'", text);
    //console.log(util.format('%s%s',scale, drawtext));
    ffmpeg(srcFile)
        .addOption('-threads', 2)
        .addOption('-ss', 1)
        .addOption('-vframes', 1)
        .addOption('-an')
        .format('image2')
        .addOption('-vf', util.format('%s%s', scale, drawtext))
        .on("error", function (err) {
            console.error(err);
        })
        .on("end", function () {
            console.log('ffmpeg: %s saved', imageFile);
        }).save(imageFile);
}