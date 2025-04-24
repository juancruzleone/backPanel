import { Router } from "express"
import * as controllers from "../controllers/controller.api.auth.js"
import { validateAccountRegistro, validateAccountLogin } from "../../middleware/auth.validate.middleware.js"
import { isAdmin } from "../../middleware/auth.role.middleware.js"

const route = Router()

route.post("/cuenta", [validateAccountRegistro], controllers.createAccount)
route.post("/cuenta/login", [validateAccountLogin], controllers.login)
route.delete("/cuenta", controllers.logout)
route.get("/cuentas", [isAdmin], controllers.getAllAccounts)
route.get("/cuentas/:id", [isAdmin], controllers.getAccountById)

export default route
