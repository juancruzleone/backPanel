import { db } from '../db.js';
import { ObjectId } from "mongodb";

const clientsCollection = db.collection("clientes");

async function getClients(filter = {}) {
    const filterMongo = { eliminado: { $ne: true } };
    return clientsCollection.find(filterMongo)
        .sort({ _id: -1 }) 
        .toArray();
}

async function getClientById(id) {
    return clientsCollection.findOne({ _id: new ObjectId(id) });
}

const addClient = async (cliente) => {
    const insertedClient = await clientsCollection.insertOne(cliente);
    cliente._id = insertedClient.insertedId;
    return cliente;
};

const putClient = async (id, cliente) => {
    const editedClient = await clientsCollection.replaceOne({ _id: new ObjectId(id) }, cliente);
    return editedClient;
};

const editClient = async (id, nuevoCliente) => {
    const editedClient = await clientsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: nuevoCliente }
    );
    return editedClient;
};

const deleteClient = async (id) => {
    const deletedClient = await clientsCollection.deleteOne({ _id: new ObjectId(id) });
    return deletedClient;
};

export {
    getClients,
    getClientById,
    addClient,
    putClient,
    editClient,
    deleteClient,
};