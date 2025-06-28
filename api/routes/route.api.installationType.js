import { Router } from "express"
import * as controllers from "../controllers/controller.api.installationTypes.js"
import { validateInstallationType, validateInstallationTypePatch } from "../../middleware/installationType.validate.middleware.js"
import { isAdmin } from "../../middleware/auth.role.middleware.js"

const route = Router()

route.get("/tipos-instalacion", controllers.getInstallationTypes)
route.get("/tipos-instalacion/:id", controllers.getInstallationTypeById)
route.post("/tipos-instalacion", [validateInstallationType, isAdmin], controllers.addInstallationType)
route.put("/tipos-instalacion/:id", [validateInstallationType, isAdmin], controllers.updateInstallationType)
route.patch("/tipos-instalacion/:id", [validateInstallationTypePatch, isAdmin], controllers.updateInstallationType)
route.delete("/tipos-instalacion/:id", isAdmin, controllers.deleteInstallationType)

export default route