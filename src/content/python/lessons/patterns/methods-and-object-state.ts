import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";

const s = py.str;
const i = py.int;
const f = py.float;

export const methodsAndObjectState: PyLesson = {
  slug: "methods-and-object-state",
  ref: "python:methods-and-object-state",
  module: "patterns",
  number: 2,
  title: "Methods and object state",
  level: "advanced",
  summary:
    "Write methods that change an object's state safely: check the rule (an **invariant**) before changing anything, so an object can never end up invalid. Expose calculated values as properties, and know when an attribute belongs to the class rather than to each instance.",

  sections: [
    {
      label: "methods guard the state",
      blocks: [
        {
          kind: "p",
          text: "An object's **state** is the current value of its attributes. Methods are the doors through which state changes: `account.deposit(50)`, `cart.add(\"A1\", 2)`. Put the rules in those methods: an **invariant** is something that must always be true, like “the balance is never negative”. Check the request first, raise a clear error if it would break the rule, and only then change the attributes.",
        },
        { kind: "code", code: 'def withdraw(self, amount):\n    if amount <= 0:\n        raise ValueError("amount must be positive")\n    if amount > self.balance:\n        raise ValueError("insufficient funds")\n    self.balance -= amount      # only reached when the change is valid' },
        {
          kind: "p",
          text: "Check first, change second. A method that changes one attribute and then fails before changing the next leaves the object half-updated, which is harder to recover from than an error raised before anything changed.",
        },
      ],
    },
    {
      label: "properties",
      blocks: [
        {
          kind: "p",
          text: "A **property** is a method that's read like an attribute: decorate it with `@property`, and `cart.total` calls it without brackets. Use one for values calculated from other attributes, so they can never be out of date the way a stored copy can.",
        },
      ],
    },
    {
      label: "class attributes and shared state",
      blocks: [
        {
          kind: "p",
          text: "A name assigned in the class body, outside any method, is a **class attribute**, shared by every instance: good for constants like `MAX_ITEMS = 50`. Mutable state must be created in `__init__` (`self.items = {}`), so each instance gets its own. A list or dictionary in the class body would be one object shared by all instances: the class-level cousin of the mutable default trap.",
        },
      ],
    },
  ],

  example: {
    caption: "An account that keeps its invariant, and a property. Press Run to execute it with real Python; running examples never affects your progress.",
    code: 'class Account:\n    """A bank account whose balance never goes below zero."""\n\n    def __init__(self, owner, balance=0):\n        self.owner = owner\n        self.balance = balance\n        self.history = []\n\n    def deposit(self, amount):\n        if amount <= 0:\n            raise ValueError("deposit must be positive")\n        self.balance += amount\n        self.history.append(("deposit", amount))\n\n    def withdraw(self, amount):\n        if amount <= 0:\n            raise ValueError("withdrawal must be positive")\n        if amount > self.balance:\n            raise ValueError(f"insufficient funds: balance is {self.balance}")\n        self.balance -= amount\n        self.history.append(("withdraw", amount))\n\n    @property\n    def transactions(self):\n        return len(self.history)\n\n\nacct = Account("Ada", 100)\nacct.deposit(50)\nacct.withdraw(30)\ntry:\n    acct.withdraw(500)\nexcept ValueError as error:\n    print("Refused:", error)\nprint(acct.balance, acct.transactions, acct.history)',
  },

  walkthrough: [
    {
      title: "A method changes the object it's called on",
      text: "Each call updates `self.balance` on that account only.",
      code: 'class Account:\n    def __init__(self, balance=0):\n        self.balance = balance\n    def deposit(self, amount):\n        self.balance += amount\n\na = Account()\nb = Account(10)\na.deposit(5)\na.deposit(5)\nprint(a.balance, b.balance)',
    },
    {
      title: "Check first, then change",
      text: "The refused withdrawal raises before touching the balance, so it's still 20 afterwards.",
      code: 'class Account:\n    def __init__(self, balance=0):\n        self.balance = balance\n    def withdraw(self, amount):\n        if amount > self.balance:\n            raise ValueError("insufficient funds")\n        self.balance -= amount\n\nacct = Account(20)\ntry:\n    acct.withdraw(50)\nexcept ValueError as error:\n    print("Refused:", error)\nprint(acct.balance)',
    },
    {
      title: "A property is always up to date",
      text: "`total` is calculated each time it's read, so it reflects every change to `items` without being stored.",
      code: 'class Cart:\n    def __init__(self):\n        self.items = {}\n    def add(self, sku, price, qty=1):\n        old_price, old_qty = self.items.get(sku, (price, 0))\n        self.items[sku] = (price, old_qty + qty)\n    @property\n    def total(self):\n        return round(sum(p * q for p, q in self.items.values()), 2)\n\ncart = Cart()\ncart.add("A1", 2.5, 2)\nprint(cart.total)\ncart.add("B2", 4.0)\nprint(cart.total)',
    },
    {
      title: "A list in the class body is shared",
      text: "`tags` was defined once, on the class, so every instance appends to the same list.",
      code: 'class Shared:\n    tags = []\n    def tag(self, t):\n        self.tags.append(t)\n\nclass Separate:\n    def __init__(self):\n        self.tags = []\n    def tag(self, t):\n        self.tags.append(t)\n\nx, y = Shared(), Shared()\nx.tag("sale")\nprint(y.tags)\np, q = Separate(), Separate()\np.tag("sale")\nprint(q.tags)',
    },
  ],

  mistakes: [
    {
      title: "Changing state before checking",
      text: "The balance is reduced first and checked afterwards, so the refused withdrawal still leaves the account at -30.",
      code: 'class Account:\n    def __init__(self, balance):\n        self.balance = balance\n    def withdraw(self, amount):\n        self.balance -= amount\n        if self.balance < 0:\n            raise ValueError("insufficient funds")\n\nacct = Account(20)\ntry:\n    acct.withdraw(50)\nexcept ValueError:\n    pass\nprint(acct.balance)',
      fix: "Check the rule before changing anything.",
    },
    {
      title: "Calling a property with brackets",
      text: "`cart.total` is already the number; adding `()` tries to call that number: `TypeError`.",
      code: 'class Cart:\n    @property\n    def total(self):\n        return 9.5\n\nprint(Cart().total())',
      raises: "TypeError",
      fix: "Read a property without brackets: `cart.total`.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "A bank account that can't overdraw",
      prompt:
        "Define `Account` with `__init__(self, owner, balance=0)`, and methods `deposit(amount)` and `withdraw(amount)`. Both reject amounts of 0 or less with `ValueError`; `withdraw` also raises `ValueError` if the amount is more than the balance. A refused operation must leave the balance unchanged. Both methods return the new balance.",
      looksFor: [
        "Deposits and withdrawals update `balance` and return it.",
        "Non-positive amounts and overdrafts raise `ValueError`.",
        "After a refused operation, `balance` is unchanged.",
      ],
      starter: "class Account:\n    # __init__, deposit and withdraw.\n    pass\n",
      task: {
        checks: [
          { kind: "expr", id: "flow", label: "Deposits and withdrawals update and return the balance", show: 'a = Account("Ada", 100); (a.deposit(50), a.withdraw(30), a.balance)', expr: 'a = Account("Ada", 100)\nresult = (a.deposit(50), a.withdraw(30), a.balance, a.owner)', expected: py.tuple(i(150), i(120), i(120), s("Ada")) },
          { kind: "expr", id: "overdraft", label: "Overdrawing raises ValueError", show: 'Account("Ada", 20).withdraw(50)', expr: 'Account("Ada", 20).withdraw(50)', raises: "ValueError" },
          { kind: "expr", id: "unchanged", label: "A refused withdrawal leaves the balance unchanged", show: 'a = Account("Ada", 20); a.withdraw(50) (refused); a.balance', expr: 'a = Account("Ada", 20)\ntry:\n    a.withdraw(50)\nexcept ValueError:\n    pass\nresult = a.balance', expected: i(20), tip: "Check amount > self.balance before subtracting." },
          { kind: "expr", id: "non-positive", label: "Zero and negative amounts are refused", show: 'deposit(0), deposit(-5), withdraw(0)', expr: 'a = Account("Ada", 10)\nresult = []\nfor op, amount in [(a.deposit, 0), (a.deposit, -5), (a.withdraw, 0), (a.withdraw, -1)]:\n    try:\n        op(amount)\n        result.append("accepted")\n    except ValueError:\n        result.append("refused")\nresult.append(a.balance)', expected: py.list(s("refused"), s("refused"), s("refused"), s("refused"), i(10)) },
          { kind: "expr", id: "default", label: "balance defaults to 0", hidden: true, expr: 'Account("Ben").balance', expected: i(0) },
        ],
      },
      hints: [
        "__init__ stores self.owner and self.balance.",
        "In each method, check first: if amount <= 0: raise ValueError(...). withdraw also checks amount > self.balance.",
        "Then change self.balance and return it.",
      ],
      answer: 'class Account:\n    """A bank account whose balance never goes below zero."""\n\n    def __init__(self, owner, balance=0):\n        self.owner = owner\n        self.balance = balance\n\n    def deposit(self, amount):\n        if amount <= 0:\n            raise ValueError("deposit must be positive")\n        self.balance += amount\n        return self.balance\n\n    def withdraw(self, amount):\n        if amount <= 0:\n            raise ValueError("withdrawal must be positive")\n        if amount > self.balance:\n            raise ValueError(f"insufficient funds: balance is {self.balance}")\n        self.balance -= amount\n        return self.balance',
      wrong: [
        { code: 'class Account:\n    def __init__(self, owner, balance=0):\n        self.owner = owner\n        self.balance = balance\n    def deposit(self, amount):\n        if amount <= 0:\n            raise ValueError("bad")\n        self.balance += amount\n        return self.balance\n    def withdraw(self, amount):\n        if amount <= 0:\n            raise ValueError("bad")\n        self.balance -= amount\n        if self.balance < 0:\n            raise ValueError("insufficient")\n        return self.balance\n', fails: ["unchanged"], why: "changes before checking" },
        { code: 'class Account:\n    def __init__(self, owner, balance=0):\n        self.owner = owner\n        self.balance = balance\n    def deposit(self, amount):\n        self.balance += amount\n        return self.balance\n    def withdraw(self, amount):\n        if amount > self.balance:\n            raise ValueError("insufficient")\n        self.balance -= amount\n        return self.balance\n', fails: ["non-positive"], why: "accepts zero and negative amounts" },
      ],
    },
    {
      id: "challenge-2",
      title: "A cart with a total property",
      prompt:
        "Define `Cart`. Each cart starts empty (its own dictionary of SKU → quantity) and stores a `prices` dictionary passed to `__init__`. `add(sku, qty=1)` adds to the quantity, raising `KeyError` for a SKU not in `prices` and `ValueError` for a quantity below 1; `remove(sku)` removes a SKU completely (no error if it isn't there). A property `total` returns the cart's value, rounded to 2 places.",
      looksFor: [
        "`total` is a property (read without brackets) that's always up to date.",
        "`add` accumulates quantities and validates the SKU and quantity; `remove` deletes a line.",
        "Two carts never share their contents.",
      ],
      starter: "class Cart:\n    # __init__(self, prices), add, remove and a total property.\n    pass\n",
      task: {
        checks: [
          { kind: "expr", id: "total", label: "total reflects adds and removes", show: 'c = Cart({"A1": 2.5, "B2": 4.0}); add A1 x2, B2, A1; total, remove A1, total', expr: 'c = Cart({"A1": 2.5, "B2": 4.0})\nc.add("A1", 2)\nc.add("B2")\nc.add("A1")\nfirst = c.total\nc.remove("A1")\nc.remove("ZZ")\nresult = (first, c.total)', expected: py.tuple(f(11.5), f(4)), compare: { numbers: "int-float-equal" }, tip: "Make total a @property that sums prices[sku] * qty over the cart." },
          { kind: "expr", id: "property", label: "total is a property, not a method", show: "isinstance(Cart.total, property)", expr: "isinstance(Cart.__dict__.get('total'), property)", expected: py.bool(true), tip: "Put @property on the line above def total(self):." },
          { kind: "expr", id: "unknown", label: "Unknown SKUs raise KeyError", show: 'Cart({"A1": 1}).add("ZZ")', expr: 'Cart({"A1": 1}).add("ZZ")', raises: "KeyError" },
          { kind: "expr", id: "qty", label: "Quantities below 1 raise ValueError", show: 'Cart({"A1": 1}).add("A1", 0)', expr: 'Cart({"A1": 1}).add("A1", 0)', raises: "ValueError" },
          { kind: "expr", id: "separate", label: "Two carts don't share contents", hidden: true, expr: 'p = {"A1": 1.0}\na = Cart(p)\nb = Cart(p)\na.add("A1", 3)\nresult = (a.total, b.total)', expected: py.tuple(f(3), i(0)), compare: { numbers: "int-float-equal" }, tip: "Create the quantities dictionary in __init__ (self.quantities = {}), not in the class body." },
        ],
      },
      hints: [
        "__init__(self, prices): self.prices = prices and self.quantities = {}.",
        'add: check sku in self.prices (else raise KeyError(sku)) and qty >= 1; then self.quantities[sku] = self.quantities.get(sku, 0) + qty. remove: self.quantities.pop(sku, None).',
        "@property def total(self): return round(sum(self.prices[s] * q for s, q in self.quantities.items()), 2).",
      ],
      answer: 'class Cart:\n    """A shopping cart priced from a price list."""\n\n    def __init__(self, prices):\n        self.prices = prices\n        self.quantities = {}\n\n    def add(self, sku, qty=1):\n        if sku not in self.prices:\n            raise KeyError(f"unknown sku: {sku}")\n        if qty < 1:\n            raise ValueError(f"quantity must be at least 1, got {qty}")\n        self.quantities[sku] = self.quantities.get(sku, 0) + qty\n\n    def remove(self, sku):\n        self.quantities.pop(sku, None)\n\n    @property\n    def total(self):\n        return round(sum(self.prices[sku] * qty for sku, qty in self.quantities.items()), 2)',
      wrong: [
        { code: 'class Cart:\n    quantities = {}\n    def __init__(self, prices):\n        self.prices = prices\n    def add(self, sku, qty=1):\n        if sku not in self.prices:\n            raise KeyError(sku)\n        if qty < 1:\n            raise ValueError("qty")\n        self.quantities[sku] = self.quantities.get(sku, 0) + qty\n    def remove(self, sku):\n        self.quantities.pop(sku, None)\n    @property\n    def total(self):\n        return round(sum(self.prices[s] * q for s, q in self.quantities.items()), 2)\n', fails: ["separate"], why: "quantities shared through the class" },
        { code: 'class Cart:\n    def __init__(self, prices):\n        self.prices = prices\n        self.quantities = {}\n    def add(self, sku, qty=1):\n        if sku not in self.prices:\n            raise KeyError(sku)\n        if qty < 1:\n            raise ValueError("qty")\n        self.quantities[sku] = self.quantities.get(sku, 0) + qty\n    def remove(self, sku):\n        self.quantities.pop(sku, None)\n    def total(self):\n        return round(sum(self.prices[s] * q for s, q in self.quantities.items()), 2)\n', fails: ["total", "property", "separate"], why: "total is a method" },
      ],
    },
  ],

  quiz: [
    {
      id: "class-attr",
      prompt: "What does this program print?",
      code: "class Order:\n    TAX = 0.2\n    def __init__(self, amount):\n        self.amount = amount\n    def with_tax(self):\n        return self.amount * (1 + self.TAX)\n\nOrder.TAX = 0.1\nprint(Order(100).with_tax(), Order(50).with_tax())",
      options: [
        { text: "`110.00000000000001 55.00000000000001`", correct: true, why: "`TAX` is a class attribute shared by every instance, so changing `Order.TAX` affects both. (The long decimals are ordinary float rounding.)" },
        { text: "`120.0 60.0`", why: "The class attribute was changed to 0.1 before either order was created." },
        { text: "`110.0 60.0`", why: "Both instances read the same class attribute, so both use 0.1." },
        { text: "An `AttributeError`", why: "`self.TAX` finds the class attribute when the instance has none of its own." },
      ],
    },
    {
      id: "invariant",
      prompt: "Why should `withdraw` check the balance **before** subtracting?",
      options: [
        { text: "So a refused withdrawal leaves the account exactly as it was", correct: true, why: "Raising before any change keeps the invariant: the balance is never negative, even briefly." },
        { text: "Subtracting first is slower", why: "Speed isn't the issue; leaving the object in an invalid state is." },
        { text: "Python requires checks at the top of a method", why: "It doesn't; the order matters for correctness, not syntax." },
        { text: "So the error message includes the balance", why: "Either order can include the balance; the difference is what state is left behind." },
      ],
    },
  ],

  outcomes: [
    "Write methods that change state only after checking the object's invariants.",
    "Expose calculated values with `@property`.",
    "Use class attributes for shared constants, and `__init__` for per-instance state.",
    "Avoid shared mutable state between instances.",
  ],
};
