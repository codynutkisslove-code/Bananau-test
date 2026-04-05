import express from 'express';
import { createServer } from 'node:http';
import { uvPath } from '@titaniumnetwork-dev/ultraviolet';
import { baremuxPath } from '@tomphttp/bare-mux/node';
import { Server } from '@tomphttp/bare-server-node';

const app = express();
const server = createServer();
const bareServer = new Server('/bare/', '');

// Serve your frontend files (index.html, styles.css, script.js)
app.use(express.static('public')); 


app.use('/uv/', express.static(uvPath));

server.on('request', (req, res) => {
    if (bareServer.shouldRoute(req)) {
        bareServer.routeRequest(req, res);
    } else {
        app(req, res);
    }
});

server.on('upgrade', (req, socket, head) => {
    if (bareServer.shouldRoute(req)) {
        bareServer.routeUpgrade(req, socket, head);
    } else {
        socket.end();
    }
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`Banana Search running on port ${PORT}`));
