import * as service from "../../services/clients.services.js";

const getClients = (req, res) => {
  const filter = req.query;
  service.getClients(filter).then((clientes) => {
    res.status(200).json(clientes);
  });
};

const getClientById = (req, res) => {
  const id = req.params.id;
  service.getClientById(id).then((cliente) => {
    if (cliente) {
      res.status(200).json(cliente);
    } else {
      res.status(404).json();
    }
  });
};

const addClient = async (req, res) => {
  try {
    const newClient = await service.addClient(req.body);
    res.status(201).json(newClient);
  } catch (error) {
    console.log(error);
    res.status(500).json(error);
  }
};

const putClient = async (req, res) => {
  const id = req.params.id;
  const cliente = {
    name: req.body.name,
    category: req.body.category,
  };

  try {
    const editedClient = await service.putClient(id, cliente);
    if (editedClient.modifiedCount > 0) {
      res.status(200).json(editedClient.value);
    } else {
      res.status(404).json();
    }
  } catch (error) {
    console.log(error);
    res.status(500).json(error);
  }
};

const patchClient = async (req, res) => {
  const id = req.params.id;
  try {
    const editedClient = await service.editClient(id, req.body);
    if (editedClient.modifiedCount > 0) {
      res.status(200).json(editedClient.value);
    } else {
      res.status(404).json();
    }
  } catch (error) {
    console.log(error);
    res.status(500).json(error);
  }
};

const deleteClient = async (req, res) => {
  const id = req.params.id;
  try {
    await service.deleteClient(id);
    res.status(204).json();
  } catch (error) {
    console.log(error);
    res.status(500).json(error);
  }
};

export {
  getClients,
  getClientById,
  addClient,
  putClient,
  patchClient,
  deleteClient,
};