import fs from "fs";

export const writeFileSync = (fileName: string, resText: string) => {
  if (process.env.NODE_ENV !== "production") {
    fs.writeFileSync(fileName, resText);
  } else {
    console.log("Filename:", fileName, ". Text:", resText);
  }
};
