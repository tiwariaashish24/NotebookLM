import express from 'express';
import "dotenv/config";
import { stat } from 'fs';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './lib/auth';
import cors from 'cors'
import { register } from 'module';
import { registerRoutes } from './routes';
import { error } from 'console';
import { errorHandler } from './middleware/error-handler-middleware';



const app = express();
const PORT = process.env.PORT;
const clientUrl = process.env.CLIENT_URL ?? "http://localhost:3001";


app.use(
    cors({
        origin: clientUrl,
        credentials :true,

    })
);

app.all('/api/auth/{*any}', toNodeHandler(auth));
// Mount express json middleware after Better Auth handler
// or only apply it to routes that don't interact with Better Auth
app.use(express.json());




app.get("/", (req, res) => {
    res.send("hello world")
});

app.use("/health", (_req, res) =>{
    res.json({status: "ok"});
});

registerRoutes(app);

app.use(errorHandler);










app.listen(PORT, () => {
    console.log("Server is running on port 8081");
});