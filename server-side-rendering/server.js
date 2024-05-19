import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import renderApp from "./dist/server/ServerApp.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT || 3001;

// Our project is going to build our HTML file and we need to read that file
// since it will contain all our css, js, because they have all of this hashes
// attach to it. So we have to resolve all of our path resources
const html = fs
  .readFileSync(path.resolve(__dirname, "./dist/client/index.html"))
  .toString();

// The html document is splitted into 2 parts.
// When the user load my page it will immediately load all of our head resoruces.
// So they can start loading css and once the html is generated, the module bundler
// In our case Vite, put all of our js files at the <head>, which is good because
// We can start loading all of them, once the client is making a requst.
const parts = html.split("not rendered");

const app = express();
app.use(
  "/assets",
  express.static(path.resolve(__dirname, "./dist/client/assets"))
);

// Anything that is not server by static assets, let REACT handle it.
app.use((req, res) => {
  // The first thing to do immediately flush them out
  res.write(parts[0]);

  const stream = renderApp(req.url, {
    onShellReady() {
      // This is something that comes from renderToPipeableStream, which is a node data type stream
      // The response object and the react stream are connected each other
      // Whenever is comming from the react is going straight to the user
      // SEO : If this is the crawler don't do something here
      stream.pipe(res);
    },
    onShellError() {
      // Server log errors, logging out to error logging services (TrackJs, Sentry)
    },
    onAllReady() {
      // SEO : If this is the crawler, it'll maintain the back pressure
      // and then you can dump it all at once.
      // stream.pipe(res)

      // Because react is going to give us every piece of render and once that's done
      // We say ok, now we can write the tail of it
      res.write(parts[1]);
      res.end();
    },
    onError(err) {
      console.log(err);
    },
  });
});

console.log(`listening on http://localhost:${PORT}`);

app.listen(PORT);
