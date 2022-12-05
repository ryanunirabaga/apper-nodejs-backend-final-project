import express from 'express';
import pick from "lodash/pick.js";
import omit from "lodash/omit.js";
import bcrypt from "bcrypt";
import { body, validationResult } from "express-validator";
import { Prisma } from '@prisma/client';
import jwt from "jsonwebtoken";

const authRouter = express.Router();

const SALT_ROUNDS = 10;


/* CRUD operations here */

// Sign-up
authRouter.post(
    "/sign-up",
    [   
        body("firstName").notEmpty().withMessage("first name is required."),
        body("lastName").notEmpty().withMessage("last name is required."),
        body("userName").notEmpty().withMessage("username is required."),
        body("email").notEmpty().isEmail().normalizeEmail().withMessage("email is required."),
        body("password").notEmpty().withMessage("password is required."),
        body("birthday")
        .notEmpty()
        .custom(val => {
            const date = new Date(val);

            // check input date if invalid
            if (date == "Invalid Date")
                throw new Error("Invalid date!");
            
            // get age
            const ageDate = new Date(Date.now() - date.getTime())
            const age = ageDate.getFullYear()-1970;

            // check age if less than 18
            if (age < 18)
                throw new Error("Age below 18 can't sign-up!")

            // return date if valid
            return date;
        }),
        body("bio").notEmpty()
    ],
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
        const filteredBody = pick(request.body, [
            "firstName",
            "lastName",
            "userName",
            "email",
            "password",
            "birthday",
            "bio"
        ]);

        // hash password using bcrypt
        const hashedPassword = await bcrypt.hash(filteredBody.password, SALT_ROUNDS);
        filteredBody.password = hashedPassword;

        try {
            // create user
            const user = await request.app.locals.prisma.user.create({
                data: filteredBody
            });

            // create session token
            const jwtSessionToken = {
                uid: user.id,
                username: user.userName
            };

            // set session token max age
            const maxAge = 1 * 24 * 60 * 60;

            // sign session token
            const jwtSession = await jwt.sign(
                jwtSessionToken,
                process.env.JWT_SECRET,
                {
                    expiresIn: maxAge
                }
            );

            // output session token as cookie
            response.cookie(
                "sessionId",
                jwtSession,
                {
                    httpOnly: true,
                    maxAge: maxAge * 1000,
                    sameSite: "lax",
                    secure: process.env.NODE_ENV === "production" ? true : false
                }
            );
            
            const filteredUser = omit(user, ["id","password"]);
            // Send HTTP Response
            response.send({
                data: filteredUser,
                message: filteredUser? "ok" : "error"
            });
        }
        catch(error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                response.status(400).json({
                    data: null,
                    error: `${error.meta.target[0].toLowerCase()} already exists!`
                });
                return;
            }
        }
    }
);

// Sign-in
authRouter.post(
    "/sign-in",
    [
        body("userName").optional({checkFalsy: true}),
        body("email").optional({checkFalsy: true}),
        body("password").notEmpty().withMessage("password is required.")
    ],
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
        const filteredBody = pick(request.body, [
            "userName",
            "email",
            "password"
        ]);

        // check if no username and email provided
        if (!filteredBody.userName && !filteredBody.email) {
            response.status(400).json(
                { error: "username or email is required." }
            );
            return;
        };

        // find user based on username or email
        let user;

        if (filteredBody.userName) {
            user = await request.app.locals.prisma.user.findUnique({
                where: {
                    userName: filteredBody.userName,
                },
            });
        }
        else {
            user = await request.app.locals.prisma.user.findUnique({
                where: {
                    email: filteredBody.email,
                }
            });
        }

        // return error if user does not exits
        if (!user) {
            response.status(401).json(
                { error: "Invalid username/email or password." }
            );
            return;
        }

        // decrypt and check password
        const isCorrectPassword = await bcrypt.compare(
            filteredBody.password,
            user.password
        );

        // return error if incorrect password
        if(!isCorrectPassword) {
            response.status(401).json(
                { error: "Invalid username/email or password." }
            );
            return;
        }

        // create session token
        const jwtSessionToken = {
            uid: user.id,
            username: user.userName
        };

        // set session token max age
        const maxAge = 1 * 24 * 60 * 60;

        // sign session token
        const jwtSession = await jwt.sign(
            jwtSessionToken,
            process.env.JWT_SECRET,
            {
                expiresIn: maxAge
            }
        );

        // output session token as cookie
        response.cookie(
            "sessionId",
            jwtSession,
            {
                httpOnly: true,
                maxAge: maxAge * 1000,
                sameSite: "lax",
                secure: process.env.NODE_ENV === "production" ? true : false
            }
        );
        
        const filteredUser = omit(user, ["id","password"]);

        // Send HTTP Response
        response.send({
            data: filteredUser,
            message: "Signed-in successfully!"
        });
    }
)

// Sign-out
authRouter.post("/sign-out", (request, response) => {

    const cookies = request.cookies;
    const jwtSession = cookies.sessionId;

    // expire cookies to log out 
    response.cookie(
        "sessionId",
        jwtSession,
        {
            maxAge: 1 // one millisecond
        }
    );

    response.send({ message: "Signed-out successfully!" });
})

export default authRouter;