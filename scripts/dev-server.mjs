import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const rootDirectory = fileURLToPath(new URL("../", import.meta.url));
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function resolveRequestPath(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, "http://localhost").pathname);
  const relativePath = pathname === "/" ? "index.html" : pathname.slice(1);
  const safePath = normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, "");
  return join(rootDirectory, safePath);
}

const server = createServer(async (request, response) => {
  try {
    const filePath = resolveRequestPath(request.url || "/");
    const fileStats = await stat(filePath);

    if (!fileStats.isFile()) {
      throw new Error("Not found");
    }

    const content = await readFile(filePath);
    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": contentTypes[extname(filePath)] || "application/octet-stream",
    });
    response.end(content);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Archivo no encontrado.");
  }
});

server.listen(port, host, () => {
  console.log(`TermaLab disponible en http://${host}:${port}`);
});
