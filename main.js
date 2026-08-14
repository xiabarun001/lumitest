// Lumitest 桌宠 - Electron 主进程
// 职责:透明置顶小窗 + 本地通知接口(127.0.0.1)+ 右键菜单。
// 机器差异一律走环境变量(PET_PORT),不写死路径(路径从 import.meta.url 推导)。
import { app, BrowserWindow, ipcMain, Menu, screen } from 'electron';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// 机器本地配置(名字、端口覆盖):优先读自己目录的 .env(独立部署),
// 没有再读 ../qa-automation/.env(与上级测试框架共用一份时);都不入库
try { process.loadEnvFile(path.join(__dirname, '.env')); } catch {
  try { process.loadEnvFile(path.join(__dirname, '..', 'qa-automation', '.env')); } catch {}
}
const PORT = Number(process.env.PET_PORT || 38999);
const OWNER = (process.env.PET_OWNER || '').trim();
const WIN_W = 196;
const WIN_H = 224;

let win = null;

// —— 位置记忆(存在系统 userData 目录,不进仓库)——
const stateFile = () => path.join(app.getPath('userData'), 'pet-state.json');
function loadState() {
  try { return JSON.parse(fs.readFileSync(stateFile(), 'utf8')); } catch { return {}; }
}
function saveState(patch) {
  const s = { ...loadState(), ...patch };
  try { fs.writeFileSync(stateFile(), JSON.stringify(s)); } catch {}
}

// —— 换肤:扫 assets/<状态>/ 下的图片帧,有就发给渲染进程用,没有就用内置 SVG 形象 ——
function buildAssetManifest() {
  const manifest = { frames: {}, config: {}, owner: OWNER };
  for (const st of ['idle', 'success', 'fail', 'attention', 'urgent', 'cry', 'angry', 'hello']) {
    const dir = path.join(__dirname, 'assets', st);
    try {
      const frames = fs.readdirSync(dir)
        .filter((f) => /\.(png|gif|webp|jpe?g)$/i.test(f))
        .sort()
        .map((f) => pathToFileURL(path.join(dir, f)).href);
      if (frames.length) manifest.frames[st] = frames;
    } catch {}
  }
  try {
    manifest.config = JSON.parse(fs.readFileSync(path.join(__dirname, 'assets', 'config.json'), 'utf8'));
  } catch {}
  return manifest;
}

function createWindow() {
  const { workArea } = screen.getPrimaryDisplay();
  const saved = loadState();
  // 默认右下角;有记忆位置就用,但要夹回可见范围(防止换显示器后跑到屏幕外)
  let x = saved.x ?? (workArea.x + workArea.width - WIN_W - 24);
  let y = saved.y ?? (workArea.y + workArea.height - WIN_H - 8);
  x = Math.min(Math.max(x, workArea.x - WIN_W + 60), workArea.x + workArea.width - 60);
  y = Math.min(Math.max(y, workArea.y), workArea.y + workArea.height - 60);

  win = new BrowserWindow({
    width: WIN_W,
    height: WIN_H,
    x, y,
    transparent: true,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
    },
  });
  win.setAlwaysOnTop(true, 'floating');
  // 默认整窗鼠标穿透(透明区域不挡桌面点击);光标移到猫/气泡上时渲染进程会要求接管
  win.setIgnoreMouseEvents(true, { forward: true });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.webContents.on('did-finish-load', () => {
    win.webContents.send('pet-assets', buildAssetManifest());
  });
}

// —— 拖动:渲染进程发屏幕坐标增量,主进程挪窗口 ——
ipcMain.on('pet-drag', (_e, { dx, dy }) => {
  if (!win) return;
  const [x, y] = win.getPosition();
  win.setPosition(x + dx, y + dy);
});
ipcMain.on('pet-drag-end', () => {
  if (!win) return;
  const [x, y] = win.getPosition();
  saveState({ x, y });
});

// 光标在猫/气泡上 → 接管鼠标;离开 → 恢复穿透
ipcMain.on('pet-hover', (_e, over) => {
  win?.setIgnoreMouseEvents(!over, over ? undefined : { forward: true });
});

// —— 右键菜单 ——
ipcMain.on('pet-context', () => {
  const face = (label, state) => ({ label, click: () => win?.webContents.send('pet-state', state) });
  const menu = Menu.buildFromTemplate([
    {
      label: '换表情',
      submenu: [
        face('😊 开心', 'success'),
        face('🙅 摇头(Fail)', 'fail'),
        face('📣 喊你', 'attention'),
        face('💦 着急', 'urgent'),
        face('😭 大哭', 'cry'),
        face('💢 生气', 'angry'),
        face('👋 挥手', 'hello'),
        { type: 'separator' },
        face('😌 回待机', 'idle'),
      ],
    },
    { label: '重新加载形象', click: () => { win?.reload(); } },
    { type: 'separator' },
    { label: '退出桌宠', click: () => app.quit() },
  ]);
  menu.popup({ window: win });
});

// —— 本地通知接口:测试脚本 POST 过来,桌宠做动作 + 弹气泡 ——
// 只听 127.0.0.1,不对外。POST /notify {type, title, message, sticky} ; GET /health
function startServer() {
  const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: true, pet: 'lumitest' }));
    }
    // 调试用:抓当前桌宠窗口画面(含透明通道),返回 PNG
    if (req.method === 'GET' && req.url === '/shot') {
      if (!win) { res.writeHead(503); return res.end(); }
      win.webContents.capturePage().then((img) => {
        res.writeHead(200, { 'Content-Type': 'image/png' });
        res.end(img.toPNG());
      }).catch(() => { res.writeHead(500); res.end(); });
      return;
    }
    if (req.method === 'POST' && req.url === '/notify') {
      let body = '';
      req.on('data', (c) => { body += c; if (body.length > 64 * 1024) req.destroy(); });
      req.on('end', () => {
        try {
          const p = JSON.parse(body || '{}');
          const type = ['success', 'fail', 'attention', 'urgent', 'cry', 'angry', 'info'].includes(p.type) ? p.type : 'info';
          const payload = {
            type,
            title: String(p.title || '').slice(0, 80),
            message: String(p.message || '').slice(0, 500),
            // 坏消息(fail/attention/urgent/cry/angry)默认停留到你点掉为止,success/info 自动消失
            sticky: p.sticky ?? ['fail', 'attention', 'urgent', 'cry', 'angry'].includes(type),
          };
          win?.webContents.send('pet-notify', payload);
          if (payload.sticky) { win?.show(); win?.moveTop(); }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'bad json' }));
        }
      });
      return;
    }
    res.writeHead(404);
    res.end();
  });
  server.on('error', (err) => {
    console.error(`[pet] 通知端口 ${PORT} 起不来(${err.code}),可能已有一只桌宠在跑`);
  });
  server.listen(PORT, '127.0.0.1');
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.whenReady().then(() => {
    if (process.platform === 'darwin') app.dock?.hide();
    createWindow();
    startServer();
  });
  app.on('window-all-closed', () => app.quit());
}
