const test = require("node:test");
const assert = require("node:assert");
const { chart } = require("../tools/chart.js");

test("음력 생일은 양력으로 바꿔서 계산한다", () => {
  const lunar = chart({ birth: "1994-06-18", lunar: "1", time: "17:30", gender: "여" });
  const solar = chart({ birth: "1994-07-26", time: "17:30", gender: "여" });
  assert.match(lunar, /음력 1994-06-18 → 양력 1994-07-26/);
  assert.strictEqual(lunar.split("\n").slice(3).join("\n"), solar.split("\n").slice(3).join("\n"));
});
