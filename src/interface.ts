export interface LoginBody {
    email: string,
    password: string
}

export interface IBody {
    username: string;
    password: string;
}

export interface IReply {
    200: {
        token: string;
        memberId: string;
        role: string;
    };
    400: { type: string; title: string; status: 400; detail: string };
    401: { type: string; title: string; status: 401; detail: string };
    404: { type: string; title: string; status: 404; detail: string };
    422: { type: string; title: string; status: 422; detail: string };
}