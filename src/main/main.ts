import { app, BrowserWindow, ipcMain, session } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { openDatabase, type DatabaseHandle } from './database.js';
import { hashPassword, verifyPassword } from './security.js';

let database: DatabaseHandle;
let mainWindow: BrowserWindow;
const signupSchema = z.object({ fullName: z.string().trim().min(2), email: z.string().email(), phone: z.string().trim().min(7), shopName: z.string().trim().min(2), address: z.string().trim().min(3), password: z.string().min(8), confirmPassword: z.string() }).refine((value) => value.password === value.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] });
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
const mainDirectory = path.dirname(fileURLToPath(import.meta.url));

function registerIpc(): void {
  ipcMain.handle('auth:status', () => ({ initialized: Boolean(database.prepare('SELECT id FROM shop_settings WHERE id = 1').get()) }));
  ipcMain.handle('auth:signup', (_event, input: unknown) => {
    const values = signupSchema.parse(input);
    if (database.prepare('SELECT id FROM users WHERE email = ?').get(values.email.toLowerCase())) throw new Error('An account with this email already exists.');
    const create = database.transaction(() => {
      database.prepare('INSERT INTO shop_settings(id, shop_name, owner_name, email, phone, address) VALUES (1, ?, ?, ?, ?, ?)').run(values.shopName, values.fullName, values.email.toLowerCase(), values.phone, values.address);
      database.prepare('INSERT INTO users(email, full_name, password_hash, role) VALUES (?, ?, ?, ?)').run(values.email.toLowerCase(), values.fullName, hashPassword(values.password), 'owner');
    });
    create();
    return { success: true };
  });
  ipcMain.handle('auth:login', (_event, input: unknown) => {
    const values = loginSchema.parse(input);
    const user = database.prepare('SELECT id, email, full_name as fullName, role, password_hash as passwordHash FROM users WHERE email = ? AND active = 1').get(values.email.toLowerCase()) as { id: number; email: string; fullName: string; role: string; passwordHash: string } | undefined;
    if (!user || !verifyPassword(values.password, user.passwordHash)) throw new Error('Invalid email or password.');
    const shop = database.prepare('SELECT shop_name as shopName, currency FROM shop_settings WHERE id = 1').get() as { shopName: string; currency: string };
    return { user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role }, shop };
  });
  ipcMain.handle('dashboard:summary', () => {
    const summary = database.prepare(`SELECT (SELECT COUNT(*) FROM products WHERE archived = 0) as products, (SELECT COALESCE(SUM(stock_quantity), 0) FROM product_variants) as units, (SELECT COUNT(*) FROM customers) as customers, (SELECT COUNT(*) FROM product_variants WHERE stock_quantity = 0) as outOfStock, (SELECT COUNT(*) FROM product_variants v JOIN products p ON p.id = v.product_id WHERE v.stock_quantity <= p.low_stock_threshold AND v.stock_quantity > 0) as lowStock, (SELECT COALESCE(SUM(total_minor), 0) FROM sales WHERE status = 'completed' AND date(sold_at) = date('now', 'localtime')) as todaySales, (SELECT COUNT(*) FROM sales WHERE status = 'completed' AND date(sold_at) = date('now', 'localtime')) as todayBills`).get();
    return summary;
  });
}

function createWindow(): void {
  const preloadPath = app.isPackaged
    ? path.join(app.getAppPath(), 'dist/preload/preload.cjs')
    : path.join(mainDirectory, '../preload/preload.cjs');
  mainWindow = new BrowserWindow({ width: 1440, height: 900, minWidth: 1100, minHeight: 700, webPreferences: { preload: preloadPath, contextIsolation: true, nodeIntegration: false, sandbox: false } });
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error(`Renderer failed to load (${errorCode}): ${errorDescription}`);
  });
  mainWindow.webContents.on('console-message', (_event, level, message) => {
    console.error(`Renderer console (${level}): ${message}`);
  });
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error(`Renderer process exited: ${details.reason}`);
  });
  if (!app.isPackaged && process.env.VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    void mainWindow.loadFile(path.join(app.getAppPath(), 'dist/renderer/index.html'));
  }
}

app.whenReady().then(() => {
  database = openDatabase();
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => callback({ responseHeaders: { ...details.responseHeaders, 'Content-Security-Policy': ["default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' ws://127.0.0.1:5173"] } }));
  registerIpc();
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
}).catch((error: unknown) => {
  console.error('Electron startup failed:', error);
  app.quit();
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
