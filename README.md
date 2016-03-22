#Install dependency modules
npm install

#Startup
cd /<br>
git clone https://github.com/aesirteam/mqttbroker.git<br>
cd mqttbroker<br>
node mqtt_server.js<br>

#Install service for redhat linux
vi /etc/rc.d/init.d/mqttbroker<br>

\#/bin/bash<br>
\#chkconfig: 2345 80 90<br>
\#description: auto_run<br>

\# source function library<br>
. /etc/rc.d/init.d/functions<br>

start() {<br>
   [ -f /mqttbroker/mqtt_server.js ] || exit 6<br>
   [ -f /mqttbroker/mongo.js ] || exit 6<br>
   su - root -c "nohup /usr/local/nodejs/bin/node /mqttbroker/mqtt_server.js >/dev/null 2>&1 &"<br>
}<br>

stop() {<br>
  killall node<br>
}<br>

case "$1" in<br>
   start)<br>
      start<br>
      ;;<br>
   stop)<br>
      stop<br>
      ;;<br>
 esac<br>

chmod +x /etc/rc.d/init.d/mqttbroker<br>
chkconfig --add mqttbroker<br>
service mqttbroker start<br>

#MQTT JavaScript Test
http://127.0.0.1:8080