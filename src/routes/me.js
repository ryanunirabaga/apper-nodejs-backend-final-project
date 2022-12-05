import express from "express";
import pick from "lodash/pick.js";
import { body, validationResult } from "express-validator";
import requiresAuth from "../middleware/requiresAuth.js";
import { Prisma } from '@prisma/client';
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import omit from "lodash/omit.js";

const meRouter = express.Router();

const SALT_ROUNDS = 10;

/* CRUD operations here */

// GET me
meRouter.get("/me", requiresAuth, async (request, response) => {

    // get session token from cookies
    const cookies = request.cookies;
    const jwtSession = cookies.sessionId;

    // get user id from session token
    const jwtSessionObject = await jwt.verify(
        jwtSession,
        process.env.JWT_SECRET
    );
    const userId = jwtSessionObject.uid;
    
    // get user details
    const user = await request.app.locals.prisma.user.findUnique({
        where: {
            id: userId
        },
    });

    // omit id and password
    const filteredUser = omit(user, [
        "id",
        "password"
    ]);

    // send HTTP response
    response.send({
        data: filteredUser,
        message: "ok"
    });
});

// GET all user's own tweets (default sorted by newest)
meRouter.get("/me/tweets", requiresAuth, async (request, response) => {

    // get session token from cookies
    const cookies = request.cookies;
    const jwtSession = cookies.sessionId;

    // get user id from session token
    const jwtSessionObject = await jwt.verify(
        jwtSession,
        process.env.JWT_SECRET
    );
    const userId = jwtSessionObject.uid;
    
    // get user details
    const user = await request.app.locals.prisma.user.findUnique({
        where: {
            id: userId
        },
        select: {
            tweets: {
                orderBy: {
                    createdAt: "desc"
                },
            }
        },
    });

    // send HTTP response
    response.send({
        data: user.tweets,
        message: "ok"
    });

});

// GET all user's own replies (default sorted by newest)
meRouter.get("/me/replies", requiresAuth, async (request, response) => {

    // get session token from cookies
    const cookies = request.cookies;
    const jwtSession = cookies.sessionId;

    // get user id from session token
    const jwtSessionObject = await jwt.verify(
        jwtSession,
        process.env.JWT_SECRET
    );
    const userId = jwtSessionObject.uid;
    
    // get user details
    const user = await request.app.locals.prisma.user.findUnique({
        where: {
            id: userId
        },
        select: {
            replies: {
                orderBy: {
                    createdAt: "desc"
                }
            }
        },
    });

    // send HTTP response
    response.send({
        data: user.replies,
        message: "ok"
    });

});

// GET all user's own tweets and replies to those tweets (default sorted by newest)
meRouter.get("/me/tweets-and-replies", requiresAuth, async (request, response) => {

    // get session token from cookies
    const cookies = request.cookies;
    const jwtSession = cookies.sessionId;

    // get user id from session token
    const jwtSessionObject = await jwt.verify(
        jwtSession,
        process.env.JWT_SECRET
    );
    const userId = jwtSessionObject.uid;
    
    // get user details
    const user = await request.app.locals.prisma.user.findUnique({
        where: {
            id: userId
        },
        select: {
            tweets: {
                orderBy: {
                    createdAt: "desc"
                },
                include: {
                    replies: {
                        orderBy: {
                            createdAt: "desc"
                        }
                    }
                }
            },
        },
    });

    // send HTTP response
    response.send({
        data: user.tweets,
        message: "ok"
    });

});

// GEt all user favorite tweets
meRouter.get("/me/favorites", requiresAuth, async (request, response) => {

    // get session token from cookies
    const cookies = request.cookies;
    const jwtSession = cookies.sessionId;

    // get user id from session token
    const jwtSessionObject = await jwt.verify(
        jwtSession,
        process.env.JWT_SECRET
    );
    const userId = jwtSessionObject.uid;
    
    // get user details
    const user = await request.app.locals.prisma.user.findUnique({
        where: {
            id: userId
        },
        select: {
            favorites: {
                include: {
                    tweet: {
                        select: {
                            content: true
                        }
                    }
                },
                orderBy: {
                    createdAt: "desc"
                },
            },
        },
    });

    // send HTTP response
    response.send({
        data: user.favorites,
        message: "ok"
    });

});

// GEt all user followers
meRouter.get("/me/followers", requiresAuth, async (request, response) => {

    // get session token from cookies
    const cookies = request.cookies;
    const jwtSession = cookies.sessionId;

    // get user id from session token
    const jwtSessionObject = await jwt.verify(
        jwtSession,
        process.env.JWT_SECRET
    );
    const userId = jwtSessionObject.uid;
    
    // get user followers details
    const userFollowers = await request.app.locals.prisma.follow.findMany({
        where: {
            followingId: Number.parseInt(userId)
        },
        select: {
            follower: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true, 
                    userName: true, 
                    email: true,    
                    birthday: true, 
                    bio: true,
                    tweets: true,
                    replies: true      
                }
            }
        }
    });

    // map output data
    const mappedUserFollowers = userFollowers.map(val => val.follower)

    // send HTTP response
    response.send({
        data: mappedUserFollowers,
        message: "ok"
    });

});

// GEt all followed users
meRouter.get("/me/following", requiresAuth, async (request, response) => {

    // get session token from cookies
    const cookies = request.cookies;
    const jwtSession = cookies.sessionId;

    // get user id from session token
    const jwtSessionObject = await jwt.verify(
        jwtSession,
        process.env.JWT_SECRET
    );
    const userId = jwtSessionObject.uid;
    
    // get followed users details
    const followedUsers = await request.app.locals.prisma.follow.findMany({
        where: {
            followerId: Number.parseInt(userId)
        },
        select: {
            following: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true, 
                    userName: true, 
                    email: true,    
                    birthday: true, 
                    bio: true,
                    tweets: true,
                    replies: true      
                }
            }
        }
    });

    // map output data
    const mappedFollowedUsers = followedUsers.map(val => val.following);   

    // send HTTP response
    response.send({
        data: mappedFollowedUsers,
        message: "ok"
    });

});

// change username
meRouter.put(
    "/me/change-username",
    [
        body("userName").notEmpty().withMessage("new username is required.")
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
        const filteredBody = pick(request.body, ["userName"])

        const cookies = request.cookies;
        const jwtSession = cookies.sessionId;

        // get user id from session token
        const jwtSessionObject = await jwt.verify(
            jwtSession,
            process.env.JWT_SECRET
        );
        const userId = jwtSessionObject.uid;
        
        try {
            // update username in database
            const updatedUser = await request.app.locals.prisma.user.update({
                where: {
                    id: userId
                },
                data: filteredBody,
            });

            // remove id and password in response data
            const filteredUser = omit(updatedUser, ["id","password"]);

            // send HTTP response
            response.send({
                data: filteredUser,
                message: "username was updated successfully."
            });
        }
        catch(error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                response.status(400).json({
                    error: `${error.meta.target[0].toLowerCase()} already exists!`
                });
            }
        }
    }
);

// change password
meRouter.put(
    "/me/change-password",
    [
        body("oldPassword").notEmpty().withMessage("old password is required."),
        body("newPassword").notEmpty().withMessage("new password is required.")
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
        const filteredBody = pick(request.body,
            [
                "oldPassword",
                "newPassword"
            ]
            );

        const cookies = request.cookies;
        const jwtSession = cookies.sessionId;

        // get user id from session token
        const jwtSessionObject = await jwt.verify(
            jwtSession,
            process.env.JWT_SECRET
        );
        const userId = jwtSessionObject.uid;

        // get user details using user id
        const user = await request.app.locals.prisma.user.findUnique({
            where: {
                id: userId
            }
        });

        // decrypt and check password
        const isCorrectPassword = await bcrypt.compare(
            filteredBody.oldPassword,
            user.password
        );

        // return error if incorrect password
        if(!isCorrectPassword) {
            response.status(401).json(
                { error: "Incorrect old password." }
            );
            return;
        }

        // check new password if the same as old password
        if (filteredBody.newPassword === filteredBody.oldPassword) {
            response.status(400).json(
                { error: "New password must be different from Old password!" }
            );
            return;
        }

        // hash new password using bcrypt
        const hashedPassword = await bcrypt.hash(filteredBody.newPassword, SALT_ROUNDS);

        // update password in database
        const updatedUser = await request.app.locals.prisma.user.update({
            where: {
                id: userId
            },
            data: {
                password: hashedPassword
            },
        });

        // remove id and password in response data
        const filteredUser = omit(updatedUser,["id","password"]);

        // send HTTP response
        response.send({
            data: filteredUser,
            message: "password was updated successfully."
        });
    }
);

// change bio
meRouter.put(
    "/me/change-bio",
    [
        body("bio").notEmpty().withMessage("bio is required.")
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
        const filteredBody = pick(request.body, ["bio"])

        const cookies = request.cookies;
        const jwtSession = cookies.sessionId;

        // get user id from session token
        const jwtSessionObject = await jwt.verify(
            jwtSession,
            process.env.JWT_SECRET
        );
        const userId = jwtSessionObject.uid;
        
        // update user's bio in database
        const updatedUser = await request.app.locals.prisma.user.update({
            where: {
                id: userId
            },
            data: filteredBody,
        });

        // remove id and password in response data
        const filteredUser = omit(updatedUser, ["id","password"]);

        // send HTTP response
        response.send({
            data: filteredUser,
            message: "bio was updated successfully."
        });

    }
);

export default meRouter;