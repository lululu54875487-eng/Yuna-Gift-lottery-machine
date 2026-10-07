const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

function createElement(initial = {}) {
  return {
    value: "",
    checked: false,
    disabled: false,
    innerHTML: "",
    innerText: "",
    textContent: "",
    style: {},
    focus() {},
    remove() {},
    ...initial
  };
}

const elements = {
  input: createElement(),
  vipInput: createElement(),
  maxWins: createElement({ value: "unlimited" }),
  vipCountsTowardLimit: createElement({ checked: true }),
  drawCount: createElement({ value: "1" }),
  machineIcon: createElement(),
  rollingText: createElement(),
  result: createElement(),
  startButton: createElement(),
  cancelButton: createElement()
};

const alerts = [];
const context = {
  console,
  Math,
  Date,
  Promise,
  Number,
  Infinity,
  String,
  Object,
  Set,
  alert(message) {
    alerts.push(message);
  },
  confirm() {
    return true;
  },
  setTimeout(callback) {
    callback();
    return 0;
  },
  document: {
    getElementById(id) {
      return elements[id];
    },
    createElement() {
      return createElement();
    },
    body: {
      appendChild() {}
    }
  },
  navigator: {
    clipboard: {
      async writeText() {}
    }
  }
};

vm.createContext(context);
vm.runInContext(script, context);

function assertJsonEqual(actual, expected) {
  assert.strictEqual(JSON.stringify(actual), JSON.stringify(expected));
}

const simple = context.parseSimplePlayers("璐璐、抽抽、璐璐");
assertJsonEqual(simple.players, ["璐璐", "抽抽"]);
assert.strictEqual(simple.warnings.length, 1);

const gift = context.parseGiftEntries([
  "璐璐：21、21",
  "璐璐：35",
  "抽抽：21"
]);
assertJsonEqual(gift.wants["璐璐"], ["21", "35"]);
assertJsonEqual(gift.numberMap["21"], ["璐璐", "抽抽"]);
assert.strictEqual(gift.errors.length, 0);
assert.strictEqual(gift.warnings.length, 2);

const vipConflict = context.parseVipEntries("21：璐璐\n21：抽抽", gift.numberMap);
assert.strictEqual(vipConflict.errors.length, 1);

const vipMissing = context.parseVipEntries("99：璐璐", gift.numberMap);
assert.strictEqual(vipMissing.errors.length, 1);

assert.strictEqual(
  context.escapeHtml("<img src=x onerror=alert(1)>"),
  "&lt;img src=x onerror=alert(1)&gt;"
);

elements.input.value = "<img src=x onerror=alert(1)>、抽抽";
elements.vipInput.value = "";

context.startLottery().then(() => {
  assert.ok(elements.result.innerText.includes("抽籤抽人"));
  assert.ok(!elements.rollingText.innerHTML.includes("<img"));
  console.log("Smoke tests OK");
}).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
