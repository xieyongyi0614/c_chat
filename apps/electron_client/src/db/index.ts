import { dbManager } from './DatabaseManager';
import { ConversationTable } from './table/ConversationTable';
import { MessageTable } from './table/MessageTable';
import { StoreTable } from './table/StoreTable';
import { UploadTaskTable } from './table/UploadTaskTable';

export const storeTableClass = dbManager.registerTableClass(StoreTable);
export const conversationTableClass = dbManager.registerTableClass(ConversationTable);
export const messageTableClass = dbManager.registerTableClass(MessageTable);
export const uploadTaskTableClass = dbManager.registerTableClass(UploadTaskTable);
dbManager.initGlobalDb();
