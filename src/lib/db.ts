import Dexie, { type EntityTable } from 'dexie';
import type { Product } from '../types/product';

export interface LocalProduct extends Product {
  synced?: boolean;
}

const db = new Dexie('bipDatabase') as Dexie & {
  products: EntityTable<LocalProduct, 'id'>;
};

db.version(2).stores({
  products: 'id, barcode, tenantId, name, category, shelfQty, shelfMinQty, depotQty',
});

export { db };
