/**
 * M02 Variables & Data Types: five lessons (PY-L02-01 … PY-L02-05), data F00 (inline).
 * input() is name = input("prompt") on its own line. Arithmetic waits until M03.
 *
 * Version 2: the challenges are re-run with other stored values (rerun) or other typed lines (retyped), so a
 * program that prints the expected words without storing, reading or converting anything no longer passes.
 */
import { py, type PyValue } from "@/engine/python/values";
import type { PyLesson } from "../model";
import { callsFunction } from "../checks";
import { rerun, retyped } from "../beginner-checks";

const out = (expected: string, tip?: string) => ({ kind: "output" as const, id: "output", label: "Prints exactly the expected lines", expected, ...(tip ? { tip } : {}) });
const held = (name: string, expected: PyValue) => ({ kind: "variable" as const, id: name, label: `${name} holds the right value`, name, expected });
const reads = callsFunction("reads", "Reads a typed line with input()", "input", "Store input() in a name on its own line.");
const asks = callsFunction("asks", "Asks for the kind with type()", "type");

export const assignmentAndInput: PyLesson = {
  id: "PY-L02-01",
  version: 2,
  slug: "assignment-and-input",
  title: "Store a value",
  lede: "A name holds a value. You can change what it holds, and you can fill it with a line that was typed.",
  focus: "A name stores a value, and input() reads one typed line into a name.",
  minutes: 14,
  objectives: [
    "Store a value in a name and print the name",
    "Replace the value a name holds",
    "Read one typed line with input() on its own line",
  ],
  requires: ["print-call", "print-text", "print-number", "print-several", "print-blank", "unquoted-name"],
  teaches: ["assignment", "reassignment", "input"],
  blocks: [
    { kind: "text", md: "A **name** is a word you choose. The line `item = \"Train Set\"` stores the text Train Set in the name `item`. The `=` means **store this value**. It does not mean \"equals\" yet.\n\nPrinting the name shows the value. The quotes are not part of the value, just as they are not printed.\n\nWhy bother? A value you store once can be used on many lines. When it changes, you change one line, and every print that uses the name follows." },
    {
      kind: "example",
      title: "A name holds a value",
      code: 'item = "Train Set"\nqty = 2\nprint("Item:", item)\nprint("Qty:", qty)\n',
      output: "Item: Train Set\nQty: 2\n",
      note: "item and qty are names. The printed words are the values stored in them.",
    },
    { kind: "text", md: "Storing a new value in the same name **replaces** the old one. The old value is gone. Python does not keep a history of the name. A print shows what the name holds **at the moment that line runs**." },
    {
      kind: "example",
      title: "The same name, a new value",
      code: 'status = "packing"\nprint(status)\nstatus = "delivered"\nprint(status)\n',
      output: "packing\ndelivered\n",
      note: "The second store replaces packing. The next print shows delivered.",
    },
    { kind: "text", md: "`input(\"City? \")` reads one typed line and gives it back as text. Put it on **its own line**, stored in a name:\n\n`city = input(\"City? \")`\n\nThe words in the quotes are the prompt. They are shown, and they do **not** start a new line. What was typed is not repeated until you print the name. In these exercises the typed line is supplied for you, and Check also tries other typed lines." },
    {
      kind: "example",
      title: "Read one typed line",
      code: 'city = input("City? ")\nprint(city)\n',
      stdin: "Denver\n",
      output: "City? Denver\n",
      note: "The prompt and the stored city share a line, because the prompt does not start a new line. Denver was the typed line.",
    },
    { kind: "text", md: "**Mistakes to avoid.** `print(\"city\")` prints the word city: the quotes make it text, not the name. And a name has to be stored **before** a line uses it. Printing a name that has not been stored yet stops the program with `NameError`." },
  ],
  tryIt: {
    id: "try",
    title: "Store a different item",
    prompt: "Store `Puzzle` in `item` and print the name.",
    spec: [],
    starter: 'item = "Train Set"\nprint(item)\n',
    answer: 'item = "Puzzle"\nprint(item)\n',
    wrong: [{ code: 'item = "Train Set"\nprint(item)\n', fails: ["output"], why: "still the original item" }],
    hints: ["The value on the right of = is what gets stored.", "Change the text that is stored, and keep the print of the name.", "The stored text should be Puzzle."],
    task: { checks: [out("Puzzle\n")] },
  },
  challenges: [
    {
      id: "c1",
      title: "Status updates for one order",
      prompt: "Order `O104839` was packed, then shipped. Store the order id once, in `order`. Store `packed` in `status` and print the order and the status on one line. Then store `shipped` in the **same** name and print the line again.",
      spec: [
        ["First line", "`order = \"O104839\"`. Check runs your program again with other order ids, so every line must use the name"],
        ["Prints", "`O104839 packed`, then `O104839 shipped`"],
      ],
      starter: 'order = "O104839"\n',
      answer: 'order = "O104839"\nstatus = "packed"\nprint(order, status)\nstatus = "shipped"\nprint(order, status)\n',
      alternatives: ['order = "O104839"\nstatus = "packed"\nprint(order, "packed")\nstatus = "shipped"\nprint(order, status)\n'],
      wrong: [
        { code: 'order = "O104839"\nprint("O104839 packed")\nprint("O104839 shipped")\n', fails: ["status", "v1", "v2"], why: "the order id is typed into each print, so another order still prints O104839" },
        { code: 'order = "O104839"\nstatus = "packed"\nprint(order, status)\nprint(order, status)\n', fails: ["output", "status", "v1", "v2"], why: "status is never replaced, so both lines say packed" },
      ],
      hints: ["Each print shows the name, not the order id written out again.", "Storing a second value in status replaces the first one.", "Put the second store between the two prints, so each print sees the status of that moment."],
      task: {
        checks: [
          out("O104839 packed\nO104839 shipped\n"),
          held("status", py.str("shipped")),
          rerun("v1", { order: "O100282" }, "O100282 packed\nO100282 shipped\n"),
          rerun("v2", { order: "O121005" }, "O121005 packed\nO121005 shipped\n"),
        ],
      },
    },
    {
      id: "c2",
      title: "A delivery note from a typed city",
      prompt: "Read the delivery city with the prompt `City? `. The prompt doesn't end its line, so end it yourself. Then print `Shipping to` and the city, and on the last line the city followed by `depot notified`.",
      spec: [
        ["Typed line", "`Austin` here; Check also types other cities"],
        ["Prints", "`City? ` on its own line, then `Shipping to Austin`, then `Austin depot notified`"],
      ],
      starter: "",
      answer: 'city = input("City? ")\nprint()\nprint("Shipping to", city)\nprint(city, "depot notified")\n',
      alternatives: ['city = input("City? ")\nprint()\nprint("Shipping to", city)\nprint(city, "depot", "notified")\n'],
      wrong: [
        { code: 'city = input("City? ")\nprint("Shipping to", city)\nprint(city, "depot notified")\n', fails: ["output", "others"], why: "the prompt's line is never ended, so Shipping to is printed right after City?" },
        { code: 'city = input("City? ")\nprint()\nprint("Shipping to Austin")\nprint("Austin depot notified")\n', fails: ["others"], why: "Austin is typed into the prints, so another city still prints Austin" },
      ],
      hints: ["input() goes on its own line, with a name on the left.", "The prompt stays on its line. An empty print() finishes a line.", "After that, every line that mentions the city prints the name."],
      task: {
        stdin: "Austin\n",
        checks: [
          out("City? \nShipping to Austin\nAustin depot notified\n"),
          reads,
          retyped("others", [
            [["Denver"], "City? \nShipping to Denver\nDenver depot notified\n"],
            [["New York"], "City? \nShipping to New York\nNew York depot notified\n"],
          ]),
        ],
      },
    },
  ],
  concept: [
    { id: "q1", prompt: "What does this print?", program: 'status = "packing"\nprint(status)\nstatus = "delivered"\nprint(status)\nprint(status)\n', choices: ["packing\ndelivered\ndelivered", "packing\npacking\ndelivered", "delivered\ndelivered\ndelivered", "packing\ndelivered"], answer: 0, why: "The first print runs before the second store. After it, status holds delivered for both of the last prints." },
    { id: "q2", prompt: "The typed line is Denver, and the prompt is City? with a space. The next line prints the name. Which console line is right?", choices: ["Denver", "City? Denver", "City?\nDenver", "city"], answer: 1, why: "The prompt is printed and does not start a new line, so printing the name continues that line." },
    { id: "q3", prompt: "What does this print?", program: 'city = "Oslo"\nprint("city")\n', choices: ["city", "Oslo", "\"city\"", "An error"], answer: 0, why: "The quotes make city a piece of text, so the word itself is printed. print(city) without quotes would show Oslo." },
  ],
  review: ["A name stores the value on the right of =. Printing the name shows that value.", "Storing again in the same name replaces the old value. A print shows the value of that moment.", "input(\"prompt\") reads one typed line. The prompt doesn't end its line. Next: whole numbers and decimals."],
};

export const numbers: PyLesson = {
  id: "PY-L02-02",
  version: 2,
  slug: "numbers",
  title: "Whole numbers and decimals",
  lede: "A whole number and a decimal are different values, even when they look similar.",
  focus: "Store a whole number and a decimal, and see that they print differently.",
  minutes: 10,
  objectives: [
    "Store a whole number and print it",
    "Store a decimal and print it",
    "Tell 8 from 8.0 in the console",
  ],
  requires: ["assignment", "print-call", "print-text", "print-several", "print-number", "unquoted-name", "sep", "end"],
  teaches: ["whole-number", "decimal-number"],
  blocks: [
    { kind: "text", md: "A whole number has no decimal point: `8`. A decimal has one: `8.0`. Python prints them differently, so you can see which kind you stored. A minus sign in front makes a negative number, as in `-3`. Counts (items, people, days) are usually whole numbers. Money and measurements are usually decimals. Adding and subtracting come in the next module." },
    {
      kind: "example",
      title: "Two kinds of number",
      code: 'count = 8\nprice = 8.0\nprint(count)\nprint(price)\n',
      output: "8\n8.0\n",
      note: "8.0 keeps the decimal point in the output. 8 does not.",
    },
    {
      kind: "example",
      title: "A price and a refund",
      code: 'price = 43.77\nrefund = -3\nprint("Price:", price)\nprint("Refund:", refund)\n',
      output: "Price: 43.77\nRefund: -3\n",
      note: "43.77 is a decimal. -3 is a whole number, and the minus is part of that value.",
    },
    { kind: "text", md: "**Mistake to avoid:** the decimal point in Python is a dot, never a comma. `price = 12,5` doesn't store twelve and a half. It stores two separate numbers, 12 and 5, and printing it shows `(12, 5)`." },
  ],
  tryIt: {
    id: "try",
    title: "Store a decimal price",
    prompt: "Change the stored price so the program prints `12.5`.",
    spec: [],
    starter: 'price = 12\nprint(price)\n',
    answer: 'price = 12.5\nprint(price)\n',
    wrong: [{ code: 'price = 12\nprint(price)\n', fails: ["output", "price"], why: "still a whole number" }],
    hints: ["The value on the right of = is what gets printed.", "A decimal point makes it a decimal.", "The value to store is 12.5."],
    task: { checks: [out("12.5\n"), held("price", py.float(12.5))] },
  },
  challenges: [
    {
      id: "c1",
      title: "A shelf tag",
      prompt: "A shelf tag shows how many are in a pack and the pack price. Store `3` in `qty` and `19.5` in `price`, then print them on one line with an `x` between them.",
      spec: [
        ["First lines", "`qty = 3` and `price = 19.5`. Check runs your program again with other values"],
        ["Prints", "`3 x 19.5`"],
      ],
      starter: "",
      answer: 'qty = 3\nprice = 19.5\nprint(qty, "x", price)\n',
      alternatives: ['qty = 3\nprice = 19.5\nprint(qty, price, sep=" x ")\n'],
      wrong: [
        { code: 'qty = 3\nprice = 19.5\nprint("3 x 19.5")\n', fails: ["v1", "v2"], why: "the numbers are typed into the text, so other values still print 3 x 19.5" },
        { code: 'qty = 3.0\nprice = 19.5\nprint(qty, "x", price)\n', fails: ["output", "qty"], why: "a count stored as 3.0 prints as 3.0" },
      ],
      hints: ["Store each number in its own name. A count has no decimal point.", "One print can show a name, a piece of text and another name.", "The x is text, so it goes in quotes between the two names."],
      task: {
        checks: [
          out("3 x 19.5\n"),
          held("qty", py.int(3)),
          rerun("v1", { qty: 1, price: py.float(4) }, "1 x 4.0\n"),
          rerun("v2", { qty: 12, price: 0.99 }, "12 x 0.99\n"),
        ],
      },
    },
    {
      id: "c2",
      title: "Today's temperatures",
      prompt: "A weather station logged a low of `-3` and a high of `12.5`. Store them in `low` and `high`, then print one line: `Low: -3 | High: 12.5`.",
      spec: [
        ["First lines", "`low = -3` and `high = 12.5`. Check runs your program again with other readings"],
        ["Prints", "`Low: -3 | High: 12.5`"],
      ],
      starter: "",
      answer: 'low = -3\nhigh = 12.5\nprint("Low:", low, "| High:", high)\n',
      alternatives: ['low = -3\nhigh = 12.5\nprint("Low:", low, end=" | ")\nprint("High:", high)\n'],
      wrong: [
        { code: 'low = 3\nhigh = 12.5\nprint("Low:", low, "| High:", high)\n', fails: ["output", "low"], why: "the minus sign is missing, so the low is 3" },
        { code: 'low = -3\nhigh = 12.5\nprint("Low: -3 | High: 12.5")\n', fails: ["v1", "v2"], why: "the readings are typed into the text, so other readings still print -3 and 12.5" },
      ],
      hints: ["The minus belongs with the digits you store.", "The bar is text between the two readings. It can sit in the same piece of text as High:.", "print puts one space between each value, which gives the spaces around the bar."],
      task: {
        checks: [
          out("Low: -3 | High: 12.5\n"),
          held("low", py.int(-3)),
          rerun("v1", { low: 0, high: py.float(20) }, "Low: 0 | High: 20.0\n"),
          rerun("v2", { low: -12.5, high: -1 }, "Low: -12.5 | High: -1\n"),
        ],
      },
    },
  ],
  concept: [
    { id: "q1", prompt: "What does this print?", program: 'n = 8\nm = 8.0\nprint(n, m)\n', choices: ["8 8.0", "8 8", "8.0 8.0", "n m"], answer: 0, why: "8 has no decimal point, so it prints as 8. 8.0 keeps its decimal point." },
    { id: "q2", prompt: "A shop meant to store twelve and a half. What does this print?", program: 'price = 12,5\nprint(price)\n', choices: ["(12, 5)", "12.5", "12,5", "An error"], answer: 0, why: "A comma is not a decimal point. Python stored two numbers, 12 and 5. Write 12.5 with a dot." },
    { id: "q3", prompt: "Which stored value is a decimal?", choices: ["count = 3", "refund = -3", "price = 3.5", "qty = 10"], answer: 2, why: "3.5 has a decimal point. -3 is a whole number." },
  ],
  review: ["A whole number has no decimal point. A decimal has one, and it is a dot.", "Python prints 8 and 8.0 differently.", "A minus written against the digits is part of the number. Next: text, True and False."],
};

export const stringsAndBooleans: PyLesson = {
  id: "PY-L02-03",
  version: 2,
  slug: "strings-and-booleans",
  title: "Text, True, and False",
  lede: "Text in a name is still text. True and False are the two yes-or-no values.",
  focus: "Store text, and store True or False, then print the name.",
  minutes: 10,
  objectives: [
    "Store text in a name and print the name",
    "Store True or False and print it",
    "Tell True from the text \"True\"",
  ],
  requires: ["assignment", "print-call", "print-text", "print-several", "end", "unquoted-name", "quotes-not-printed", "case-sensitive"],
  teaches: ["string-value", "boolean"],
  blocks: [
    { kind: "text", md: "Text in quotes is a value you can store. The quotes mark the text. They are not stored. `item = \"Train Set\"` and then `print(item)` shows Train Set." },
    {
      kind: "example",
      title: "Text in a name",
      code: 'item = "Train Set"\ncode = "WELCOME10"\nprint(item)\nprint(code)\n',
      output: "Train Set\nWELCOME10\n",
      note: "The names hold the text. The quotes do not appear.",
    },
    { kind: "text", md: "`True` and `False` are values, like numbers. They answer yes-or-no questions: is it in stock, has it shipped. They are written **without quotes**, and the capitals matter. `true` is not `True`. `\"True\"` is text, not the yes-or-no value. Using them to choose a path comes later. Here you store them and print them." },
    {
      kind: "example",
      title: "Yes and no",
      code: 'ready = True\nprint(ready)\nprint(False)\n',
      output: "True\nFalse\n",
      note: "True is stored in ready. False is printed directly. Neither has quotes in the program.",
    },
  ],
  tryIt: {
    id: "try",
    title: "Mark it shipped",
    prompt: "Store `True` in `shipped` so the program prints `True`.",
    spec: [],
    starter: 'shipped = False\nprint(shipped)\n',
    answer: 'shipped = True\nprint(shipped)\n',
    wrong: [{ code: 'shipped = "True"\nprint(shipped)\n', fails: ["shipped"], why: "prints the same word, but it is text" }],
    hints: ["The value on the right of = is what gets printed.", "True and False have no quotes.", "Store True."],
    task: { checks: [out("True\n"), held("shipped", py.bool(true))] },
  },
  challenges: [
    {
      id: "c1",
      title: "A cinema ticket",
      prompt: "Store the film `Arrival` in `movie` and the seat `F12` in `seat`. Print `Movie:` and the film on one line, then `Seat:` and the seat on the next.",
      spec: [
        ["First lines", "`movie = \"Arrival\"` and `seat = \"F12\"`. Check runs your program again with other tickets"],
        ["Prints", "`Movie: Arrival`, then `Seat: F12`"],
      ],
      starter: "",
      answer: 'movie = "Arrival"\nseat = "F12"\nprint("Movie:", movie)\nprint("Seat:", seat)\n',
      wrong: [
        { code: 'movie = "Arrival"\nseat = "F12"\nprint("Movie:", "movie")\nprint("Seat:", "seat")\n', fails: ["output", "v1", "v2"], why: "the names are in quotes, so the words movie and seat are printed" },
        { code: 'movie = "Arrival"\nseat = "F12"\nprint("Movie: Arrival")\nprint("Seat: F12")\n', fails: ["v1", "v2"], why: "the ticket is typed into the prints, so another ticket still prints Arrival" },
      ],
      hints: ["Text you store goes in quotes on the right of =.", "To print what a name holds, write the name without quotes.", "The label is text and the name follows it in the same print."],
      task: {
        checks: [
          out("Movie: Arrival\nSeat: F12\n"),
          rerun("v1", { movie: "Up", seat: "A1" }, "Movie: Up\nSeat: A1\n"),
          rerun("v2", { movie: "The Martian", seat: "K7" }, "Movie: The Martian\nSeat: K7\n"),
        ],
      },
    },
    {
      id: "c2",
      title: "In stock, or not",
      prompt: "Store `Desk Lamp` in `product` and the yes-or-no value `False` in `in_stock`. Print one line: the product, a comma and a space, then `in stock:` and the value.",
      spec: [
        ["First lines", "`product = \"Desk Lamp\"` and `in_stock = False`. Check runs your program again with other products"],
        ["Prints", "`Desk Lamp, in stock: False`"],
      ],
      starter: "",
      answer: 'product = "Desk Lamp"\nin_stock = False\nprint(product, end=", ")\nprint("in stock:", in_stock)\n',
      alternatives: ['product = "Desk Lamp"\nin_stock = False\nprint(product, end=",")\nprint(" in stock:", in_stock)\n'],
      wrong: [
        { code: 'product = "Desk Lamp"\nin_stock = "False"\nprint(product, end=", ")\nprint("in stock:", in_stock)\n', fails: ["in_stock"], why: "False in quotes is text, not the yes-or-no value" },
        { code: 'product = "Desk Lamp"\nin_stock = False\nprint(product, "in stock:", in_stock)\n', fails: ["output", "v1", "v2"], why: "there is no comma after the product" },
      ],
      hints: ["False is a value, written without quotes.", "The comma must sit right after the product, before the space.", "Either end the first print with a comma and a space, or choose a separator."],
      task: {
        checks: [
          out("Desk Lamp, in stock: False\n"),
          held("in_stock", py.bool(false)),
          rerun("v1", { product: "Bike Light", in_stock: true }, "Bike Light, in stock: True\n"),
          rerun("v2", { product: "Tent", in_stock: false }, "Tent, in stock: False\n"),
        ],
      },
    },
  ],
  concept: [
    { id: "q1", prompt: "What does this print?", program: 'name = "Maya"\nprint(name)\n', choices: ["Maya", "\"Maya\"", "name", "True"], answer: 0, why: "The quotes mark the text that is stored. They are not part of the value." },
    { id: "q2", prompt: "What happens when a program runs `ready = true` and then `print(ready)`?", choices: ["It stops with NameError", "True", "true", "False"], answer: 0, why: "true with a small t is just a name nobody stored. The yes value is True, with a capital T." },
    { id: "q3", prompt: "Which line stores the yes-or-no value True?", choices: ["ready = \"True\"", "ready = true", "ready = True", "print(True)"], answer: 2, why: "True has a capital T and no quotes. true is a different name, and \"True\" is text." },
  ],
  review: ["Text is stored in quotes. The quotes are not part of the value.", "True and False are values. They have no quotes, and the capitals matter.", "\"True\" is text. True is the yes-or-no value. Next: turning text into numbers."],
};

export const conversion: PyLesson = {
  id: "PY-L02-04",
  version: 2,
  slug: "conversion",
  title: "Turn text into a number",
  lede: "A typed line is text, even when it looks like a number. int(), float(), and str() convert it.",
  focus: "Convert text to a whole number or a decimal, and a number back to text.",
  minutes: 14,
  objectives: [
    "Turn text into a whole number with int()",
    "Turn text into a decimal with float()",
    "Turn a number into text with str()",
  ],
  requires: ["assignment", "input", "string-value", "whole-number", "decimal-number", "print-call", "print-text", "print-number", "print-several", "unquoted-name"],
  teaches: ["conversion"],
  blocks: [
    { kind: "text", md: "`\"12\"` and `12` both print as 12. They are not the same kind of value. `\"12\"` is text. `int(\"12\")` reads that text as a whole number. `float(\"12.5\")` reads text as a decimal. `str(12)` goes the other way: a number becomes text.\n\n`input()` always gives you text. A typed price is text until you convert it. Converting also tidies what people type: `int(\"007\")` is 7, and `int(\" 5 \")` is 5, because spaces around the digits are allowed." },
    {
      kind: "example",
      title: "Three conversions",
      code: 'qty = int("12")\nprice = float("12.5")\nlabel = str(12)\nprint(qty)\nprint(price)\nprint(label)\n',
      output: "12\n12.5\n12\n",
      note: "qty is a whole number, price is a decimal, and label is text. The last line looks like 12 because the quotes are not printed.",
    },
    { kind: "text", md: "`int()` only accepts text that is a whole number. `int(\"12.5\")` stops the program. A decimal in text needs `float()`.\n\n`int()` of a decimal **value** (not text) is allowed: it keeps the whole part and drops the rest, so `int(12.9)` is 12 and `int(-2.5)` is -2. It never rounds up." },
    {
      kind: "error-example",
      title: "Text that is not a whole number",
      code: 'qty = int("12.5")\nprint(qty)\n',
      error: "ValueError",
      output: "",
      note: "Nothing prints. int() refuses the text 12.5 because of the decimal point. float(\"12.5\") would accept it.",
    },
    {
      kind: "example",
      title: "A typed number, tidied",
      code: 'boxes_text = input("Boxes? ")\nboxes = int(boxes_text)\nprint(boxes_text)\nprint(boxes)\n',
      stdin: "007\n",
      output: "Boxes? 007\n7\n",
      note: "The typed line is the text 007, and printing it shows the zeros. int() reads it as the number 7.",
    },
  ],
  tryIt: {
    id: "try",
    title: "Read the quantity as a number",
    prompt: "The text `\"4\"` is stored in `qty_text`. Store a whole number made from it in `qty`, and print `qty`.",
    spec: [],
    starter: 'qty_text = "4"\nqty = qty_text\nprint(qty)\n',
    answer: 'qty_text = "4"\nqty = int(qty_text)\nprint(qty)\n',
    wrong: [{ code: 'qty_text = "4"\nqty = qty_text\nprint(qty)\n', fails: ["qty"], why: "prints 4, but qty is still text" }],
    hints: ["int() turns whole-number text into a whole number.", "Call it on the name that holds the text, and store the result.", "The result goes in qty."],
    task: { checks: [out("4\n"), held("qty", py.int(4))] },
  },
  challenges: [
    {
      id: "c1",
      title: "Tidy a typed quantity",
      prompt: "Customers type quantities like `03` or ` 5 `. Read the line with the prompt `Quantity? `, store it as a whole number in `qty`, and print `Quantity:` and the number.",
      spec: [
        ["Typed line", "`03` here; Check also types other quantities"],
        ["Prints", "`Quantity? Quantity: 3`"],
      ],
      starter: "",
      answer: 'qty_text = input("Quantity? ")\nqty = int(qty_text)\nprint("Quantity:", qty)\n',
      wrong: [
        { code: 'qty_text = input("Quantity? ")\nqty = qty_text\nprint("Quantity:", qty)\n', fails: ["output", "qty", "others"], why: "qty is still the typed text, so the zero is printed" },
        { code: 'qty_text = input("Quantity? ")\nqty = 3\nprint("Quantity:", qty)\n', fails: ["others"], why: "3 is typed in, so any other quantity still prints 3" },
      ],
      hints: ["input() always gives text, even when the text is digits.", "int() reads whole-number text. Spaces around the digits and zeros in front are fine.", "Convert the stored line, store the result in qty, and print qty."],
      task: {
        stdin: "03\n",
        checks: [
          out("Quantity? Quantity: 3\n"),
          held("qty", py.int(3)),
          retyped("others", [
            [["12"], "Quantity? Quantity: 12\n"],
            [[" 5 "], "Quantity? Quantity: 5\n"],
            [["0"], "Quantity? Quantity: 0\n"],
          ]),
        ],
      },
    },
    {
      id: "c2",
      title: "Price and whole dollars",
      prompt: "Read a price with the prompt `Price? `. Print it as a decimal after `Price:`, then on the next line print `Whole dollars:` and only its whole part.",
      spec: [
        ["Typed line", "`12.50` here; Check also types other prices, including a whole number"],
        ["Prints", "`Price? Price: 12.5`, then `Whole dollars: 12`"],
      ],
      starter: "",
      answer: 'price_text = input("Price? ")\nprice = float(price_text)\ndollars = int(price)\nprint("Price:", price)\nprint("Whole dollars:", dollars)\n',
      wrong: [
        { code: 'price_text = input("Price? ")\nprice = float(price_text)\ndollars = int(price_text)\nprint("Price:", price)\nprint("Whole dollars:", dollars)\n', fails: ["output", "others"], why: "int() refuses text with a decimal point, so the program stops" },
        { code: 'price_text = input("Price? ")\nprice = float(price_text)\nprint("Price:", price)\nprint("Whole dollars:", price)\n', fails: ["output", "others"], why: "the whole-dollar line still shows the cents" },
      ],
      hints: ["The typed text has a decimal point, so only one of the two conversions accepts it.", "Once you have a decimal value, int() keeps its whole part.", "Convert the text first, then convert that decimal, and print both names."],
      task: {
        stdin: "12.50\n",
        checks: [
          out("Price? Price: 12.5\nWhole dollars: 12\n"),
          retyped("others", [
            [["7.99"], "Price? Price: 7.99\nWhole dollars: 7\n"],
            [["3"], "Price? Price: 3.0\nWhole dollars: 3\n"],
            [["0.5"], "Price? Price: 0.5\nWhole dollars: 0\n"],
          ]),
        ],
      },
    },
  ],
  concept: [
    { id: "q1", prompt: "What does this print?", program: 'n = int(" 007 ")\nprint(n)\n', choices: ["7", "007", "\" 007 \"", "An error"], answer: 0, why: "int() allows spaces around the digits and zeros in front, and reads the number 7." },
    { id: "q2", prompt: "What does this print?", program: 'n = int(9.99)\nprint(n)\n', choices: ["9", "10", "9.99", "An error"], answer: 0, why: "int() of a decimal value keeps the whole part. It never rounds up." },
    { id: "q3", prompt: "What does int(\"7.5\") do?", choices: ["Stores 7", "Stores 7.5", "Stores 8", "Stops the program"], answer: 3, why: "int() only accepts text that is a whole number. 7.5 needs float()." },
  ],
  review: ["int() turns whole-number text into a whole number. float() turns decimal text into a decimal.", "int() of a decimal value keeps the whole part. str() turns a number into text.", "int(\"12.5\") is an error. A typed line from input() is text until you convert it. Next: None, and asking for a value's kind."],
};

export const noneAndType: PyLesson = {
  id: "PY-L02-05",
  version: 2,
  slug: "none-and-type",
  title: "None and type",
  lede: "type() tells you what kind of value a name holds. None means there is no value.",
  focus: "Ask for the kind of a value, and use None when there is no value.",
  minutes: 12,
  objectives: [
    "Read the kind of a value with type()",
    "Store None when a value is missing",
    "Tell text, numbers, True, and None apart by their kinds",
  ],
  requires: ["assignment", "input", "string-value", "whole-number", "decimal-number", "boolean", "conversion", "reassignment", "print-call", "print-text", "print-number", "print-several", "unquoted-name"],
  teaches: ["none-value", "type-call"],
  blocks: [
    { kind: "text", md: "`\"12\"`, `12`, and `12.0` can look alike in a print. `type()` reports the kind. You will see the word `class` and then `str` for text, `int` for a whole number, `float` for a decimal, or `bool` for True and False. When a program misbehaves, asking for the kind is often the fastest way to see why." },
    {
      kind: "example",
      title: "Four kinds",
      code: 'print(type("12"))\nprint(type(12))\nprint(type(12.0))\nprint(type(True))\n',
      output: "<class 'str'>\n<class 'int'>\n<class 'float'>\n<class 'bool'>\n",
      note: "The text 12 and the number 12 are different kinds, which is why int() and str() exist.",
    },
    { kind: "text", md: "`None` means **no value**. A missing coupon, a missing note, a city that was not set. It is not the text `\"None\"`, and it is not `0` or `False`. `type(None)` reports `NoneType`." },
    {
      kind: "example",
      title: "Nothing stored yet",
      code: 'coupon = None\nprint(coupon)\nprint(type(coupon))\n',
      output: "None\n<class 'NoneType'>\n",
      note: "Printing None shows the word None. Its kind is NoneType.",
    },
    { kind: "text", md: "**Mistake to avoid:** `coupon = \"None\"` prints exactly the same word as `coupon = None`. Only `type()` shows the difference: the first is `str`, a piece of text that happens to spell None." },
  ],
  tryIt: {
    id: "try",
    title: "Ask about the price",
    prompt: "`price` is `19.5`. Print the kind of `price`.",
    spec: [],
    starter: 'price = 19.5\nprint(price)\n',
    answer: 'price = 19.5\nprint(type(price))\n',
    wrong: [{ code: 'price = 19.5\nprint(price)\n', fails: ["output", "asks"], why: "prints the price, not its kind" }],
    hints: ["type() reports the kind of the value inside the brackets.", "Print that result.", "Pass it the name price."],
    task: { checks: [out("<class 'float'>\n"), asks] },
  },
  challenges: [
    {
      id: "c1",
      title: "What input() hands you",
      prompt: "Read a quantity with the prompt `Quantity? `. Print the kind of the typed line. Then convert it to a whole number in `qty`, and print the kind of `qty` and `qty` itself on one line.",
      spec: [
        ["Typed line", "`42` here; Check also types other numbers"],
        ["Prints", "`Quantity? <class 'str'>`, then `<class 'int'> 42`"],
      ],
      starter: "",
      answer: 'raw = input("Quantity? ")\nprint(type(raw))\nqty = int(raw)\nprint(type(qty), qty)\n',
      wrong: [
        { code: 'raw = input("Quantity? ")\nprint(type(raw))\nqty = raw\nprint(type(qty), qty)\n', fails: ["output", "qty", "others"], why: "qty is still text, so its kind is str" },
        { code: 'raw = input("Quantity? ")\nprint(raw)\nqty = int(raw)\nprint(qty)\n', fails: ["output", "asks", "others"], why: "prints the values, not their kinds" },
      ],
      hints: ["type() around a name gives its kind, and print shows it.", "The typed line is text. int() makes a whole number from it.", "The last print has two values: the kind of qty, then qty."],
      task: {
        stdin: "42\n",
        checks: [
          out("Quantity? <class 'str'>\n<class 'int'> 42\n"),
          held("qty", py.int(42)),
          asks,
          retyped("others", [
            [["7"], "Quantity? <class 'str'>\n<class 'int'> 7\n"],
            [["0012"], "Quantity? <class 'str'>\n<class 'int'> 12\n"],
          ]),
        ],
      },
    },
    {
      id: "c2",
      title: "Inspect an imported order",
      prompt: "An import stored one order. Its quantity arrived as text, but the shop needs a whole number. Convert `qty` in place, then print each field's name and kind, one per line, in the order shown.",
      spec: [
        ["Keep", "the four given lines at the top. Check runs your program again with another quantity"],
        ["Prints", "`order_id <class 'str'>`, `qty <class 'int'>`, `total <class 'float'>`, `coupon <class 'NoneType'>`"],
      ],
      starter: 'order_id = "O100376"\nqty = "2"\ntotal = 91.47\ncoupon = None\n',
      answer: 'order_id = "O100376"\nqty = "2"\ntotal = 91.47\ncoupon = None\nqty = int(qty)\nprint("order_id", type(order_id))\nprint("qty", type(qty))\nprint("total", type(total))\nprint("coupon", type(coupon))\n',
      wrong: [
        { code: 'order_id = "O100376"\nqty = "2"\ntotal = 91.47\ncoupon = None\nprint("order_id", type(order_id))\nprint("qty", type(qty))\nprint("total", type(total))\nprint("coupon", type(coupon))\n', fails: ["output", "qty", "v1"], why: "qty is never converted, so its kind is still str" },
        { code: 'order_id = "O100376"\nqty = "2"\ntotal = 91.47\ncoupon = None\nqty = 2\nprint("order_id", type(order_id))\nprint("qty", type(qty))\nprint("total", type(total))\nprint("coupon", type(coupon))\n', fails: ["v1"], why: "2 is typed in, so an order with another quantity still ends with 2" },
      ],
      hints: ["Storing again in qty replaces the text with whatever you store.", "int() of the text in qty gives the whole number.", "Each print has two values: the field's name as text, then type() of the name."],
      task: {
        checks: [
          out("order_id <class 'str'>\nqty <class 'int'>\ntotal <class 'float'>\ncoupon <class 'NoneType'>\n"),
          held("qty", py.int(2)),
          asks,
          rerun("v1", { qty: "5" }, "order_id <class 'str'>\nqty <class 'int'>\ntotal <class 'float'>\ncoupon <class 'NoneType'>\n", { vars: { qty: 5 } }),
        ],
      },
    },
  ],
  concept: [
    { id: "q1", prompt: "What does this print?", program: 'print(type("Maya"))\n', choices: ["<class 'str'>", "<class 'int'>", "Maya", "None"], answer: 0, why: "Text in quotes has kind str." },
    { id: "q2", prompt: "What does this print?", program: 'coupon = "None"\nprint(coupon, type(coupon))\n', choices: ["None <class 'str'>", "None <class 'NoneType'>", "\"None\" <class 'str'>", "None None"], answer: 0, why: "With quotes, None is a piece of text. It prints the same word, but its kind is str." },
    { id: "q3", prompt: "What does this print?", program: 'n = int("4")\nprint(type(n))\n', choices: ["<class 'str'>", "<class 'int'>", "<class 'float'>", "4"], answer: 1, why: "int() produced a whole number, so the kind is int." },
  ],
  review: ["type() prints the kind: str, int, float, bool, or NoneType.", "None means there is no value. It is not the text \"None\".", "\"12\" and 12 look alike when printed. Their kinds are str and int. Next module: operators that compute with these values."],
};

export const m02Lessons: PyLesson[] = [assignmentAndInput, numbers, stringsAndBooleans, conversion, noneAndType];
