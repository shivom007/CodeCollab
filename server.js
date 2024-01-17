const express = require('express');
const app = express();
const cors = require('cors');
app.use(cors());

const http = require('http');
const path = require('path');
const bodyP = require("body-parser")


const compiler = require("compilex")
const { Server } = require('socket.io');
const ACTIONS = require('./src/Actions');
const options = { stats: true }
compiler.init(options)
app.use(bodyP.json())
app.use(express.json())
app.use(express.urlencoded({extended:true}));

const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('build'));
app.use((req, res, next) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});


const userSocketMap = {};
function getAllConnectedClients(roomId) {
    // Map
    return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
        (socketId) => {
            return {
                socketId,
                username: userSocketMap[socketId],
            };
        }
    );
}

io.on('connection', (socket) => {
    console.log('socket connected', socket.id);

    socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
        userSocketMap[socket.id] = username;
        socket.join(roomId);
        const clients = getAllConnectedClients(roomId);
        clients.forEach(({ socketId }) => {
            io.to(socketId).emit(ACTIONS.JOINED, {
                clients,
                username,
                socketId: socket.id,
            });
        });
    });

    socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
        socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
    });

    socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
        io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
    });

    socket.on(ACTIONS.COMPILE, (data) => {
        const { code, input, lang } = data;
    
        try {
          if (lang === 'Cpp') {
            if (!input) {
              const envData = { OS: 'windows', cmd: 'g++', options: { timeout: 10000 } };
              compiler.compileCPP(envData, code, (data) => {
                if (data.output) {
                  socket.emit('compile_result', data);
                } else {
                  socket.emit('compile_result', { output: 'error' });
                }
              });
            } else {
              const envData = { OS: 'windows', cmd: 'g++', options: { timeout: 10000 } };
              compiler.compileCPPWithInput(envData, code, input, (data) => {
                if (data.output) {
                  socket.emit('compile_result', data);
                } else {
                  socket.emit('compile_result', { output: 'error' });
                }
              });
            }
          } else if (lang === 'Java') {
            if (!input) {
              const envData = { OS: 'windows' };
              compiler.compileJava(envData, code, (data) => {
                if (data.output) {
                  socket.emit('compile_result', data.output);
                } else {
                  socket.emit('compile_result', { output: 'error' });
                }
              });
            } else {
              const envData = { OS: 'windows' };
              compiler.compileJavaWithInput(envData, code, input, (data) => {
                if (data.output) {
                  socket.emit('compile_result', data);
                } else {
                  socket.emit('compile_result', { output: 'error' });
                }
              });
            }
          } else if (lang === 'Python') {
            if (!input) {
              const envData = { OS: 'windows' };
              compiler.compilePython(envData, code, (data) => {
                if (data.output) {
                  socket.emit('compile_result', data);
                } else {
                  socket.emit('compile_result', { output: 'error' });
                }
              });
            } else {
              const envData = { OS: 'windows' };
              compiler.compilePythonWithInput(envData, code, input, (data) => {
                if (data.output) {
                  socket.emit('compile_result', data);
                } else {
                  socket.emit('compile_result', { output: 'error' });
                }
              });
            }
          }
        } catch (e) {
          console.log('Error:', e);
          socket.emit('compile_result', { output: 'error' });
        }
      });
      socket.on("delete_file", () => {
       compiler.flush(function () {
        console.log("File Deleted succesfully")
       })
      });
    

    socket.on('disconnecting', () => {
        const rooms = [...socket.rooms];
        rooms.forEach((roomId) => {
            socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
                socketId: socket.id,
                username: userSocketMap[socket.id],
            });
        });
        delete userSocketMap[socket.id];
        socket.leave();
    });
});

app.get("/", (res,req) => {
    res.status(200).json("Healthy")
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Listening on port ${PORT}`));
