import { describe, expect, it } from "vitest";
import {
  calculateMarket,
  calculateCrafting,
  calculateEnhancement,
  calculateFailstack,
  calculateBox,
  calculateProduction,
  defaultTax,
} from "./tools";

describe("market arithmetic", () => {
  it("applies Value Pack after base tax and preserves money beyond number precision", () => {
    expect(
      calculateMarket({
        ...defaultTax,
        valuePack: true,
        price: "1000000000000000000",
        quantity: 1,
        cost: "0",
      }).net,
    ).toBe("845000000000000000");
    expect(
      calculateMarket({ ...defaultTax, price: "101", quantity: 1, cost: "0" })
        .net,
    ).toBe("65");
  });
  it("supports exemption and rejects invalid numeric amounts", () => {
    expect(
      calculateMarket({
        ...defaultTax,
        exempt: true,
        price: "100",
        quantity: 1,
        cost: "0",
      }).net,
    ).toBe("100");
    expect(() =>
      calculateMarket({ ...defaultTax, price: "-1", quantity: 1, cost: "0" }),
    ).toThrow();
  });
});
describe("crafting opportunity cost", () => {
  it("uses owned material to reduce cash need without hiding its economic cost", () => {
    const result = calculateCrafting({
      ...defaultTax,
      exempt: true,
      crafts: 2,
      yield: 2.5,
      salePrice: "100",
      extraCost: "10",
      minutes: 30,
      ingredients: [{ name: "Material", quantity: 3, owned: 5, price: "20" }],
    });
    expect(result.economicCost).toBe("130");
    expect(result.cashCost).toBe("30");
    expect(result.profit).toBe("370");
    expect(result.profitPerHour).toBe("740");
  });
});
describe("enhancement finite horizon", () => {
  const input = {
    chance: 50,
    increase: 0,
    cap: 100,
    limit: 2,
    pity: 0,
    currentPity: 0,
    attemptCost: "100",
    failureCost: "0",
    guaranteedCost: "50",
    stackCost: "0",
    buyPrice: "200",
  };
  it("agrees with enumeration of two coin flips", () => {
    const result = calculateEnhancement(input);
    expect(result.successPercent).toBe(75);
    expect(result.expectedAttempts).toBe(1.5);
    expect(result.expectedSpend).toBe("150");
  });
  it("guarantees the attempt after the remaining failures, not the last failure", () => {
    const result = calculateEnhancement({ ...input, chance: 0, pity: 1 });
    expect(result.successPercent).toBe(100);
    expect(result.guaranteedAttempt).toBe(2);
    expect(result.expectedSpend).toBe("150");
    expect(
      calculateEnhancement({ ...input, chance: 0, pity: 1, currentPity: 1 })
        .expectedSpend,
    ).toBe("50");
  });
});
describe("failstack renewal cost", () => {
  it("accounts for repeated starts after accidental success", () => {
    const r = calculateFailstack({
      baseCost: "0",
      steps: [
        { label: "1", chance: 50, cost: "10", failureCost: "0" },
        { label: "2", chance: 50, cost: "10", failureCost: "0" },
      ],
    });
    expect(r.expectedCost).toBe("60");
    expect(r.chanceOfBuildingPercent).toBe(25);
  });
});
describe("exclusive RNG outcomes", () => {
  it("computes expected value after tax and validates total probability", () => {
    const input = {
      ...defaultTax,
      exempt: true,
      boxPrice: "30",
      boxes: 2,
      outcomes: [
        { name: "A", probability: 25, quantity: 1, price: "100" },
        { name: "B", probability: 75, quantity: 1, price: "0" },
      ],
    };
    expect(calculateBox(input).expectedProfit).toBe("-5");
    expect(calculateBox(input).totalExpectedProfit).toBe("-10");
    expect(() =>
      calculateBox({ ...input, outcomes: [input.outcomes[0]] }),
    ).toThrow();
  });
});
describe("shared stock in production chains", () => {
  it("bounds repeated expansion of a branching graph", () => {
    const graph = Array.from({ length: 20 }, (_, index) => ({
      id: "level-" + index,
      name: "Level " + index,
      yield: 1,
      ingredients:
        index === 19
          ? [{ name: "Raw", quantity: 1, price: "1", recipeId: null }]
          : [0, 1].map(() => ({
              name: "Level " + (index + 1),
              quantity: 1,
              price: "1",
              recipeId: "level-" + (index + 1),
            })),
    }));
    expect(() =>
      calculateProduction({
        recipeId: "level-0",
        quantity: 1,
        recipes: graph,
        inventory: [],
      }),
    ).toThrow(/20.000/);
  });
  const recipes = [
    {
      id: "root",
      name: "Product",
      yield: 1,
      ingredients: [
        { name: "Sub", quantity: 1, price: "10", recipeId: "sub" },
        { name: "Sub", quantity: 1, price: "10", recipeId: "sub" },
      ],
    },
    {
      id: "sub",
      name: "Sub",
      yield: 3,
      ingredients: [{ name: "Raw", quantity: 2, price: "5", recipeId: null }],
    },
  ];
  it("uses byproduct surplus across branches without buying twice", () => {
    const result = calculateProduction({
      recipeId: "root",
      quantity: 1,
      recipes,
      inventory: [],
    });
    expect(result.cost).toBe("10");
    expect(result.tasks.find((r) => r.id === "sub")?.crafts).toBe(1);
  });
  it("consumes shared inventory once and detects cycles", () => {
    const result = calculateProduction({
      recipeId: "root",
      quantity: 1,
      recipes,
      inventory: [
        {
          id: "stock",
          name: "Raw",
          quantity: 1,
          target: 0,
          location: "Velia",
          price: "5",
        },
      ],
    });
    expect(result.cost).toBe("5");
    expect(() =>
      calculateProduction({
        recipeId: "root",
        quantity: 1,
        recipes: [
          {
            ...recipes[0],
            ingredients: [
              { name: "Product", quantity: 1, price: "0", recipeId: "root" },
            ],
          },
        ],
        inventory: [],
      }),
    ).toThrow();
  });
});
