#Install dependency modules
npm install mqtt<br>
npm install mqtt-connection<br>
npm install websocket-stream<br>
npm install ws<br>
npm install mongodb<br>
npm install moment<br>
npm install fluent-ffmpeg

#Startup
cd /<br>
git clone https://github.com/aesirteam/mqttbroker.git<br>
cd mqttbroker<br>
node mqtt_server.js<br>

#Install service for redhat linux
vi /etc/rc.d/init.d/mqttbroker<br>

\#/bin/bash<br>
\#chkconfig: 2345 80 90<br>
#description: auto_run

# source function library
. /etc/rc.d/init.d/functions

start() {
   [ -f /mqttbroker/mqtt_server.js ] || exit 6
   [ -f /mqttbroker/mongo.js ] || exit 6
   su - root -c "nohup /usr/local/nodejs/bin/node /mqttbroker/mqtt_server.js >/dev/null 2>&1 &"
}

stop() {
  killall node
}

case "$1" in
   start)
      start
      ;;
   stop)
      stop
      ;;
 esac

chmod +x /etc/rc.d/init.d/mqttbroker
chkconfig --add mqttbroker
service mqttbroker start