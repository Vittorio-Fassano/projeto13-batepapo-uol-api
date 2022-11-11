import express from 'express';
import cors from 'cors';
import chalk from 'chalk';
import dotenv from 'dotenv';
import {MongoClient} from 'mongodb';

const app = express();
app.use(cors());
dotenv.config();
app.use(express.json());

//connection with mongo
const mongoClient = new MongoClient(process.env.MONGO_URI);
const port = process.env.PORT;

try {
    await mongoClient.connect();
    console.log("MongoDb is connected");
} catch (err) {
    console.log(err);
};

//connection with database
const database = process.env.MONGO_DB;
let db = null;

try {
    db = mongoClient.db(database);
} catch (err) {
    console.log("Error to connect", err);
};

//schemasJoi


//turn on the server
app.listen(port, () => {
    console.log(chalk.bold.green(`Server running in port: ${port}`));
});