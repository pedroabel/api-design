import http, { IncomingMessage, ServerResponse } from "node:http";
import { login } from "./login.js";


const host = "127.0.0.1"
const port = 3001

const server = http.createServer(async (request: IncomingMessage, response: ServerResponse) => {
    if (request.method === "POST" && request.url === "/v1/login") {
        await login(request, response);
        return
    }

    response.writeHead(404, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({
        type: "about:blank",
        title: "Not found",
        status: 404,
        detail: "This route does not exist.",
    }))
})

server.listen(port, host)

