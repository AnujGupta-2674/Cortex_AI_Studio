import { Router } from "express";
import { runAgent, getAvailableAgents } from "../controllers/agent.controller.js";

const router = Router();

/* -------------------------------------------------------------------------- */
/*                                Agent Routes                                */
/* -------------------------------------------------------------------------- */

// Execute the agent workflow (supports '/', '/run', and '/query')
router.post("/", runAgent);
router.post("/run", runAgent);
router.post("/query", runAgent);

// Get list and details of all available agents
router.get("/agents", getAvailableAgents);
router.get("/list", getAvailableAgents);

export default router;
