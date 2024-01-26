let analyzer = require("./parser");
let fs = require("fs");

const data = fs.readFileSync("./ex.jsam", "utf-8");
let parser = new analyzer.Parser(data);

let tree = parser.parse();

parser.print_tokens();

console.log(JSON.stringify(tree, null, 2));
