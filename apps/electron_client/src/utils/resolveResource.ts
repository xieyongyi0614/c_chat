import { app } from 'electron';
import path from 'path';

export function resolveResource(...paths: string[]) {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, ...paths);
  }

  return path.join(__dirname, '../../resources', ...paths);
}
