import Dexie, { type EntityTable } from 'dexie';

interface Product {
  id: string;
  tenant_id: string;
  barcode: string;
  name: string;
  depot_qty: number;
  depot_location: string;
  shelf_qty: number;
  shelf_location: string;
  shelf_min_qty: number;
}

const db = new Dexie('GoPMEDatabase') as Dexie & {
  products: EntityTable<Product, 'id'>;
};

db.version(1).stores({
  products: 'id, barcode, tenant_id'
});

export { db };
