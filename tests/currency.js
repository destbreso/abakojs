"use strict";

const {
  value,
  cents,
  cents2Amount,
  sum,
  fx,
  add,
  subtract,
  multiply,
  divide,
  percent,
  compare,
  isValid,
  isZero,
  isPositive,
  isNegative,
  maxTax,
  applyTax,
  applyMaxTax,
  applySumTax,
  applyDiscount,
  applyMaxDiscount,
  applySumDiscount,
  addPercent,
  deductPercent,
  maxFee,
  addMaxFee,
  addFees,
  deductMaxFee,
  deductFees,
  abs,
  min,
  max,
  equal,
  greaterThan,
  greaterThanOrEqual,
  lessThan,
  lessThanOrEqual,
  format,
  convert,
  recipes,
} = require("../index");

// normalize -0 -> 0 so tiny amounts that round to zero compare cleanly
const nz = (v) => (v === 0 ? 0 : v);
const testValue = (amount, expected, decimals = 2) => {
  it(`$${amount} with ${decimals} decimals is ${expected}`, () => {
    expect(nz(value(amount, decimals))).toEqual(nz(expected));
  });
  if (amount !== 0) {
    it(`$${-amount} with ${decimals} decimals is ${-expected}`, () => {
      expect(nz(value(-amount, decimals))).toEqual(nz(-expected));
    });
  }
};

describe("#money", () => {
  describe("#value: borderline values", () => {
    it("NaN amount is NaN", () => {
      expect(value(NaN)).toEqual(NaN);
    });
    it("string (not numeric) amount is NaN", () => {
      expect(value("a123b")).toEqual(NaN);
    });
    it("string (numeric) amount is valid", () => {
      expect(value("50.001")).toEqual(50); // 50.001 -> 50.00 (half-even)
    });
    it("undefined amount is NaN", () => {
      expect(value(undefined)).toEqual(NaN);
    });
    it("null amount is NaN", () => {
      expect(value(null)).toEqual(NaN);
    });
    it("false amount is NaN", () => {
      expect(value(false)).toEqual(NaN);
    });
    it("true amount is NaN", () => {
      expect(value(true)).toEqual(NaN);
    });
    it("array amount is NaN", () => {
      expect(value([1, 2, 3])).toEqual(NaN);
    });
    it("object amount is NaN", () => {
      expect(value({ a: 1, b: 2, c: 3 })).toEqual(NaN);
    });
  });

  // describe('arithmetic', () => {
  //   testValue(value(0.991),add(0.991,0))
  //   testValue(value(-0.991),add(-0.991,0))
  // })

  describe("#value", () => {
    testValue(0, 0);
    testValue(1, 1);
    testValue(0.99, 0.99);
    testValue(0.99, 0.99);
    testValue(0.991, 0.99);
    testValue(0.999, 1);
    testValue(0.0000001, 0);
    testValue(0.0000001, 0, 3);
    testValue(0.0000005, 0);
    testValue(0.0000009, 0, 5);
    testValue(0.10010509, 0, 0);
    testValue(0.10010509, 0.1, 1);
    testValue(0.10010509, 0.1);
    testValue(0.10010509, 0.1, 3);
    testValue(0.10010509, 0.1001, 4);
    testValue(0.10010509, 0.10011, 5);
    testValue(0.10010509, 0.100105, 6);
    testValue(0.10010509, 0.1001051, 7);
    testValue(0.10010509, 0.10010509, 8);
    testValue(0.10010509, 0.10010509, 9);
    testValue(0.011, 0.01);
    testValue(0.011, 0.011, 3);
    testValue(0.015, 0.02);
    testValue(0.101, 0.1);
    testValue(0.101, 0.101, 3);
    testValue(0.105, 0.1);
    testValue(0.105, 0.105, 3);
    testValue(0.0101, 0.01);
    testValue(0.0101, 0.01, 3);
    testValue(0.0101, 0.0101, 4);
    testValue(0.0105, 0.01);
    testValue(0.0105, 0.01, 3);
    testValue(0.0105, 0.0105, 4);
    testValue(0.1001, 0.1);
    testValue(0.1001, 0.1, 3);
    testValue(0.1001, 0.1001, 4);
    testValue(0.1005, 0.1);
    testValue(0.1005, 0.1, 3);
    testValue(0.1005, 0.1005, 4);

    testValue(10.990001, 10.99, 2);

    // Decimal-heavy cases (where floating-point bugs surface)
    testValue(1.005, 1);
    testValue(0.615, 0.62);
    testValue(0.075, 0.08);
    testValue(2.675, 2.68);
    testValue(1.255, 1.26);
    testValue(0.545, 0.54);
    testValue(3.335, 3.34);
    testValue(4.995, 5);
    testValue(0.0045, 0);
    testValue(19.99, 19.99);
    testValue(49.995, 50);

    // Crypto precision (8 decimals, BTC satoshi level)
    testValue(0.00000001, 0.00000001, 8); // 1 satoshi
    testValue(0.12345678, 0.12345678, 8);
    testValue(0.123456789, 0.12345679, 8); // 9th digit rounds up
    testValue(0.123456784, 0.12345678, 8); // ceil behavior
    testValue(0.00000005, 0.00000005, 8);
    testValue(0.1, 0.1, 8);
    testValue(1.23456789, 1.23456789, 8);
    testValue(0.99999999, 0.99999999, 8);
    testValue(0.000000001, 0, 8); // 9th digit rounds up
    testValue(21000000.12345678, 21000000.12345678, 8); // BTC max supply scale

    // 4 decimals (some altcoins, commodities)
    testValue(1.23456, 1.2346, 4);
    testValue(0.00015, 0.0002, 4);
    testValue(99.99995, 100, 4);

    // 6 decimals (USDC micro-units, ETH gwei-scale)
    testValue(0.123456, 0.123456, 6);
    testValue(0.0000015, 0.000002, 6);
    testValue(999.999999, 999.999999, 6);
  });
  describe("#cents", () => {
    it("0.01 is 1 cents", () => {
      expect(cents(0.01)).toEqual(1);
    });
    it("0.17 is 17 cents", () => {
      expect(cents(0.17)).toEqual(17);
    });
    it("3.12 is 312 cents", () => {
      expect(cents(3.12)).toEqual(312);
    });
    it("0.11001 is 11 cents", () => {
      expect(cents(0.11001)).toEqual(11);
    });
  });
  describe("#cents2Amount", () => {
    it("157 cents are 1.57", () => {
      expect(cents2Amount(157)).toEqual(1.57);
    });
    it("`5513` cents are 55.13", () => {
      expect(cents2Amount("5513")).toEqual(55.13);
    });
    it("undefined cents are NaN", () => {
      expect(cents2Amount(undefined)).toEqual(NaN);
    });
    it("null cents are NaN", () => {
      expect(cents2Amount(null)).toEqual(NaN);
    });
    it("[Object] cents are NaN", () => {
      expect(cents2Amount({ a: 1 })).toEqual(NaN);
    });
    it("array cents are NaN", () => {
      expect(cents2Amount([1, 2, 3, 4])).toEqual(NaN);
    });
    it("99 cents are 0.99", () => {
      expect(cents2Amount(99)).toEqual(0.99);
    });
    it("1 cents are 1", () => {
      expect(cents2Amount(1)).toEqual(0.01);
    });
    it("0 cents are 0", () => {
      expect(cents2Amount(0)).toEqual(0);
    });
    it("12.5 throws an ArgumentError", () => {
      expect(() => cents2Amount(12.5)).toThrow(
        "cents must be positive integer",
      );
    });
    it("-25 throws an ArgumentError", () => {
      expect(() => cents2Amount(-25)).toThrow("cents must be positive integer");
    });
  });
  describe("#fx", () => {
    it("0 * 0 = 0", () => {
      expect(fx(0, 0)).toEqual(0);
    });
    it("0 * 1 = 0", () => {
      expect(fx(0, 1)).toEqual(0);
    });
    it("1 * 0 = 0", () => {
      expect(fx(1, 0)).toEqual(0);
    });
    it("1 * 1 = 1", () => {
      expect(fx(1, 1)).toEqual(1);
    });
    it("12.2506 * 1 = 12.25", () => {
      expect(fx(12.2506, 1)).toEqual(12.25);
    });
    it("1 * 12.2506 = 12.25", () => {
      expect(fx(1, 12.2506)).toEqual(12.25);
    });
    it("5 * 3 = 15", () => {
      expect(fx(5, 3)).toEqual(15);
    });
    it("100 * 1.55235 = 155.24", () => {
      expect(fx(100, 1.55235)).toEqual(155.24);
    });
    it("100 * 0.01 = 1", () => {
      expect(fx(100, 0.01)).toEqual(1);
    });
    it("100 * 0.0000155235 = 0", () => {
      expect(fx("100", 0.0000155235)).toEqual(0);
    });
    it("100 * 0.0000155235 = 0.002 (3 decimals)", () => {
      expect(fx(100, 0.0000155235, 3)).toEqual(0.002);
    });
    it("100 * 0.0000155235 = 0.0016 (4 decimals)", () => {
      expect(fx(100, 0.0000155235, 4)).toEqual(0.0016);
    });

    // Decimal-heavy FX cases
    it("12.99 * 1.1 = 14.29", () => {
      expect(fx(12.99, 1.1)).toEqual(14.29);
    });
    it("0.33 * 3 = 0.99", () => {
      expect(fx(0.33, 3)).toEqual(0.99);
    });
    it("99.99 * 0.1 = 10", () => {
      expect(fx(99.99, 0.1)).toEqual(10);
    });

    // Crypto FX (8 decimals)
    it("1 BTC * 0.5 = 0.5 (8 decimals)", () => {
      expect(fx(1, 0.5, 8)).toEqual(0.5);
    });
    it("0.12345678 * 2 = 0.24691356 (8 decimals)", () => {
      expect(fx(0.12345678, 2, 8)).toEqual(0.24691356);
    });
    it("0.00000001 * 100 = 0.000001 (8 decimals)", () => {
      expect(fx(0.00000001, 100, 8)).toEqual(0.000001);
    });
    it("0.5 * 0.00000002 = 0.00000001 (8 decimals)", () => {
      expect(fx(0.5, 0.00000002, 8)).toEqual(0.00000001);
    });
  });
  describe("#percent", () => {
    it("0% of 100 is 0", () => {
      expect(percent(100, 0)).toEqual(0);
    });
    it("100% of 100 is 100", () => {
      expect(percent(100, 100)).toEqual(100);
    });
    it("50.000001452% of 100 is 50", () => {
      expect(percent(100, 50.000001452)).toEqual(50);
    });
    it("50.568% of 100 is 50.57", () => {
      expect(percent(100, 50.568)).toEqual(50.57);
    });
    it("50% of 999.99 is 500", () => {
      expect(percent(999.99, 50)).toEqual(500);
    });
    it("8.75% of 524.25 is 45.87", () => {
      expect(percent(524.25, 8.75)).toEqual(45.87);
    });
    it("8.76% of 100 is 8.76", () => {
      expect(percent(100, 8.76)).toEqual(8.76);
    });
    it("8.76% of 99.99 is 8.76", () => {
      expect(percent(99.99, 8.76)).toEqual(8.76);
    });
    it("8.76% of 99 is 8.67", () => {
      expect(percent(99, 8.76)).toEqual(8.67);
    });
    it("8.76% of 200 is 17.52", () => {
      expect(percent(200, 8.76)).toEqual(17.52);
    });
    it("8.75% of 20 is 1.75", () => {
      expect(percent(20, 8.75)).toEqual(1.75);
    });

    // Decimal-heavy percent cases
    it("15% of 33.33 is 5", () => {
      expect(percent(33.33, 15)).toEqual(5);
    });
    it("7.5% of 199.99 is 15", () => {
      expect(percent(199.99, 7.5)).toEqual(15);
    });
    it("0.5% of 0.01 is 0", () => {
      expect(percent(0.01, 0.5)).toEqual(0);
    });

    // Crypto precision percent (8 decimals)
    it("10% of 0.12345678 = 0.01234568 (8 decimals)", () => {
      expect(percent(0.12345678, 10, 8)).toEqual(0.01234568);
    });
    it("50% of 0.00000002 = 0.00000001 (8 decimals)", () => {
      expect(percent(0.00000002, 50, 8)).toEqual(0.00000001);
    });
    it("1% of 1 = 0.01 (8 decimals)", () => {
      expect(percent(1, 1, 8)).toEqual(0.01);
    });
    it("33.33% of 0.00000003 = 0.00000001 (8 decimals)", () => {
      expect(percent(0.00000003, 33.33, 8)).toEqual(0.00000001);
    });
  });
  describe("#sum", () => {
    it("0.1 + 0.2 = 0.3", () => {
      expect(sum(0.1, 0.2)).toEqual(0.3);
    });
    it("0 + 0.001 = 0", () => {
      expect(sum(0.0, 0.001)).toEqual(0);
    });
    it("0 + 0.615 = 0.62", () => {
      expect(sum(0.0, 0.615)).toEqual(0.62);
    });
    it("9.99 + 0.01 = 10.00", () => {
      expect(sum(9.99, 0.01)).toEqual(10.0);
    });
    it("9.999 + 0.001 = 10.00", () => {
      expect(sum(9.999, 0.001)).toEqual(10.0);
    });
    it("9.999 + 0.01 = 10.01", () => {
      expect(sum(9.999, 0.01)).toEqual(10.01);
    });
    it("7.89 + 1.23 + 4.56 = 13.58 *composed way", () => {
      expect(sum(sum(7.89, 1.23), 4.56)).toEqual(13.68);
    });
    it("7.89 + `1.23`+ 4.56 = 13.58 *clear way", () => {
      expect(sum(7.89, "1.23", 4.56)).toEqual(13.68);
    });
    it("0.1 + 0.2 - 0.3 = 0", () => {
      expect(sum("0.1", "0.2", "-0.3")).toEqual(0);
    });
    it("0.1 + 0.2 - 0.3 = 0 *array way", () => {
      expect(sum([0.1, 0.2, -0.3])).toEqual(0);
    });
    it("0.1 + 0.2 - 0.3 = 0 *array spread way", () => {
      expect(sum(...[0.1, 0.2, -0.3])).toEqual(0);
    });

    // Decimal-heavy sum cases (classic floating-point traps)
    it("1.1 + 2.2 = 3.3", () => {
      expect(sum(1.1, 2.2)).toEqual(3.3);
    });
    it("0.01 + 0.06 = 0.07", () => {
      expect(sum(0.01, 0.06)).toEqual(0.07);
    });
    it("0.7 + 0.1 = 0.8", () => {
      expect(sum(0.7, 0.1)).toEqual(0.8);
    });
    it("0.615 + 0.005 = 0.62", () => {
      expect(sum(0.615, 0.005)).toEqual(0.62);
    });
    it("0.1 + 0.2 + 0.3 + 0.4 = 1", () => {
      expect(sum(0.1, 0.2, 0.3, 0.4)).toEqual(1);
    });
    it("19.99 + 0.01 = 20", () => {
      expect(sum(19.99, 0.01)).toEqual(20);
    });
    it("33.33 + 33.33 + 33.34 = 100", () => {
      expect(sum(33.33, 33.33, 33.34)).toEqual(100);
    });
    it("sum of many small decimals: 10 * 0.1 = 1", () => {
      expect(sum(0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1)).toEqual(1);
    });

    // Crypto precision sum (8 decimals)
    it("0.12345678 + 0.00000001 = 0.12345679 (8 decimals)", () => {
      expect(sum(0.12345678, 0.00000001, { decimals: 8 })).toEqual(0.12345679);
    });
    it("sum array with 8 decimals", () => {
      expect(sum([0.12345678, 0.00000001], { decimals: 8 })).toEqual(
        0.12345679,
      );
    });
    it("0.99999999 + 0.00000001 = 1 (8 decimals)", () => {
      expect(sum(0.99999999, 0.00000001, { decimals: 8 })).toEqual(1);
    });
    it("0.001 + 0.002 + 0.003 = 0.006 (8 decimals)", () => {
      expect(sum(0.001, 0.002, 0.003, { decimals: 8 })).toEqual(0.006);
    });
    it("crypto sum of 5 amounts", () => {
      expect(sum(0.001, 0.002, 0.003, 0.004, 0.005, { decimals: 8 })).toEqual(
        0.015,
      );
    });
  });

  describe("#add", () => {
    it("0.1 + 0.2 = 0.3", () => {
      expect(add(0.1, 0.2)).toEqual(0.3);
    });
    it("0 + 0.001 = 0", () => {
      expect(add(0.0, 0.001)).toEqual(0);
    });
    it("0 + 0.615 = 0.62", () => {
      expect(add(0.0, 0.615)).toEqual(0.62);
    });
    it("9.99 + 0.01 = 10.00", () => {
      expect(add(9.99, 0.01)).toEqual(10.0);
    });
    it("9.999 + 0.001 = 10.00", () => {
      expect(add(9.999, 0.001)).toEqual(10.0);
    });
    it("9.999 + 0.01 = 10.01", () => {
      expect(add(9.999, 0.01)).toEqual(10.01);
    });

    // Decimal-heavy add cases
    it("0.1 + 0.2 = 0.3 (classic float trap)", () => {
      expect(add(0.1, 0.2)).toEqual(0.3);
    });
    it("1.1 + 2.2 = 3.3", () => {
      expect(add(1.1, 2.2)).toEqual(3.3);
    });
    it("0.01 + 0.06 = 0.07", () => {
      expect(add(0.01, 0.06)).toEqual(0.07);
    });
    it("0.7 + 0.1 = 0.8", () => {
      expect(add(0.7, 0.1)).toEqual(0.8);
    });
    it("33.33 + 66.67 = 100", () => {
      expect(add(33.33, 66.67)).toEqual(100);
    });
    it("0.005 + 0.005 = 0.01", () => {
      expect(add(0.005, 0.005)).toEqual(0.01);
    });
    it("0.25 + 0.17 = 0.42", () => {
      expect(add(0.25, 0.17)).toEqual(0.42);
    });
    it("0.14 + 0.28 = 0.42", () => {
      expect(add(0.14, 0.28)).toEqual(0.42);
    });

    // Crypto precision add (8 decimals)
    it("0.12345678 + 0.00000001 = 0.12345679 (8 decimals)", () => {
      expect(add(0.12345678, 0.00000001, 8)).toEqual(0.12345679);
    });
    it("0.99999999 + 0.00000001 = 1 (8 decimals)", () => {
      expect(add(0.99999999, 0.00000001, 8)).toEqual(1);
    });
    it("0.00000001 + 0.00000001 = 0.00000002 (8 decimals)", () => {
      expect(add(0.00000001, 0.00000001, 8)).toEqual(0.00000002);
    });
    it("0.50000000 + 0.50000000 = 1 (8 decimals)", () => {
      expect(add(0.5, 0.5, 8)).toEqual(1);
    });
  });

  describe("#subtract", () => {
    it("1.01 - 0.99 = 0.02", () => {
      expect(subtract(1.01, 0.99)).toEqual(0.02);
    });
    it("23.42 - 19.13 = 4.29", () => {
      expect(subtract(23.42, 19.13)).toEqual(4.29);
    });
    it("0.3 - 0.1 = 0.2", () => {
      expect(subtract(0.3, 0.1)).toEqual(0.2);
    });
    it("10 - 10 = 0", () => {
      expect(subtract(10, 10)).toEqual(0);
    });
    it("0 - 0.01 = -0.01", () => {
      expect(subtract(0, 0.01)).toEqual(-0.01);
    });

    // Decimal-heavy subtract (classic floating-point traps)
    it("0.3 - 0.2 = 0.1", () => {
      expect(subtract(0.3, 0.2)).toEqual(0.1);
    });
    it("1.0 - 0.9 = 0.1", () => {
      expect(subtract(1.0, 0.9)).toEqual(0.1);
    });
    it("1.0 - 0.1 - 0.1 = 0.8 (composed)", () => {
      expect(subtract(subtract(1.0, 0.1), 0.1)).toEqual(0.8);
    });
    it("100.10 - 0.01 = 100.09", () => {
      expect(subtract(100.1, 0.01)).toEqual(100.09);
    });
    it("0.75 - 0.25 = 0.5", () => {
      expect(subtract(0.75, 0.25)).toEqual(0.5);
    });
    it("0.07 - 0.01 = 0.06", () => {
      expect(subtract(0.07, 0.01)).toEqual(0.06);
    });
    it("33.33 - 33.33 = 0", () => {
      expect(subtract(33.33, 33.33)).toEqual(0);
    });
    it("0.3 - 0.1 - 0.1 = 0.1 (composed)", () => {
      expect(subtract(subtract(0.3, 0.1), 0.1)).toEqual(0.1);
    });

    // Crypto precision subtract (8 decimals)
    it("0.12345679 - 0.00000001 = 0.12345678 (8 decimals)", () => {
      expect(subtract(0.12345679, 0.00000001, 8)).toEqual(0.12345678);
    });
    it("1 - 0.00000001 = 0.99999999 (8 decimals)", () => {
      expect(subtract(1, 0.00000001, 8)).toEqual(0.99999999);
    });
    it("0.00000002 - 0.00000001 = 0.00000001 (8 decimals)", () => {
      expect(subtract(0.00000002, 0.00000001, 8)).toEqual(0.00000001);
    });
    it("0.50000000 - 0.12345678 = 0.37654322 (8 decimals)", () => {
      expect(subtract(0.5, 0.12345678, 8)).toEqual(0.37654322);
    });
  });
  describe("#multiply", () => {
    it("165 * 1.40 = 231", () => {
      expect(multiply(165, 1.4)).toEqual(231);
    });
    it("0 * 5 = 0", () => {
      expect(multiply(0, 5)).toEqual(0);
    });
    it("10 * 0 = 0", () => {
      expect(multiply(10, 0)).toEqual(0);
    });
    it("10.5 * 3 = 31.5", () => {
      expect(multiply(10.5, 3)).toEqual(31.5);
    });
    it("100 * 0.5 = 50", () => {
      expect(multiply(100, 0.5)).toEqual(50);
    });
    it('"abcd" * 2 is NaN', () => {
      expect(multiply("abcd", 2)).toEqual(NaN);
    });
    it("null * 2 is NaN", () => {
      expect(multiply(null, 2)).toEqual(NaN);
    });

    // Decimal-heavy multiply cases
    it("0.33 * 3 = 0.99", () => {
      expect(multiply(0.33, 3)).toEqual(0.99);
    });
    it("1.1 * 1.1 = 1.21", () => {
      expect(multiply(1.1, 1.1)).toEqual(1.21);
    });
    it("19.99 * 2 = 39.98", () => {
      expect(multiply(19.99, 2)).toEqual(39.98);
    });
    it("0.01 * 0.01 = 0", () => {
      expect(multiply(0.01, 0.01)).toEqual(0);
    });
    it("9.99 * 1.1 = 10.99", () => {
      expect(multiply(9.99, 1.1)).toEqual(10.99);
    });

    // Crypto precision multiply (8 decimals)
    it("0.12345678 * 2 = 0.24691356 (8 decimals)", () => {
      expect(multiply(0.12345678, 2, 8)).toEqual(0.24691356);
    });
    it("0.00000001 * 10 = 0.0000001 (8 decimals)", () => {
      expect(multiply(0.00000001, 10, 8)).toEqual(0.0000001);
    });
    it("1.23456789 * 0.5 = 0.61728394 (8 decimals)", () => {
      expect(multiply(1.23456789, 0.5, 8)).toEqual(0.61728394);
    });
    it("0.00000005 * 3 = 0.00000015 (8 decimals)", () => {
      expect(multiply(0.00000005, 3, 8)).toEqual(0.00000015);
    });
  });
  describe("#divide", () => {
    it("123.45 / 1 = 123.45 ", () => {
      expect(divide(123.45, 1)).toEqual(123.45);
    });
    it("123.451 / 1 = 123.45 ", () => {
      expect(divide(123.451, 1)).toEqual(123.45);
    });
    it("123.45 / 2 = 61.72 ", () => {
      expect(divide(123.45, 2)).toEqual(61.72);
    });
    it("123.451 / 2 = 61.73 ", () => {
      expect(divide(123.451, 2)).toEqual(61.73);
    });
    it("0 / 2 = 0", () => {
      expect(divide(0, 2)).toEqual(0);
    });
    it("10 / 3 = 3.33", () => {
      expect(divide(10, 3)).toEqual(3.33);
    });
    it('"10" / 2 = 5', () => {
      expect(divide("10", 2)).toEqual(5);
    });
    it('"abcd" / 2 is NaN', () => {
      expect(divide("abcd", 2)).toEqual(NaN);
    });
    it("10 / 0 throws ArgumentError", () => {
      expect(() => divide(10, 0)).toThrow("cant divide by zero");
    });

    // Decimal-heavy divide cases
    it("1 / 3 = 0.33", () => {
      expect(divide(1, 3)).toEqual(0.33);
    });
    it("0.1 / 3 = 0.03", () => {
      expect(divide(0.1, 3)).toEqual(0.03);
    });
    it("100 / 7 = 14.29", () => {
      expect(divide(100, 7)).toEqual(14.29);
    });
    it("0.99 / 3 = 0.33", () => {
      expect(divide(0.99, 3)).toEqual(0.33);
    });
    it("0.01 / 3 = 0", () => {
      expect(divide(0.01, 3)).toEqual(0);
    });

    // Crypto precision divide (8 decimals)
    it("1 / 3 = 0.33333333 (8 decimals)", () => {
      expect(divide(1, 3, 8)).toEqual(0.33333333);
    });
    it("0.12345678 / 2 = 0.06172839 (8 decimals)", () => {
      expect(divide(0.12345678, 2, 8)).toEqual(0.06172839);
    });
    it("0.00000010 / 10 = 0.00000001 (8 decimals)", () => {
      expect(divide(0.0000001, 10, 8)).toEqual(0.00000001);
    });
    it("1 / 7 = 0.14285714 (8 decimals)", () => {
      expect(divide(1, 7, 8)).toEqual(0.14285714);
    });
  });

  describe("RECIPES", () => {
    describe("#partition", () => {
      it("1 in default parts is [1.00]", () => {
        expect(recipes.partition(1)).toEqual([1.0]);
      });
      it("1 in 1 parts is [1.00]", () => {
        expect(recipes.partition(1, 1)).toEqual([1.0]);
      });
      it("1 in 2 parts is [0.5, 0.5]", () => {
        expect(recipes.partition(1, 2)).toEqual([0.5, 0.5]);
      });
      it("1 in 3 parts is [0.34, 0.33, 0.33]", () => {
        expect(recipes.partition(1, 3)).toEqual([0.34, 0.33, 0.33]);
      });
      it("1 in 4 parts is [0.25, 0.25, 0.25, 0.25]", () => {
        expect(recipes.partition(1, 4)).toEqual([0.25, 0.25, 0.25, 0.25]);
      });
      it("1 in 5 parts is [0.2, 0.2, 0.2, 0.2, 0.2]", () => {
        expect(recipes.partition(1, 5)).toEqual([0.2, 0.2, 0.2, 0.2, 0.2]);
      });
      it("1 in 6 parts is [0.17, 0.17, 0.17, 0.17, 0.16, 0.16]", () => {
        expect(recipes.partition(1, 6)).toEqual([
          0.17, 0.17, 0.17, 0.17, 0.16, 0.16,
        ]);
      });
      it("1 in 7 parts is [0.15,0.15,0.14,0.14,0.14,0.14,0.14]", () => {
        expect(recipes.partition(1, 7)).toEqual([
          0.15, 0.15, 0.14, 0.14, 0.14, 0.14, 0.14,
        ]);
      });
      it("1 in 8 parts is [0.13,0.13,0.13,0.13,0.12,0.12,0.12,0.12]", () => {
        expect(recipes.partition(1, 8)).toEqual([
          0.13, 0.13, 0.13, 0.13, 0.12, 0.12, 0.12, 0.12,
        ]);
      });
      it("1 in 9 parts is [0.12,0.11,0.11,0.11,0.11,0.11,0.11,0.11,0.11]", () => {
        expect(recipes.partition(1, 9)).toEqual([
          0.12, 0.11, 0.11, 0.11, 0.11, 0.11, 0.11, 0.11, 0.11,
        ]);
      });
      it("1 in 10 parts is [0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1]", () => {
        expect(recipes.partition(1, 10)).toEqual([
          0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1,
        ]);
      });
      it("1 in 11 parts is [0.1,0.09,0.09,0.09,0.09,0.09,0.09,0.09,0.09,0.09,0.09]", () => {
        expect(recipes.partition(1, 11)).toEqual([
          0.1, 0.09, 0.09, 0.09, 0.09, 0.09, 0.09, 0.09, 0.09, 0.09, 0.09,
        ]);
      });

      it("0.11 in 5 parts is [0.03,0.02,0.02,0.02,0.02]", () => {
        expect(recipes.partition(0.11, 5)).toEqual([
          0.03, 0.02, 0.02, 0.02, 0.02,
        ]);
      });
      it("0.11 in 9 parts is [0.02,0.02,0.01,0.01,0.01,0.01,0.01,0.01,0.01]", () => {
        expect(recipes.partition(0.11, 9)).toEqual([
          0.02, 0.02, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01,
        ]);
      });
      it("0.11 in 10 parts is [0.02,0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.01]", () => {
        expect(recipes.partition(0.11, 10)).toEqual([
          0.02, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01,
        ]);
      });
      it("0.11 in 11 parts is [0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.01]", () => {
        expect(recipes.partition(0.11, 11)).toEqual([
          0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01,
        ]);
      });
      it("0.11 in 12 parts is [0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.01,0]", () => {
        expect(recipes.partition(0.11, 12)).toEqual([
          0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0,
        ]);
      });

      it("0.01 in 1 parts is [0.01]", () => {
        expect(recipes.partition(0.01, 1)).toEqual([0.01]);
      });
      it("0.01 in 5 parts is [0.01,0,0,0,0]", () => {
        expect(recipes.partition(0.01, 5)).toEqual([0.01, 0, 0, 0, 0]);
      });

      it("0.01 as [100%] is [0.01]", () => {
        expect(recipes.partition(0.01, [100])).toEqual([0.01]);
      });

      it("0.01 as [50%,50%] is [0.01,0]", () => {
        expect(recipes.partition(0.01, [50, 50])).toEqual([0.01, 0]);
      });
      it("0.01 as [99%,1%] is [0.01,0]", () => {
        expect(recipes.partition(0.01, [99, 1])).toEqual([0.01, 0]);
      });
      it("0.01 as [41%,33%,15%,9%,2%] is [0.01,0,0,0,0]", () => {
        expect(recipes.partition(0.01, [41, 33, 15, 9, 2])).toEqual([
          0.01, 0, 0, 0, 0,
        ]);
      });

      it("0.1 as [50%,50%] is [0.05,0.05]", () => {
        expect(recipes.partition(0.1, [50, 50])).toEqual([0.05, 0.05]);
      });
      it("0.1 as [99%,1%] is [0.1,0]", () => {
        expect(recipes.partition(0.1, [99, 1])).toEqual([0.1, 0]);
      });
      it("0.1 as [41%,33%,15%,9%,2%] is [0.05,0.04,0.01,0,0]", () => {
        expect(recipes.partition(0.1, [41, 33, 15, 9, 2])).toEqual([
          0.05, 0.04, 0.01, 0, 0,
        ]);
      });

      it("1 as [50%,50%] is [0.5,0.5]", () => {
        expect(recipes.partition(1, [50, 50])).toEqual([0.5, 0.5]);
      });
      it("1 as [99%,1%] is [0.99,0.01]", () => {
        expect(recipes.partition(1, [99, 1])).toEqual([0.99, 0.01]);
      });
      it("1 as [41%,33%,15%,9%,2%] is [0.41,0.33,0.15,0.09,0.02]", () => {
        expect(recipes.partition(1, [41, 33, 15, 9, 2])).toEqual([
          0.41, 0.33, 0.15, 0.09, 0.02,
        ]);
      });

      it("10 as [50%,50%] is [5,5]", () => {
        expect(recipes.partition(10, [50, 50])).toEqual([5, 5]);
      });
      it("10 as [99%,1%] is [9.9,0.1]", () => {
        expect(recipes.partition(10, [99, 1])).toEqual([9.9, 0.1]);
      });
      it("10 as [41%,33%,15%,9%,2%] is [4.1,3.3,1.5,0.9,0.2]", () => {
        expect(recipes.partition(10, [41, 33, 15, 9, 2])).toEqual([
          4.1, 3.3, 1.5, 0.9, 0.2,
        ]);
      });

      it("100 as [50%,50%] is [50,50]", () => {
        expect(recipes.partition(100, [50, 50])).toEqual([50, 50]);
      });
      it("100 as [99%,1%] is [99,1]", () => {
        expect(recipes.partition(100, [99, 1])).toEqual([99, 1]);
      });
      it("100 as [41%,33%,15%,9%,2%] is [41,33,15,9,2]", () => {
        expect(recipes.partition(100, [41, 33, 15, 9, 2])).toEqual([
          41, 33, 15, 9, 2,
        ]);
      });
      it("100 as [33%,41%,9%,2%,15%] is [33,41,9,2,15]", () => {
        expect(recipes.partition(100, [33, 41, 9, 2, 15])).toEqual([
          33, 41, 9, 2, 15,
        ]);
      });

      it("100 as ...[50%,50%], is [50,50]", () => {
        expect(recipes.partition(100, ...[50, 50])).toEqual([50, 50]);
      });
      it("100 as ,50%,50% is [50,50]", () => {
        expect(recipes.partition(100, 50, 50)).toEqual([50, 50]);
      });

      it("100 in 0 parts throws an ArgumentError", () => {
        expect(() => recipes.partition(100, 0)).toThrow(
          "partsArg must be a positive integer or an array with a partition of 100",
        );
      });
      it("100 in 1.25 parts throws an ArgumentError", () => {
        expect(() => recipes.partition(100, 1.25)).toThrow(
          "partsArg must be a positive integer or an array with a partition of 100",
        );
      });
      it("100 as [50%,45%] throws an ArgumentError", () => {
        expect(() => recipes.partition(100, [50, 45])).toThrow(
          "partsArg must be a positive integer or an array with a partition of 100",
        );
      });
      it("100 as ...[50%,45%] throws an ArgumentError", () => {
        expect(() => recipes.partition(100, ...[50, 45])).toThrow(
          "partsArg must be a positive integer or an array with a partition of 100",
        );
      });
      it("100 as ,50%,45% throws an ArgumentError", () => {
        expect(() => recipes.partition(100, 50, 45)).toThrow(
          "partsArg must be a positive integer or an array with a partition of 100",
        );
      });
      it("100 as [1%] throws an ArgumentError", () => {
        expect(() => recipes.partition(100, [1])).toThrow(
          "partsArg must be a positive integer or an array with a partition of 100",
        );
      });
    });
    describe("#split (alias of partition)", () => {
      it("1 in default parts is [1.00]", () => {
        expect(recipes.split(1)).toEqual([1.0]);
      });
      it("1 in 2 parts is [0.5, 0.5]", () => {
        expect(recipes.split(1, 2)).toEqual([0.5, 0.5]);
      });
      it("1 in 3 parts is [0.34, 0.33, 0.33]", () => {
        expect(recipes.split(1, 3)).toEqual([0.34, 0.33, 0.33]);
      });
      it("0.01 in 5 parts is [0.01,0,0,0,0]", () => {
        expect(recipes.split(0.01, 5)).toEqual([0.01, 0, 0, 0, 0]);
      });
      it("1 as [50%,50%] is [0.5,0.5]", () => {
        expect(recipes.split(1, [50, 50])).toEqual([0.5, 0.5]);
      });
      it("100 as [41%,33%,15%,9%,2%] is [41,33,15,9,2]", () => {
        expect(recipes.split(100, [41, 33, 15, 9, 2])).toEqual([
          41, 33, 15, 9, 2,
        ]);
      });
      it("100 as ...[50%,50%] is [50,50]", () => {
        expect(recipes.split(100, ...[50, 50])).toEqual([50, 50]);
      });
      it("100 as ,50,50 is [50,50]", () => {
        expect(recipes.split(100, 50, 50)).toEqual([50, 50]);
      });
      it("top-level split is the same as recipes.split", () => {
        // eslint-disable-next-line global-require
        const { split } = require("../index.js");
        expect(split(1, 2)).toEqual(recipes.split(1, 2));
      });
      it("100 in 0 parts throws an ArgumentError", () => {
        expect(() => recipes.split(100, 0)).toThrow(
          "partsArg must be a positive integer or an array with a partition of 100",
        );
      });
    });
    describe("#maxTax", () => {
      it("100 maxTax 0% or 0.01 is 0.01 ", () => {
        expect(maxTax(100, 0, 0.01)).toEqual(0.01);
      });
      it("100 maxTax 100% or 99.99 is 99.99 ", () => {
        expect(maxTax(100, 100, 99.99)).toEqual(100);
      });
      it("100 maxTax 10% or 20 is 20 ", () => {
        expect(maxTax(100, 10, 20)).toEqual(20);
      });
      it("100 maxTax 10% or 20.0001 is 20 ", () => {
        expect(maxTax(100, 10, 20.0001)).toEqual(20);
      });
      it("100 maxTax 10% or 20.021 is 20.02 ", () => {
        expect(maxTax(100, 10, 20.021)).toEqual(20.02);
      });
      it("100 maxTax 21% or 20 is 21 ", () => {
        expect(maxTax(100, 21, 20)).toEqual(21);
      });
      it("100 maxTax 21.875% or 20 is 21 ", () => {
        expect(maxTax(100, 21.875, 20)).toEqual(21.88);
      });
      it("524.25 maxTax 8.75% or 45 is 45.87 ", () => {
        expect(maxTax(524.25, 8.75, 45)).toEqual(45.87);
      });
      it("524.25 maxTax 8.75% or 50 is 50 ", () => {
        expect(maxTax(524.25, 8.75, 50)).toEqual(50);
      });
    });
    describe("#applyDiscount", () => {
      it("100 apply discount 10% is 90", () => {
        expect(applyDiscount(100, 10)).toEqual(90);
      });
      it("11 apply discount 8.2% is 10.10", () => {
        expect(applyDiscount(11, 8.2)).toEqual(10.1);
      });

      // Decimal-heavy discount
      it("49.99 apply discount 15% is 42.49", () => {
        expect(applyDiscount(49.99, 15)).toEqual(42.49);
      });
      it("0.99 apply discount 50% is 0.5", () => {
        expect(applyDiscount(0.99, 50)).toEqual(0.5);
      });
      it("19.99 apply discount 10% is 17.99", () => {
        expect(applyDiscount(19.99, 10)).toEqual(17.99);
      });
    });
    describe("#appyTax", () => {
      it("100 apply maxTax 10% is 110 ", () => {
        expect(applyTax(100, 10)).toEqual(110);
      });

      // Decimal-heavy tax
      it("49.99 apply tax 21% is 60.49", () => {
        expect(applyTax(49.99, 21)).toEqual(60.49);
      });
      it("0.01 apply tax 10% is 0.01", () => {
        expect(applyTax(0.01, 10)).toEqual(0.01);
      });
      it("19.99 apply tax 7.5% is 21.49", () => {
        expect(applyTax(19.99, 7.5)).toEqual(21.49);
      });
    });
    describe("#applyMaxTax", () => {
      it("100 apply maxTax 10% or 20 is 120 ", () => {
        expect(applyMaxTax(100, 10, 20)).toEqual(120);
      });
    });
    describe("#appllySumTax", () => {
      it("100 apply sumTax 10% or 20 is 130 ", () => {
        expect(applySumTax(100, 10, 20)).toEqual(130);
      });
    });

    describe("#compare", () => {
      it("1 vs 2 returns -1", () => {
        expect(compare(1, 2)).toEqual(-1);
      });
      it("2 vs 1 returns 1", () => {
        expect(compare(2, 1)).toEqual(1);
      });
      it("1 vs 1 returns 0", () => {
        expect(compare(1, 1)).toEqual(0);
      });
      it("0.1 vs 0.10 returns 0", () => {
        expect(compare(0.1, 0.1)).toEqual(0);
      });
      it("0.001 vs 0.002 both round to 0.01, returns 0", () => {
        expect(compare(0.001, 0.002)).toEqual(0);
      });
      it("100 vs 99.99 returns 1", () => {
        expect(compare(100, 99.99)).toEqual(1);
      });
      it("NaN vs 1 returns NaN", () => {
        expect(compare(NaN, 1)).toEqual(NaN);
      });
      it("1 vs NaN returns NaN", () => {
        expect(compare(1, NaN)).toEqual(NaN);
      });
      it("-1 vs 0 returns -1", () => {
        expect(compare(-1, 0)).toEqual(-1);
      });

      // Decimal-heavy compare
      it("0.1 + 0.2 precision: compare(0.30, 0.3) = 0", () => {
        expect(compare(0.3, 0.3)).toEqual(0);
      });
      it("19.99 vs 20 returns -1", () => {
        expect(compare(19.99, 20)).toEqual(-1);
      });
      it("0.005 vs 0.004 both round to 0.01, returns 0", () => {
        expect(compare(0.005, 0.004)).toEqual(0);
      });
      it("0.015->0.02, 0.014->0.01, returns 1", () => {
        expect(compare(0.015, 0.014)).toEqual(1);
      });

      // Crypto precision compare (8 decimals)
      it("0.12345678 vs 0.12345679 = -1 (8 decimals)", () => {
        expect(compare(0.12345678, 0.12345679, 8)).toEqual(-1);
      });
      it("0.12345679 vs 0.12345678 = 1 (8 decimals)", () => {
        expect(compare(0.12345679, 0.12345678, 8)).toEqual(1);
      });
      it("0.12345678 vs 0.12345678 = 0 (8 decimals)", () => {
        expect(compare(0.12345678, 0.12345678, 8)).toEqual(0);
      });
      it("0.00000001 vs 0.00000002 = -1 (8 decimals)", () => {
        expect(compare(0.00000001, 0.00000002, 8)).toEqual(-1);
      });
      it("at 2 decimals 0.12345678 vs 0.12345679 both round to 0.13, returns 0", () => {
        expect(compare(0.12345678, 0.12345679)).toEqual(0);
      });

      // README examples, realistic prices
      it("19.99 vs 24.99 returns -1", () => {
        expect(compare(19.99, 24.99)).toEqual(-1);
      });
      it("24.99 vs 19.99 returns 1", () => {
        expect(compare(24.99, 19.99)).toEqual(1);
      });
      it("9.99 vs 9.990 returns 0 (trailing zero)", () => {
        expect(compare(9.99, 9.99)).toEqual(0);
      });
      it("'0.10' vs 0.1 returns 0 (string input)", () => {
        expect(compare("0.10", 0.1)).toEqual(0);
      });
      it("NaN vs 1.99 returns NaN", () => {
        expect(compare(NaN, 1.99)).toEqual(NaN);
      });

      // Precision-varying: values that differ only beyond the active decimal place
      it("9.994->9.99, 9.999->10.00 at 2dp -> -1", () => {
        expect(compare(9.994, 9.999)).toEqual(-1);
      });
      it("9.994 vs 9.999 at 3dp: 9.994 < 9.999 → -1", () => {
        expect(compare(9.994, 9.999, 3)).toEqual(-1);
      });
      it("14.9949->14.99, 14.9951->15.00 at 2dp -> -1", () => {
        expect(compare(14.9949, 14.9951)).toEqual(-1);
      });
      it("14.9949 vs 14.9951 at 4dp: 14.9949 < 14.9951 → -1", () => {
        expect(compare(14.9949, 14.9951, 4)).toEqual(-1);
      });
    });

    describe("#isValid", () => {
      it("1 is valid", () => {
        expect(isValid(1)).toEqual(true);
      });
      it("0 is valid", () => {
        expect(isValid(0)).toEqual(true);
      });
      it("-1 is valid", () => {
        expect(isValid(-1)).toEqual(true);
      });
      it('"10.5" is valid', () => {
        expect(isValid("10.5")).toEqual(true);
      });
      it('"0" is valid', () => {
        expect(isValid("0")).toEqual(true);
      });
      it("NaN is not valid", () => {
        expect(isValid(NaN)).toEqual(false);
      });
      it("null is not valid", () => {
        expect(isValid(null)).toEqual(false);
      });
      it("undefined is not valid", () => {
        expect(isValid(undefined)).toEqual(false);
      });
      it('"abc" is not valid', () => {
        expect(isValid("abc")).toEqual(false);
      });
      it("[] is not valid", () => {
        expect(isValid([])).toEqual(false);
      });
      it("{} is not valid", () => {
        expect(isValid({})).toEqual(false);
      });
      it("false is not valid", () => {
        expect(isValid(false)).toEqual(false);
      });
      it("true is not valid", () => {
        expect(isValid(true)).toEqual(false);
      });
    });

    describe("#isZero", () => {
      it("0 is zero", () => {
        expect(isZero(0)).toEqual(true);
      });
      it("1 is not zero", () => {
        expect(isZero(1)).toEqual(false);
      });
      it("-1 is not zero", () => {
        expect(isZero(-1)).toEqual(false);
      });
      it("0.001 rounds to 0.00, is zero", () => {
        expect(isZero(0.001)).toEqual(true);
      });
      it("0.0001 rounds to 0.00, is zero", () => {
        expect(isZero(0.0001)).toEqual(true);
      });
      it('"0" is zero', () => {
        expect(isZero("0")).toEqual(true);
      });

      // Crypto precision isZero (8 decimals)
      it("0.000000001 rounds to 0 at 8 decimals, is zero", () => {
        expect(isZero(0.000000001, 8)).toEqual(true);
      });
      it("0 is zero at 8 decimals", () => {
        expect(isZero(0, 8)).toEqual(true);
      });
      it("0.00000001 is not zero at 8 decimals", () => {
        expect(isZero(0.00000001, 8)).toEqual(false);
      });
      it("0.004 rounds to 0.00 at 2 decimals, is zero", () => {
        expect(isZero(0.004)).toEqual(true);
      });
    });

    describe("#isPositive", () => {
      it("1 is positive", () => {
        expect(isPositive(1)).toEqual(true);
      });
      it("0.001 rounds to 0.00, not positive", () => {
        expect(isPositive(0.001)).toEqual(false);
      });
      it("100 is positive", () => {
        expect(isPositive(100)).toEqual(true);
      });
      it("0 is not positive", () => {
        expect(isPositive(0)).toEqual(false);
      });
      it("-1 is not positive", () => {
        expect(isPositive(-1)).toEqual(false);
      });
      it("-0.001 rounds to -0.01, is not positive", () => {
        expect(isPositive(-0.001)).toEqual(false);
      });

      // Crypto precision isPositive (8 decimals)
      it("0.00000001 is positive at 8 decimals", () => {
        expect(isPositive(0.00000001, 8)).toEqual(true);
      });
      it("-0.00000001 is not positive at 8 decimals", () => {
        expect(isPositive(-0.00000001, 8)).toEqual(false);
      });
      it("0 is not positive at 8 decimals", () => {
        expect(isPositive(0, 8)).toEqual(false);
      });
    });

    describe("#isNegative", () => {
      it("-1 is negative", () => {
        expect(isNegative(-1)).toEqual(true);
      });
      it("-0.001 rounds to 0.00, not negative", () => {
        expect(isNegative(-0.001)).toEqual(false);
      });
      it("-100 is negative", () => {
        expect(isNegative(-100)).toEqual(true);
      });
      it("0 is not negative", () => {
        expect(isNegative(0)).toEqual(false);
      });
      it("1 is not negative", () => {
        expect(isNegative(1)).toEqual(false);
      });
      it("0.001 rounds to 0.01, not negative", () => {
        expect(isNegative(0.001)).toEqual(false);
      });

      // Crypto precision isNegative (8 decimals)
      it("-0.00000001 is negative at 8 decimals", () => {
        expect(isNegative(-0.00000001, 8)).toEqual(true);
      });
      it("0.00000001 is not negative at 8 decimals", () => {
        expect(isNegative(0.00000001, 8)).toEqual(false);
      });
      it("0 is not negative at 8 decimals", () => {
        expect(isNegative(0, 8)).toEqual(false);
      });
    });

    describe("#applyMaxDiscount", () => {
      it("100 applyMaxDiscount 10% or 20 is 80", () => {
        expect(applyMaxDiscount(100, 10, 20)).toEqual(80);
      });
      it("100 applyMaxDiscount 20% or 10 is 80", () => {
        expect(applyMaxDiscount(100, 20, 10)).toEqual(80);
      });
      it("100 applyMaxDiscount 10% or 5 is 90", () => {
        expect(applyMaxDiscount(100, 10, 5)).toEqual(90);
      });
      it("100 applyMaxDiscount 0% or 10 is 90", () => {
        expect(applyMaxDiscount(100, 0, 10)).toEqual(90);
      });
      it("100 applyMaxDiscount 25% or 20 is 75", () => {
        expect(applyMaxDiscount(100, 25, 20)).toEqual(75);
      });
      it("50 applyMaxDiscount 10% or 10 is 40", () => {
        expect(applyMaxDiscount(50, 10, 10)).toEqual(40);
      });
    });

    describe("#applySumDiscount", () => {
      it("100 applySumDiscount 10% and 20 is 70", () => {
        expect(applySumDiscount(100, 10, 20)).toEqual(70);
      });
      it("100 applySumDiscount 0% and 10 is 90", () => {
        expect(applySumDiscount(100, 0, 10)).toEqual(90);
      });
      it("100 applySumDiscount 10% and 0 is 90", () => {
        expect(applySumDiscount(100, 10, 0)).toEqual(90);
      });
      it("200 applySumDiscount 50% and 30 is 70", () => {
        expect(applySumDiscount(200, 50, 30)).toEqual(70);
      });
      it("recipes.applyMaxDiscount matches top-level", () => {
        expect(recipes.applyMaxDiscount(100, 10, 20)).toEqual(
          applyMaxDiscount(100, 10, 20),
        );
      });
      it("recipes.applySumDiscount matches top-level", () => {
        expect(recipes.applySumDiscount(100, 10, 20)).toEqual(
          applySumDiscount(100, 10, 20),
        );
      });
    });

    // ─── New recipe names ─────────────────────────────────────────────────────

    describe("#addPercent", () => {
      it("100 addPercent 10% is 110", () => {
        expect(addPercent(100, 10)).toEqual(110);
      });
      it("49.99 addPercent 21% is 60.49", () => {
        expect(addPercent(49.99, 21)).toEqual(60.49);
      });
      it("0.01 addPercent 10% is 0.01", () => {
        expect(addPercent(0.01, 10)).toEqual(0.01);
      });
      it("is an alias of applyTax", () => {
        expect(addPercent(19.99, 7.5)).toEqual(applyTax(19.99, 7.5));
      });
      it("recipes.addPercent matches top-level", () => {
        expect(recipes.addPercent(100, 10)).toEqual(addPercent(100, 10));
      });
    });

    describe("#deductPercent", () => {
      it("100 deductPercent 10% is 90", () => {
        expect(deductPercent(100, 10)).toEqual(90);
      });
      it("49.99 deductPercent 15% is 42.49", () => {
        expect(deductPercent(49.99, 15)).toEqual(42.49);
      });
      it("0.99 deductPercent 50% is 0.5", () => {
        expect(deductPercent(0.99, 50)).toEqual(0.5);
      });
      it("is an alias of applyDiscount", () => {
        expect(deductPercent(19.99, 10)).toEqual(applyDiscount(19.99, 10));
      });
      it("recipes.deductPercent matches top-level", () => {
        expect(recipes.deductPercent(100, 10)).toEqual(deductPercent(100, 10));
      });
    });

    describe("#maxFee", () => {
      it("100 maxFee 10% or 20 is 20", () => {
        expect(maxFee(100, 10, 20)).toEqual(20);
      });
      it("100 maxFee 21% or 20 is 21", () => {
        expect(maxFee(100, 21, 20)).toEqual(21);
      });
      it("524.25 maxFee 8.75% or 50 is 50", () => {
        expect(maxFee(524.25, 8.75, 50)).toEqual(50);
      });
      it("is an alias of maxTax", () => {
        expect(maxFee(524.25, 8.75, 45)).toEqual(maxTax(524.25, 8.75, 45));
      });
      it("recipes.maxFee matches top-level", () => {
        expect(recipes.maxFee(100, 10, 20)).toEqual(maxFee(100, 10, 20));
      });
    });

    describe("#addMaxFee", () => {
      it("100 addMaxFee 10% or 20 is 120", () => {
        expect(addMaxFee(100, 10, 20)).toEqual(120);
      });
      it("100 addMaxFee 25% or 10 is 125", () => {
        expect(addMaxFee(100, 25, 10)).toEqual(125);
      });
      it("is an alias of applyMaxTax", () => {
        expect(addMaxFee(100, 10, 20)).toEqual(applyMaxTax(100, 10, 20));
      });
      it("recipes.addMaxFee matches top-level", () => {
        expect(recipes.addMaxFee(100, 10, 20)).toEqual(addMaxFee(100, 10, 20));
      });
    });

    describe("#addFees", () => {
      it("100 addFees 10% and 20 is 130", () => {
        expect(addFees(100, 10, 20)).toEqual(130);
      });
      it("200 addFees 5% and 3 is 213", () => {
        expect(addFees(200, 5, 3)).toEqual(213);
      });
      it("is an alias of applySumTax", () => {
        expect(addFees(100, 10, 20)).toEqual(applySumTax(100, 10, 20));
      });
      it("recipes.addFees matches top-level", () => {
        expect(recipes.addFees(100, 10, 20)).toEqual(addFees(100, 10, 20));
      });
    });

    describe("#deductMaxFee", () => {
      it("100 deductMaxFee 10% or 20 is 80", () => {
        expect(deductMaxFee(100, 10, 20)).toEqual(80);
      });
      it("100 deductMaxFee 25% or 20 is 75", () => {
        expect(deductMaxFee(100, 25, 20)).toEqual(75);
      });
      it("50 deductMaxFee 10% or 10 is 40", () => {
        expect(deductMaxFee(50, 10, 10)).toEqual(40);
      });
      it("is an alias of applyMaxDiscount", () => {
        expect(deductMaxFee(100, 10, 20)).toEqual(
          applyMaxDiscount(100, 10, 20),
        );
      });
      it("recipes.deductMaxFee matches top-level", () => {
        expect(recipes.deductMaxFee(100, 10, 20)).toEqual(
          deductMaxFee(100, 10, 20),
        );
      });
    });

    describe("#deductFees", () => {
      it("100 deductFees 10% and 20 is 70", () => {
        expect(deductFees(100, 10, 20)).toEqual(70);
      });
      it("200 deductFees 50% and 30 is 70", () => {
        expect(deductFees(200, 50, 30)).toEqual(70);
      });
      it("100 deductFees 0% and 10 is 90", () => {
        expect(deductFees(100, 0, 10)).toEqual(90);
      });
      it("is an alias of applySumDiscount", () => {
        expect(deductFees(100, 10, 20)).toEqual(applySumDiscount(100, 10, 20));
      });
      it("recipes.deductFees matches top-level", () => {
        expect(recipes.deductFees(100, 10, 20)).toEqual(
          deductFees(100, 10, 20),
        );
      });
    });

    describe("#abs", () => {
      it("abs(-10.50) is 10.5", () => {
        expect(abs(-10.5)).toEqual(10.5);
      });
      it("abs(10.50) is 10.5", () => {
        expect(abs(10.5)).toEqual(10.5);
      });
      it("abs(0) is 0", () => {
        expect(abs(0)).toEqual(0);
      });
      it("abs(-0.001) is 0", () => {
        expect(abs(-0.001)).toEqual(0);
      });
      it("abs(NaN) is NaN", () => {
        expect(abs(NaN)).toEqual(NaN);
      });
      it("abs('-5.25') is 5.25", () => {
        expect(abs("-5.25")).toEqual(5.25);
      });
      it("abs(-1.2345, 4) is 1.2345", () => {
        expect(abs(-1.2345, 4)).toEqual(1.2345);
      });

      // Decimal-heavy abs
      it("abs(-0.005) is 0", () => {
        expect(abs(-0.005)).toEqual(0);
      });
      it("abs(-19.99) is 19.99", () => {
        expect(abs(-19.99)).toEqual(19.99);
      });

      // Crypto precision abs (8 decimals)
      it("abs(-0.12345678, 8) is 0.12345678", () => {
        expect(abs(-0.12345678, 8)).toEqual(0.12345678);
      });
      it("abs(-0.00000001, 8) is 0.00000001", () => {
        expect(abs(-0.00000001, 8)).toEqual(0.00000001);
      });
      it("abs(0.99999999, 8) is 0.99999999", () => {
        expect(abs(0.99999999, 8)).toEqual(0.99999999);
      });
    });

    describe("#min", () => {
      it("min(10, 20, 5) is 5", () => {
        expect(min(10, 20, 5)).toEqual(5);
      });
      it("min([10, 20, 5]) is 5", () => {
        expect(min([10, 20, 5])).toEqual(5);
      });
      it("min(0.1, 0.2) is 0.1", () => {
        expect(min(0.1, 0.2)).toEqual(0.1);
      });
      it("min(-1, 0, 1) is -1", () => {
        expect(min(-1, 0, 1)).toEqual(-1);
      });
      it("min(NaN, 1) is NaN", () => {
        expect(min(NaN, 1)).toEqual(NaN);
      });
      it("min(5) is 5", () => {
        expect(min(5)).toEqual(5);
      });
      it("min('10', '3', '7') is 3", () => {
        expect(min("10", "3", "7")).toEqual(3);
      });

      // Decimal-heavy min
      it("min(0.33, 0.34, 0.32) is 0.32", () => {
        expect(min(0.33, 0.34, 0.32)).toEqual(0.32);
      });
      it("min(19.99, 20, 19.98) is 19.98", () => {
        expect(min(19.99, 20, 19.98)).toEqual(19.98);
      });

      // Crypto precision min (8 decimals)
      it("min(0.12345678, 0.12345679, {decimals:8}) is 0.12345678", () => {
        expect(min(0.12345678, 0.12345679, { decimals: 8 })).toEqual(
          0.12345678,
        );
      });
      it("min([0.00000001, 0.00000002, 0.00000003], {decimals:8}) is 0.00000001", () => {
        expect(
          min([0.00000001, 0.00000002, 0.00000003], { decimals: 8 }),
        ).toEqual(0.00000001);
      });
      it("min(0.12345678, 0.12345679) at 2 decimals both round to 0.12", () => {
        expect(min(0.12345678, 0.12345679)).toEqual(0.12);
      });
    });

    describe("#max", () => {
      it("max(10, 20, 5) is 20", () => {
        expect(max(10, 20, 5)).toEqual(20);
      });
      it("max([10, 20, 5]) is 20", () => {
        expect(max([10, 20, 5])).toEqual(20);
      });
      it("max(0.1, 0.2) is 0.2", () => {
        expect(max(0.1, 0.2)).toEqual(0.2);
      });
      it("max(-1, 0, 1) is 1", () => {
        expect(max(-1, 0, 1)).toEqual(1);
      });
      it("max(NaN, 1) is NaN", () => {
        expect(max(NaN, 1)).toEqual(NaN);
      });
      it("max(5) is 5", () => {
        expect(max(5)).toEqual(5);
      });

      // Decimal-heavy max
      it("max(0.33, 0.34, 0.32) is 0.34", () => {
        expect(max(0.33, 0.34, 0.32)).toEqual(0.34);
      });
      it("max(19.99, 20, 19.98) is 20", () => {
        expect(max(19.99, 20, 19.98)).toEqual(20);
      });

      // Crypto precision max (8 decimals)
      it("max(0.12345678, 0.12345679, {decimals:8}) is 0.12345679", () => {
        expect(max(0.12345678, 0.12345679, { decimals: 8 })).toEqual(
          0.12345679,
        );
      });
      it("max([0.00000001, 0.00000002, 0.00000003], {decimals:8}) is 0.00000003", () => {
        expect(
          max([0.00000001, 0.00000002, 0.00000003], { decimals: 8 }),
        ).toEqual(0.00000003);
      });
    });

    describe("#equal", () => {
      it("1 equals 1", () => {
        expect(equal(1, 1)).toEqual(true);
      });
      it("0.1 equals 0.10", () => {
        expect(equal(0.1, 0.1)).toEqual(true);
      });
      it("1 does not equal 2", () => {
        expect(equal(1, 2)).toEqual(false);
      });
      it("0.001 equals 0.002 (both round to 0.01)", () => {
        expect(equal(0.001, 0.002)).toEqual(true);
      });
      it("NaN does not equal NaN", () => {
        expect(equal(NaN, NaN)).toEqual(false);
      });

      // Decimal-heavy equal
      it("0.1 + 0.2 and 0.3 are equal", () => {
        expect(equal(0.3, 0.3)).toEqual(true);
      });
      it("0.005->0.00, 0.006->0.01 at 2 decimals, not equal", () => {
        expect(equal(0.005, 0.006)).toEqual(false);
      });
      it("19.99 and 19.98 are not equal", () => {
        expect(equal(19.99, 19.98)).toEqual(false);
      });

      // Crypto precision equal (8 decimals)
      it("0.12345678 equals 0.12345678 (8 decimals)", () => {
        expect(equal(0.12345678, 0.12345678, 8)).toEqual(true);
      });
      it("0.12345678 does not equal 0.12345679 (8 decimals)", () => {
        expect(equal(0.12345678, 0.12345679, 8)).toEqual(false);
      });
      it("0.000000001 and 0.000000002 both round to 0 at 8 decimals, equal", () => {
        expect(equal(0.000000001, 0.000000002, 8)).toEqual(true);
      });

      // README examples, realistic prices
      it("19.99 equals 19.99", () => {
        expect(equal(19.99, 19.99)).toEqual(true);
      });
      it("49.981 (->49.98) does not equal 49.99", () => {
        expect(equal(49.981, 49.99)).toEqual(false);
      });
      it("19.99 does not equal 20.00", () => {
        expect(equal(19.99, 20.0)).toEqual(false);
      });

      // Precision-varying
      it("49.994 (->49.99) vs 49.999 (->50.00) at 2dp, not equal", () => {
        expect(equal(49.994, 49.999)).toEqual(false);
      });
      it("49.994 does not equal 49.999 at 3dp", () => {
        expect(equal(49.994, 49.999, 3)).toEqual(false);
      });
      it("9.9949 (->9.99) vs 9.9951 (->10.00) at 2dp, not equal", () => {
        expect(equal(9.9949, 9.9951)).toEqual(false);
      });
    });

    describe("#greaterThan", () => {
      it("2 > 1 is true", () => {
        expect(greaterThan(2, 1)).toEqual(true);
      });
      it("1 > 1 is false", () => {
        expect(greaterThan(1, 1)).toEqual(false);
      });
      it("1 > 2 is false", () => {
        expect(greaterThan(1, 2)).toEqual(false);
      });
      it("NaN > 1 is false", () => {
        expect(greaterThan(NaN, 1)).toEqual(false);
      });

      // Decimal-heavy greaterThan
      it("0.11 > 0.10 is true", () => {
        expect(greaterThan(0.11, 0.1)).toEqual(true);
      });
      it("19.99 > 19.98 is true", () => {
        expect(greaterThan(19.99, 19.98)).toEqual(true);
      });

      // Crypto precision greaterThan (8 decimals)
      it("0.12345679 > 0.12345678 is true (8 decimals)", () => {
        expect(greaterThan(0.12345679, 0.12345678, 8)).toEqual(true);
      });
      it("0.00000002 > 0.00000001 is true (8 decimals)", () => {
        expect(greaterThan(0.00000002, 0.00000001, 8)).toEqual(true);
      });
      it("0.12345678 > 0.12345679 is false (8 decimals)", () => {
        expect(greaterThan(0.12345678, 0.12345679, 8)).toEqual(false);
      });

      // README examples, realistic prices
      it("24.99 > 19.99 is true", () => {
        expect(greaterThan(24.99, 19.99)).toEqual(true);
      });
      it("19.99 > 24.99 is false", () => {
        expect(greaterThan(19.99, 24.99)).toEqual(false);
      });
      it("19.99 > 19.99 is false", () => {
        expect(greaterThan(19.99, 19.99)).toEqual(false);
      });

      // Precision-varying
      it("9.999 (->10.00) > 9.994 (->9.99) at 2dp is true", () => {
        expect(greaterThan(9.999, 9.994)).toEqual(true);
      });
      it("9.999 > 9.994 at 3dp is true", () => {
        expect(greaterThan(9.999, 9.994, 3)).toEqual(true);
      });
    });

    describe("#greaterThanOrEqual", () => {
      it("2 >= 1 is true", () => {
        expect(greaterThanOrEqual(2, 1)).toEqual(true);
      });
      it("1 >= 1 is true", () => {
        expect(greaterThanOrEqual(1, 1)).toEqual(true);
      });
      it("1 >= 2 is false", () => {
        expect(greaterThanOrEqual(1, 2)).toEqual(false);
      });
      it("NaN >= 1 is false", () => {
        expect(greaterThanOrEqual(NaN, 1)).toEqual(false);
      });

      // Crypto precision greaterThanOrEqual (8 decimals)
      it("0.12345678 >= 0.12345678 is true (8 decimals)", () => {
        expect(greaterThanOrEqual(0.12345678, 0.12345678, 8)).toEqual(true);
      });
      it("0.12345679 >= 0.12345678 is true (8 decimals)", () => {
        expect(greaterThanOrEqual(0.12345679, 0.12345678, 8)).toEqual(true);
      });
      it("0.12345678 >= 0.12345679 is false (8 decimals)", () => {
        expect(greaterThanOrEqual(0.12345678, 0.12345679, 8)).toEqual(false);
      });

      // README examples, realistic prices
      it("24.99 >= 19.99 is true", () => {
        expect(greaterThanOrEqual(24.99, 19.99)).toEqual(true);
      });
      it("19.99 >= 19.99 is true", () => {
        expect(greaterThanOrEqual(19.99, 19.99)).toEqual(true);
      });
      it("14.99 >= 19.99 is false", () => {
        expect(greaterThanOrEqual(14.99, 19.99)).toEqual(false);
      });

      // Precision-varying
      it("9.994 (->9.99) >= 9.999 (->10.00) at 2dp is false", () => {
        expect(greaterThanOrEqual(9.994, 9.999)).toEqual(false);
      });
      it("9.994 >= 9.999 at 3dp is false", () => {
        expect(greaterThanOrEqual(9.994, 9.999, 3)).toEqual(false);
      });
    });

    describe("#lessThan", () => {
      it("1 < 2 is true", () => {
        expect(lessThan(1, 2)).toEqual(true);
      });
      it("1 < 1 is false", () => {
        expect(lessThan(1, 1)).toEqual(false);
      });
      it("2 < 1 is false", () => {
        expect(lessThan(2, 1)).toEqual(false);
      });
      it("NaN < 1 is false", () => {
        expect(lessThan(NaN, 1)).toEqual(false);
      });

      // Decimal-heavy lessThan
      it("0.10 < 0.11 is true", () => {
        expect(lessThan(0.1, 0.11)).toEqual(true);
      });
      it("19.98 < 19.99 is true", () => {
        expect(lessThan(19.98, 19.99)).toEqual(true);
      });

      // Crypto precision lessThan (8 decimals)
      it("0.12345678 < 0.12345679 is true (8 decimals)", () => {
        expect(lessThan(0.12345678, 0.12345679, 8)).toEqual(true);
      });
      it("0.00000001 < 0.00000002 is true (8 decimals)", () => {
        expect(lessThan(0.00000001, 0.00000002, 8)).toEqual(true);
      });
      it("0.12345679 < 0.12345678 is false (8 decimals)", () => {
        expect(lessThan(0.12345679, 0.12345678, 8)).toEqual(false);
      });

      // README examples, realistic prices
      it("14.99 < 19.99 is true", () => {
        expect(lessThan(14.99, 19.99)).toEqual(true);
      });
      it("19.99 < 14.99 is false", () => {
        expect(lessThan(19.99, 14.99)).toEqual(false);
      });
      it("19.99 < 19.99 is false", () => {
        expect(lessThan(19.99, 19.99)).toEqual(false);
      });

      // Precision-varying
      it("9.994 (->9.99) < 9.999 (->10.00) at 2dp is true", () => {
        expect(lessThan(9.994, 9.999)).toEqual(true);
      });
      it("9.994 < 9.999 at 3dp is true", () => {
        expect(lessThan(9.994, 9.999, 3)).toEqual(true);
      });
    });

    describe("#lessThanOrEqual", () => {
      it("1 <= 2 is true", () => {
        expect(lessThanOrEqual(1, 2)).toEqual(true);
      });
      it("1 <= 1 is true", () => {
        expect(lessThanOrEqual(1, 1)).toEqual(true);
      });
      it("2 <= 1 is false", () => {
        expect(lessThanOrEqual(2, 1)).toEqual(false);
      });
      it("NaN <= 1 is false", () => {
        expect(lessThanOrEqual(NaN, 1)).toEqual(false);
      });

      // Crypto precision lessThanOrEqual (8 decimals)
      it("0.12345678 <= 0.12345678 is true (8 decimals)", () => {
        expect(lessThanOrEqual(0.12345678, 0.12345678, 8)).toEqual(true);
      });
      it("0.12345678 <= 0.12345679 is true (8 decimals)", () => {
        expect(lessThanOrEqual(0.12345678, 0.12345679, 8)).toEqual(true);
      });
      it("0.12345679 <= 0.12345678 is false (8 decimals)", () => {
        expect(lessThanOrEqual(0.12345679, 0.12345678, 8)).toEqual(false);
      });

      // README examples, realistic prices
      it("14.99 <= 19.99 is true", () => {
        expect(lessThanOrEqual(14.99, 19.99)).toEqual(true);
      });
      it("19.99 <= 19.99 is true", () => {
        expect(lessThanOrEqual(19.99, 19.99)).toEqual(true);
      });
      it("24.99 <= 19.99 is false", () => {
        expect(lessThanOrEqual(24.99, 19.99)).toEqual(false);
      });

      // Precision-varying
      it("9.999 (->10.00) <= 9.994 (->9.99) at 2dp is false", () => {
        expect(lessThanOrEqual(9.999, 9.994)).toEqual(false);
      });
      it("9.999 <= 9.994 at 3dp is false: 9.999 > 9.994", () => {
        expect(lessThanOrEqual(9.999, 9.994, 3)).toEqual(false);
      });
    });

    describe("#format", () => {
      // Standard currencies
      it('format(1234.56, "USD", "en-US") → $1,234.56', () => {
        expect(format(1234.56, "USD", "en-US")).toEqual("$1,234.56");
      });
      it('format(1234.56, "EUR", "de-DE") contains 1.234,56', () => {
        const result = format(1234.56, "EUR", "de-DE");
        expect(result).toContain("1.234,56");
        expect(result).toContain("€");
      });
      it('format(1234.56, "GBP", "en-GB") → £1,234.56', () => {
        expect(format(1234.56, "GBP", "en-GB")).toEqual("£1,234.56");
      });
      it('format(1234, "JPY", "en-US") contains ¥', () => {
        const result = format(1234, "JPY", "en-US");
        expect(result).toContain("¥");
      });
      it("format(0, 'USD', 'en-US') → $0.00", () => {
        expect(format(0, "USD", "en-US")).toEqual("$0.00");
      });
      it("format(-19.99, 'USD', 'en-US') → -$19.99", () => {
        expect(format(-19.99, "USD", "en-US")).toEqual("-$19.99");
      });

      // Decimals
      it('format(0.005, "USD", "en-US") → $0.01', () => {
        expect(format(0.005, "USD", "en-US")).toEqual("$0.01");
      });
      it('format(49.995, "USD", "en-US") → $50.00', () => {
        expect(format(49.995, "USD", "en-US")).toEqual("$50.00");
      });

      // String amounts
      it('format("1234.56", "USD", "en-US") → $1,234.56', () => {
        expect(format("1234.56", "USD", "en-US")).toEqual("$1,234.56");
      });

      // Crypto currencies
      it('format(0.12345678, "BTC") starts with ₿', () => {
        const result = format(0.12345678, "BTC", "en-US");
        expect(result).toEqual("₿0.12345678");
      });
      it('format(1.5, "BTC") → ₿1.5', () => {
        expect(format(1.5, "BTC", "en-US")).toEqual("₿1.5");
      });
      it('format(0.00000001, "BTC", "en-US") → ₿0.00000001', () => {
        expect(format(0.00000001, "BTC", "en-US")).toEqual("₿0.00000001");
      });
      it('format(21000000, "BTC", "en-US") → ₿21,000,000', () => {
        expect(format(21000000, "BTC", "en-US")).toEqual("₿21,000,000");
      });
      it('format(2.5, "ETH", "en-US") starts with Ξ', () => {
        expect(format(2.5, "ETH", "en-US")).toEqual("Ξ2.5");
      });
      it('format(100000, "SAT", "en-US") → sat100,000', () => {
        expect(format(100000, "SAT", "en-US")).toEqual("sat100,000");
      });

      // Error cases
      it("format(NaN) throws ArgumentError", () => {
        expect(() => format(NaN)).toThrow("amount must be numeric");
      });
      it("format(null) throws ArgumentError", () => {
        expect(() => format(null)).toThrow("amount must be numeric");
      });
      it('format(100, "INVALID_CODE") throws ArgumentError', () => {
        expect(() => format(100, "INVALID_CODE", "en-US")).toThrow(
          "unsupported currency code",
        );
      });

      // Default currency is USD
      it("format(100) defaults to USD", () => {
        const result = format(100, undefined, "en-US");
        expect(result).toEqual("$100.00");
      });
    });

    describe("#convert", () => {
      const rates = {
        USD: 1,
        EUR: 0.92,
        GBP: 0.79,
        JPY: 149.5,
        BTC: 0.0000125,
      };

      // Basic conversions
      it("100 USD → EUR = 92", () => {
        expect(convert(100, "USD", "EUR", rates)).toEqual(92);
      });
      it("100 EUR → USD = 108.7", () => {
        expect(convert(100, "EUR", "USD", rates)).toEqual(108.7);
      });
      it("100 USD → GBP = 79", () => {
        expect(convert(100, "USD", "GBP", rates)).toEqual(79);
      });
      it("100 GBP → USD = 126.58", () => {
        expect(convert(100, "GBP", "USD", rates)).toEqual(126.58);
      });
      it("100 USD → JPY = 14950", () => {
        expect(convert(100, "USD", "JPY", rates)).toEqual(14950);
      });

      // Same currency
      it("100 USD → USD = 100", () => {
        expect(convert(100, "USD", "USD", rates)).toEqual(100);
      });

      // Cross-currency (non-base to non-base)
      it("100 EUR → GBP (cross)", () => {
        const result = convert(100, "EUR", "GBP", rates);
        expect(result).toEqual(85.87);
      });
      it("100 GBP → EUR (cross)", () => {
        const result = convert(100, "GBP", "EUR", rates);
        expect(result).toEqual(116.46);
      });

      // Decimal-heavy
      it("49.99 USD → EUR", () => {
        expect(convert(49.99, "USD", "EUR", rates)).toEqual(45.99);
      });
      it("0.01 USD → EUR", () => {
        expect(convert(0.01, "USD", "EUR", rates)).toEqual(0.01);
      });
      it("19.99 EUR → USD", () => {
        expect(convert(19.99, "EUR", "USD", rates)).toEqual(21.73);
      });

      // Crypto precision
      it("1 BTC → USD (8 decimals)", () => {
        expect(convert(1, "BTC", "USD", rates)).toEqual(80000);
      });
      it("100 USD → BTC (8 decimals)", () => {
        expect(convert(100, "USD", "BTC", rates, 8)).toEqual(0.00125);
      });
      it("0.5 BTC → EUR", () => {
        expect(convert(0.5, "BTC", "EUR", rates)).toEqual(36800);
      });

      // String amount
      it('"100" USD → EUR = 92', () => {
        expect(convert("100", "USD", "EUR", rates)).toEqual(92);
      });

      // NaN
      it("NaN amount returns NaN", () => {
        expect(convert(NaN, "USD", "EUR", rates)).toEqual(NaN);
      });
      it('"abc" amount returns NaN', () => {
        expect(convert("abc", "USD", "EUR", rates)).toEqual(NaN);
      });

      // Case insensitive
      it("case insensitive currency codes", () => {
        expect(convert(100, "usd", "eur", rates)).toEqual(92);
      });

      // Error cases
      it("missing from currency throws", () => {
        expect(() => convert(100, "CHF", "EUR", rates)).toThrow(
          "missing rate for currency: CHF",
        );
      });
      it("missing to currency throws", () => {
        expect(() => convert(100, "USD", "CHF", rates)).toThrow(
          "missing rate for currency: CHF",
        );
      });
      it("zero rate throws", () => {
        expect(() => convert(100, "USD", "EUR", { USD: 0, EUR: 0.92 })).toThrow(
          "rate for USD cannot be zero",
        );
      });
    });
  });
});
