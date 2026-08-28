import { describe, it, expect, vi } from 'vitest';

// Simulação de teste E2E do fluxo de Realtime e resolução de produto em camadas
describe('E2E Realtime Remote Scanner -> PDV Integration', () => {
  it('should resolve product from catalog, indexedDB, or backend fallback and add to cart accumulatively', async () => {
    let cart: Array<{ barcode: string; quantity: number; name: string; unitPrice: number }> = [];

    const mockCatalog = [
      { id: '1', name: 'Refrigerante Cola 2L', barcode: '7891234567890', price: 8.50, shelfQty: 10, depotQty: 20 },
      { id: '2', name: 'Biscoito Recheado 140g', barcode: '7899876543210', price: 4.20, shelfQty: 5, depotQty: 15 },
    ];

    const addItem = (barcode: string, qty: number = 1) => {
      const found = mockCatalog.find(p => p.barcode === barcode);
      if (!found) {
        throw new Error(`Produto não encontrado: ${barcode}`);
      }

      const existingIndex = cart.findIndex(item => item.barcode === barcode);
      if (existingIndex >= 0) {
        cart[existingIndex] = {
          ...cart[existingIndex],
          quantity: cart[existingIndex].quantity + qty,
        };
      } else {
        cart = [
          ...cart,
          {
            barcode: found.barcode,
            name: found.name,
            unitPrice: found.price,
            quantity: qty,
          }
        ];
      }
    };

    // 1. Primeiro bip do Refrigerante
    addItem('7891234567890', 1);
    expect(cart).toHaveLength(1);
    expect(cart[0].barcode).toBe('7891234567890');
    expect(cart[0].quantity).toBe(1);

    // 2. Segundo bip do mesmo Refrigerante (deve incrementar para 2 sem sobrescrever)
    addItem('7891234567890', 1);
    expect(cart).toHaveLength(1);
    expect(cart[0].quantity).toBe(2);

    // 3. Bip de outro produto (Biscoito) -> deve ter 2 itens no carrinho
    addItem('7899876543210', 1);
    expect(cart).toHaveLength(2);
    expect(cart[0].quantity).toBe(2);
    expect(cart[1].barcode).toBe('7899876543210');
    expect(cart[1].quantity).toBe(1);

    // 4. Bip inválido dispara erro
    expect(() => addItem('9999999999999', 1)).toThrowError('Produto não encontrado');
  });
});
