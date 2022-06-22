import { createService } from "..";
import { getProductByBarcode } from "./controllers";

export default createService({
  name: "product",
  baseURL: "/product",
  routes: [
    {
      method: "get",
      path: "/:barcode",
      handler: getProductByBarcode,
      needAuth: true,
    },
  ],
});
