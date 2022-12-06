import express from 'express';
import pick from "lodash/pick.js";
import omit from "lodash/omit.js";
import { body, validationResult } from "express-validator";
import jwt from "jsonwebtoken";
import requiresAuth from '../middleware/requiresAuth.js';

const tweetRouter = express.Router();


// GET all tweets
tweetRouter.get("/tweets", requiresAuth, async (request, response) => {
    
    const allTweets = await request.app.locals.prisma.tweet.findMany({
        select: {
            id: true,
            user: {
                select:{
                    userName: true
                }
            },
            content: true,
            replies: {
                select: {
                    user: {
                        select: {
                            userName: true
                        }
                    },
                    content: true,
                    id: true
                }
            }
        }
    });

    // clean output data
    const mappedTweet = allTweets.map((tweet) => ({
        id: tweet.id,
        username: tweet.user.userName,
        content: tweet.content,
        replies: tweet.replies.map((reply) => ({
            id: reply.id,
            username: reply.user.userName,
            content: reply.content
        })) || null
    }));

    response.send({
        data: mappedTweet,
        message: "ok"
    });
});

// POST a tweet
tweetRouter.post(
"/tweets",
    [
        body("content")
        .notEmpty()
        .isLength({ max: 280 })
        .withMessage("content is required(max 280 characters).")

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
        const filteredBody = pick(request.body, ["content"])

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
        
        // add tweet to database
        const tweet = await request.app.locals.prisma.tweet.create({
            data: filteredBody
        });

        // send HTTP response
        response.send({
            data: tweet,
            message: "ok"
        });
});

// DELETE a tweet
tweetRouter.delete("/tweets/:tweetId", requiresAuth, async (request, response) => {

    // get tweetId from parameter
    const tweetId = Number.parseInt(request.params.tweetId);

    // check param if a number
    if (isNaN(tweetId)) {
        response.status(400).json({
            error: "Invalid parameter!"
        });
        return;
    }

    // get session token from cookies
    const cookies = request.cookies;
    const jwtSession = cookies.sessionId;

    // get user id from session token
    const jwtSessionObject = await jwt.verify(
        jwtSession,
        process.env.JWT_SECRET
    );
    const userId = jwtSessionObject.uid;
    
    // get tweet
    const tweet = await request.app.locals.prisma.tweet.findUnique({
        where: {
            id: tweetId
        }
    });

    // check if tweet is existing
    if (!tweet) {
        response.status(404).json({
            data: null,
            message: "Resource not found!"
        });
        return;
    }

    // check if user owned the tweet
    if (userId !== tweet.userId) {
        response.status(401).json({
            error: "You don't own this tweet."
        });
        return;
    };

    // delete user tweet from database
    const deleteTweet = await request.app.locals.prisma.tweet.delete({
        where: {
            id: tweetId
        }
    });

    // send HTTP response
    response.send({
        data: deleteTweet,
        message: "tweet was deleted successfully!"
    });
});

// favorite a tweet
tweetRouter.post("/tweets/:tweetId/favorites", requiresAuth, async (request, response) => {

    // get tweetId from parameter
    const tweetId = request.params.tweetId;

    // check param if a number
    if (isNaN(tweetId)) {
        response.status(400).json({
            error: "Invalid parameter!"
        });
        return;
    }
    
    // get session token from cookies
    const cookies = request.cookies;
    const jwtSession = cookies.sessionId;

    // get user id from session token
    const jwtSessionObject = await jwt.verify(
        jwtSession,
        process.env.JWT_SECRET
    );
    const userId = jwtSessionObject.uid;
    
    // get tweet
    const tweet = await request.app.locals.prisma.tweet.findUnique({
        where: {
            id: Number.parseInt(tweetId)
        }
    });

    // check tweet is existing
    if (!tweet) {
        response.status(404).json({
            data: null,
            message: "Resource not found!"
        });
        return;
    }

    try {
        // add tweet as a favorite to database
        const favoriteTweet = await request.app.locals.prisma.favorite.create({
            data: {
                userId: userId,
                tweetId: Number.parseInt(tweetId)
            },
            include: {
                tweet: {
                    select: {
                        content: true
                    }
                }
            }
        })

        // send HTTP response
        response.send({
            data: favoriteTweet,
            message: "Tweet was successfully added to favorites!"
        });       
        }
    catch {
        // send HTTP error response
        response.status(400).json({
            error: "This tweet is already on your favorites!"
        }); 
    }

});

// unfavorite a tweet
tweetRouter.delete("/tweets/:tweetId/favorites", requiresAuth, async (request, response) => {

    // get tweetId from parameter
    const tweetId = request.params.tweetId;

    // check param if a number
    if (isNaN(tweetId)) {
        response.status(400).json({
            error: "Invalid parameter!"
        });
        return;
    }
    
    // get session token from cookies
    const cookies = request.cookies;
    const jwtSession = cookies.sessionId;

    // get user id from session token
    const jwtSessionObject = await jwt.verify(
        jwtSession,
        process.env.JWT_SECRET
    );
    const userId = jwtSessionObject.uid;

    try {
        // remove favorite to database
        const deletedFavorite = await request.app.locals.prisma.favorite.delete({
            where: {
                tweetId_userId: {
                    tweetId: Number.parseInt(tweetId),
                    userId: userId
                }
            }
        });

        // send HTTP response
        response.send({
            data: deletedFavorite,
            message: "Tweet was successfully removed from favorites!"
        });       
        }
    catch {
        // send HTTP error response
        response.status(404).json({
            data: null,
            error: "Resource not found!"
        }); 
    }

});

export default tweetRouter;