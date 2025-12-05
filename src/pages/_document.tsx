import Document, { Html, Head, Main, NextScript } from "next/document";

// Minimal Document to satisfy Pages layer when App Router is primary.
export default class MyDocument extends Document {
  render() {
    return (
      <Html lang="en">
        <Head />
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
