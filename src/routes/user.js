import express from "express";
import pick from "lodash/pick.js";
import requiresAuth from "../middleware/requiresAuth.js";
import jwt from "jsonwebtoken";
import omit from "lodash/omit.js";

const userRouter = express.Router();


// GET user by id
userRouter.get("/users/:userId", async (request, response) => {

    // get session token from cookies
    const cookies = request.cookies;
    const jwtSession = cookies.sessionId;

    // get user id from parameter
    const userId = request.params.userId;

    // check param if a number
    if (isNaN(userId)) {
        response.status(400).json({
            error: "Invalid parameter!"
        });
        return;
    }

    try {
        // verify session token
        const jwtSessionObject = await jwt.verify(
            jwtSession,
            process.env.JWT_SECRET
        );
        
        // get user details if token is verified
        const userDetails = await request.app.locals.prisma.user.findUnique({
            where: {
                id: Number.parseInt(userId)
            },
        });

        // remove unnecessary data
        const filteredDetails = omit(userDetails, [
            "createdAt",
            "updatedAt",
            "id",
            "password"
        ]);
        
        // send HTTP response
        response.send({
            data: filteredDetails,
            message: userDetails ? "ok" : "Resource not found!"
        });
    }
    catch {
        // get username and bio only if not authenticated
        const userDetails = await request.app.locals.prisma.user.findUnique({
            where: {
                id: Number.parseInt(userId)
            },
            select: {
                userName: true,
                bio: true
            }
        });

        // send HTTP response
        response.send({
            data: userDetails,
            message: userDetails? "ok" : "Resource not found!"
        });
    }

});

// GET user's tweets
userRouter.get("/users/:userId/tweets", requiresAuth, async (request, response) => {

    // get user id from parameter
    const userId = request.params.userId;

    // check param if a number
    if (isNaN(userId)) {
        response.status(400).json({
            error: "Invalid parameter!"
        });
        return;
    }

    // get user details
    const user = await request.app.locals.prisma.user.findUnique({
        where: {
            id: Number.parseInt(userId)
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

// GET user's replies
userRouter.get("/users/:userId/replies", requiresAuth, async (request, response) => {

    // get user id from parameter
    const userId = request.params.userId;

    // check param if a number
    if (isNaN(userId)) {
        response.status(400).json({
            error: "Invalid parameter!"
        });
        return;
    }

    // get user details
    const user = await request.app.locals.prisma.user.findUnique({
        where: {
            id: Number.parseInt(userId)
        },
        select: {
            replies: {
                orderBy: {
                    createdAt: "desc"
                },
            }
        },
    });

    // send HTTP response
    response.send({
        data: user.replies,
        message: "ok"
    });

});

// GET user's favorites
userRouter.get("/users/:userId/favorites", requiresAuth, async (request, response) => {

    // get user id from parameter
    const userId = request.params.userId;

    // check param if a number
    if (isNaN(userId)) {
        response.status(400).json({
            error: "Invalid parameter!"
        });
        return;
    }

    // get user details
    const user = await request.app.locals.prisma.user.findUnique({
        where: {
            id: Number.parseInt(userId)
        },
        select: {
            favorites: {
                include: {
                    tweet: true
                },
                orderBy: {
                    createdAt: "desc"
                },
            }
        },
    });

    // send HTTP response
    response.send({
        data: user.favorites,
        message: "ok"
    });

});

// GET user's followers
userRouter.get("/users/:userId/followers", async (request, response) => {

    // get session token from cookies
    const cookies = request.cookies;
    const jwtSession = cookies.sessionId;
    
    // get user id from parameter
    const userId = request.params.userId;

    // check param if a number
    if (isNaN(userId)) {
        response.status(400).json({
            error: "Invalid parameter!"
        });
        return;
    }

    try {
        // verify session token
        const jwtSessionObject = await jwt.verify(
            jwtSession,
            process.env.JWT_SECRET
        );

        // get follower details if token is verified
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
    }
    catch {
        // get 15 followers, limited details
        const userFollowers = await request.app.locals.prisma.follow.findMany({
            take:15,
            where: {
                followingId: Number.parseInt(userId)
            },
            select : {
                follower: {
                    select: {
                        userName: true, 
                        bio: true, 
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
    }

});

// GET user's followed users
userRouter.get("/users/:userId/following", async (request, response) => {

    // get session token from cookies
    const cookies = request.cookies;
    const jwtSession = cookies.sessionId;
    
    // get user id from parameter
    const userId = request.params.userId;

    // check param if a number
    if (isNaN(userId)) {
        response.status(400).json({
            error: "Invalid parameter!"
        });
        return;
    }

    try {
        // verify session token
        const jwtSessionObject = await jwt.verify(
            jwtSession,
            process.env.JWT_SECRET
        );

        // get user's followed users details if token is verified
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
    }
    catch {
        // get 15 followed users, limited details
        const followedUsers = await request.app.locals.prisma.follow.findMany({
            take:15,
            where: {
                followerId: Number.parseInt(userId)
            },
            select : {
                following: {
                    select: {
                        userName: true, 
                        bio: true, 
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
    }

});

// follow a user
userRouter.post("/users/:userId/follow", requiresAuth, async (request, response) => {

    // get user id from parameter
    const followingUserId = request.params.userId;

    // check param if a number
    if (isNaN(followingUserId)) {
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
    const followeUserId = jwtSessionObject.uid;
    
    // check following id and follower id if the same
    if (followeUserId == followingUserId) {
        response.status(400).json({
            error: "You cannot follow/unfollow yourself!"
        });
        return;
    }

    // get following user
    const followingUser = await request.app.locals.prisma.user.findUnique({
        where: {
            id: Number.parseInt(followingUserId)
        }
    });

    // check user if existing
    if (!followingUser) {
        response.status(404).json({
            data: null,
            message: "Resource not found!"
        });
        return;
    }

    try {
        // add following user to database
        const followeduser = await request.app.locals.prisma.follow.create({
            data: {
                followerId: followeUserId,
                followingId: Number.parseInt(followingUserId)
            }
        });

        // send HTTP response
        response.send({
            data: followeduser,
            message: "User was followed successfully!"
        });  
    }
    catch {
        // send HTTP error response
        response.status(400).json({
            error: "You're already following this user!"
        }); 
    }
});

// unfollow a user
userRouter.delete("/users/:userId/follow", requiresAuth, async (request, response) => {

    // get user id from parameter
    const followingUserId = request.params.userId;

    // check param if a number
    if (isNaN(followingUserId)) {
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
    const followeUserId = jwtSessionObject.uid;
    
    // check following id and follower id if the same
    if (followeUserId == followingUserId) {
        response.status(400).json({
            error: "You cannot follow/unfollow yourself!"
        });
        return;
    }

    try {
        // remove following user to database
        const followeduser = await request.app.locals.prisma.follow.delete({
            where: {
                followingId_followerId: {
                    followerId: followeUserId,
                    followingId: Number.parseInt(followingUserId)
                }
            }
        });

        // send HTTP response
        response.send({
            data: followeduser,
            message: "User was unfollowed successfully!"
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


export default userRouter;