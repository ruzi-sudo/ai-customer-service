import { v4 as uuid } from 'uuid';
import { hash } from 'bcryptjs';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'data', 'customer-service.db');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

// Create tables
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS admin_users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT '新对话',
    customer_name TEXT NOT NULL DEFAULT '访客',
    status TEXT NOT NULL DEFAULT 'active',
    mode TEXT NOT NULL DEFAULT 'ai',
    waiting_for_agent INTEGER NOT NULL DEFAULT 0,
    rating INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id),
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

async function seed() {
  const now = Date.now();

  // Default admin user
  const existingAdmin = sqlite.prepare('SELECT id FROM admin_users WHERE username = ?').get('admin');
  if (!existingAdmin) {
    const hashPwd = await hash('admin123', 10);
    sqlite.prepare(
      'INSERT INTO admin_users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)'
    ).run(uuid(), 'admin', hashPwd, Math.floor(now / 1000));
    console.log('✅ Created default admin user (admin / admin123)');
  }

  // Default settings
  const defaultSettings = [
    ['api_base_url', 'http://localhost:3001'],
    ['api_key', ''],
    ['workspace_slug', 'customer-support'],
    ['chat_mode', 'chat'],
    ['jwt_secret', 'change-me-in-production-' + uuid()],
  ];
  const insertSetting = sqlite.prepare(
    'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)'
  );
  for (const [key, value] of defaultSettings) {
    insertSetting.run(key, value);
  }
  console.log('✅ Created default settings');

  // Sample conversations
  const existing = sqlite.prepare('SELECT COUNT(*) as count FROM conversations').get() as { count: number };
  if ((existing as { count: number }).count === 0) {
    const conv1 = uuid();
    const conv2 = uuid();
    const conv3 = uuid();
    const conv4 = uuid();

    const insertConv = sqlite.prepare(
      'INSERT INTO conversations (id, title, customer_name, status, mode, waiting_for_agent, rating, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    const insertMsg = sqlite.prepare(
      'INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)'
    );

    insertConv.run(conv1, '订单 #1234 物流查询', '张三', 'active', 'ai', 0, 5,
      Math.floor((now - 3600000) / 1000), Math.floor((now - 1800000) / 1000));
    insertMsg.run(uuid(), conv1, 'user', '我的订单 #1234 已经发出来5天了还没到，能帮我查一下吗？', Math.floor((now - 3600000) / 1000));
    insertMsg.run(uuid(), conv1, 'assistant', '我来帮您查一下订单 #1234 的状态。根据系统显示，您的包裹目前已在本地配送站，预计明天送达。', Math.floor((now - 3590000) / 1000));
    insertMsg.run(uuid(), conv1, 'user', '可以改一下收货地址吗？', Math.floor((now - 1800000) / 1000));
    insertMsg.run(uuid(), conv1, 'assistant', '由于您的包裹已经在本地配送站，可能无法修改地址。建议您直接联系快递员，需要我提供快递员联系方式吗？', Math.floor((now - 1790000) / 1000));

    insertConv.run(conv2, '蓝牙耳机退货', '李四', 'closed', 'ai', 0, 4,
      Math.floor((now - 86400000) / 1000), Math.floor((now - 72000000) / 1000));
    insertMsg.run(uuid(), conv2, 'user', '我买的蓝牙耳机有噪音问题，想退货。', Math.floor((now - 86400000) / 1000));
    insertMsg.run(uuid(), conv2, 'assistant', '很抱歉听到这个问题。请问您的订单号是多少？我们提供30天无理由退货服务，确认订单号后我会为您指导退货流程。', Math.floor((now - 86390000) / 1000));

    insertConv.run(conv3, '会员积分咨询', '王五', 'active', 'ai', 0, null,
      Math.floor((now - 172800000) / 1000), Math.floor((now - 172000000) / 1000));
    insertMsg.run(uuid(), conv3, 'user', '我现在有多少积分？想兑换优惠券。', Math.floor((now - 172800000) / 1000));
    insertMsg.run(uuid(), conv3, 'assistant', '您目前有 2,350 积分。可以兑换以下优惠券：\n- 500积分抵50元\n- 1000积分抵100元\n- 2000积分抵200元\n需要为您兑换哪一张？', Math.floor((now - 172790000) / 1000));

    insertConv.run(conv4, '网站支付失败', '赵六', 'active', 'manual', 1, null,
      Math.floor((now - 259200000) / 1000), Math.floor((now - 258000000) / 1000));
    insertMsg.run(uuid(), conv4, 'user', '我付款一直报错，帮我看看！', Math.floor((now - 259200000) / 1000));
    insertMsg.run(uuid(), conv4, 'assistant', '很抱歉给您带来不便。支付报错可能有以下原因：\n1. 银行卡余额不足\n2. 网络连接问题\n3. 浏览器缓存问题\n\n请尝试以下操作：\n- 清除浏览器缓存\n- 换一种支付方式\n- 检查网络连接', Math.floor((now - 259190000) / 1000));
    insertMsg.run(uuid(), conv4, 'user', '这些我都试过了还是不行 @人工', Math.floor((now - 258500000) / 1000));
    insertMsg.run(uuid(), conv4, 'system', '已为您转接人工客服，请稍候...', Math.floor((now - 258490000) / 1000));

    console.log('✅ Created sample conversations');
  }

  console.log('\n🎉 Seed complete!');
  sqlite.close();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
