import * as docs from ".";
import server from "./server";
import { Command } from "commander";

const program = new Command();

program.command("res").action(() => {
  console.log("build response base");
  docs.generateResponseBase();
});

program.command("swagger").action(() => {
  console.log("build swagger");
  docs.generateSwagger();
});

program.command("server").action(() => {
  const app = new server();
  app.listen();
});

program.parse();
