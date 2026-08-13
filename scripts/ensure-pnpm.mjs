import process from "node:process";

const userAgent = process.env.npm_config_user_agent ?? "";

if (!userAgent.includes("pnpm")) {
  console.error(
    [
      "error: this repository requires pnpm (via mise).",
      "",
      "  mise exec -- pnpm install",
      "",
      "Do not use npm, yarn, or bun.",
    ].join("\n"),
  );
  process.exit(1);
}
