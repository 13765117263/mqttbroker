var client;

function connect() {
	var connected = btn_connect.innerText != 'connect';
	errmsg.innerText = '';
	if (!connected) {
		client = new Paho.MQTT.Client(host.value, parseInt(port.value), clientId.value);
		client.onConnectionLost = onConnectionLost;
		client.onMessageArrived = onMessageArrived;

		client.connect({
			userName: user.value,
			password: pwd.value,
			cleanSession: true,
			keepAliveInterval: 10,
			onSuccess: onConnect,
			onFailure: onError
		});
		btn_connect.innerText = 'disconnect';
	} else {
		client.disconnect();
		btn_connect.innerText = 'connect';
	}
}

function onConnect() {
	client.subscribe(subscribe.value, {qos: 0});
	host.disabled =
		port.disabled =
		user.disabled =
		pwd.disabled =
		clientId.disabled =
		subscribe.disabled = true;
}

function onMessageArrived(message) {
	//console.log("onMessageArrived: ".concat(message.destinationName, "\r\n", message.payloadString));
	topic.value = message.destinationName;
	payload.value = message.payloadString;
}

function onConnectionLost(responseObject) {
	errmsg.innerText = "onConnectionLost: " + responseObject.errorMessage;
	host.disabled =
		port.disabled =
		user.disabled =
		pwd.disabled =
		clientId.disabled =
		subscribe.disabled = false;
	btn_connect.innerText = 'connect';
}

function onError(responseObject) {
	errmsg.innerText = "onError: " + responseObject.errorMessage;
	host.disabled =
		port.disabled =
		user.disabled =
		pwd.disabled =
		clientId.disabled =
		subscribe.disabled = false;
	btn_connect.innerText = 'connect';
}