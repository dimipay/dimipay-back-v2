import bwipjs from "bwip-js";

export const dotcode = (code: string) => {
  return bwipjs.toBuffer({
    bcid: "dotcode", // Barcode type
    text: code, // Text to encode
    scale: 4,
    includetext: true,
    inkspread: 0.25,
  });
};
