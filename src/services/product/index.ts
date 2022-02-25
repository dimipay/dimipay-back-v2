import { createService } from "..";
import { getBarcodelessProducts, getProductByBarcode } from "./controllers";

export default createService({
  name: "product",
  baseURL: "/product",
  routes: [
    {
      method: "get",
      path: "/barcodeless",
      handler: getBarcodelessProducts,
      needAuth: true,
      permission: ["Pos"],
    },
    {
      method: "get",
      path: "/:barcode",
      handler: getProductByBarcode,
      needAuth: true,
      permission: ["Pos"],
    },
  ],
});
