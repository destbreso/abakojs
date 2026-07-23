"use strict";

const money = require("../index");

const {
  allocate,
  netFromGross,
  taxFromGross,
  grossFromNet,
  total,
  sum,
  cents,
  ArgumentError,
} = money;

describe("allocate (arbitrary ratios)", () => {
  it("distributes by simple ratios", () => {
    expect(allocate(1000, [7, 3])).toEqual([700, 300]);
    expect(allocate(100, [1, 1, 1])).toEqual([33.34, 33.33, 33.33]);
    expect(allocate(100, [3, 2, 1])).toEqual([50.01, 33.33, 16.66]);
    expect(allocate(0.05, [1, 1])).toEqual([0.03, 0.02]);
  });

  it("does not require ratios to sum to 100 or 1", () => {
    expect(allocate(10, [1, 1])).toEqual([5, 5]);
    expect(allocate(10, [0.5, 0.5])).toEqual([5, 5]);
    expect(allocate(10, [2, 2])).toEqual([5, 5]);
  });

  it("handles negative amounts (magnitude allocated, sign preserved)", () => {
    expect(allocate(-0.05, [1, 1])).toEqual([-0.03, -0.02]);
    expect(sum(allocate(-100, [3, 2, 1]))).toEqual(-100);
  });

  it("accepts a zero-weight bucket", () => {
    expect(allocate(10, [1, 0, 1])).toEqual([5, 0, 5]);
  });

  it("throws on invalid ratios", () => {
    expect(() => allocate(10, [])).toThrow(ArgumentError);
    expect(() => allocate(10, [0, 0])).toThrow(ArgumentError);
    expect(() => allocate(10, [1, -1])).toThrow(ArgumentError);
    expect(() => allocate(10, "nope")).toThrow(ArgumentError);
  });

  it("INVARIANT: parts always sum back to the amount", () => {
    const ratioSets = [
      [1, 1],
      [1, 1, 1],
      [7, 3],
      [3, 2, 1],
      [1, 2, 3, 4],
      [5, 5, 5, 5, 5, 5, 5],
      [0.5, 0.25, 0.25],
      [1, 0, 2],
    ];
    for (const ratios of ratioSets) {
      for (let c = 0; c <= 400; c++) {
        const amt = c / 100;
        const parts = allocate(amt, ratios);
        const totalCents = parts.reduce((acc, p) => acc + cents(p), 0);
        expect(totalCents).toBe(c);
      }
    }
  });
});

describe("VAT: gross / net / tax", () => {
  it("net from gross", () => {
    expect(netFromGross(121, 21)).toEqual(100);
    expect(netFromGross(100, 21)).toEqual(82.64);
    expect(netFromGross(107, 7)).toEqual(100);
  });

  it("gross from net", () => {
    expect(grossFromNet(100, 21)).toEqual(121);
    expect(grossFromNet(82.64, 21)).toEqual(99.99); // rounding is not perfectly invertible
  });

  it("tax from gross", () => {
    expect(taxFromGross(121, 21)).toEqual(21);
    expect(taxFromGross(100, 21)).toEqual(17.36);
  });

  it("INVARIANT: net + tax === gross exactly", () => {
    for (const rate of [7, 10, 19, 21, 8.25]) {
      for (let c = 0; c <= 500; c++) {
        const gross = c / 100;
        const net = netFromGross(gross, rate);
        const tax = taxFromGross(gross, rate);
        expect(sum(net, tax)).toBe(gross);
      }
    }
  });

  it("grossFromNet is an alias of addPercent", () => {
    expect(grossFromNet(89.99, 21)).toEqual(money.addPercent(89.99, 21));
  });
});

describe("total alias", () => {
  it("equals sum", () => {
    expect(total(19.99, 4.99, 0.5)).toEqual(sum(19.99, 4.99, 0.5));
    expect(total([0.1, 0.2, -0.3])).toEqual(sum([0.1, 0.2, -0.3]));
    expect(total(0.12345678, 0.00000001, { decimals: 8 })).toEqual(0.12345679);
  });
});

describe("chain (fluent pipeline)", () => {
  const { chain } = money;

  it("chains arithmetic and recipes, unwraps with .value/.done()", () => {
    expect(chain(46.44).deductPercent(5).addPercent(21).value).toEqual(53.39);
    expect(chain(100).add(50).multiply(2).done()).toEqual(300);
    expect(chain(121).netFromGross(21).value).toEqual(100);
    expect(chain(121).taxFromGross(21).value).toEqual(21);
    expect(chain(89.99).addFees(2.9, 0.3).value).toEqual(92.9);
  });

  it("coerces to a number via valueOf", () => {
    expect(5 + Number(chain(10).add(5))).toEqual(20);
    expect(Number(chain(19.99).multiply(3))).toEqual(59.97);
  });

  it("has terminal steps returning arrays / strings", () => {
    expect(chain(1000000.05).allocate([50, 30, 20])).toEqual([
      500000.03, 300000.01, 200000.01,
    ]);
    expect(chain(49.99).split(3)).toEqual([16.67, 16.66, 16.66]);
    expect(chain(1234.56).format("USD", "en-US")).toEqual("$1,234.56");
  });

  it("is immutable (each step returns a new chain)", () => {
    const base = chain(100);
    const a = base.add(50);
    const b = base.subtract(50);
    expect(base.value).toEqual(100);
    expect(a.value).toEqual(150);
    expect(b.value).toEqual(50);
  });

  it("honors a per-chain rounding mode", () => {
    expect(chain(1.005, 2, money.RoundingMode.HALF_UP).value).toEqual(1.01);
    expect(chain(1.005).value).toEqual(1); // default HALF_EVEN
  });
});
