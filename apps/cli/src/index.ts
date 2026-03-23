import { Command } from "commander";

const program = new Command();

program
  .name("doqtor")
  .description("Keep your docs in sync with your code")
  .version("0.0.1");

program
  .command("check")
  .description("Check for documentation drift in local changes")
  .action(() => {
    console.log("doqtor check — not yet implemented");
  });

program
  .command("fix")
  .description("Fix documentation drift and apply patches")
  .action(() => {
    console.log("doqtor fix — not yet implemented");
  });

program
  .command("init")
  .description("Generate a default doqtor.config.json")
  .action(() => {
    console.log("doqtor init — not yet implemented");
  });

program.parse();
