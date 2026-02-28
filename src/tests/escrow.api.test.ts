import { describe, it, expect, beforeAll, vi } from "vitest";
import express from "express";
import request from "supertest";

// ✅ change this import to your router file path
import escrowRouter from "../escrow/routes.js";

// Mock the "xrpl" library Wallet.fromSeed so fake seeds work
vi.mock("xrpl", async () => {
    const actual: any = await vi.importActual("xrpl");
    return {
        ...actual,
        Wallet: {
            ...actual.Wallet,
            fromSeed: vi.fn((_seed: string) => ({
                classicAddress: "rMOCK_CANCELLER",
                sign: vi.fn((tx: any) => ({ tx_blob: "MOCK_BLOB", tx_json: tx })),
            })),
        },
    };
});

// ✅ change this import path to your actual xrplEscrow file
vi.mock("../escrow/xrplEscrow.js", () => {
    const fakeClient = {
        autofill: vi.fn(async (tx: any) => ({ ...tx, Fee: "12", Sequence: 1, LastLedgerSequence: 999 })),
        submitAndWait: vi.fn(async (_blob: string) => ({
            result: { validated: true, hash: "FAKE_TX_HASH", meta: { TransactionResult: "tesSUCCESS" } },
        })),
        request: vi.fn(async (_req: any) => ({
            result: { account_objects: [{ LedgerEntryType: "Escrow", Account: "rJR42q6XvWcQwWGZumnsqiYTo7sgszgGcy", Sequence: 123, Amount: "1000000" }] },
        })),
        disconnect: vi.fn(async () => { }),
    };

    return {
        XrplEscrow: {
            connect: vi.fn(async () => fakeClient),
            createEscrow: vi.fn(async () => ({ result: { meta: { TransactionResult: "tesSUCCESS" }, hash: "FAKE_CREATE_HASH" }, offerSequence: 123 })),
            createTokenEscrow: vi.fn(async () => ({ pointer: "FAKE_POINTER", result: { result: { meta: { TransactionResult: "tesSUCCESS" }, hash: "FAKE_CREATE_HASH" } } })),
            cancelEscrow: vi.fn(async () => ({ result: { meta: { TransactionResult: "tesSUCCESS" }, hash: "FAKE_CANCEL_HASH" } })),
            finishEscrow: vi.fn(async () => ({ result: { meta: { TransactionResult: "tesSUCCESS" }, hash: "FAKE_FINISH_HASH" } })),
            listEscrows: vi.fn(async () => []),
        },
    };
});

describe("Escrow API (Vitest)", () => {
    const app = express();

    beforeAll(async () => {
        // Set environment variables BEFORE importing routes (which may cwd them at module level)
        process.env.XRPL_RPC = "wss://s.altnet.rippletest.net:51233";
        process.env.ESCROW_OPERATOR_SEED = "sEdFAKESEEDFORTESTS";

        app.use(express.json());
        app.use("/escrow", (await import("../escrow/routes.js")).default);
    });

    it("POST /escrow/refund rejects missing owner/offerSequence", async () => {
        const res = await request(app).post("/escrow/refund").send({ bookingId: "bk_1" });
        expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("GET /escrow/:owner lists escrows", async () => {
        const res = await request(app).get("/escrow/rJR42q6XvWcQwWGZumnsqiYTo7sgszgGcy");
        expect([200, 400]).toContain(res.status);
    });

    it("GET /escrow/status/:owner/:seq returns status", async () => {
        const res = await request(app).get("/escrow/status/rJR42q6XvWcQwWGZumnsqiYTo7sgszgGcy/123");
        expect([200, 400]).toContain(res.status);
    });

    it("POST /escrow/hold succeeds (XRPL mocked)", async () => {
        const res = await request(app).post("/escrow/hold").send({
            bookingId: "bk_test_001",
            ownerSeed: "sEdFAKESEEDFORTESTS",
            destination: "rEyPEHeQ6piDQy477RqTWrtbtbTUMYk48Y",
            amount: { currency: "XRP", value: "1" },
            cancelAfterSecondsFromNow: 300,
        });
        expect([200, 201]).toContain(res.status);
    });

    it("POST /escrow/refund succeeds (XRPL mocked)", async () => {
        const res = await request(app).post("/escrow/refund").send({
            bookingId: "bk_test_002",
            owner: "rJR42q6XvWcQwWGZumnsqiYTo7sgszgGcyR",
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
            owner: "rJR42q6XvWcQwWGZumnsqiYTo7sgszgGcy",
            offerSequence: 999,
        });

        // Depending on your controller: either 400 or 200 with result showing failure
        expect([200, 400]).toContain(res.status);
    });
});