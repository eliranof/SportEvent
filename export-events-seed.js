const fs = require("fs");
const path = require("path");
const vm = require("vm");

const inputFile = path.join(__dirname, "src", "data", "eventsData.js");

/*
  שנה כאן רק אם אצלך תיקיית ה-PHP נמצאת במקום אחר.
  ברוב המקרים של XAMPP זה הנתיב הנכון:
  C:\xampp\htdocs\sportevent-api
*/
const apiFolder = "C:\\xampp\\htdocs\\sportevent-api";

const outputFile = path.join(apiFolder, "events_seed.json");

if (!fs.existsSync(inputFile)) {
  throw new Error(`לא נמצא קובץ המקור: ${inputFile}`);
}

if (!fs.existsSync(apiFolder)) {
  throw new Error(`לא נמצאה תיקיית ה-API: ${apiFolder}`);
}

const source = fs.readFileSync(inputFile, "utf8");

const executableSource = source.replace(
  /export\s+const\s+([A-Za-z0-9_]+)\s*=/g,
  "seed.$1 ="
);

const context = {
  seed: {},
};

vm.createContext(context);
new vm.Script(executableSource, { filename: inputFile }).runInContext(context);

fs.writeFileSync(outputFile, JSON.stringify(context.seed, null, 2), "utf8");

console.log("events_seed.json נוצר בהצלחה:");
console.log(outputFile);