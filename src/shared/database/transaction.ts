import mongoose, { type ClientSession } from 'mongoose';

export type TransactionRunner = <T>(work: (session: ClientSession) => Promise<T>) => Promise<T>;

export const withTransaction: TransactionRunner = async (work) => {
  const session = await mongoose.startSession();
  try {
    let result!: Awaited<ReturnType<typeof work>>;
    await session.withTransaction(async () => { result = await work(session); });
    return result;
  } finally { await session.endSession(); }
};
