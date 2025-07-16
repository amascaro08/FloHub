import { StackClientApp } from "@stackframe/js";

export const stackClientApp = new StackClientApp({
  tokenStore: "cookie",

  // get your Stack Auth API keys from https://app.stack-auth.com and store them in a safe place (eg. environment variables)
  publishableClientKey: 'pck_wzfpr1x4arrnhj0yw6cryyaws41bemjn72kytm3gv8vs8',
});
