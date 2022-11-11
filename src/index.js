import express from 'express';
import cors from 'cors';
import chalk from 'chalk';
import dotenv from 'dotenv';
import {MongoClient} from 'mongodb';

const app = express();
app.use(cors());
dotenv.config();
app.use(express.json());

const mongoClient = new MongoClient(process.env.MONGO_URI);

try {
    await mongoClient.connect();
    console.log("MongoDb is connected");
} catch (err) {
    console.log(err);
};


app.listen(process.env.PORT, () => {
    console.log(chalk.bold.green(`Server running in port: ${process.env.PORT}`));
});