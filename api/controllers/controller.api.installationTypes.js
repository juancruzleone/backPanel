import * as service from "../../services/installationTypes.services.js"

const getInstallationTypes = (req, res) => {
  const filter = req.query
  service.getInstallationTypes(filter).then((tipos) => {
    res.status(200).json(tipos)
  }).catch((error) => {
    console.error("Error al obtener tipos de instalación:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  })
}

const getInstallationTypeById = (req, res) => {
  const id = req.params.id
  service.getInstallationTypeById(id).then((tipo) => {
    if (tipo) {
      res.status(200).json(tipo)
    } else {
      res.status(404).json({ error: "Tipo de instalación no encontrado" })
    }
  }).catch((error) => {
    console.error("Error al obtener tipo de instalación:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  })
}

const addInstallationType = async (req, res) => {
  try {
    const tipo = { ...req.body }
    const newType = await service.addInstallationType(tipo)
    res.status(201).json(newType)
  } catch (error) {
    console.error("Error al agregar tipo de instalación:", error)
    res.status(400).json({ error: error.message || "Error al crear el tipo de instalación" })
  }
}

const updateInstallationType = async (req, res) => {
  try {
    const id = req.params.id
    const tipo = { ...req.body }
    const updatedType = await service.updateInstallationType(id, tipo)
    res.status(200).json({ message: "Tipo de instalación actualizado correctamente" })
  } catch (error) {
    console.error("Error al actualizar tipo de instalación:", error)
    res.status(400).json({ error: error.message || "Error al actualizar el tipo de instalación" })
  }
}

const deleteInstallationType = async (req, res) => {
  try {
    const id = req.params.id
    await service.deleteInstallationType(id)
    res.status(200).json({ message: "Tipo de instalación eliminado correctamente" })
  } catch (error) {
    console.error("Error al eliminar tipo de instalación:", error)
    res.status(400).json({ error: error.message || "Error al eliminar el tipo de instalación" })
  }
}

export { 
  getInstallationTypes, 
  getInstallationTypeById, 
  addInstallationType, 
  updateInstallationType, 
  deleteInstallationType 
}