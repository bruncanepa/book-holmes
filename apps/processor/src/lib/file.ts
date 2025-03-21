import fs from "fs";
import path from "path";

export const writeFileSync = (fileName: string, resText: string) => {
  if (process.env.NODE_ENV !== "production") {
    // fs.writeFileSync(path.join(__dirname, ...fileName.split("/")), resText);
  } else {
    console.log("Filename:", fileName, ". Text:", resText);
  }
};

export const readFileSync = (fileName: string) => {
  if (process.env.NODE_ENV !== "production") {
    // return fs.readFileSync(
    //   path.join(__dirname, ...fileName.split("/")),
    //   "utf8"
    // );
  } else {
    console.log("Filename:", fileName);
    return "";
  }
};
