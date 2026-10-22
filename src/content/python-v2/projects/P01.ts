/**
 * P01 Smart Shopping Cart & Receipt Generator (registry P01), on R01@starter.1. Phase 1 builds milestone 1;
 * milestones 2–5 stay `planned` in the registry.
 */
import type { PyProject } from "../model";
import { py } from "@/engine/python/values";
import type { PyValue } from "@/engine/python/values";
import { mountsFor } from "../datasets";
import { milestone, prints, shows } from "./step";

const STORE = `"""Reads Runtime Market's product file. Provided for you: you don't need to change it."""
import csv


def load_products(path):
    """Every product in the file, as a dict. Prices are numbers; empty dates are None."""
    products = []
    with open(path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            row["list_price"] = float(row["list_price"])
            row["weight_kg"] = float(row["weight_kg"]) if row["weight_kg"] else None
            row["discontinued_on"] = row["discontinued_on"] or None
            products.append(row)
    return products
`;

const MAIN = `from store import load_products
from catalogue import build_catalogue, find

products = load_products("data/products.csv")
catalogue = build_catalogue(products)
print(len(catalogue), "products")
for name in find(catalogue, "speaker"):
    print("-", name)
`;

const CATALOGUE_STARTER = `def build_catalogue(products):
    """Return a dict that maps each product_id to its product."""
    pass


def find(catalogue, text):
    """Names of products still on sale whose name contains text, ignoring case, sorted A to Z."""
    pass
`;

const CATALOGUE_M1 = `def build_catalogue(products):
    """Return a dict that maps each product_id to its product."""
    catalogue = {}
    for product in products:
        catalogue[product["product_id"]] = product
    return catalogue


def find(catalogue, text):
    """Names of products still on sale whose name contains text, ignoring case, sorted A to Z."""
    wanted = text.lower()
    names = []
    for product in catalogue.values():
        if product["discontinued_on"] is None and wanted in product["name"].lower():
            names.append(product["name"])
    return sorted(names)
`;

const s = py.str;
const product = (name: string, discontinued: string | null): PyValue =>
  py.dict([[s("name"), s(name)], [s("discontinued_on"), discontinued === null ? py.none : s(discontinued)]]);
const lamps = py.dict([
  [s("A1"), product("Desk Lamp", null)],
  [s("A2"), product("Lamp Shade", "2025-01-01")],
  [s("A3"), product("Floor LAMP", null)],
]);
const mugs = py.dict([[s("M1"), product("zebra Mug", null)], [s("M2"), product("Apple Mug", null)], [s("M3"), product("Mug Tree", "2024-06-30")]]);
const names = (...xs: string[]) => py.list(...xs.map(s));

const loaded = 'from store import load_products\nfrom catalogue import build_catalogue\n_c = build_catalogue(load_products("data/products.csv"))\n';

const SPEAKERS = ["Compact Speaker 2.0", "Deluxe Speaker", "Essential Speaker", "Everyday Speaker", "Lite Speaker", "Mini Speaker", "Organic Speaker", "Pro Speaker", "Travel Speaker", "Ultra Speaker"];

const CART = `def add_item(cart, product_id, qty):
    """Add qty onto whatever is already in the cart for this product."""
    cart[product_id] = cart.get(product_id, 0) + qty


def set_qty(cart, product_id, qty):
    """Set the quantity. Zero or less removes the product."""
    if qty <= 0:
        if product_id in cart:
            cart.pop(product_id)
    else:
        cart[product_id] = qty


def units(cart):
    """How many units are in the cart, across every product."""
    total = 0
    for product_id in cart:
        total = total + cart[product_id]
    return total
`;

const CART_STUB = `def add_item(cart, product_id, qty):
    """Add qty onto whatever is already in the cart for this product."""
    pass


def set_qty(cart, product_id, qty):
    """Set the quantity. Zero or less removes the product."""
    pass


def units(cart):
    """How many units are in the cart, across every product."""
    pass
`;

const MONEY = `def cents(price):
    """Shelf price as a whole number of cents."""
    return round(price * 100)


def subtotal_cents(cart, catalogue):
    """Sum of price times quantity, in cents."""
    total = 0
    for product_id in cart:
        total = total + cents(catalogue[product_id]["list_price"]) * cart[product_id]
    return total


def shipping_cents(subtotal):
    """599 cents, unless the subtotal is 5000 cents or more."""
    if subtotal >= 5000:
        return 0
    return 599


def tax_cents(subtotal):
    """7 percent of the subtotal, in cents."""
    return round(subtotal * 7 / 100)


def total_cents(cart, catalogue):
    """Subtotal, plus shipping, plus tax."""
    subtotal = subtotal_cents(cart, catalogue)
    return subtotal + shipping_cents(subtotal) + tax_cents(subtotal)
`;

const RECEIPT = `def money(cents):
    """Cents as a dollar string with two decimal places."""
    return f"{cents / 100:.2f}"


def write_receipt(path, cart, catalogue):
    """Write one line per product, then subtotal, shipping, tax and total."""
    lines = []
    for product_id in sorted(cart):
        product = catalogue[product_id]
        line = cents(product["list_price"]) * cart[product_id]
        lines.append(product["name"] + " x" + str(cart[product_id]) + " " + money(line))
    subtotal = subtotal_cents(cart, catalogue)
    ship = shipping_cents(subtotal)
    tax = tax_cents(subtotal)
    lines.append("subtotal " + money(subtotal))
    lines.append("shipping " + money(ship))
    lines.append("tax " + money(tax))
    lines.append("total " + money(subtotal + ship + tax))
    text = "\\n".join(lines) + "\\n"
    handle = open(path, "w", encoding="utf-8")
    handle.write(text)
    handle.close()
`;

const SALE = `def add_sale(cart, catalogue, product_id, qty):
    """Add a product that is still for sale. Skip unknown ids, discontinued products and a quantity below 1."""
    product = catalogue.get(product_id)
    if product is None:
        return False
    if product["discontinued_on"] is not None:
        return False
    if qty < 1:
        return False
    add_item(cart, product_id, qty)
    return True
`;

const MONEY_STUB = `def cents(price):
    pass


def subtotal_cents(cart, catalogue):
    pass


def shipping_cents(subtotal):
    pass


def tax_cents(subtotal):
    pass


def total_cents(cart, catalogue):
    pass
`;
const RECEIPT_STUB = `def money(cents):
    pass


def write_receipt(path, cart, catalogue):
    pass
`;
const SALE_STUB = `def add_sale(cart, catalogue, product_id, qty):
    pass
`;

const CAT_M2 = CATALOGUE_M1 + "\n" + CART;
const CAT_M3 = CAT_M2 + "\n" + MONEY;
const CAT_M4 = CAT_M3 + "\n" + RECEIPT;
const CAT_M5 = CAT_M4 + "\n" + SALE;

const MAIN_M2 = `from store import load_products
from catalogue import build_catalogue, find, add_item, set_qty, units

products = load_products("data/products.csv")
catalogue = build_catalogue(products)
cart = {}
add_item(cart, "P0001", 2)
add_item(cart, "P0005", 1)
set_qty(cart, "P0001", 1)
print(units(cart))
`;

const MAIN_M3 = `from store import load_products
from catalogue import build_catalogue, find, add_item, total_cents

products = load_products("data/products.csv")
catalogue = build_catalogue(products)
cart = {}
add_item(cart, "P0001", 1)
add_item(cart, "P0005", 1)
print(total_cents(cart, catalogue))
`;

const MAIN_M4 = `from store import load_products
from catalogue import build_catalogue, find, add_item, write_receipt

products = load_products("data/products.csv")
catalogue = build_catalogue(products)
cart = {}
add_item(cart, "P0001", 1)
add_item(cart, "P0005", 1)
write_receipt("receipt.txt", cart, catalogue)
print("receipt written")
`;

const MAIN_M5 = `from store import load_products
from catalogue import build_catalogue, find, add_sale, units

products = load_products("data/products.csv")
catalogue = build_catalogue(products)
cart = {}
add_sale(cart, catalogue, "P0001", 1)
add_sale(cart, catalogue, "P0037", 1)
add_sale(cart, catalogue, "NOPE", 1)
add_sale(cart, catalogue, "P0001", 0)
print(units(cart))
`;

const cartExpr = `from catalogue import add_item, set_qty, units
cart = {}
add_item(cart, "A", 2)
add_item(cart, "A", 1)
set_qty(cart, "B", 4)
set_qty(cart, "B", 0)
result = (units(cart), cart.get("A"), "B" in cart)
`;

const moneyExpr = `from catalogue import subtotal_cents, shipping_cents, tax_cents, total_cents
catalogue = {"A": {"list_price": 7.49}, "B": {"list_price": 4.0}}
small = {"A": 1}
big = {"A": 1, "B": 1}
result = (subtotal_cents(small, catalogue), shipping_cents(749), shipping_cents(5000), tax_cents(749), total_cents(big, catalogue))
`;

const receiptText = "Ultra Bike Light x1 7.49\nOrganic Speaker x1 171.99\nsubtotal 179.48\nshipping 0.00\ntax 12.56\ntotal 192.04\n";

const saleExpr = `from catalogue import add_sale, units
catalogue = {
    "A": {"discontinued_on": None},
    "B": {"discontinued_on": "2024-08-30"},
}
cart = {}
refused = add_sale(cart, catalogue, "A", 0)
add_sale(cart, catalogue, "A", 2)
add_sale(cart, catalogue, "B", 1)
add_sale(cart, catalogue, "C", 1)
result = (refused, units(cart), "B" in cart, "C" in cart)
`;

const market = { mounts: mountsFor("R01@starter.1", ["products.csv"]), files: { "store.py": STORE } };
const kept = [
  { kind: "expr" as const, id: "count", label: "build_catalogue holds all 328 starter products", show: "len(build_catalogue(products))", expr: `${loaded}result = len(_c)`, expected: py.int(328) },
  { kind: "expr" as const, id: "lookup", label: "Products are found by product_id", show: 'build_catalogue(products)["P0035"]["name"]', expr: `${loaded}result = _c["P0035"]["name"]`, expected: s("Deluxe Pillow") },
  {
    kind: "function" as const,
    id: "find",
    label: "find matches any case, skips discontinued products, sorts A to Z",
    tip: "Recheck all three rules: match in any case, skip products with a discontinued_on date, and return the names sorted A to Z.",
    name: "find",
    cases: [
      { args: [lamps, s("lamp")], expected: names("Desk Lamp", "Floor LAMP") },
      { args: [lamps, s("chair")], expected: names() },
      { args: [py.dict([]), s("lamp")], expected: names(), hidden: true },
      { args: [mugs, s("MUG")], expected: names("Apple Mug", "zebra Mug"), hidden: true },
    ],
  },
];

export const p01: PyProject = {
  id: "P01",
  slug: "smart-shopping-cart",
  title: "Smart Shopping Cart & Receipt Generator",
  story:
    "You've joined Runtime Market's checkout team. Over five milestones you'll build the code behind the shopping cart: browsing the catalogue, managing a cart, pricing it the way the order system does, writing a receipt file and handling the awkward cases. Everything runs on the real product file from the starter edition.",
  files: ["catalogue.py", "main.py"],
  provided: { "store.py": STORE },
  dataset: "R01@starter.1",
  dataFiles: ["products.csv"],
  milestones: [
    {
      id: "P01.m1",
      title: "Browse products",
      brief:
        "Customers search the catalogue before they buy. `store.py` already reads `data/products.csv` into a list of product dicts. In `catalogue.py`, write `build_catalogue(products)`, which indexes the products by `product_id`, and `find(catalogue, text)`, which returns the names (the `name` field) of products **still on sale** (no `discontinued_on`) whose name contains `text`, ignoring case, sorted A to Z. `main.py` uses both to list every speaker.",
      doneWhen: [
        "`build_catalogue` holds all 328 starter products, looked up by `product_id`",
        "`find` ignores case, skips discontinued products and sorts names A to Z",
        "`main.py` prints the product count and the 10 speakers on sale",
      ],
      starters: { "catalogue.py": CATALOGUE_STARTER, "main.py": MAIN },
      solution: { "catalogue.py": CATALOGUE_M1, "main.py": MAIN },
      hints: [
        "`build_catalogue`: start with an empty dict and add `catalogue[product[\"product_id\"]] = product` for each product.",
        "`find`: compare lowercase versions, `text.lower() in product[\"name\"].lower()`, and skip products whose `discontinued_on` isn't `None`.",
        "Collect matching names in a list and return `sorted(names)`.",
      ],
      wrong: [
        { files: { "catalogue.py": CATALOGUE_M1.replace('product["discontinued_on"] is None and ', ""), "main.py": MAIN }, fails: ["find"], why: "lists discontinued products too" },
        { files: { "catalogue.py": CATALOGUE_M1.replace("wanted = text.lower()", "wanted = text").replace('wanted in product["name"].lower()', 'wanted in product["name"]'), "main.py": MAIN }, fails: ["find", "output"], why: "case-sensitive search" },
        { files: { "catalogue.py": CATALOGUE_M1.replace("return sorted(names)", "return names"), "main.py": MAIN }, fails: ["find", "output"], why: "not sorted, so main.py's list is out of order too" },
      ],
      task: {
        ...market,
        checks: [...kept, { kind: "output", id: "output", label: "main.py lists the 10 speakers on sale", expected: `328 products\n${SPEAKERS.map((n) => `- ${n}`).join("\n")}\n` }],
      },
    },
    milestone({
      id: "P01.m2",
      title: "Cart add and update",
      brief: "A cart maps a product id to a quantity. `add_item` adds onto the quantity already there. `set_qty` sets it, and removes the product when the quantity is zero or less. `units` adds up every quantity. `main.py` puts two bike lights and one speaker in the cart, then sets the bike lights to one.",
      doneWhen: ["Adding the same product twice keeps both quantities", "Setting a quantity to zero removes that product", "`main.py` prints 2"],
      starters: { "catalogue.py": CATALOGUE_M1 + "\n" + CART_STUB, "main.py": MAIN_M2 },
      solution: { "catalogue.py": CAT_M2, "main.py": MAIN_M2 },
      hints: [
        "When the product is new, start from zero before adding the quantity.",
        "A quantity of zero or less should take that id out of the cart.",
        "Units are the quantities added together, not the number of ids.",
      ],
      wrong: [
        { files: { "catalogue.py": CAT_M2.replace("cart.get(product_id, 0) + qty", "qty"), "main.py": MAIN_M2 }, fails: ["cart"], why: "a second add replaces the quantity" },
        { files: { "catalogue.py": CAT_M2.replace("if qty <= 0:\n        if product_id in cart:\n            cart.pop(product_id)\n    else:\n        cart[product_id] = qty", "cart[product_id] = qty"), "main.py": MAIN_M2 }, fails: ["cart"], why: "zero stays in the cart" },
      ],
      checks: [...kept, shows("cart", "add keeps both quantities, zero removes the product, units adds quantities", "units(cart)", cartExpr, py.tuple(py.int(3), py.int(3), py.bool(false))), prints("main.py prints 2", "2\n")],
      ...market,
    }),
    milestone({
      id: "P01.m3",
      title: "Totals and discounts",
      brief: "Prices are stored as cents so the total cannot drift. Shipping is 599 cents when the subtotal is under 5000 cents, and free from 5000 cents up. Tax is 7 percent of the subtotal, rounded to the nearest cent. `main.py` buys one bike light and one speaker.",
      doneWhen: ["The subtotal is price times quantity, in cents", "Shipping is free at 5000 cents", "`main.py` prints 19204"],
      starters: { "catalogue.py": CAT_M2 + "\n" + MONEY_STUB, "main.py": MAIN_M3 },
      solution: { "catalogue.py": CAT_M3, "main.py": MAIN_M3 },
      hints: [
        "Turn a shelf price into cents with round(price * 100) before you multiply by the quantity.",
        "Shipping depends on the subtotal, not on how many products are in the cart.",
        "Tax is round(subtotal * 7 / 100). Add subtotal, shipping and tax.",
      ],
      wrong: [
        { files: { "catalogue.py": CAT_M3.replace("return 0", "return 599"), "main.py": MAIN_M3 }, fails: ["money", "output"], why: "shipping is charged on a large order" },
        { files: { "catalogue.py": CAT_M3.replace("round(subtotal * 7 / 100)", "subtotal * 7 / 100"), "main.py": MAIN_M3 }, fails: ["money", "output"], why: "tax is left as a fraction of a cent" },
      ],
      checks: [
        ...kept,
        shows("cart", "add keeps both quantities, zero removes the product, units adds quantities", "units(cart)", cartExpr, py.tuple(py.int(3), py.int(3), py.bool(false))),
        shows("money", "cents, free shipping at 5000, and 7 percent tax", "total_cents(big, catalogue)", moneyExpr, py.tuple(py.int(749), py.int(599), py.int(0), py.int(52), py.int(1828))),
        prints("main.py prints the total in cents", "19204\n"),
      ],
      ...market,
    }),
    milestone({
      id: "P01.m4",
      title: "Receipt file",
      brief: "Write `receipt.txt`. One line per product, sorted by product id: the name, the quantity and the line price in dollars, as `<name> x<quantity> <price>` (for example `Ultra Bike Light x1 7.49`). Then subtotal, shipping, tax and total, also in dollars, as `subtotal <amount>`, `shipping <amount>`, `tax <amount>` and `total <amount>`. Dollars always have two decimals. Each line ends with a newline, the last one too. `main.py` writes the receipt for one bike light and one speaker.",
      doneWhen: ["Products are listed in product-id order", "Shipping is 0.00 on this order", "The total line is 192.04"],
      starters: { "catalogue.py": CAT_M3 + "\n" + RECEIPT_STUB, "main.py": MAIN_M4 },
      solution: { "catalogue.py": CAT_M4, "main.py": MAIN_M4 },
      hints: [
        "Walk the product ids in sorted order so the receipt does not depend on insertion order.",
        "Turn cents back into dollars only when you build a line.",
        "Open the path, write the text, and close the file.",
      ],
      wrong: [
        { files: { "catalogue.py": CAT_M4.replace('lines.append(product["name"] + " x" + str(cart[product_id]) + " " + money(line))', "lines.append(product_id)"), "main.py": MAIN_M4 }, fails: ["receipt"], why: "lines are ids, not names and prices" },
        { files: { "catalogue.py": CAT_M4.replace("money(subtotal + ship + tax)", "money(subtotal)"), "main.py": MAIN_M4 }, fails: ["receipt"], why: "the total leaves out shipping and tax" },
      ],
      checks: [
        ...kept,
        shows("money", "cents, free shipping at 5000, and 7 percent tax", "total_cents(big, catalogue)", moneyExpr, py.tuple(py.int(749), py.int(599), py.int(0), py.int(52), py.int(1828))),
        shows("receipt", "receipt.txt lists both products and the total 192.04", "open('receipt.txt').read()", "result = open('receipt.txt', encoding='utf-8').read()", py.str(receiptText)),
        prints("main.py writes the receipt", "receipt written\n"),
      ],
      ...market,
    }),
    milestone({
      id: "P01.m5",
      title: "Edge cases",
      brief: "`add_sale` is the door into the cart. It refuses a product id that is not in the catalogue, a product with a `discontinued_on` date, and a quantity below 1. It returns True when it adds the product and False when it refuses. P0037 Mini Green Tea is discontinued. `main.py` tries a real product, that discontinued tea, a missing id and a zero quantity.",
      doneWhen: ["A missing id is not added", "A discontinued product is not added", "`main.py` prints 1"],
      starters: { "catalogue.py": CAT_M4 + "\n" + SALE_STUB, "main.py": MAIN_M5 },
      solution: { "catalogue.py": CAT_M5, "main.py": MAIN_M5 },
      hints: [
        "Look the id up first. If it is missing, stop.",
        "A discontinued product has a date in discontinued_on. Still-for-sale products have None there.",
        "Only call add_item after all three checks pass.",
      ],
      wrong: [
        { files: { "catalogue.py": CAT_M5.replace("if product[\"discontinued_on\"] is not None:\n        return False\n    ", ""), "main.py": MAIN_M5 }, fails: ["sale", "output"], why: "discontinued tea is added" },
        { files: { "catalogue.py": CAT_M5.replace("if qty < 1:\n        return False\n    ", ""), "main.py": MAIN_M5 }, fails: ["sale"], why: "a zero quantity is added" },
      ],
      checks: [
        ...kept,
        shows("sale", "missing, discontinued and zero quantities are refused", "units(cart)", saleExpr, py.tuple(py.bool(false), py.int(2), py.bool(false), py.bool(false))),
        prints("main.py keeps only the bike light", "1\n"),
      ],
      ...market,
    }),
  ],
};
