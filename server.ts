import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';
import { handleChat, getHistory } from './src/lib/chat-handler';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new SocketIOServer(server, {
    cors: { origin: '*' },
  });

  // Share io instance with API routes
  (globalThis as any).__io = io;

  io.on('connection', (socket) => {
    // --- Customer chat ---
    socket.on('chat:join', (conversationId: string) => {
      socket.join(`conv:${conversationId}`);
    });

    socket.on('chat:leave', (conversationId: string) => {
      socket.leave(`conv:${conversationId}`);
    });

    socket.on('chat:send', async (data: { conversationId: string | null; message: string }) => {
      try {
        const result = await handleChat(data.conversationId, data.message);

        // Join room for new conversations
        if (result.isNew) {
          socket.join(`conv:${result.conversationId}`);
        }

        // Tell the sender the conversation ID (needed for new convos)
        socket.emit('chat:conversation', { conversationId: result.conversationId });

        // Conversation has ended — notify customer
        if (result.ended) {
          socket.emit('chat:ended', { conversationId: result.conversationId });
          return;
        }

        // Send reply messages to the conversation room (customer + anyone)
        for (const msg of result.replyMessages) {
          io.to(`conv:${result.conversationId}`).emit('chat:reply', msg);
        }

        // Waiting status
        if (result.waitingForAgent) {
          io.to(`conv:${result.conversationId}`).emit('chat:waiting', {
            conversationId: result.conversationId,
            waitingForAgent: true,
          });
        }

        // Notify admins
        io.to('admin').emit('admin:message', {
          conversationId: result.conversationId,
          message: result.userMessage,
        });
        for (const msg of result.replyMessages) {
          io.to('admin').emit('admin:message', {
            conversationId: result.conversationId,
            message: msg,
          });
        }
        io.to('admin').emit('admin:conversation-update', {
          conversationId: result.conversationId,
        });
      } catch (err) {
        socket.emit('chat:error', {
          message: err instanceof Error ? err.message : '处理消息失败',
        });
      }
    });

    socket.on('chat:history', (conversationId: string) => {
      const result = getHistory(conversationId);
      socket.emit('chat:history', result);
    });

    // --- Admin ---
    socket.on('admin:join', () => {
      socket.join('admin');
    });

    socket.on('admin:leave', () => {
      socket.leave('admin');
    });

    socket.on('disconnect', () => {});
  });

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
