import express from 'express';
import "dotenv/config";
import { stat } from 'fs';



const app = express();
const PORT = process.env.PORT;




app.get("/", (req, res) => {
    res.send("hello world")
});

app.use("/health", (_req, res) =>{
    res.json({status: "ok"});
});










app.listen(PORT, () => {
    console.log("Server is running on port 8081");
});