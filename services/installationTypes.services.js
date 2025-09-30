import { db } from "../db.js"
import { ObjectId } from "mongodb"

const installationTypesCollection = db.collection("tiposInstalacion")

async function getInstallationTypes(filter = {}, tenantId = null) {
  const filterMongo = { eliminado: { $ne: true } }

  if (filter.activo !== undefined) {
    filterMongo.activo = filter.activo === 'true'
  }

  if (filter.nombre) {
    filterMongo.nombre = { $regex: filter.nombre, $options: "i" }
  }

  if (tenantId) {
    // Búsqueda dual: buscar por tenantId o por _id del tenant
    // Esto maneja el caso donde el usuario tiene el _id del tenant como tenantId
    console.log('🔍 [INSTALLATION TYPES] Buscando tipos para tenantId:', tenantId);
    
    // Primero buscar por tenantId directo
    filterMongo.tenantId = tenantId
    let tipos = await installationTypesCollection.find(filterMongo).sort({ nombre: 1 }).toArray()
    console.log('🔍 [INSTALLATION TYPES] Tipos encontrados (tenantId directo):', tipos.length);
    
    // Si no encuentra nada, buscar el tenant real y usar su tenantId
    if (tipos.length === 0) {
      try {
        console.log('🔍 [INSTALLATION TYPES] Buscando tenant por _id...');
        const tenantCollection = db.collection("tenants")
        const tenant = await tenantCollection.findOne({ _id: new ObjectId(tenantId) })
        
        if (tenant && tenant.tenantId) {
          console.log('✅ [INSTALLATION TYPES] Tenant encontrado, usando tenantId real:', tenant.tenantId);
          filterMongo.tenantId = tenant.tenantId
          tipos = await installationTypesCollection.find(filterMongo).sort({ nombre: 1 }).toArray()
          console.log('🔍 [INSTALLATION TYPES] Tipos encontrados (tenantId real):', tipos.length);
        }
      } catch (error) {
        console.log('❌ [INSTALLATION TYPES] Error buscando tenant:', error.message);
      }
    }
    
    return tipos
  }

  return installationTypesCollection.find(filterMongo).sort({ nombre: 1 }).toArray()
}

async function getInstallationTypeById(id, tenantId = null) {
  if (!ObjectId.isValid(id)) {
    return null
  }
  
  const query = { _id: new ObjectId(id), eliminado: { $ne: true } }
  if (tenantId) {
    query.tenantId = tenantId
  }
  
  return installationTypesCollection.findOne(query)
}

async function getInstallationTypeByName(nombre, tenantId = null) {
  const query = { 
    nombre: { $regex: `^${nombre}$`, $options: "i" }, 
    eliminado: { $ne: true } 
  }
  
  if (tenantId) {
    query.tenantId = tenantId
  }
  
  return installationTypesCollection.findOne(query)
}

const addInstallationType = async (tipo, adminUser) => {
  try {
    // Verificar que se proporcione tenantId
    if (!tipo.tenantId) {
      throw new Error("Se requiere tenantId para crear el tipo de instalación")
    }

    // Verificar que el usuario tenga permisos para este tenant
    if (adminUser.role !== "super_admin" && adminUser.tenantId !== tipo.tenantId) {
      throw new Error("No tienes permisos para crear tipos de instalación en este tenant")
    }

    // Verificar si ya existe un tipo con el mismo nombre en el mismo tenant
    const existingType = await getInstallationTypeByName(tipo.nombre, tipo.tenantId)
    if (existingType) {
      throw new Error("Ya existe un tipo de instalación con ese nombre")
    }

    const typeToInsert = {
      ...tipo,
      fechaCreacion: new Date(),
      activo: tipo.activo !== undefined ? tipo.activo : true
    }

    const result = await installationTypesCollection.insertOne(typeToInsert)
    typeToInsert._id = result.insertedId
    return typeToInsert
  } catch (error) {
    console.error("Error en addInstallationType:", error)
    throw error
  }
}

const updateInstallationType = async (id, tipo, tenantId = null, adminUser = null) => {
  try {
    if (!ObjectId.isValid(id)) {
      throw new Error("El ID del tipo de instalación no es válido")
    }

    const query = { _id: new ObjectId(id), eliminado: { $ne: true } }
    if (tenantId) {
      query.tenantId = tenantId
    }

    // Verificar que el usuario tenga permisos para este tenant
    if (adminUser && adminUser.role !== "super_admin" && adminUser.tenantId !== tenantId) {
      throw new Error("No tienes permisos para actualizar tipos de instalación en este tenant")
    }

    // Si se está actualizando el nombre, verificar que no exista otro tipo con ese nombre en el mismo tenant
    if (tipo.nombre) {
      const existingType = await getInstallationTypeByName(tipo.nombre, tenantId)
      if (existingType && existingType._id.toString() !== id) {
        throw new Error("Ya existe un tipo de instalación con ese nombre")
      }
    }

    const updateData = {
      ...tipo,
      fechaActualizacion: new Date(),
    }

    const result = await installationTypesCollection.updateOne(query, { $set: updateData })
    
    if (result.matchedCount === 0) {
      throw new Error("Tipo de instalación no encontrado")
    }
    
    return result
  } catch (error) {
    console.error("Error en updateInstallationType:", error)
    throw error
  }
}

const deleteInstallationType = async (id, tenantId = null, adminUser = null) => {
  try {
    if (!ObjectId.isValid(id)) {
      throw new Error("El ID del tipo de instalación no es válido")
    }

    const query = { _id: new ObjectId(id) }
    if (tenantId) {
      query.tenantId = tenantId
    }

    // Verificar que el usuario tenga permisos para este tenant
    if (adminUser && adminUser.role !== "super_admin" && adminUser.tenantId !== tenantId) {
      throw new Error("No tienes permisos para eliminar tipos de instalación en este tenant")
    }
    
    // Eliminación lógica
    const result = await installationTypesCollection.updateOne(query, { $set: { eliminado: true, fechaEliminacion: new Date() } })
    
    if (result.matchedCount === 0) {
      throw new Error("Tipo de instalación no encontrado")
    }
    
    return result
  } catch (error) {
    console.error("Error en deleteInstallationType:", error)
    throw error
  }
}

export { 
  getInstallationTypes, 
  getInstallationTypeById, 
  getInstallationTypeByName, 
  addInstallationType, 
  updateInstallationType, 
  deleteInstallationType 
}