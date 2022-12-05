import express from 'express';
import pick from "lodash/pick.js";
import omit from "lodash/omit.js";
import { body, validationResult } from "express-validator";
import jwt from "jsonwebtoken";
import requiresAuth from '../middleware/requiresAuth.js';

const replyRouter = express.Router();

// reply to a tweet
replyRouter.post(
    "/replies",
    [
        body("tweetId").notEmpty().isInt().withMessage("Tweet id (must be a number) is required."),
        body("content").notEmpty().withMessage("content is required."),
    ],
    requiresAuth,
    async (request, response) => {
        // validate request body
        const errors = validationResult(request);
        if (!errors.isEmpty()) {
            response.status(400).json(
                { errors: errors.array() }
            );
            return;
        };

        // filter request body
        const filteredBody = pick(request.body, ["tweetId","content"])

        // parse tweetId to Int
        filteredBody.tweetId = Number.parseInt(filteredBody.tweetId);

        // get session token from cookies
        const cookies = request.cookies;
        const jwtSession = cookies.sessionId;
    
        // get user id from session token
        const jwtSessionObject = await jwt.verify(
            jwtSession,
            process.env.JWT_SECRET
        );
        const userId = jwtSessionObject.uid;
        
        // add userId to filtered request body
        filteredBody.userId = userId;
        
        try {
            // add reply to database
            const tweetReply = await request.app.locals.prisma.reply.create({
                data: filteredBody
            });
            
            // send HTTP response
            response.send({
                data: tweetReply,
                message: "Reply was posted successfully!"
            });
        }
        catch {
            response.status(404).json({
                error: "selected tweet was not found!"
            });
        }
    }
);




export default replyRouter;