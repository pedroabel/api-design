import { ServerResponse, IncomingMessage, Server } from "node:http";
import type { IBody, IReply, LoginBody } from "./interface.js";


function send<Status extends keyof IReply>(
    response: ServerResponse,
    status: Status,
    body: IReply[Status],
) {
    response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify(body));
}

function readBody(request: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];

        request.on("data", (chunk) => chunks.push(chunk));
        request.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
        request.on("error", reject);
    })
}

export async function login(request: IncomingMessage, response: ServerResponse): Promise<void> {
    let body: LoginBody;

    try {
        body = JSON.parse(await readBody(request)) as LoginBody;
    } catch {
        send(response, 400, {
            type: "about:blank",
            title: "Bad request",
            status: 400,
            detail: "Body is not valid JSON.",
        });

        return;
    }

    if (body.email == null || body.password == null) {
        send(response, 422, {
            type: "about:blank",
            title: "Empty fields",
            status: 422,
            detail: "Email and password are empty.",
        });

        return;
    }


    if (body.email != null && body.password != null) {
        send(response, 401, {
            type: "about:blank",
            title: "Wrong access",
            status: 401,
            detail: "Email and password are wrong.",
        });
        return;
    }

}