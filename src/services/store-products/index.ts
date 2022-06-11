import { createService } from "..";
import * as controllers from "./controllers";

export default createService({
  name: "store-products",
  baseURL: "/product/store",
  routes: [
    {
      method: "post",
      path: "/",
      handler: controllers.storeProducts,
      needAuth: true,
    },
    {
      method: "put",
      path: "/",
      handler: controllers.updateStoreProducts,
      needAuth: true,
    },
    {
      method: "get",
      path: "/:systemId",
      handler: controllers.getProductStoring,
      needAuth: true,
    },
  ],
});
