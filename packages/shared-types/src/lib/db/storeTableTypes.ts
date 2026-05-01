import { db } from '@c_chat/shared-config';

export namespace StoreTableTypes {
  export type StoreKey = (typeof db.store)[keyof typeof db.store];

  export type StoreItem = {
    key: StoreKey;
    window_id: number;
    value: string;
    expiry: string;
  };
}
