import { Router } from "express";
import { EscrowController } from "./controller.js";

const router = Router();

router.post("/hold", EscrowController.holdDeposit);       // EscrowCreate
router.post("/release", EscrowController.releaseDeposit); // EscrowFinish
router.post("/refund", EscrowController.refundDeposit);   // EscrowCancel
router.get("/:owner", EscrowController.listOwnerEscrows);
router.get("/status/:owner/:seq", EscrowController.getEscrowStatus);

export default router;