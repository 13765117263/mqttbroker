/**
 * Created by zhongkui on 2016/3/14.
 */
var mqtt = require('mqtt');

var client = mqtt.connect('tcp://localhost:1883',{username:'admin', password:'password', clientId:'mqtt-test-client'});

client.on('connect', function(){
    console.log('connect successful!');
    client.subscribe('req/#',{qos:0});
});

client.on('message', function(topic, payload){
    console.log("%s\r\n%s",topic, payload.toString());
});

client.on('close', function(){
    console.log('connect close');
});

client.on('error',function(err) {
    client.stream.end();
})
