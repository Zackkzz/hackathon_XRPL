import { Request, Response } from "express";
import * as xrpl from "xrpl";
import { XrplEscrow, TokenAmount } from "./xrplEscrow.js";

//const XRPL_RPC = process.env.XRPL_RPC!;
//const OPERATOR_SEED = process.env.ESCROW_OPERATOR_SEED!;

function required(v: any, name: string) {
    if (v === undefined || v === null || v === "") throw new Error(`Missing ${name}`);
}

export class EscrowController {
    static async holdDeposit(req: Request, res: Response) {
        const XRPL_RPC = process.env.XRPL_RPC!;
        const OPERATOR_SEED = process.env.ESCROW_OPERATOR_SEED!;
        console.log("Controller XRPL_RPC:", process.env.XRPL_RPC);
        console.log("HIT HOLD");
        try {
            /**
             * Body example (IOU):
             * {
             *   "ownerSeed": "s....",                     // payer wallet seed
             *   "destination": "r....",                   // organizer
             *   "amount": { "currency":"USD","issuer":"rISSUER","value":"10" },
             *   "cancelAfterSecondsFromNow": 300,         // must be set for token escrow
             *   "finishAfterSecondsFromNow": 0,
             *   "bookingId": "BK123"
             * }
             *
             * Body example (MPT):
             * {
             *   "ownerSeed":"s....",
             *   "destination":"r....",
             *   "amount": { "mpt_issuance_id":"05EE...F5AA", "value":"10" },
             *   "cancelAfterSecondsFromNow": 300,
             *   "bookingId":"BK123"
             * }
             */
            const { ownerSeed, destination, amount, cancelAfterSecondsFromNow, finishAfterSecondsFromNow, bookingId } =
                req.body as {
                    ownerSeed: string;
                    destination: string;
                    amount: any;
                    cancelAfterSecondsFromNow: number;
                    finishAfterSecondsFromNow?: number;
                    bookingId?: string;
                };

            required(ownerSeed, "ownerSeed");
            required(destination, "destination");
            required(amount, "amount");
            required(cancelAfterSecondsFromNow, "cancelAfterSecondsFromNow");

            const client = await XrplEscrow.connect(XRPL_RPC);
            try {
                const ownerWallet = xrpl.Wallet.fromSeed(ownerSeed);

                const RIPPLE_EPOCH_OFFSET = 946684800; // seconds between 1970 and 2000
                const nowRipple = Math.floor(Date.now() / 1000) - RIPPLE_EPOCH_OFFSET;
                const finishAfter =
                    finishAfterSecondsFromNow && Number(finishAfterSecondsFromNow) > 0
                        ? nowRipple + Number(finishAfterSecondsFromNow)
                        : undefined;
                const cancelAfter = nowRipple + Number(cancelAfterSecondsFromNow);

                const { pointer, result } = await XrplEscrow.createTokenEscrow({
                    client,
                    ownerWallet,
                    destination,
                    amount,
                    finishAfter,
                    cancelAfter,
                    memoJson: { bookingId, type: "deposit" },
                });

                res.status(201).json({ pointer, result: result.result });
            } finally {
                await client.disconnect();
            }
        } catch (e: any) {
            res.status(400).json({ error: e.message });
        }
    }

    static async releaseDeposit(req: Request, res: Response) {
        const XRPL_RPC = process.env.XRPL_RPC!;
        const OPERATOR_SEED = process.env.ESCROW_OPERATOR_SEED!;
        try {
            const ownerStr = String(req.body.owner ?? "").trim();
            const offerSeqNum = Number(req.body.offerSequence);

            if (!xrpl.isValidClassicAddress(ownerStr)) throw new Error("owner must be an XRPL r... address");
            if (!Number.isInteger(offerSeqNum)) throw new Error("offerSequence must be an integer");

             // use the already‑asserted constant so the parameter is a string
             const client = await XrplEscrow.connect(XRPL_RPC);
            try {
                required(OPERATOR_SEED, "ESCROW_OPERATOR_SEED");
                const finisher = xrpl.Wallet.fromSeed(OPERATOR_SEED);

                // Build the tx explicitly and log it
                const tx: xrpl.EscrowFinish = {
                    TransactionType: "EscrowFinish",
                    Account: finisher.classicAddress, // MUST be string
                    Owner: ownerStr,                  // MUST be string
                    OfferSequence: offerSeqNum,        // MUST be number
                };

                console.log("EscrowFinish TX =", JSON.stringify(tx));

                const prepared = await client.autofill(tx);
                const signed = finisher.sign(prepared);
                const result = await client.submitAndWait(signed.tx_blob);

                res.json({ result: result.result });
            } finally {
                await client.disconnect();
            }
        } catch (e: any) {
            res.status(400).json({ error: e.message });
        }
    }

    static async refundDeposit(req: Request, res: Response) {
        const XRPL_RPC = process.env.XRPL_RPC!;
        const OPERATOR_SEED = process.env.ESCROW_OPERATOR_SEED!;
        console.log("HIT REFUND");
        try {
            /**
             * Body:
             * { "owner":"r....", "offerSequence":123, "operatorSeed":"(optional)" }
             *
             * NOTE: EscrowCancel only works AFTER CancelAfter. :contentReference[oaicite:6]{index=6}
             */
            const { owner, offerSequence, operatorSeed } = req.body as {
                owner: string;
                offerSequence: number;
                operatorSeed?: string;
            };

            required(owner, "owner");
            required(offerSequence, "offerSequence");
            console.log("process.env.OPERATOR_SEED:", process.env.ESCROW_OPERATOR_SEED);

            const client = await XrplEscrow.connect(XRPL_RPC);
            console.log("operatorSeed:", operatorSeed, typeof operatorSeed);
            console.log("OPERATOR_SEED:", OPERATOR_SEED, typeof OPERATOR_SEED);
            try {
                const seed = operatorSeed ?? OPERATOR_SEED;
                required(seed, "operatorSeed or OPERATOR_SEED");
                const canceller = xrpl.Wallet.fromSeed(seed);
                console.log("Refund owner:", owner, "offerSequence:", offerSequence, "operatorSeedProvided:", Boolean(operatorSeed));
                console.log("Canceller classic address:", canceller.classicAddress);
                const result = await XrplEscrow.cancelEscrow({
                    client,
                    cancellerWallet: canceller,
                    owner,
                    offerSequence: Number(offerSequence),
                });
                res.json({ result: result.result });
            } finally {
                await client.disconnect();
            }
        } catch (e: any) {
            res.status(400).json({ error: e.message });
        }
    }

    static async listOwnerEscrows(req: Request, res: Response) {
        const XRPL_RPC = process.env.XRPL_RPC!;
        const OPERATOR_SEED = process.env.ESCROW_OPERATOR_SEED!;
        try {
            const owner = String(req.params.owner ?? "").trim();
            required(owner, "owner");

            const client = await XrplEscrow.connect(XRPL_RPC);
            try {
                const escrows = await XrplEscrow.listEscrows({ client, ownerAccount: owner });
                res.json({ owner, escrows });
            } finally {
                await client.disconnect();
            }
        } catch (e: any) {
            res.status(400).json({ error: e.message });
        }
    }

    static async getEscrowStatus(req: Request, res: Response) {
        const XRPL_RPC = process.env.XRPL_RPC!;
        const OPERATOR_SEED = process.env.ESCROW_OPERATOR_SEED!;
        try {
            const owner = String(req.params.owner ?? "").trim();
            const offerSequence = Number(req.params.seq);

            required(owner, "owner");
            if (!xrpl.isValidClassicAddress(owner)) throw new Error("owner must be an XRPL r... address");
            if (!Number.isInteger(offerSequence)) throw new Error("seq must be an integer");

            const client = await XrplEscrow.connect(XRPL_RPC);
            try {
                try {
                    const node = await XrplEscrow.getEscrow({ client, owner, offerSequence });
                    // If we got a node back, escrow still exists
                    return res.json({
                        owner,
                        offerSequence,
                        status: "HELD",
                        escrow: node,
                    });
                } catch (err: any) {
                    // xrpl.js wraps rippled errors; handle "not found"
                    const msg = String(err?.data?.error || err?.message || "");
                    const isNotFound =
                        msg.includes("entryNotFound") ||
                        msg.includes("lgrNotFound") ||
                        msg.includes("Not found") ||
                        msg.includes("doesNotExist");

                    if (isNotFound) {
                        return res.json({
                            owner,
                            offerSequence,
                            status: "NOT_HELD", // finished OR cancelled
                        });
                    }
                    throw err;
                }
            } finally {
                await client.disconnect();
            }
        } catch (e: any) {
            res.status(400).json({ error: e.message });
        }
    }

}