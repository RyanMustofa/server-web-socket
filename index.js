import { WebSocket, WebSocketServer } from "ws";
import http from "http";
import { randomUUID } from "crypto";
import process from "process";
import { isObject } from "util";

const server = http.createServer();
const wsServer = new WebSocketServer({ server });
const port = process.argv[2] || process.env.PORT || 9999;
server.listen(port, "0.0.0.0", () => {
	console.log("Websocket Running in port " + port);
});

const clients = {};
const users = {};

const typesDef = {
	USER_EVENT: "userevent",
	CONTENT_CHANGE: "contentchange",
};

function handleClose(userId) {
	console.log(`${userId} has disconnected`);
	delete clients[userId];
}

function handleMessage(message, userId) {
	let dataFromClient = JSON.parse(message.toString());
	if (isObject(dataFromClient)) {
		let { type, to, message } = dataFromClient;
		let isBroadcast = false;
		if (type && type === "broadcast") {
			for (let uid in clients) {
				let client = clients[uid];
				if (client.readyState === WebSocket.OPEN) {
					if (isObject(message)) {
						client.send(JSON.stringify(message));
					} else {
						client.send(message);
					}
				}
			}
		}
		if (to) {
			let client = clients[to];
			if (client) {
				if (client.readyState === WebSocket.OPEN) {
					if (isObject(message)) {
						client.send(JSON.stringify(message));
					} else {
						client.send(message);
					}
				}
			} else {
				clients[userId].send(
					JSON.stringify({ failure: 1, message: "client not found" })
				);
			}
		}
	}
}

wsServer.on("connection", (connection) => {
	let userId = randomUUID().toString();
	console.log("Received a new connection");
	clients[userId] = connection;
	connection.send(JSON.stringify({ token: userId, STATE: "connected" }));
	console.log(`${userId} connected.`);
	connection.on("message", (message) => handleMessage(message, userId));
	connection.on("close", () => handleClose(userId));
});
