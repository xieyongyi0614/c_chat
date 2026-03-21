import { dbManager } from './DatabaseManager';
import { StoreTable } from './table/StoreTable';

export const storeTableClass = dbManager.registerTableClass(StoreTable);
dbManager.initGlobalDb();
