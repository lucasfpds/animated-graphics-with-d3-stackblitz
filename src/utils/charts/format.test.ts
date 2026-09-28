import { describe, expect, it } from "vitest";

import {
  formatCompactNumber,
  formatCurrency,
  formatDateTime,
  formatDecimal,
  formatMetricValue,
  formatNumber,
  formatPercent,
  formatShare,
  formatShortDate,
  formatVariation,
} from "./format";

describe("formatNumber", () => {
  it("should use the pt-BR thousands separator", () => {
    expect(formatNumber(1234567)).toBe("1.234.567");
  });
});

describe("formatDecimal", () => {
  it("should always keep one decimal place with a comma", () => {
    expect(formatDecimal(2)).toBe("2,0");
  });
});

describe("formatCompactNumber", () => {
  it("should abbreviate large values", () => {
    expect(formatCompactNumber(86400)).toMatch(/86,4/);
  });
});

describe("formatCurrency", () => {
  it("should format values in Brazilian reais", () => {
    expect(formatCurrency(412000)).toMatch(/R\$\s?412\.000/);
  });
});

describe("formatPercent", () => {
  it("should format a ratio as a percentage", () => {
    expect(formatPercent(0.42)).toBe("42%");
  });

  it("should fall back to zero for a non-finite ratio", () => {
    expect(formatPercent(Number.NaN)).toBe("0%");
  });
});

describe("formatShare", () => {
  it("should compute the share of the total", () => {
    expect(formatShare(25, 200)).toBe("12,5%");
  });

  it("should not produce NaN when the total is zero", () => {
    expect(formatShare(10, 0)).toBe("0%");
  });
});

describe("formatVariation", () => {
  it("should prefix a positive variation with a plus sign", () => {
    expect(formatVariation(120, 100)).toBe("+20%");
  });

  it("should keep the minus sign for a negative variation", () => {
    expect(formatVariation(80, 100)).toBe("-20%");
  });

  it("should return 100% when the reference is zero", () => {
    expect(formatVariation(50, 0)).toBe("100%");
  });

  it("should return 0% when both values are zero", () => {
    expect(formatVariation(0, 0)).toBe("0%");
  });
});

describe("formatMetricValue", () => {
  it("should use currency for the currency unit", () => {
    expect(formatMetricValue(1000, "currency")).toMatch(/R\$/);
  });

  it("should use plain numbers for the count unit", () => {
    expect(formatMetricValue(1000, "count")).toBe("1.000");
  });
});

describe("date formatters", () => {
  it("should format short dates in pt-BR", () => {
    // Asserção independente de fuso horário: "01 de jan." ou "31 de dez.".
    expect(formatShortDate(1767225600000)).toMatch(/^\d{2} de \w{3}\.$/);
  });

  it("should include the time in the date-time format", () => {
    expect(formatDateTime(1767225600000)).toMatch(/\d{2}:\d{2}/);
  });
});
