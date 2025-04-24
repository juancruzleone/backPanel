import { db } from '../db.js';
import { ObjectId } from 'mongodb';

const cuentaCollection = db.collection('cuentas');

async function editProfile(userId, userName) {
    const existe = await cuentaCollection.findOne({ userName });
    if (existe) throw new Error('El nombre de usuario ya existe');

    await cuentaCollection.updateOne(
        { _id: new ObjectId(userId) },
        { $set: { userName } }
    );
}

export { editProfile };
