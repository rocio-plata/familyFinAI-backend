import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Money } from '../../../../../src/contexts/financial-tracking/domain/value-objects/money.js';
import { Currency } from '../../../../../src/shared-kernel/domain/currency.js';

describe('Money', () => {
  const clp = Currency.of('CLP');
  const usd = Currency.of('USD');

  describe('of()', () => {
    it('crea instancia para monto cero', () => {
      assert.doesNotThrow(() => Money.of(0, clp));
    });

    it('crea instancia para monto positivo', () => {
      assert.doesNotThrow(() => Money.of(1000, clp));
    });

    it('lanza InvalidMoneyError para monto negativo', () => {
      assert.throws(() => Money.of(-1, clp), { name: 'InvalidMoneyError' });
    });
  });

  describe('add()', () => {
    it('suma dos montos con la misma moneda', () => {
      const a = Money.of(100, clp);
      const b = Money.of(200, clp);
      const result = a.add(b);
      assert.ok(result.isGreaterThan(a));
    });

    it('lanza InvalidMoneyError al sumar monedas distintas', () => {
      assert.throws(() => Money.of(100, clp).add(Money.of(100, usd)), { name: 'InvalidMoneyError' });
    });
  });

  describe('isGreaterThan()', () => {
    it('retorna true cuando el monto es mayor', () => {
      assert.ok(Money.of(200, clp).isGreaterThan(Money.of(100, clp)));
    });

    it('retorna false cuando los montos son iguales', () => {
      assert.ok(!Money.of(100, clp).isGreaterThan(Money.of(100, clp)));
    });

    it('retorna false cuando el monto es menor', () => {
      assert.ok(!Money.of(50, clp).isGreaterThan(Money.of(100, clp)));
    });

    it('lanza InvalidMoneyError al comparar monedas distintas', () => {
      assert.throws(() => Money.of(100, clp).isGreaterThan(Money.of(50, usd)), { name: 'InvalidMoneyError' });
    });
  });
});
