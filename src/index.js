//imports
import express from 'express';
import cors from 'cors';
import chalk from 'chalk';
import dotenv from 'dotenv';
import {MongoClient} from 'mongodb';
import Joi from 'joi';
import dayjs from 'dayjs';

//general configs
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
const participantSchema = Joi.object ({
    name: Joi.string().required(),
    lastStatus: Joi.number().integer()
});

const messageSchema = Joi.object ({
    from: Joi.string().required(),
    to:   Joi.string().required(),
    text: Joi.string().required(),
    type: Joi.string().required().valid("message", "private_message"),
    time: Joi.string()
});

//route post participants
app.post("/participants", async (req, res) => {
    const {name} = req.body;

    try {
        const validatingUser = participantSchema.validate({name}, {abortEarly: false});
        const userAlreadyExist = await db.collection("participants").findOne({name});

        if (validatingUser.error || userAlreadyExist !== null ) {
            res.status(409).send("Invalid user");//error validating a user
            console.log(validatingUser.error.details.map((detail) => detail.message));
            return;

        } else {
            //insert users
            await db.collection("participants").insertOne({name, lastStatus: Date.now()});

            //insert initial messages
            await db.collection("messages").insertOne({
                from: name, 
                to: "Todos", 
                text: "entra na sala...", 
                type: "status",  
                time: dayjs(Date.now()).format("HH:mm:ss")
            });

            //response
            res.sendStatus(201);
            console.log("Validated user");
            return;
        };
        
    } catch (err) {
        res.sendStatus(422); //error registering a user
        return;
    };
});

//route delete participants (TO DO)


//route get participants
app.get("/participants", async(req, res) => {

    try {
        const users = await db.collection("participants").find({}).toArray();

        //show initial messages
        const showInitialMessages = await db.collection("messages").find({}).toArray();
        console.log(showInitialMessages);
        //
        
        res.status(200).send(users);
        return;

    } catch(err) {
        res.sendStatus(500); //error accessing users
        return;
    };
});

//turn on the server
app.listen(port, () => {
    console.log(chalk.bold.green(`Server running in port: ${port}`));
});