import Docs from ".";
import server from "./server";
import { Command } from "commander";

const program = new Command();
const docs = new Docs();
const app = new server();

program.command("res").action(() => {
  console.log("build response base");
  docs.generateResponseBase();
});

program.command("swagger").action(() => {
  console.log("build swagger");
  docs.generateSwagger();
});

program.command("server").action(() => {
  app.listen();
});

program.parse();
