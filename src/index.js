//imports:
import express from 'express';
import cors from 'cors';
import chalk from 'chalk';
import dotenv from 'dotenv';
import {MongoClient} from 'mongodb';
import Joi from 'joi';
import dayjs from 'dayjs';

//general configs:
const app = express();
app.use(cors());
dotenv.config();
app.use(express.json());

//connection with mongo:
const mongoClient = new MongoClient(process.env.MONGO_URI);
const port = process.env.PORT;

try {
    await mongoClient.connect();
    console.log("MongoDb is connected");
} catch (err) {
    console.log(err);
};

//connection with database:
const database = process.env.MONGO_DB;
let db = null;

try {
    db = mongoClient.db(database);
} catch (err) {
    console.log("Error to connect", err);
};

//schemasJoi:
const participantSchema = Joi.object ({
    name: Joi.string().required(),
    lastStatus: Joi.number().integer()
});

const messageSchema = Joi.object ({
    from: Joi.string().required(),
    to:   Joi.string().required().min(1),
    text: Joi.string().required().min(1),
    type: Joi.string().required().valid("message", "private_message"),
    time: Joi.string()
});

//route post participants:
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

//route delete participants(partially working):
app.delete("/participants", async(req, res) => {
    try {
        const deleteAllParticipants = await db.collection("participants").deleteMany({});
        const deleteAllInitialMessages =  await db.collection("messages").deleteMany({});
        res.status(200).send({deleteAllParticipants, deleteAllInitialMessages});
    } catch (err) {
        res.sendStatus(500);
        console.log(deleteAllParticipants, deleteAllInitialMessages);
        return;
    };
});
//WARNING: the above route deletes all participants and messages;

//route get participants:
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

//rout post messages:
app.post("/messages", async (req, res) => {
    const {to, text, type} = req.body; //req from body
    const {user} = req.headers //req from headers
    const from = user;

    try{
        const validatingMessage = messageSchema.validate({from, to, text, type}, {abortEarly: false});
        const userAlreadyExist = await db.collection("participants").findOne({name: from});
        console.log(userAlreadyExist);
        

        if(validatingMessage.error || userAlreadyExist === null ) {
            res.status(409).send("Invalid message");//error validating a message
            console.log(validatingMessage.error.details.map((detail) => detail.message));
            return;

        } else {
            //insert messages
            await db.collection("messages").insertOne({from, to, text, type, time: dayjs(Date.now()).format("HH:mm:ss")});

            //response
            res.sendStatus(201);
            console.log("Validated message");
            return;
        };

    } catch (err) {
        res.sendStatus(422); //error sending a message
        return;

    };
});

//route get messages:
app.get("/messages", async(req, res) => {
    const {user} = req.headers;
    const {limit} = req.query; //only if the limit is required
    console.log(user);
    console.log(limit);

    try {
        const messages = await db.collection("messages").find({
            $or:[{from:user}, {to:user}, {to:"todos"}, {type:"message"}] //find only messages that user could see
        }).toArray();
        console.log(messages);

        if(limit === null) { //without a limit
            res.status(200).send(messages);
            return;
        } else {
            console.log(messages);
            const numberOfMessages = messages.slice(-limit).reverse(); //with a limit from query string
            console.log(numberOfMessages);
            res.status(200).send(numberOfMessages);
            return;
        };

    } catch(err) {
        res.sendStatus(500); //error accessing messages
        return;
    };
});

//route post status:
app.post("/status", async (req, res) => {
    const {user} = req.headers;

    try {
        const userAlreadyExist = await db.collection("participants").findOne({name: user});
        if(userAlreadyExist === null) {
            res.sendStatus(404);//no registered user
            return;
        } else {
            const newStatus = await db.collection("participants").updateOne({name: user}, {$set: {lastStatus: Date.now()}});
            res.send(newStatus);
            return;
        };
    } catch (err) {   
        res.sendStatus(500);//error accessing users
        console.log(err);
        return;
    };
});

//turn on the server:
app.listen(port, () => {
    console.log(chalk.bold.green(`Server running in port: ${port}`));
});

//remaining requirements: inactive users(15s);