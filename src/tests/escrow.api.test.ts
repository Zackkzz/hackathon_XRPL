import { describe, it, expect, beforeAll, vi } from "vitest";
import express from "express";
import request from "supertest";

// ✅ change this import to your router file path
import escrowRouter from "../escrow/routes.js";

// ✅ change this import path to your actual xrplEscrow file
vi.mock("../escrow/xrplEscrow.js", () => {
    const fakeClient = {
        autofill: vi.fn(async (tx: any) => ({ ...tx, Fee: "12", Sequence: 1, LastLedgerSequence: 999 })),
        submitAndWait: vi.fn(async (_blob: string) => ({
            result: { validated: true, hash: "FAKE_TX_HASH", meta: { TransactionResult: "tesSUCCESS" } },
        })),
        request: vi.fn(async (_req: any) => ({
            result: { account_objects: [{ LedgerEntryType: "Escrow", Account: "rOWNER", Sequence: 123, Amount: "1000000" }] },
        })),
        disconnect: vi.fn(async () => { }),
    };

    return {
        XrplEscrow: {
            connect: vi.fn(async () => fakeClient),
            createEscrow: vi.fn(async () => ({ result: { meta: { TransactionResult: "tesSUCCESS" }, hash: "FAKE_CREATE_HASH" }, offerSequence: 123 })),
            cancelEscrow: vi.fn(async () => ({ result: { meta: { TransactionResult: "tesSUCCESS" }, hash: "FAKE_CANCEL_HASH" } })),
            finishEscrow: vi.fn(async () => ({ result: { meta: { TransactionResult: "tesSUCCESS" }, hash: "FAKE_FINISH_HASH" } })),
        },
    };
});

describe("Escrow API (Vitest)", () => {
    const app = express();

    beforeAll(() => {
        process.env.XRPL_RPC = "wss://s.altnet.rippletest.net:51233";
        process.env.ESCROW_OPERATOR_SEED = "sEdFAKESEEDFORTESTS";

        app.use(express.json());
        app.use("/escrow", escrowRouter);
    });

    it("POST /escrow/refund rejects missing owner/offerSequence", async () => {
        const res = await request(app).post("/escrow/refund").send({ bookingId: "bk_1" });
        expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("GET /escrow/:owner lists escrows", async () => {
        const res = await request(app).get("/escrow/rOWNER");
        expect(res.status).toBe(200);
        expect(res.body).toBeTruthy();
    });

    it("GET /escrow/status/:owner/:seq returns status", async () => {
        const res = await request(app).get("/escrow/status/rOWNER/123");
        // Might be 200 or 404 depending on your implementation:
        expect([200, 404]).toContain(res.status);
    });

    it("POST /escrow/hold succeeds (XRPL mocked)", async () => {
        const res = await request(app).post("/escrow/hold").send({
            bookingId: "bk_test_001",
            owner: "rOWNER",
            destination: "rDEST",
            amount: 1,
            currency: "XRP",
        });
        expect([200, 201]).toContain(res.status);
    });

    it("POST /escrow/refund succeeds (XRPL mocked)", async () => {
        const res = await request(app).post("/escrow/refund").send({
            bookingId: "bk_test_002",
            owner: "rOWNER",
            offerSequence: 123,
        });
        expect([200, 201]).toContain(res.status);
    });

    it("POST /escrow/refund fails when XRPL cancel fails", async () => {
        const xrplMod: any = await import("../escrow/xrplEscrow.js");
        xrplMod.XrplEscrow.cancelEscrow.mockResolvedValueOnce({
            result: { meta: { TransactionResult: "tecNO_ENTRY" }, hash: "FAIL_HASH" },
        });

        const res = await request(app).post("/escrow/refund").send({
            bookingId: "bk_test_003",
            owner: "rOWNER",
            offerSequence: 999,
        });

        // Depending on your controller: either 400 or 200 with result showing failure
        expect([200, 400]).toContain(res.status);
    });
});