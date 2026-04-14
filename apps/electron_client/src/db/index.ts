import { dbManager } from './DatabaseManager';
import { ConversationTable } from './table/ConversationTable';
import { MessageTable } from './table/MessageTable';
import { StoreTable } from './table/StoreTable';

export const storeTableClass = dbManager.registerTableClass(StoreTable);
export const conversationTableClass = dbManager.registerTableClass(ConversationTable);
export const messageTableClass = dbManager.registerTableClass(MessageTable);
dbManager.initGlobalDb();
