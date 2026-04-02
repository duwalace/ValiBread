import express from "express";
import rfidRoutes from "./rfidRoutes.js"; 
import estoqueRoutes from "./estoqueRoutes.js"; 
import authRoutes from "./authRoutes.js";

const router = express.Router();

router.use('/estoque', estoqueRoutes);
router.use('/rfid', rfidRoutes); 
router.use('/auth', authRoutes);

export default router;