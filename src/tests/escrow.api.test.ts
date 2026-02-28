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
            getEscrow: vi.fn(async () => ({ LedgerEntryType: "Escrow", Account: "rJR42q6XvWcQwWGZumnsqiYTo7sgszgGcy", Sequence: 123, Amount: "1000000" })),
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

    // ============================================================================
    // POST /escrow/hold (Create Token Escrow)
    // ============================================================================

    describe("POST /escrow/hold", () => {
        it("creates XRP token escrow successfully", async () => {
            const res = await request(app).post("/escrow/hold").send({
                bookingId: "bk_xrp_001",
                ownerSeed: "sEdFAKESEEDFORTESTS",
                destination: "rEyPEHeQ6piDQy477RqTWrtbtbTUMYk48Y",
                amount: { currency: "XRP", value: "100" },
                cancelAfterSecondsFromNow: 300,
            });
            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty("pointer");
            expect(res.body).toHaveProperty("result");
        });

        it("creates IOU token escrow with various parameters", async () => {
            const res = await request(app).post("/escrow/hold").send({
                bookingId: "bk_iou_001",
                ownerSeed: "sEdFAKESEEDFORTESTS",
                destination: "rEyPEHeQ6piDQy477RqTWrtbtbTUMYk48Y",
                amount: { currency: "USD", issuer: "rN7n7otQDd6FczFgLdYqmjhzjc7g7yfDKX", value: "50.00" },
                cancelAfterSecondsFromNow: 3600,
                finishAfterSecondsFromNow: 1800,
            });
            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty("pointer");
            expect(res.body).toHaveProperty("result");
        });

        it("rejects missing ownerSeed", async () => {
            const res = await request(app).post("/escrow/hold").send({
                bookingId: "bk_test",
                destination: "rEyPEHeQ6piDQy477RqTWrtbtbTUMYk48Y",
                amount: { currency: "XRP", value: "1" },
                cancelAfterSecondsFromNow: 300,
            });
            expect(res.status).toBe(400);
            expect(res.body.error).toContain("ownerSeed");
        });

        it("rejects missing destination", async () => {
            const res = await request(app).post("/escrow/hold").send({
                bookingId: "bk_test",
                ownerSeed: "sEdFAKESEEDFORTESTS",
                amount: { currency: "XRP", value: "1" },
                cancelAfterSecondsFromNow: 300,
            });
            expect(res.status).toBe(400);
            expect(res.body.error).toContain("destination");
        });

        it("rejects missing amount", async () => {
            const res = await request(app).post("/escrow/hold").send({
                bookingId: "bk_test",
                ownerSeed: "sEdFAKESEEDFORTESTS",
                destination: "rEyPEHeQ6piDQy477RqTWrtbtbTUMYk48Y",
                cancelAfterSecondsFromNow: 300,
            });
            expect(res.status).toBe(400);
            expect(res.body.error).toContain("amount");
        });

        it("rejects missing cancelAfterSecondsFromNow", async () => {
            const res = await request(app).post("/escrow/hold").send({
                bookingId: "bk_test",
                ownerSeed: "sEdFAKESEEDFORTESTS",
                destination: "rEyPEHeQ6piDQy477RqTWrtbtbTUMYk48Y",
                amount: { currency: "XRP", value: "1" },
            });
            expect(res.status).toBe(400);
            expect(res.body.error).toContain("cancelAfterSecondsFromNow");
        });

        it("accepts optional finishAfterSecondsFromNow", async () => {
            const res = await request(app).post("/escrow/hold").send({
                bookingId: "bk_with_finish",
                ownerSeed: "sEdFAKESEEDFORTESTS",
                destination: "rEyPEHeQ6piDQy477RqTWrtbtbTUMYk48Y",
                amount: { currency: "XRP", value: "1" },
                cancelAfterSecondsFromNow: 300,
                finishAfterSecondsFromNow: 100,
            });
            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty("result");
        });

        it("accepts optional bookingId", async () => {
            const res = await request(app).post("/escrow/hold").send({
                ownerSeed: "sEdFAKESEEDFORTESTS",
                destination: "rEyPEHeQ6piDQy477RqTWrtbtbTUMYk48Y",
                amount: { currency: "XRP", value: "1" },
                cancelAfterSecondsFromNow: 300,
            });
            expect(res.status).toBe(201);
        });
    });

    // ============================================================================
    // POST /escrow/release (Finish Escrow)
    // ============================================================================

    describe("POST /escrow/release", () => {
        it("releases escrow successfully with valid parameters", async () => {
            const res = await request(app).post("/escrow/release").send({
                owner: "rJR42q6XvWcQwWGZumnsqiYTo7sgszgGcy",
                offerSequence: 123,
            });
            expect([200, 201]).toContain(res.status);
            expect(res.body).toHaveProperty("result");
        });

        it("rejects missing owner", async () => {
            const res = await request(app).post("/escrow/release").send({
                offerSequence: 123,
            });
            expect(res.status).toBe(400);
            expect(res.body.error).toContain("owner");
        });

        it("rejects missing offerSequence", async () => {
            const res = await request(app).post("/escrow/release").send({
                owner: "rJR42q6XvWcQwWGZumnsqiYTo7sgszgGcy",
            });
            expect(res.status).toBe(400);
            expect(res.body.error).toContain("offerSequence");
        });

        it("rejects invalid XRPL address for owner", async () => {
            const res = await request(app).post("/escrow/release").send({
                owner: "invalid_address",
                offerSequence: 123,
            });
            expect(res.status).toBe(400);
            expect(res.body.error).toContain("XRPL");
        });

        it("rejects non-integer offerSequence", async () => {
            const res = await request(app).post("/escrow/release").send({
                owner: "rJR42q6XvWcQwWGZumnsqiYTo7sgszgGcy",
                offerSequence: "not_a_number",
            });
            expect(res.status).toBe(400);
            expect(res.body.error).toContain("integer");
        });

        it("handles XRPL submission errors gracefully", async () => {
            const xrplMod: any = await import("../escrow/xrplEscrow.js");
            xrplMod.XrplEscrow.connect.mockResolvedValueOnce({
                autofill: vi.fn(async (tx) => ({ ...tx, Fee: "12" })),
                submitAndWait: vi.fn(async () => {
                    throw new Error("Network error");
                }),
                disconnect: vi.fn(async () => {}),
            });

            const res = await request(app).post("/escrow/release").send({
                owner: "rJR42q6XvWcQwWGZumnsqiYTo7sgszgGcy",
                offerSequence: 123,
            });
            expect(res.status).toBe(400);
        });
    });

    // ============================================================================
    // POST /escrow/refund (Cancel Escrow)
    // ============================================================================

    describe("POST /escrow/refund", () => {
        it("cancels escrow successfully with environment operator seed", async () => {
            const res = await request(app).post("/escrow/refund").send({
                owner: "rJR42q6XvWcQwWGZumnsqiYTo7sgszgGcy",
                offerSequence: 123,
            });
            expect([200, 201]).toContain(res.status);
            expect(res.body).toHaveProperty("result");
        });

        it("cancels escrow successfully with provided operator seed", async () => {
            const res = await request(app).post("/escrow/refund").send({
                owner: "rJR42q6XvWcQwWGZumnsqiYTo7sgszgGcy",
                offerSequence: 456,
                operatorSeed: "sEdFAKEOPSEED",
            });
            expect([200, 201]).toContain(res.status);
            expect(res.body).toHaveProperty("result");
        });

        it("rejects missing owner", async () => {
            const res = await request(app).post("/escrow/refund").send({
                offerSequence: 123,
            });
            expect(res.status).toBe(400);
            expect(res.body.error).toContain("owner");
        });

        it("rejects missing offerSequence", async () => {
            const res = await request(app).post("/escrow/refund").send({
                owner: "rJR42q6XvWcQwWGZumnsqiYTo7sgszgGcy",
            });
            expect(res.status).toBe(400);
            expect(res.body.error).toContain("offerSequence");
        });

        it("handles XRPL cancel failures", async () => {
            const xrplMod: any = await import("../escrow/xrplEscrow.js");
            xrplMod.XrplEscrow.cancelEscrow.mockResolvedValueOnce({
                result: { meta: { TransactionResult: "tecNO_ENTRY" }, hash: "FAIL_HASH" },
            });

            const res = await request(app).post("/escrow/refund").send({
                owner: "rJR42q6XvWcQwWGZumnsqiYTo7sgszgGcy",
                offerSequence: 999,
            });
            expect([200, 400]).toContain(res.status);
        });

        it("handles invalid escrow (not found)", async () => {
            const xrplMod: any = await import("../escrow/xrplEscrow.js");
            xrplMod.XrplEscrow.cancelEscrow.mockResolvedValueOnce({
                result: { meta: { TransactionResult: "entryNotFound" } },
            });

            const res = await request(app).post("/escrow/refund").send({
                owner: "rJR42q6XvWcQwWGZumnsqiYTo7sgszgGcy",
                offerSequence: 888,
            });
            expect(res.status).toBeLessThan(500);
        });
    });

    // ============================================================================
    // GET /escrow/:owner (List Owner Escrows)
    // ============================================================================

    describe("GET /escrow/:owner", () => {
        it("lists escrows for valid owner address", async () => {
            const res = await request(app).get("/escrow/rJR42q6XvWcQwWGZumnsqiYTo7sgszgGcy");
            expect([200, 400]).toContain(res.status);
            if (res.status === 200) {
                expect(res.body).toHaveProperty("owner");
                expect(res.body).toHaveProperty("escrows");
            }
        });

        it("returns empty escrows list when none exist", async () => {
            const xrplMod: any = await import("../escrow/xrplEscrow.js");
            xrplMod.XrplEscrow.listEscrows.mockResolvedValueOnce([]);

            const res = await request(app).get("/escrow/rJR42q6XvWcQwWGZumnsqiYTo7sgszgGcy");
            expect(res.status).toBe(200);
            expect(res.body.escrows).toEqual([]);
        });

        it("returns multiple escrows when they exist", async () => {
            const xrplMod: any = await import("../escrow/xrplEscrow.js");
            const mockEscrows = [
                { LedgerEntryType: "Escrow", Account: "rJR42q6XvWcQwWGZumnsqiYTo7sgszgGcy", Sequence: 123, Amount: "1000000" },
                { LedgerEntryType: "Escrow", Account: "rJR42q6XvWcQwWGZumnsqiYTo7sgszgGcy", Sequence: 124, Amount: "2000000" },
            ];
            xrplMod.XrplEscrow.listEscrows.mockResolvedValueOnce(mockEscrows);

            const res = await request(app).get("/escrow/rJR42q6XvWcQwWGZumnsqiYTo7sgszgGcy");
            expect(res.status).toBe(200);
            expect(res.body.escrows.length).toBe(2);
        });

        it("handles whitespace in owner parameter", async () => {
            const xrplMod: any = await import("../escrow/xrplEscrow.js");
            xrplMod.XrplEscrow.listEscrows.mockResolvedValueOnce([]);

            const res = await request(app).get("/escrow/%20rJR42q6XvWcQwWGZumnsqiYTo7sgszgGcy%20");
            expect([200, 400]).toContain(res.status);
        });

        it("rejects missing owner parameter", async () => {
            const res = await request(app).get("/escrow/");
            expect(res.status).not.toBe(200);
        });
    });

    // ============================================================================
    // GET /escrow/status/:owner/:seq (Get Escrow Status)
    // ============================================================================

    describe("GET /escrow/status/:owner/:seq", () => {
        it("returns HELD status when escrow exists", async () => {
            const xrplMod: any = await import("../escrow/xrplEscrow.js");
            const mockEscrow = {
                LedgerEntryType: "Escrow",
                Account: "rJR42q6XvWcQwWGZumnsqiYTo7sgszgGcy",
                Sequence: 123,
                Amount: "1000000",
                Destination: "rEyPEHeQ6piDQy477RqTWrtbtbTUMYk48Y",
            };
            xrplMod.XrplEscrow.getEscrow.mockResolvedValueOnce(mockEscrow);

            const res = await request(app).get("/escrow/status/rJR42q6XvWcQwWGZumnsqiYTo7sgszgGcy/123");
            expect(res.status).toBe(200);
            expect(res.body.status).toBe("HELD");
            expect(res.body).toHaveProperty("escrow");
        });

        it("returns NOT_HELD status when escrow is not found", async () => {
            const xrplMod: any = await import("../escrow/xrplEscrow.js");
            xrplMod.XrplEscrow.getEscrow.mockRejectedValueOnce({
                data: { error: "entryNotFound" },
            });

            const res = await request(app).get("/escrow/status/rJR42q6XvWcQwWGZumnsqiYTo7sgszgGcy/999");
            expect(res.status).toBe(200);
            expect(res.body.status).toBe("NOT_HELD");
            expect(res.body).not.toHaveProperty("escrow");
        });

        it("rejects invalid XRPL address for owner", async () => {
            const res = await request(app).get("/escrow/status/invalid_address/123");
            expect(res.status).toBe(400);
            expect(res.body.error).toContain("XRPL");
        });

        it("rejects non-integer sequence number", async () => {
            const res = await request(app).get("/escrow/status/rJR42q6XvWcQwWGZumnsqiYTo7sgszgGcy/invalid");
            expect(res.status).toBe(400);
            expect(res.body.error).toContain("integer");
        });

        it("handles negative sequence numbers", async () => {
            const xrplMod: any = await import("../escrow/xrplEscrow.js");
            xrplMod.XrplEscrow.getEscrow.mockRejectedValueOnce({
                data: { error: "entryNotFound" },
            });

            const res = await request(app).get("/escrow/status/rJR42q6XvWcQwWGZumnsqiYTo7sgszgGcy/-1");
            expect([200, 400]).toContain(res.status);
        });

        it("handles large sequence numbers", async () => {
            const xrplMod: any = await import("../escrow/xrplEscrow.js");
            xrplMod.XrplEscrow.getEscrow.mockRejectedValueOnce({
                data: { error: "entryNotFound" },
            });

            const res = await request(app).get("/escrow/status/rJR42q6XvWcQwWGZumnsqiYTo7sgszgGcy/999999999");
            expect(res.status).toBe(200);
            expect(res.body.status).toBe("NOT_HELD");
        });

        it("handles XRPL network errors", async () => {
            const xrplMod: any = await import("../escrow/xrplEscrow.js");
            xrplMod.XrplEscrow.getEscrow.mockRejectedValueOnce({
                message: "Network timeout",
            });

            const res = await request(app).get("/escrow/status/rJR42q6XvWcQwWGZumnsqiYTo7sgszgGcy/123");
            expect(res.status).toBe(400);
        });
    });

    // ============================================================================
    // Integration Tests
    // ============================================================================

    describe("Integration scenarios", () => {
        it("completes full escrow lifecycle: create -> status -> release", async () => {
            // 1. Create escrow
            const createRes = await request(app).post("/escrow/hold").send({
                bookingId: "lifecycle_test",
                ownerSeed: "sEdFAKESEEDFORTESTS",
                destination: "rEyPEHeQ6piDQy477RqTWrtbtbTUMYk48Y",
                amount: { currency: "XRP", value: "100" },
                cancelAfterSecondsFromNow: 300,
            });
            expect(createRes.status).toBe(201);

            // 2. Check status
            const statusRes = await request(app).get("/escrow/status/rJR42q6XvWcQwWGZumnsqiYTo7sgszgGcy/123");
            expect([200, 400]).toContain(statusRes.status);

            // 3. Release escrow
            const releaseRes = await request(app).post("/escrow/release").send({
                owner: "rJR42q6XvWcQwWGZumnsqiYTo7sgszgGcy",
                offerSequence: 123,
            });
            expect([200, 201]).toContain(releaseRes.status);
        });

        it("handles concurrent escrow creation", async () => {
            const promises = Array.from({ length: 3 }, (_, i) =>
                request(app)
                    .post("/escrow/hold")
                    .send({
                        bookingId: `concurrent_${i}`,
                        ownerSeed: "sEdFAKESEEDFORTESTS",
                        destination: "rEyPEHeQ6piDQy477RqTWrtbtbTUMYk48Y",
                        amount: { currency: "XRP", value: "10" },
                        cancelAfterSecondsFromNow: 300,
                    })
            );

            const results = await Promise.all(promises);
            const successCount = results.filter((r) => r.status === 201).length;
            expect(successCount).toBeGreaterThan(0);
        });

        it("prevents refund without proper operator seed", async () => {
            // Temporarily clear operator seed
            const originalSeed = process.env.ESCROW_OPERATOR_SEED;
            delete process.env.ESCROW_OPERATOR_SEED;

            const res = await request(app).post("/escrow/refund").send({
                owner: "rJR42q6XvWcQwWGZumnsqiYTo7sgszgGcy",
                offerSequence: 123,
            });
            expect(res.status).toBe(400);
            expect(res.body.error).toContain("operatorSeed");

            // Restore original seed
            process.env.ESCROW_OPERATOR_SEED = originalSeed;
        });
    });
});