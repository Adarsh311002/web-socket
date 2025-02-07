import express from "express";
import {createServer} from "node:http";
import { fileURLToPath } from "node:url";
import {dirname,join} from "node:path";
import { Server } from 'socket.io';
import sqlite3 from 'sqlite3';
import { open } from "sqlite";

const app = express();
const server = createServer(app);
const io = new Server(server)

const db = await open({
    filename: 'chat.db',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_offset TEXT UNIQUE,
        content TEXT
    );
  `);

const _dirname = dirname(fileURLToPath(import.meta.url));

app.get("/",(req,res) => {
    res.sendFile(join(_dirname,'index.html'))
});



io.on('connection',async (socket) => {
    socket.on('chat message', async(msg) => {
        let result;
        try {
            result = await db.run('INSERT INTO messages (content) VALUES (?)', msg)
        } catch (error) {
            return;
        }
        io.emit('chat message', msg,result.lastID);
    })

    if(!socket.recovered){
        try {
            await db.each('SELECT id, content FROM messages WHERE id > ?',
              [socket.handshake.auth.serverOffset || 0],
              (_err, row) => {
                socket.emit('chat message', row.content, row.id);
              }
            )
          } catch (error) {
            console.log("Something went wrong",error);            
        }
    }
})

server.listen(3000,() => {
    console.log("server is running on port 3000")
});




