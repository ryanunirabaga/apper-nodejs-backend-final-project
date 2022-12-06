import express from 'express'
import { PrismaClient } from '@prisma/client';
import authRouter from './routes/auth.js';
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import cors from "cors";
import tweetRouter from './routes/tweet.js';
import replyRouter from './routes/reply.js';
import userRouter from './routes/user.js';
import meRouter from './routes/me.js';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
app.use(express.json());
app.use(cookieParser()); // allows express to read/write cookies
app.use(cors()); // allows express to reed/write cors   
app.locals.prisma = prisma;

const PORT = 3000;
app.use(authRouter);
app.use(meRouter);
app.use(userRouter);
app.use(tweetRouter);
app.use(replyRouter);


// redirect to 404 if path is non-existent
app.use((request, response) => {
    response.status(404).json({
        error: "Page not found"
    });
});

app.listen(PORT, () => console.log(`listening on PORT ${PORT}`));