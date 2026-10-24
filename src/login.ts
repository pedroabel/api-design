import { ServerResponse, IncomingMessage, Server } from "node:http";
import { createHmac } from "node:crypto";
import type { IBody, IReply, LoginBody } from "./interface.js";

const seedEmail = "pedroabel";
const seedPassword = "123";
const jwtSecret = "dev-only-change-me";

function signToken(memberId: string, role: string): string {
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const now = Math.floor(Date.now() / 1000);
    const payload = Buffer.from(JSON.stringify({
        sub: memberId,
        role,
        exp: now + 60 * 60,
    })).toString("base64url")
    const signature = createHmac("sha256", jwtSecret)
        .update(`${header}.${payload}`)
        .digest("base64url");

    return `${header}.${payload}.${signature}`;
}


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

    if (body.email === seedEmail && body.password === seedPassword) {
        send(response, 200, {
            token: signToken("1", "librarian"),
            memberId: "1",
            role: "librarian",
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