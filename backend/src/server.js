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
import { SpeechClient } from '@google-cloud/speech';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

//middleware
app.use(cors({
  origin: [
    'https://ai-teaching-assistance-project.vercel.app',
    'https://ai-teaching-assistance-project.onrender.com'
  ],
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


  // WebSocket endpoint for Google Speech-to-Text streaming
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    console.log('Upgrade request for', request.url, 'from', request.socket.remoteAddress);
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

  app.get('/ws/realtime-proxy', (req, res) => {
    res.status(200).send('websocket proxy endpoint');
  });

  wss.on('connection', (clientWs, request) => {
    console.log('[WS] Client connected from', request.socket.remoteAddress);
    const speechClient = new SpeechClient();

    let recognizeStream = null;
    let clientClosed = false;

    // Start Google streaming recognize
    function startRecognitionStream() {
      recognizeStream = speechClient
        .streamingRecognize({
          config: {
            encoding: 'LINEAR16',
            sampleRateHertz: 16000,
            languageCode: 'en-US',
          },
          interimResults: true,
        })
        .on('error', (err) => {
          console.error('[Google] Streaming error:', err.message);
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: 'error', message: err.message }));
          }
        })
        .on('data', (data) => {
          if (clientWs.readyState === WebSocket.OPEN) {
            const transcript = data.results
              .map(r => r.alternatives[0].transcript)
              .join(' ');
            clientWs.send(JSON.stringify({ type: 'transcript', transcript, isFinal: !!data.results[0]?.isFinal }));
          }
        });
    }

    startRecognitionStream();

    clientWs.on('message', (message) => {
      // Expect binary PCM audio frames from client
      if (!recognizeStream) return;
      recognizeStream.write(message);
    });

    clientWs.on('close', () => {
      clientClosed = true;
      if (recognizeStream) {
        recognizeStream.end();
        recognizeStream = null;
      }
      console.log('[WS] Client disconnected');
    });

    clientWs.on('error', (err) => {
      console.error('[WS] Client error', err.message);
    });
  });

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});

