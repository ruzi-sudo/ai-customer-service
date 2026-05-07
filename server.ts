import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';
import { handleChat, getHistory } from './src/lib/chat-handler';
import Database from 'better-sqlite3';
import path from 'path';
import cron from 'node-cron';

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

  // Auto-end stale conversations every 5 minutes
  const THIRTY_MIN = 30 * 60 * 1000;
  const sqlite = new Database(path.join(process.cwd(), 'data', 'customer-service.db'));
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  cron.schedule('*/5 * * * *', () => {
    const cutoff = Date.now() - THIRTY_MIN;
    const rows = sqlite.prepare(
      `SELECT id FROM conversations WHERE status = 'active' AND updated_at <= ?`
    ).all(Math.floor(cutoff / 1000)) as { id: string }[];

    if (rows.length === 0) return;

    const stmt = sqlite.prepare(
      `UPDATE conversations SET status = 'ended', updated_at = ? WHERE id = ?`
    );
    const now = Math.floor(Date.now() / 1000);

    for (const row of rows) {
      stmt.run(now, row.id);
      io.to(`conv:${row.id}`).emit('chat:status', {
        conversationId: row.id,
        status: 'ended',
      });
    }

    io.to('admin').emit('admin:conversation-update', {});
    console.log(`[auto-end] Ended ${rows.length} stale conversation(s)`);
  });

  // Prompt rating for active conversations whose last message is >1min old and unrated
  const ONE_MIN = 60;
  cron.schedule('* * * * *', () => {
    const cutoff = Math.floor(Date.now() / 1000) - ONE_MIN;
    const rows = sqlite.prepare(
      `SELECT c.id, MAX(m.created_at) as last_msg_at
       FROM conversations c
       JOIN messages m ON m.conversation_id = c.id
       WHERE c.status = 'active' AND c.rating IS NULL
       GROUP BY c.id
       HAVING last_msg_at <= ?`
    ).all(cutoff) as { id: string; last_msg_at: number }[];

    for (const row of rows) {
      io.to(`conv:${row.id}`).emit('chat:rating', { conversationId: row.id });
    }
  });
});
