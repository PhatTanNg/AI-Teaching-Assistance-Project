import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectDB } from "./libs/db.js";
import authRoute from "./routes/authRoute.js";
import userRoute from "./routes/userRoute.js";
import transcribeRoute from "./routes/transcribeRoute.js";
import { protectedRoute } from "./middlewares/authMiddleware.js";
import http from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import axios from 'axios';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

//middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());

// Debug middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

//public routes
app.use("/api/auth", authRoute);
app.use("/api/transcribe", transcribeRoute);

//private routes
//app.use(protectedRoute);
app.use("/api/users",protectedRoute , userRoute);


connectDB().then(() => {
  const server = http.createServer(app);

  // WebSocket proxy endpoint for Deepgram realtime streaming
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    // log upgrade attempts for debugging
    console.log('Upgrade request for', request.url, 'from', request.socket.remoteAddress);
    // only handle our realtime proxy path
    if (request.url && request.url.startsWith('/ws/realtime-proxy')) {
      try {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      } catch (e) {
        console.error('Error handling upgrade', e);
        try { socket.destroy(); } catch (e2) {}
      }
    } else {
      socket.destroy();
    }
  });

  // simple HTTP GET to verify backend is reachable at the websocket path
  app.get('/ws/realtime-proxy', (req, res) => {
    res.status(200).send('websocket proxy endpoint');
  });

  wss.on('connection', (clientWs, request) => {
    console.log('[WS] Client connected from', request.socket.remoteAddress);
    // create a websocket to Deepgram with server-side API key
    const deepgramKey = process.env.DEEPGRAM_API_KEY;
    if (!deepgramKey) {
      console.error('[WS] DEEPGRAM_API_KEY not set');
      clientWs.send(JSON.stringify({ type: 'error', message: 'Server missing DEEPGRAM_API_KEY' }));
      clientWs.close();
      return;
    }

    // Use Deepgram realtime/listen websocket endpoint. Use 'listen' path for realtime audio.
    const dgUrl = 'wss://api.deepgram.com/v1/listen?model=nova-2&language=en-US&sample_rate=16000&encoding=linear16';
    console.log('[DG] Connecting to:', dgUrl);
    const dgWs = new WebSocket(dgUrl, {
      headers: {
        Authorization: `Token ${deepgramKey}`,
      },
    });
    // buffer messages from client until dgWs is open
    const pendingMessages = [];
    let clientDisconnected = false;

    const isOpen = (s) => s && s.readyState === WebSocket.OPEN;

    dgWs.on('open', () => {
      console.log('[DG] Connection established');
      // notify client if possible
      if (isOpen(clientWs)) {
        try { clientWs.send(JSON.stringify({ type: 'status', message: 'connected-to-deepgram' })); } catch (e) { console.warn('[DG] clientWs send failed on open', e); }
      }
      // flush pending messages
      try {
        if (pendingMessages.length > 0) {
          console.log('[DG] Flushing', pendingMessages.length, 'pending messages');
          for (const m of pendingMessages) {
            if (isOpen(dgWs)) dgWs.send(m);
          }
        }
      } catch (e) {
        console.warn('[DG] Error flushing pending messages to Deepgram', e);
      }
      pendingMessages.length = 0;
    });

    dgWs.on('message', (msg) => {
      // forward Deepgram messages to client
      console.log('[DG] Received message from Deepgram, length:', msg.length);
      try {
        if (isOpen(clientWs)) {
          clientWs.send(msg);
          console.log('[DG] Forwarded message to client');
        } else {
          console.warn('[DG] clientWs not open, dropping message from Deepgram');
        }
      } catch (e) {
        console.warn('[DG] Error forwarding message to client', e.message);
      }
    });

    dgWs.on('close', (code, reason) => {
      console.log('[DG] Connection closed with code', code, reason ? '(' + reason.toString() + ')' : '');
      if (!clientDisconnected && isOpen(clientWs)) {
        try { clientWs.close(4000, 'Deepgram connection closed'); } catch (e) { console.warn('[DG] Error closing clientWs after dg close', e); }
      }
    });

    dgWs.on('error', (err) => {
      console.error('[DG] Connection error', err && err.message);
      try { if (isOpen(clientWs)) clientWs.send(JSON.stringify({ type: 'error', message: 'deepgram connection error', details: err.message })); } catch (e) { console.warn('[DG] Failed to notify client about error', e); }
    });

    clientWs.on('message', (message) => {
      // binary audio frames or control messages are forwarded to Deepgram
      console.log('[WS] Received message from client, length:', message.length);
      try {
        if (isOpen(dgWs)) {
          dgWs.send(message);
          console.log('[WS] Forwarded message to Deepgram');
        } else {
          // buffer until open
          console.log('[WS] Buffering message (Deepgram not open yet)');
          pendingMessages.push(message);
        }
      } catch (e) {
        console.warn('[WS] Error sending to Deepgram:', e.message);
        pendingMessages.push(message);
      }
    });

    clientWs.on('close', () => {
      clientDisconnected = true;
      console.log('[WS] Client disconnected');
      try { dgWs.close(1000, 'Client disconnected'); } catch (e) {}
    });

    clientWs.on('error', (err) => {
      console.error('[WS] Client error', err.message);
    });
  });

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});

