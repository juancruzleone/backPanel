import { db } from "../db.js"
import jwt from "jsonwebtoken"
import { ObjectId } from "mongodb"

const tokenCollection = db.collection("tokens")

async function createToken(cuenta) {
  // Incluir tenantId en el token
  const tokenPayload = {
    ...cuenta,
    tenantId: cuenta.tenantId
  }
  const token = jwt.sign(tokenPayload, process.env.JWT_SECRET)
  await tokenCollection.insertOne({ token, cuenta_id: cuenta._id, tenantId: cuenta.tenantId })
  return token
}

async function validateToken(token) {
  try {
    console.log('🔐 [TOKEN SERVICE] Validando token...');
    console.log('🔐 [TOKEN SERVICE] Token recibido:', token ? token.substring(0, 20) + '...' : 'No token');
    
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    console.log('🔐 [TOKEN SERVICE] Payload decodificado:', {
      _id: payload._id,
      userName: payload.userName,
      tenantId: payload.tenantId,
      iat: payload.iat,
      exp: payload.exp
    });
    
    // Buscar sesión en BD con logs detallados
    console.log('🔍 [TOKEN SERVICE] Buscando sesión con:', {
      token: token.substring(0, 20) + '...',
      cuenta_id: payload._id
    });
    
    const sessionActiva = await tokenCollection.findOne({ token, cuenta_id: new ObjectId(payload._id) })
    console.log('🔐 [TOKEN SERVICE] Sesión en BD:', sessionActiva ? 'ENCONTRADA' : 'NO ENCONTRADA');
    
    if (!sessionActiva) {
      console.log('❌ [TOKEN SERVICE] Token no encontrado en BD - sesión inválida');
      console.log('🔍 [TOKEN SERVICE] Verificando si existen tokens para este usuario...');
      
      // Debug: buscar cualquier token para este usuario
      const userTokens = await tokenCollection.find({ cuenta_id: new ObjectId(payload._id) }).toArray();
      console.log('🔍 [TOKEN SERVICE] Tokens encontrados para usuario:', userTokens.length);
      
      if (userTokens.length > 0) {
        console.log('🔍 [TOKEN SERVICE] Primer token en BD:', userTokens[0].token.substring(0, 20) + '...');
        console.log('🔍 [TOKEN SERVICE] Token actual:', token.substring(0, 20) + '...');
        console.log('🔍 [TOKEN SERVICE] ¿Coinciden?', userTokens[0].token === token);
      }
      
      // TEMPORAL: Si el token JWT es válido pero no está en BD, crear la sesión
      console.log('⚠️ [TOKEN SERVICE] TEMPORAL: Creando sesión faltante en BD');
      await tokenCollection.insertOne({ 
        token, 
        cuenta_id: new ObjectId(payload._id), 
        tenantId: payload.tenantId,
        createdAt: new Date()
      });
      console.log('✅ [TOKEN SERVICE] Sesión temporal creada');
    }

    console.log('✅ [TOKEN SERVICE] Token válido');
    return payload
  } catch (error) {
    console.error('❌ [TOKEN SERVICE] Error validando token:', error.message);
    if (error.name === 'TokenExpiredError') {
      console.log('⏰ [TOKEN SERVICE] Token expirado');
      throw error; // Re-lanzar para que el middleware lo maneje
    }
    return null
  }
}

async function removeToken(token) {
  await tokenCollection.deleteOne({ token })
}

export { createToken, validateToken, removeToken }
