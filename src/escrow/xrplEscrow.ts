import * as xrpl from "xrpl";

export type IOUAmount = {
    currency: string;  // e.g. "USD" or 160-bit hex currency code
    issuer: string;    // issuer address
    value: string;     // decimal string
};

export type MPTAmount = {
    mpt_issuance_id: string; // 192-bit issuance id (hex string)
    value: string;           // decimal string
};

export type TokenAmount = IOUAmount | MPTAmount;
export type AmountLike = string | TokenAmount;

export type EscrowPointer = {
    owner: string;          // escrow owner (the Account that created EscrowCreate)
    offerSequence: number;  // sequence number from EscrowCreate tx
};

export function isMPTAmount(a: TokenAmount): a is MPTAmount {
    return (a as any).mpt_issuance_id !== undefined;
}

export class XrplEscrow {
    static async connect(rpcUrl: string) {
        const finalUrl = (rpcUrl ?? process.env.XRPL_RPC ?? "").trim();
        console.log("XRPL Client rpcUrl =", JSON.stringify(finalUrl));

        if (!finalUrl.startsWith("ws")) {
            throw new Error(`XRPL_RPC is invalid or missing: ${finalUrl}`);
        }

        const client = new xrpl.Client(finalUrl);
        await client.connect();
        return client;
    }

    /**
     * Create a token escrow (IOU or MPT) for a refundable deposit.
     *
     * IMPORTANT:
     * - Token escrows require CancelAfter (expiration). :contentReference[oaicite:4]{index=4}
     * - EscrowCancel can only occur after CancelAfter.
     */
    static async createTokenEscrow(params: {
        client: xrpl.Client;
        ownerWallet: xrpl.Wallet;     // who locks the funds (deposit payer)
        destination: string;          // who receives funds on finish (e.g. organizer)
        amount: AmountLike;          // IOU or MPT amount
        finishAfter?: number;         // unix seconds
        cancelAfter: number;          // unix seconds (mandatory for token escrow)
        memoJson?: any;
    }): Promise<{ pointer: EscrowPointer; result: xrpl.TxResponse }> {
        const { client, ownerWallet, destination, amount, finishAfter, cancelAfter, memoJson } = params;

        const tx: xrpl.EscrowCreate = {
            TransactionType: "EscrowCreate",
            Account: ownerWallet.classicAddress,
            Destination: destination,
            Amount: params.amount as any,        // IOU object or MPT object
            CancelAfter: cancelAfter,
            ...(finishAfter ? { FinishAfter: finishAfter } : {}),
            ...(memoJson
                ? {
                    Memos: [
                        {
                            Memo: {
                                MemoType: xrpl.convertStringToHex("application/json"),
                                MemoData: xrpl.convertStringToHex(JSON.stringify(memoJson)),
                            },
                        },
                    ],
                }
                : {}),
        };

        const prepared = await client.autofill(tx);
        const signed = ownerWallet.sign(prepared);
        const result = await client.submitAndWait(signed.tx_blob);

        // The escrow is referenced later by (Owner + OfferSequence)
        const pointer: EscrowPointer = {
            owner: ownerWallet.classicAddress,
            offerSequence: prepared.Sequence!,
        };

        return { pointer, result };
    }

    /** Finish escrow (release deposit to Destination). */
    static async finishEscrow(params: {
        client: xrpl.Client;
        finisherWallet: xrpl.Wallet; // the account submitting EscrowFinish
        owner: string;
        offerSequence: number;
        fulfillmentHex?: string;     // for conditional escrows (optional)
    }) {
        const { client, finisherWallet, owner, offerSequence, fulfillmentHex } = params;

        const tx: xrpl.EscrowFinish = {
            TransactionType: "EscrowFinish",
            Account: finisherWallet.classicAddress,
            Owner: owner,
            OfferSequence: offerSequence,
            ...(fulfillmentHex ? { Fulfillment: fulfillmentHex } : {}),
        };

        const prepared = await client.autofill(tx);
        const signed = finisherWallet.sign(prepared);
        return await client.submitAndWait(signed.tx_blob);
    }

    /**
     * Cancel escrow (refunds back to Owner) — only possible AFTER CancelAfter. :contentReference[oaicite:5]{index=5}
     */
    static async cancelEscrow(params: {
        client: xrpl.Client;
        cancellerWallet: xrpl.Wallet;
        owner: string;
        offerSequence: number;
    }) {
        const { client, cancellerWallet, owner, offerSequence } = params;
        console.log(">>> cancelEscrow() CALLED <<<", { owner, offerSequence });

        const ownerStr = String(owner).trim();
        const seqNum = Number(offerSequence);

        const tx: xrpl.EscrowCancel = {
            TransactionType: "EscrowCancel",
            Account: cancellerWallet.classicAddress, // MUST be string
            Owner: ownerStr,                         // MUST be string
            OfferSequence: seqNum,                   // MUST be number
        };

        console.log("EscrowCancel TX =", JSON.stringify(tx));
        console.log("types:", {
            Account: typeof (tx as any).Account,
            Owner: typeof (tx as any).Owner,
            OfferSequence: typeof (tx as any).OfferSequence,
        });

        const prepared = await client.autofill(tx);
        const signed = cancellerWallet.sign(prepared);
        return await client.submitAndWait(signed.tx_blob);
    }

    /** Look up escrows owned by an account (helpful for audit / status). */
    static async listEscrows(params: { client: xrpl.Client; ownerAccount: string }) {
        const { client, ownerAccount } = params;
        const resp = await client.request({
            command: "account_objects",
            account: ownerAccount,
        });

        const objs = resp.result.account_objects ?? [];
        return objs.filter((o: any) => o.LedgerEntryType === "Escrow");
    }

    static async getEscrow(params: { client: xrpl.Client; owner: string; offerSequence: number }) {
        const { client, owner, offerSequence } = params;

        const resp = await client.request({
            command: "ledger_entry",
            escrow: {
                owner,
                seq: offerSequence,
            },
        });

        return resp.result.node; // escrow ledger object if found
    }
}