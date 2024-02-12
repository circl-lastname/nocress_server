#!/usr/bin/env node

import { WebSocketServer } from "ws";

let server = new WebSocketServer({ port: 6257 });

let waitingPlayers = [];

server.on("connection", (socket) => {
  socket.nocress = {};
  
  socket.on("message", (data) => {
    let message = JSON.parse(data);
    
    if (message.action == "findOpponent") {
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
        
        socket.send(JSON.stringify({
          action: "foundOpponent",
          opponent: 1
        }));
        
        socket.nocress.opponent.send(JSON.stringify({
          action: "foundOpponent",
          opponent: 2
        }));
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
  console.log(waitingPlayers.length);
}, 1000);
