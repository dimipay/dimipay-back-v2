import { getProductByBarcode } from "./controllers";

import type { ServiceSchema } from "..";

export default <ServiceSchema>{
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
};
