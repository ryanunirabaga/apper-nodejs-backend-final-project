import jwt from "jsonwebtoken";

const requiresAuth = async (request, response, next) => {
    const cookies = request.cookies;
    const jwtSession = cookies.sessionId;

    if (!jwtSession) {
        response.status(401).send({
            data: null,
            message: "Not Authorized"
        });
        return;
    }

    try {
        await jwt.verify(jwtSession, process.env.JWT_SECRET);
        next();
    }
    catch {
        response.status(401).send({
            data: null,
            message: "Not Authorized"
        });
    }
}

export default requiresAuth;