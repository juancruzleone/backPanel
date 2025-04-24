import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const client = new MongoClient(process.env.MONGODB_URI);
const db = client.db("PanelMantenimiento");

client.connect()
    .then(() => console.log("Conectado a la base de datos"))
    .catch(error => console.error("Error al conectar a la base de datos:", error));

export { client, db };
