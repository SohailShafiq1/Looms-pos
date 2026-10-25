import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('loom', {
  auth: {
    status: () => ipcRenderer.invoke('auth:status'),
    signup: (input: unknown) => ipcRenderer.invoke('auth:signup', input),
    login: (input: unknown) => ipcRenderer.invoke('auth:login', input)
  },
  dashboard: { summary: () => ipcRenderer.invoke('dashboard:summary') }
});
