#!/usr/bin/env node

import * as https from "node:https";
import * as fs from "node:fs";
import { WebSocketServer } from "ws";

const httpsOptions = {
  key: fs.readFileSync(process.env.NOCRESS_KEY),
  cert: fs.readFileSync(process.env.NOCRESS_CERT),
};

let httpsServer = https.createServer(httpsOptions);
httpsServer.listen(6257);

let server = new WebSocketServer({ server: httpsServer });

let waitingPlayers = [];
let connections = 0;

server.on("connection", (socket) => {
  connections++;
  
  socket.nocress = {};
  socket.nocress.username = "Anonymous";
  
  socket.on("message", (data) => {
    let message;
    
    try {
      message = JSON.parse(data);
    } catch {
      return;
    }
    
    if (message.action == "setUsername") {
      if (message.username && typeof(message.username) == "string" && message.username.length <= 32) {
        socket.nocress.username = message.username;
      }
    } else if (message.action == "findOpponent") {
      if (socket.nocress.opponent) {
        socket.nocress.opponent.send(JSON.stringify({
          action: "gameEnd"
        }));
        
        socket.nocress.opponent.nocress.opponent = undefined;
      }
      
      socket.nocress.opponent = waitingPlayers.shift();
      
      if (!socket.nocress.opponent) {
        waitingPlayers.push(socket);
      } else {
        socket.nocress.opponent.nocress.opponent = socket;
        
        if (Math.round(Math.random())) {
          socket.send(JSON.stringify({
            action: "foundOpponent",
            opponent: 1,
            username: socket.nocress.opponent.nocress.username
          }));
          
          socket.nocress.opponent.send(JSON.stringify({
            action: "foundOpponent",
            opponent: 2,
            username: socket.nocress.username
          }));
        } else {
          socket.send(JSON.stringify({
            action: "foundOpponent",
            opponent: 2,
            username: socket.nocress.opponent.nocress.username
          }));
          
          socket.nocress.opponent.send(JSON.stringify({
            action: "foundOpponent",
            opponent: 1,
            username: socket.nocress.username
          }));
        }
      }
    } else if (message.action == "move") {
      if (socket.nocress.opponent) {
        socket.nocress.opponent.send(JSON.stringify({
          action: "move",
          fromX: message.fromX,
          fromY: message.fromY,
          x: message.x,
          y: message.y,
        }));
      }
    }
  });
  
  socket.on("close", () => {
    connections--;
    
    if (socket.nocress.opponent) {
      socket.nocress.opponent.send(JSON.stringify({
        action: "gameEnd"
      }));
      
      socket.nocress.opponent.nocress.opponent = undefined;
    }
    
    for (let i = 0; i < waitingPlayers.length; i++) {
      if (socket == waitingPlayers[i]) {
        waitingPlayers.splice(i, 1);
      }
    }
  });
});

setInterval(() => {
  let date = new Date();
  fs.appendFileSync(
    `${process.env.NOCRESS_LOG_DIR}/${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}.log`,
    `${date.getHours()}:${date.getMinutes().toString().padStart(2, "0")},${connections}\r\n`
  );
}, 60000);
